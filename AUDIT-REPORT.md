# Pre-Launch Audit Report

**Project:** Bus Buddy  
**Audit date:** March 2025  
**Scope:** Full-stack (frontend + backend), 5-phase review

---

## Summary

A full pre-launch audit was done across **5 phases**. Issues were found and fixed in each phase. This report explains what was wrong, what was changed, and what to watch after launch.

---

## Phase 1: Visual, UI/UX & Assets

### What we checked
- Images and SVGs (responsive, aspect ratio, stretching)
- Layout and clipping on mobile/desktop
- Usability (hover states, contrast, navigation, accessibility)

### Issues fixed

| Issue | Why it mattered | Fix |
|-------|-----------------|-----|
| **Sleep screen not keyboard-accessible** | Keyboard users couldn’t wake the app. | Added `tabIndex={0}`, Enter/Space key handler, and visible focus ring. |
| **Weak focus visibility on buttons/tabs** | Keyboard users couldn’t see where focus was. | Added `focus-visible` ring styles to mode tabs, stop tabs, weather controls, and driving tabs. |
| **Weather header text could overflow on small screens** | Long text could crowd or clip. | Truncated weather text; “Bring umbrella” only on larger screens. |
| **Stop labels could overflow in tab bar** | Long names distorted layout. | Truncated labels + `title` tooltip. |
| **Driving grids forced 2 columns on mobile** | Cards were cramped. | Switched to 1 column on small screens (`grid-cols-1 sm:grid-cols-2`). |
| **Traffic camera image cropped edges** | Important parts of image could be cut off. | Switched to `object-contain` with dark background. |
| **Shuttle landmarks could clip at track edges** | Icons at 0%/100% could be cut off. | Clamped positions to 6–94% and adjusted icon/container sizes. |
| **Typo: “Stnding”** | Looked unpolished. | Corrected to “Standing”. |
| **Hidden scrollbar on stop chips** | Users might not know more stops existed. | Removed `scrollbar-none` so scroll is visible. |
| **Low-contrast footer text** | Hard to read. | Slightly larger, brighter text. |

### Still good to know
- Full-screen background images are still PNGs; consider WebP/AVIF later for smaller size.
- Test at 320px width and 200% zoom for extra safety.

---

## Phase 2: Frontend Behaviour & Errors

### What we checked
- Buttons, forms, modals, tabs and their state
- Error handling and user-facing messages
- Unhandled promises and possible crashes

### Issues fixed

| Issue | Why it mattered | Fix |
|-------|-----------------|-----|
| **Camera list could crash when it shrank** | Selecting camera 3, then refresh with 2 cameras → crash. | Clamp selected index when list length changes; safe fallback for current camera. |
| **Abort controllers didn’t cancel requests** | Refreshing/navigating still sent requests. | Pass `signal` from hooks into API; real request cancellation. |
| **Malformed API data could crash UI** | Backend shape changes could break pages. | Normalise all API responses (dashboard, weather, driving) with safe defaults. |
| **Dashboard “last updated” could look fresh after failed refresh** | Misleading “fresh” indicator. | Only update “last updated” when at least one request succeeds. |
| **Weather failures were silent** | Blank header with no explanation. | Added `weatherError` and show “Weather temporarily unavailable” in header. |
| **Driving showed “all clear” during full fetch failure** | False sense that data was loaded. | When `error && !data`, show single failure message and hide normal tab content; added Retry button. |
| **Unstable preferences updater** | Extra effect churn. | Stable `useCallback` for `updatePreferences`. |
| **Timeout/abort errors could be technical** | Confusing for users. | User-friendly messages (e.g. “Request timed out. Tap refresh.”). |

### Still good to know
- No infinite loops or unhandled promise rejections were found in the reviewed code.

---

## Phase 3: Backend & API Stability

### What we checked
- Route handlers and error handling
- Validation of inputs and upstream data
- Logic that could crash or return bad data

### Issues fixed

| Issue | Why it mattered | Fix |
|-------|-----------------|-----|
| **Upstream LTA/API payloads trusted as-is** | Malformed data could crash routes. | Safe parsing and normalisation in LTA client for bus, incidents, images, speed bands, travel times. |
| **Invalid bus arrival timestamps** | Bad date → exception in normalisation. | Validate date (e.g. `Number.isFinite(ms)`); skip bad slots; return null status for invalid first arrival. |
| **Weak `stopCode` validation** | Any string accepted. | Zod: trim + 5-digit regex. |
| **Driving aggregation assumed valid fields** | Missing/wrong types could throw. | Guards: skip rows without valid name/EstTime; skip bad speed-band rows. |
| **Raw error messages sent to client** | Could leak internal/upstream details. | Stable messages: “Bus data temporarily unavailable”, “Driving data temporarily unavailable”, “Internal server error”. |
| **Weather numbers not clamped** | Odd values could slip through. | Coerce and clamp rain probability 0–100; safe weather code. |

### Still good to know
- All API keys/secrets come from environment variables; no hardcoded secrets found.

