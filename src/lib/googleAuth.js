import { useEffect, useState } from 'react'

const USER_KEY = 'user'
const USER_EVENT = 'youtube-clone-user-updated'
let googleIdentityPromise

function readUser() {
  try {
    const value = localStorage.getItem(USER_KEY)
    if (!value) return null
    const user = JSON.parse(value)
    if (typeof user?.name !== 'string' || typeof user?.email !== 'string') return null
    return {
      name: user.name,
      email: user.email,
      picture: typeof user.picture === 'string' ? user.picture : '',
    }
  } catch {
    return null
  }
}

function loadGoogleIdentity() {
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id)
  if (googleIdentityPromise) return googleIdentityPromise

  googleIdentityPromise = new Promise((resolve, reject) => {
    let script = document.querySelector('script[data-google-identity]')
    const onLoad = () => {
      if (window.google?.accounts?.id) resolve(window.google.accounts.id)
      else reject(new Error('Google sign-in could not be loaded. Please try again.'))
    }
    const onError = () => reject(new Error('Google sign-in could not be loaded. Please try again.'))

    if (!script) {
      script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.dataset.googleIdentity = 'true'
      script.addEventListener('load', onLoad, { once: true })
      script.addEventListener('error', onError, { once: true })
      document.head.appendChild(script)
      return
    }

    script.addEventListener('load', onLoad, { once: true })
    script.addEventListener('error', onError, { once: true })
  }).catch((error) => {
    googleIdentityPromise = null
    throw error
  })

  return googleIdentityPromise
}

function decodeCredential(credential) {
  const encodedPayload = credential.split('.')[1]
  if (!encodedPayload) throw new Error('Google returned an invalid sign-in response.')
  const base64 = encodedPayload.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='))
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
  const payload = JSON.parse(new TextDecoder().decode(bytes))
  if (typeof payload.name !== 'string' || typeof payload.email !== 'string') {
    throw new Error('Google returned an incomplete profile.')
  }
  return {
    name: payload.name,
    email: payload.email,
    picture: typeof payload.picture === 'string' ? payload.picture : '',
  }
}

export function saveGoogleUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
  window.dispatchEvent(new Event(USER_EVENT))
}

export function clearGoogleUser() {
  localStorage.removeItem(USER_KEY)
  window.google?.accounts?.id?.disableAutoSelect()
  window.dispatchEvent(new Event(USER_EVENT))
}

export async function startGoogleSignIn(clientId, onSuccess, onError) {
  try {
    const identity = await loadGoogleIdentity()
    identity.initialize({
      client_id: clientId,
      callback: ({ credential }) => {
        try {
          const user = decodeCredential(credential)
          saveGoogleUser(user)
          onSuccess(user)
        } catch (error) {
          onError(error)
        }
      },
    })
    identity.prompt()
  } catch (error) {
    onError(error)
  }
}

export function useGoogleUser() {
  const [user, setUser] = useState(readUser)

  useEffect(() => {
    const update = () => setUser(readUser())
    window.addEventListener(USER_EVENT, update)
    window.addEventListener('storage', update)
    return () => {
      window.removeEventListener(USER_EVENT, update)
      window.removeEventListener('storage', update)
    }
  }, [])

  return user
}
