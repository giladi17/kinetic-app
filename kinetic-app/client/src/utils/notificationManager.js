import { sendNotification, msUntilTime, scheduleNotification } from './notifications'

const MESSAGES = {
  workout: [
    '💪 זמן אימון! הגוף שלך מחכה',
    '🔥 הסטריק שלך בסכנה — תאמן היום',
    '⚡ 20 דקות בלבד יכולות לשנות את היום',
  ],
  supplements: [
    '💊 שכחת את הקריאטין הבוקר?',
    '🥤 זמן לתוספים — אל תשבור את הרצף',
  ],
  streak_protection: [
    '🚨 נשארו {hours} שעות לשמור על הסטריק!',
    '⚠️ {streak} ימים רצופים — אל תפסיד הלילה',
  ],
  hydration: [
    '💧 שתית מספיק מים היום?',
    '🫗 מטרה: 2L — איפה אתה עומד?',
  ],
}

function randomMessage(type) {
  const arr = MESSAGES[type] || MESSAGES.workout
  return arr[Math.floor(Math.random() * arr.length)]
}

export async function initNotifications(reminders, streakStatus) {
  if (Notification.permission !== 'granted') return

  reminders.forEach(r => {
    if (!r.enabled) return
    const delay = msUntilTime(r.hour, r.minute)

    if (r.type === 'streak_protection' && streakStatus.streakAtRisk) {
      const msg = randomMessage('streak_protection')
        .replace('{hours}', streakStatus.hoursLeftToSave)
        .replace('{streak}', streakStatus.currentStreak)
      scheduleNotification('KINETIC — Streak בסכנה! 🔥', msg, 1000)
    } else {
      scheduleNotification('KINETIC', randomMessage(r.type), delay)
    }
  })
}
