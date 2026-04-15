export async function requestPermission() {
  if (!('Notification' in window)) return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export function sendNotification(title, body, options = {}) {
  if (Notification.permission !== 'granted') return
  new Notification(title, {
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    ...options
  })
}

export function scheduleNotification(title, body, delayMs) {
  setTimeout(() => sendNotification(title, body), delayMs)
}

export function msUntilTime(hour, minute = 0) {
  const now = new Date()
  const target = new Date()
  target.setHours(hour, minute, 0, 0)
  if (target <= now) target.setDate(target.getDate() + 1)
  return target - now
}