---

## Phase 4: Security & Pre-Publish

### What we checked
- XSS, injection, CSRF, sensitive data exposure
- Security headers, CORS, credentials
- Env and secrets handling

### Issues fixed

| Issue | Why it mattered | Fix |
|-------|-----------------|-----|
| **No security headers** | Weaker default browser security. | Added **Helmet**; disabled `X-Powered-By`. |
| **CORS `credentials: true` without cookies** | Unnecessary risk. | Set `credentials: false`; limited methods/headers and `maxAge`. |
| **Strict JSON body not set** | Slightly looser request handling. | `express.json({ limit: '100kb', strict: true, type: 'application/json' })`. |
| **Backend error details shown in UI** | Could leak internal/proxy messages. | API client maps status codes to short, user-safe messages only. |
| **Unvalidated camera image URLs** | Privacy/tracking and mixed-content risk. | Only allow `https:` URLs; fallback image + “Blocked insecure image URL”; `referrerPolicy="no-referrer"` on image. |

### Still good to know
- No `dangerouslySetInnerHTML` or similar XSS patterns found.
- No API keys or tokens in frontend code.
- If you add cookie-based auth later, add CSRF protection and keep CORS strict.

---

## Phase 5: Code Quality & Performance

### What we checked
- Repeated logic, heavy re-renders, bundle size
- Backend cache usage and duplicate work

### Issues fixed

| Issue | Why it mattered | Fix |
|-------|-----------------|-----|
| **Heavy modes in initial bundle** | Slower first load. | **Lazy load** Driving and Shuttle modes with `React.lazy` + `Suspense`; Bus mode stays eager. |
| **Repeated pin checks in service list** | Extra work every render. | `pinnedSet = useMemo(() => new Set(pinnedServices))`; memoised sorted list; `pinnedSet.has()` for `isPinned`. |
| **Cache stampede on cold keys** | Many concurrent requests for same key = duplicate upstream calls. | **getOrLoad()** in cache: in-flight deduplication so one load per key. |
| **Repeated get/fetch/set in routes** | Noisy and easy to get wrong. | Dashboard, weather, and driving use `cache.getOrLoad(...)` instead of manual get/fetch/set. |
| **Unused coordinate parsing in expressways** | Extra CPU for no benefit. | Removed coordinate parsing from expressway aggregation (only RoadName/category/speed used). |
| **Camera sort doing repeated Set checks** | Comparator called many times. | Precompute priority and distance once per camera; sort by those; then drop priority from output. |

### Still good to know
- Build output shows separate chunks for `DrivingPage` and `ShuttleRadarPage` (smaller initial JS).
- You could later add a shared SG time-formatting helper to avoid repeated `toLocaleTimeString` options.

---

## Quick reference: files changed (by phase)

- **Phase 1:** `DashboardPage.tsx`, `StopTabBar.tsx`, `WeatherHeader.tsx`, `App.tsx`, `DrivingPage.tsx`, `ShuttleRadarPage.tsx`, `CrowdIcon.tsx`, `ControlsBar.tsx`, `index.css`
- **Phase 2:** `apiClient.ts`, `useDashboardData.ts`, `DashboardPage.tsx`, `WeatherHeader.tsx`, `useDrivingData.ts`, `DrivingPage.tsx`, `usePreferences.ts`
- **Phase 3:** `ltaClient.ts`, `normalizeBusArrival.ts`, `dashboard.ts` (routes), `weatherClient.ts`, `server.ts`
- **Phase 4:** `server.ts`, `apiClient.ts`, `DrivingPage.tsx`, `package.json` (backend, Helmet)
- **Phase 5:** `App.tsx`, `ServiceList.tsx`, `cache.ts`, `dashboard.ts` (routes)

---

## After launch: what to keep an eye on

1. **Performance:** If dashboard feels slow on low-end devices, consider moving the 100ms rotation progress out of the main page (e.g. into `StopTabBar` or CSS animation).
2. **Errors:** Monitor backend logs for `[/api/dashboard]`, `[/api/weather]`, `[/api/driving]` to spot upstream or config issues.
3. **Secrets:** Keep `LTA_API_KEY` and any new secrets in env only; never commit `.env` with real keys.
4. **Security:** If you add login or cookies, add CSRF protection and review CORS/credentials again.
5. **Assets:** Consider WebP/AVIF and responsive image sizes for large backgrounds if you optimise further.

---

## Checklist before going live

- [ ] Run `npm run build` in both `frontend` and `backend` and fix any errors.
- [ ] Set `NODE_ENV=production` and use HTTPS in production.
- [ ] Ensure `LTA_API_KEY` (and any other secrets) are set in production env only.
- [ ] Test main flows: bus stop selection, refresh, driving tabs, shuttle view.
- [ ] Test on a narrow viewport (e.g. 320px) and with browser zoom.
- [ ] Confirm no sensitive data or stack traces appear in client-facing error messages.

---

*End of audit report.*
