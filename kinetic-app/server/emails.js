// ─── Kinetic Email System — powered by Resend ────────────────────────────────
// Sends: Welcome (on register), Day-3 reminder (if inactive), Day-7 Pro offer (free users)
'use strict'

const { Resend } = require('resend')

// Lazily instantiated at send-time so Railway build doesn't require the secret
let _resend = null
function getResend() {
  if (!process.env.RESEND_API_KEY) return null
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY)
  return _resend
}

function getFrom()   { return process.env.EMAIL_FROM || 'Kinetic App <noreply@kinetic-fitness.com>' }
function getAppUrl() { return process.env.APP_URL || 'https://kinetic-app-lovat.vercel.app' }

// ─── Core sender ─────────────────────────────────────────────────────────────
async function sendEmail(to, subject, html) {
  const resend = getResend()
  if (!resend) {
    console.log(`[Email] RESEND_API_KEY not set — skipped: "${subject}" → ${to}`)
    return { skipped: true }
  }
  try {
    const { data, error } = await resend.emails.send({ from: getFrom(), to, subject, html })
    if (error) {
      console.error(`[Email] Failed "${subject}" → ${to}:`, error)
      return { error }
    }
    console.log(`[Email] Sent "${subject}" → ${to} (id: ${data.id})`)
    return { id: data.id }
  } catch (err) {
    console.error(`[Email] Exception sending "${subject}" → ${to}:`, err.message)
    return { error: err.message }
  }
}

