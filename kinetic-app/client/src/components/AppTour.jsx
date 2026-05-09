import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import * as JoyrideModule from 'react-joyride'
const Joyride = JoyrideModule.default ?? JoyrideModule
const { ACTIONS, EVENTS, STATUS } = JoyrideModule
import { useUser } from '../context/UserContext'
import { getPersona } from '../data/personas'

const TOUR_KEY = 'hasSeenTomTour'

const JOYRIDE_STYLES = {
  options: {
    backgroundColor: '#1C1C1E',
    arrowColor: '#1C1C1E',
    textColor: '#ffffff',
    primaryColor: '#00BFFF',
    overlayColor: 'rgba(0, 0, 0, 0.72)',
    spotlightShadow: '0 0 0 3px rgba(0,191,255,0.45)',
    zIndex: 9000,
  },
  tooltip: {
    padding: '24px',
    borderRadius: '20px',
    fontFamily: "'Space Grotesk', sans-serif",
    maxWidth: '340px',
    border: '1px solid rgba(0,191,255,0.15)',
    boxShadow: '0 32px 64px rgba(0,0,0,0.6)',
  },
  tooltipTitle: {
    fontSize: '15px',
    fontWeight: 900,
    color: '#00BFFF',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    marginBottom: '8px',
  },
  tooltipContent: {
    fontSize: '14px',
    lineHeight: 1.6,
    color: 'rgba(255,255,255,0.85)',
    padding: '8px 0 0',
  },
  tooltipFooter: {
    marginTop: '20px',
    padding: '0',
  },
  buttonNext: {
    backgroundColor: '#00BFFF',
    color: '#000',
    fontWeight: 900,
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: '13px',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    borderRadius: '12px',
    padding: '10px 20px',
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(0,191,255,0.4)',
  },
  buttonBack: {
    color: 'rgba(255,255,255,0.5)',
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: '13px',
    fontWeight: 700,
    marginRight: '8px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '10px 8px',
  },
  buttonSkip: {
    color: 'rgba(255,255,255,0.35)',
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: '12px',
    fontWeight: 600,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '10px 8px',
    textDecoration: 'underline',
  },
  buttonClose: {
    color: 'rgba(255,255,255,0.4)',
    top: '12px',
    right: '12px',
    width: '24px',
    height: '24px',
  },
  beacon: {
    inner: '#00BFFF',
    outer: 'rgba(0,191,255,0.3)',
  },
  spotlight: {
    borderRadius: '16px',
  },
}

const TOUR_STEPS = [
  {
    target: '#dashboard-header',
    placement: 'bottom',
    disableBeacon: true,
    title: 'ברוך הבא ל-KINETIC 👋',
    content: 'זהו לוח הביצועים שלך — כאן תראה הכל: Readiness Score, פעילות שבועית, ואתגר יומי שאני בוחר לך כל בוקר.',
  },
  {
    target: '#nutrition-ai-section',
    placement: 'bottom',
    disableBeacon: true,
    title: 'הזנה חכמה ✨',
    content: 'כאן אתה מזין ארוחות בטקסט חופשי או בלחיצת כפתור, וה-AI יחשב הכל — קלוריות, חלבון, פחמימות ושומן.',
  },
  {
    target: '#plans-catalog',
    placement: 'top',
    disableBeacon: true,
    title: 'פרוטוקולי אימון 💪',
    content: 'בחר את הפרוטוקול שלך והתחל לעקוב אחרי ההתקדמות. יש PPL, Full Body, ותוכניות מותאמות אישית.',
  },
  {
    target: '#dashboard-header',
    placement: 'bottom',
    disableBeacon: true,
    title: 'הכל מוכן! 🚀',
    content: 'אני כאן בכל עת — לחץ על כפתור ה-AI בפינה כדי לשאול אותי כל דבר. בוא נתחיל!',
  },
]

// Route needed for each step index
const STEP_ROUTES = ['/dashboard', '/nutrition', '/plans', '/dashboard']

export default function AppTour({ onDone }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useUser()
  const persona = getPersona(user?.gender, user?.aiPersona)

  const [run, setRun] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [pendingStep, setPendingStep] = useState(null)

  // Start tour on mount — navigate to dashboard first if needed
  useEffect(() => {
    if (location.pathname !== '/dashboard') {
      navigate('/dashboard', { replace: true })
    } else {
      // Small delay so the page has rendered its targets
      setTimeout(() => setRun(true), 400)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // When location changes, resume if a pending step is waiting
  useEffect(() => {
    if (pendingStep === null) return
    const timer = setTimeout(() => {
      setStepIndex(pendingStep)
      setPendingStep(null)
      setRun(true)
    }, 500)
    return () => clearTimeout(timer)
  }, [location.pathname, pendingStep])

  const finish = useCallback(() => {
    localStorage.setItem(TOUR_KEY, 'true')
    setRun(false)
    onDone?.()
    navigate('/dashboard', { replace: true })
  }, [navigate, onDone])

  const handleCallback = useCallback((data) => {
    const { action, index, type, status } = data

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      finish()
      return
    }

    if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      const next = index + (action === ACTIONS.PREV ? -1 : 1)
      const clampedNext = Math.max(0, Math.min(next, TOUR_STEPS.length - 1))
      const targetRoute = STEP_ROUTES[clampedNext]

      if (targetRoute && location.pathname !== targetRoute) {
        setRun(false)
        setPendingStep(clampedNext)
        navigate(targetRoute)
      } else {
        setStepIndex(clampedNext)
      }
    }
  }, [location.pathname, navigate, finish])

  // Locale strings in Hebrew
  const locale = {
    back: 'חזור',
    close: 'סגור',
    last: 'יאללה! 🚀',
    next: 'הבא',
    open: 'פתח',
    skip: 'דלג',
  }

  return (
    <Joyride
      steps={TOUR_STEPS}
      run={run}
      stepIndex={stepIndex}
      continuous
      showSkipButton
      showProgress
      disableCloseOnEsc={false}
      disableOverlayClose={false}
      spotlightClicks={false}
      styles={JOYRIDE_STYLES}
      locale={locale}
      callback={handleCallback}
      floaterProps={{ disableAnimation: false }}
    />
  )
}
