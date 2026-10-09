export function showAppToast(message) {
  window.dispatchEvent(new CustomEvent('youtube-clone-toast', { detail: message }))
}
