const NOTIF_KEY = "whooops_notifications_on";
const LAST_NOTIF_KEY = "whooops_last_notification_date";

export function getNotificationsEnabled() {
  return localStorage.getItem(NOTIF_KEY) !== "false";
}

export function setNotificationsEnabled(on) {
  localStorage.setItem(NOTIF_KEY, on ? "true" : "false");
  if (!on && scheduledTimer) {
    clearTimeout(scheduledTimer);
    scheduledTimer = null;
  }
}

let scheduledTimer = null;

export async function requestPermission() {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const perm = await Notification.requestPermission();
  return perm === "granted";
}

function getToday() {
  return new Date().toISOString().split("T")[0];
}

function msUntilNextNineAM() {
  const now = new Date();
  const target = new Date(now);
  target.setHours(9, 0, 0, 0);
  if (now >= target) target.setDate(target.getDate() + 1);
  return target.getTime() - now.getTime();
}

export function scheduleDailyNotification() {
  if (!getNotificationsEnabled()) return;
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  if (scheduledTimer) clearTimeout(scheduledTimer);

  const ms = msUntilNextNineAM();

  scheduledTimer = setTimeout(() => {
    const lastDate = localStorage.getItem(LAST_NOTIF_KEY);
    const today = getToday();

    if (lastDate !== today) {
      new Notification("WhoOops! Daily Challenge", {
        body: "🎯 Your Daily Challenge is waiting for you!",
        icon: "/favicon.ico",
      });
      localStorage.setItem(LAST_NOTIF_KEY, today);
    }

    scheduleDailyNotification();
  }, ms);
}

export async function initNotifications() {
  if (!getNotificationsEnabled()) return;
  const granted = await requestPermission();
  if (granted) scheduleDailyNotification();
}
