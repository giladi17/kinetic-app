# Kinetic App — Project Rules

## Design & UI

- Framework: TailwindCSS with the **Stitch Theme** design language.
- Light mode backgrounds: `bg-[#F8F9FF]` (page), `bg-white` with `shadow-[0_24px_48px_rgba(0,0,0,0.06)]` (cards).
- Brand colors: electric-lime `#CCFF00` (accent), charcoal `text-[#151C25]` (primary text).

## Dark Mode

- Dark mode is toggled exclusively via the `dark` class on the `<html>` element (`document.documentElement`).
- Use Tailwind's `dark:` prefix for all dark-mode variants (e.g. `dark:bg-[#0E0E0E]`, `dark:text-white`).
- Never toggle dark mode via `body` classes or inline styles.

## User Management

- Never hardcode user names (e.g. `'Alex'`, `'ארבל'` as a fallback is acceptable only in display, not in logic).
- Always pull the user's name from `AuthContext` via `user?.name`.
- Session data is stored in `localStorage` under the key `kinetic_user` and the JWT under `kinetic_token`.
- On page load, restore session from `kinetic_user` immediately, then verify with `/api/auth/me` in the background.

## React Code Standards

- Use **Functional Components** with hooks only — no class components.
- Handle API errors with graceful degradation: never crash the UI on a failed fetch.
- Use `authFetch` (from `src/api.js`) for authenticated requests so the Authorization header is always attached.
- Keep components focused; extract reusable logic into custom hooks or utility files.

## Backend

- Email sending uses Resend. Default sender: `onboarding@resend.dev` (no domain verification needed). Override via `EMAIL_FROM` env var.
- AI responses use `gemini-1.5-flash` via the `/v1beta/` REST endpoint. Do not use `/v1/` or attempt model fallbacks.
- All errors in API routes must be caught and return a JSON response — never let an unhandled exception crash the server.