// ─── Shared layout wrapper ────────────────────────────────────────────────────
function layout(content) {
  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Kinetic</title>
</head>
<body style="margin:0;padding:0;background-color:#0e0e0e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0e0e0e;min-height:100vh;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table width="100%" style="max-width:560px;" cellpadding="0" cellspacing="0">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <div style="display:inline-block;background:#CCFF00;border-radius:14px;padding:10px 20px;">
                <span style="font-size:22px;font-weight:900;letter-spacing:2px;color:#0e0e0e;font-family:Arial Black,Arial,sans-serif;">KINETIC</span>
              </div>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#1a1a1a;border-radius:20px;border:1px solid rgba(255,255,255,0.07);overflow:hidden;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:28px 0 0;">
              <p style="color:#555;font-size:12px;margin:0;">
                קיבלת אימייל זה כי נרשמת ל-Kinetic Fitness App.<br/>
                <a href="${getAppUrl()}" style="color:#CCFF00;text-decoration:none;">kinetic-app.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// ─── CTA Button ───────────────────────────────────────────────────────────────
function ctaButton(label, url) {
  return `
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:8px 0;">
          <a href="${url}"
             style="display:inline-block;background:#CCFF00;color:#0e0e0e;font-size:15px;font-weight:900;
                    letter-spacing:0.5px;text-decoration:none;border-radius:12px;
                    padding:14px 36px;font-family:Arial Black,Arial,sans-serif;">
            ${label}
          </a>
        </td>
      </tr>
    </table>`
}

// ─── Feature row ──────────────────────────────────────────────────────────────
function featureRow(emoji, title, desc) {
  return `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
        <table cellpadding="0" cellspacing="0">
          <tr>
            <td style="width:36px;vertical-align:top;padding-top:2px;font-size:20px;">${emoji}</td>
            <td style="padding-right:8px;">
              <p style="margin:0;color:#fff;font-size:14px;font-weight:700;">${title}</p>
              <p style="margin:4px 0 0;color:#888;font-size:12px;">${desc}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>`
}

// ─── 1. Welcome Email ─────────────────────────────────────────────────────────
function buildWelcomeHtml(name) {
  const tips = [
    ['⏱️', 'התחל קצר', 'אימון של 20 דקות עדיף על כלום. כמות > שלמות.'],
    ['📸', 'תעד את ההתקדמות', 'לוג כל סט — הנתונים יגידו לך מה עובד.'],
    ['🔁', 'עקביות מנצחת', 'שלושה אימונים שבועיים במשך חודש = 12 ניצחונות.'],
  ]

  return layout(`
    <!-- Header band -->
    <div style="background:linear-gradient(135deg,#1f2700 0%,#2a3800 100%);padding:40px 36px 32px;text-align:right;">
      <p style="margin:0 0 6px;color:#CCFF00;font-size:12px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">ברוך הבא</p>
      <h1 style="margin:0;color:#fff;font-size:28px;font-weight:900;line-height:1.25;">שלום, ${name}! 👋</h1>
      <p style="margin:12px 0 0;color:#aaa;font-size:15px;line-height:1.6;">
        אנחנו שמחים שהצטרפת ל-Kinetic.<br/>
        הכל מוכן — בוא נתחיל לבנות את גוף החלומות שלך.
      </p>
    </div>

    <!-- Body -->
    <div style="padding:32px 36px;">
      <p style="margin:0 0 20px;color:#CCFF00;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">3 טיפים להתחלה מנצחת</p>

      <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid rgba(255,255,255,0.05);">
        ${tips.map(([e, t, d]) => featureRow(e, t, d)).join('')}
      </table>

      <div style="margin-top:32px;">
        ${ctaButton('התחל עכשיו 🚀', getAppUrl() + '/dashboard')}
      </div>

      <p style="margin:24px 0 0;color:#555;font-size:12px;text-align:center;line-height:1.6;">
        כבר יש לך שאלה? פשוט פתח את ה-AI Coach באפליקציה.
      </p>
    </div>
  `)
}

// ─── 2. Day-3 Reminder Email ──────────────────────────────────────────────────
function buildReminderHtml(name) {
  return layout(`
    <!-- Header band -->
    <div style="background:linear-gradient(135deg,#1a1200 0%,#261a00 100%);padding:40px 36px 32px;text-align:right;">
      <p style="margin:0 0 6px;color:#CCFF00;font-size:12px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">חסרת לנו</p>
      <h1 style="margin:0;color:#fff;font-size:28px;font-weight:900;line-height:1.25;">היי ${name}, איפה אתה? 💪</h1>
      <p style="margin:12px 0 0;color:#aaa;font-size:15px;line-height:1.6;">
        3 ימים עברו מאז שנרשמת.<br/>
        האימון הראשון שלך מחכה — ולוקח רק 20 דקות.
      </p>
    </div>

    <!-- Body -->
    <div style="padding:32px 36px;">

      <!-- Stats pills -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
        <tr>
          <td style="padding:0 6px 0 0;width:33%;">
            <div style="background:#111;border-radius:12px;padding:16px 12px;text-align:center;border:1px solid rgba(204,255,0,0.15);">
              <p style="margin:0;color:#CCFF00;font-size:24px;font-weight:900;">20</p>
              <p style="margin:4px 0 0;color:#666;font-size:10px;text-transform:uppercase;letter-spacing:1px;">דקות לאימון</p>
            </div>
          </td>
          <td style="padding:0 3px;width:33%;">
            <div style="background:#111;border-radius:12px;padding:16px 12px;text-align:center;border:1px solid rgba(204,255,0,0.15);">
              <p style="margin:0;color:#CCFF00;font-size:24px;font-weight:900;">8+</p>
              <p style="margin:4px 0 0;color:#666;font-size:10px;text-transform:uppercase;letter-spacing:1px;">תוכניות מוכנות</p>
            </div>
          </td>
          <td style="padding:0 0 0 6px;width:33%;">
            <div style="background:#111;border-radius:12px;padding:16px 12px;text-align:center;border:1px solid rgba(204,255,0,0.15);">
              <p style="margin:0;color:#CCFF00;font-size:24px;font-weight:900;">0→1</p>
              <p style="margin:4px 0 0;color:#666;font-size:10px;text-transform:uppercase;letter-spacing:1px;">הצעד החשוב</p>
            </div>
          </td>
        </tr>
      </table>

      <p style="margin:0 0 24px;color:#aaa;font-size:14px;line-height:1.7;text-align:right;">
        כל מסע מתחיל באימון אחד.<br/>
        פתח את Kinetic עכשיו — בחר תוכנית ותתחיל. זה פשוט.
      </p>

      ${ctaButton('חזרה לאפליקציה →', getAppUrl() + '/workouts')}
    </div>
  `)
}

// ─── 3. Day-7 Pro Offer Email ─────────────────────────────────────────────────
function buildProOfferHtml(name) {
  const proFeatures = [
    ['📊', 'Analytics מתקדם', 'גרפי כוח, זיהוי פלטו, DNA של האימון שלך'],
    ['🤖', 'AI Coach אישי', 'שאל כל שאלה — תקבל תשובה מותאמת לך'],
    ['⚡', 'War Room', 'דשבורד elite עם כל המדדים במקום אחד'],
    ['∞', 'תוכניות ללא הגבלה', 'צור כמה תוכניות אימון שתרצה'],
    ['📈', 'היסטוריה מלאה', 'כל מדידת משקל, כל סט — לנצח'],
  ]

  return layout(`
    <!-- Header band -->
    <div style="background:linear-gradient(135deg,#001a0a 0%,#002612 100%);padding:40px 36px 32px;text-align:right;">
      <p style="margin:0 0 6px;color:#CCFF00;font-size:12px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">הצעה מיוחדת</p>
      <h1 style="margin:0;color:#fff;font-size:26px;font-weight:900;line-height:1.25;">${name}, שדרג ל-Pro — 14 יום חינם 🚀</h1>
      <p style="margin:12px 0 0;color:#aaa;font-size:15px;line-height:1.6;">
        שבוע ראשון עשית את הצעד הראשון.<br/>
        עכשיו תן לנו לקחת אותך לשלב הבא.
      </p>
    </div>

    <!-- Body -->
    <div style="padding:32px 36px;">

      <p style="margin:0 0 20px;color:#CCFF00;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">מה תקבל ב-Pro</p>

      <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid rgba(255,255,255,0.05);margin-bottom:28px;">
        ${proFeatures.map(([e, t, d]) => featureRow(e, t, d)).join('')}
      </table>

      <!-- Price block -->
      <div style="background:#111;border-radius:14px;padding:20px 24px;margin-bottom:28px;text-align:center;border:1px solid rgba(204,255,0,0.2);">
        <p style="margin:0;color:#CCFF00;font-size:32px;font-weight:900;">14 יום</p>
        <p style="margin:4px 0 0;color:#aaa;font-size:14px;">Trial חינם מוחלט — ללא כרטיס אשראי</p>
        <p style="margin:8px 0 0;color:#555;font-size:12px;">לאחר מכן רק ₪29/חודש. בטל בכל עת.</p>
      </div>

      ${ctaButton('התחל Trial חינם עכשיו ✨', getAppUrl() + '/pricing')}

      <p style="margin:20px 0 0;color:#555;font-size:12px;text-align:center;line-height:1.6;">
        ההצעה בתוקף ל-48 שעות.<br/>
        לא צריך כרטיס אשראי כדי להתחיל.
      </p>
    </div>
  `)
}

// ─── Public API ───────────────────────────────────────────────────────────────
async function sendWelcomeEmail(email, name) {
  return sendEmail(email, `ברוך הבא ל-Kinetic, ${name}! 🏋️`, buildWelcomeHtml(name))
}

async function sendReminderEmail(email, name) {
  return sendEmail(email, `היי ${name}, חסרת לנו 💪 — חזור לאימון`, buildReminderHtml(name))
}

async function sendProOfferEmail(email, name) {
  return sendEmail(email, `${name}, שדרג ל-Pro — 14 יום Trial חינם 🚀`, buildProOfferHtml(name))
}

module.exports = { sendWelcomeEmail, sendReminderEmail, sendProOfferEmail }
