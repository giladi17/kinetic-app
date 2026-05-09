import React, { Suspense, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ACTIONS, EVENTS, STATUS } from 'react-joyride'

// Dynamic import avoids Rollup's static default-export check on the ESM bundle
const JoyrideComponent = React.lazy(() =>
  import('react-joyride').then(mod => ({ default: mod.default ?? mod.Joyride }))
)

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

// Each step carries its own route so the callback knows where to navigate
const STEPS = [
  {
    target: '#tour-dashboard-stats',
    route: '/dashboard',
    placement: 'bottom',
    disableBeacon: true,
    title: 'לוח ביצועים 📊',
    content: 'כאן תראה הכל: מדד התאוששות, ביצועים שבועיים, ואתגר יומי שנבחר עבורך כל בוקר.',
  },
  {
    target: '#tour-nutrition-input',
    route: '/nutrition',
    placement: 'bottom',
    disableBeacon: true,
    title: 'הזנה חכמה ✨',
    content: 'הזן ארוחות בטקסט חופשי או בלחיצת כפתור — ה-AI יחשב קלוריות, חלבון, פחמימות ושומן.',
  },
  {
    target: '#tour-plans-list',
    route: '/plans',
    placement: 'top',
    disableBeacon: true,
    title: 'פרוטוקולי אימון 💪',
    content: 'בחר את הפרוטוקול שלך והתחל לעקוב אחרי ההתקדמות. יש PPL, Full Body, ותוכניות מותאמות אישית.',
  },
]

export default function AppTour({ onDone }) {
  const navigate = useNavigate()

  const [runTour, setRunTour] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)

  // Kick off on dashboard after giving it time to render
  useEffect(() => {
    navigate('/dashboard', { replace: true })
    const t = setTimeout(() => setRunTour(true), 800)
    return () => clearTimeout(t)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function finish() {
    localStorage.setItem(TOUR_KEY, 'true')
    setRunTour(false)
    onDone?.()
    navigate('/dashboard', { replace: true })
  }

  function handleCallback(data) {
    const { action, index, status, type } = data

    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      finish()
      return
    }

    if (type === EVENTS.STEP_AFTER) {
      const nextIndex = index + (action === ACTIONS.PREV ? -1 : 1)

      // Past the last step → finish
      if (nextIndex >= STEPS.length) {
        finish()
        return
      }

      const nextStep = STEPS[nextIndex]

      if (nextStep.route !== window.location.pathname) {
        // Pause first so Joyride stops hunting for the old target
        setRunTour(false)
        navigate(nextStep.route)
        // Give the new page 400 ms to mount its DOM before Joyride searches
        setTimeout(() => {
          setStepIndex(nextIndex)
          setRunTour(true)
        }, 800)
      } else {
        setStepIndex(nextIndex)
      }
    }
  }

  const locale = {
    back: 'חזור',
    close: 'סגור',
    last: 'יאללה! 🚀',
    next: 'הבא',
    open: 'פתח',
    skip: 'דלג',
  }

  return (
    <Suspense fallback={null}>
      <JoyrideComponent
        steps={STEPS}
        run={runTour}
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
    </Suspense>
  )
}
