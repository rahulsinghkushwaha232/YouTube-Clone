import { useEffect, useState } from 'react'

const STORAGE_KEY = 'subscriptions'
const SUBSCRIPTIONS_EVENT = 'youtube-clone-subscriptions-updated'

function readSubscriptions() {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    if (!value) return []
    const parsed = JSON.parse(value)
    if (!Array.isArray(parsed)) return []

    const seen = new Set()
    return parsed.filter((channel) => {
      if (
        !channel
        || typeof channel.channelId !== 'string'
        || !channel.channelId
        || typeof channel.channelTitle !== 'string'
        || !channel.channelTitle
        || seen.has(channel.channelId)
      ) return false
      seen.add(channel.channelId)
      return true
    })
  } catch {
    return []
  }
}

function writeSubscriptions(subscriptions) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(subscriptions))
    window.dispatchEvent(new Event(SUBSCRIPTIONS_EVENT))
    return true
  } catch {
    return false
  }
}

export function addSubscription(channel) {
  const subscriptions = readSubscriptions()
  if (subscriptions.some((item) => item.channelId === channel.channelId)) return true
  return writeSubscriptions([...subscriptions, {
    channelId: channel.channelId,
    channelTitle: channel.channelTitle,
  }])
}

export function removeSubscription(channelId) {
  return writeSubscriptions(readSubscriptions().filter((item) => item.channelId !== channelId))
}

export function clearSubscriptions() {
  try {
    localStorage.removeItem(STORAGE_KEY)
    window.dispatchEvent(new Event(SUBSCRIPTIONS_EVENT))
    return true
  } catch {
    return false
  }
}

export function useSubscriptions() {
  const [subscriptions, setSubscriptions] = useState(readSubscriptions)

  useEffect(() => {
    const update = () => setSubscriptions(readSubscriptions())
    window.addEventListener(SUBSCRIPTIONS_EVENT, update)
    window.addEventListener('storage', update)
    return () => {
      window.removeEventListener(SUBSCRIPTIONS_EVENT, update)
      window.removeEventListener('storage', update)
    }
  }, [])

  return subscriptions
}
