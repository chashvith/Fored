# CURRENT ARCHITECTURE MAP

- **Framework & Libraries**: Next.js 14 App Router, React 18, Tailwind CSS (with CSS variables for theming styling), Framer Motion.
- **Routing Structure**: 
  - `app/page.tsx`: Landing page representation.
  - `app/dashboard/page.tsx`: The user's reading shelf, representing book progress and library statistics.
  - `app/dashboard/[slug]/page.tsx`: Dynamic route for rendering individual book reader experiences.
  - `app/api/gemini/route.ts` & `app/api/tts/route.ts`: Backend routes responsible for LLM calls (Explain, Summarize, Translate) and text-to-speech features.
- **Components**:
  - `Reader.tsx`: The core reading experience containing text selection logic, dictionary lookups (Free Dictionary API), keyboard navigation (Focus Mode), and inline AI action popup menus.
  - Auth Components: `auth-create-account-form.tsx`, `auth-signin-form.tsx`, `auth-modal.tsx` to handle authentication flows.
  - Core Elements: `landing-page.tsx`, `theme-controller.tsx`, `stick-figure-scene.tsx`.
- **State Management**: Pure React `useState`, `useEffect`, and `useRef` at the component level. Local state is used for the LLM UI results, active index focus on paragraphs, and font sizing.
- **Styling**: Tailwind CSS with custom thematic CSS variables (`--app-bg`, `--app-surface`, `--app-text`, etc.) driving light/dark mode configuration.

# TECHNICAL DEBT & BUGS

- **Hardcoded State & Missing Database**: The `BOOKS` array and shelf stats within `dashboard/page.tsx` are entirely hardcoded. There's no global state (e.g., Zustand or React Context) or database ORM (Prisma/Drizzle) to persist reading progress, notes, or highlights.
- **Mobile Responsiveness & Viewport Trapping**: The positioning logic inside `Reader.tsx` for tooltips and selection menus (`setWordPopup`, `setSelectionMenu`) is rudimentary (`rect.top < 140`). Popups are prone to overflow the viewport or appear disjointed if the user zooms, scrolls abruptly, or reads on a narrow mobile device. Font sizing logic executes in a client-side `useEffect` window resize listener rather than utilizing responsive CSS media queries.
- **Fragile DOM APIs**: Relying on built-in `window.getSelection()` and native `window.speechSynthesis` is extremely fragile across different browser environments (especially iOS Safari). Voice synthesis differs heavily by device, which contrasts with the existence of the unused or incomplete `app/api/tts/route.ts`.
- **Incomplete Features**: The settings panel inside `Reader.tsx` simply fires an `alert("Settings panel placeholder")`.
- **Loading & Error States**: The Gemini integration handles text responses, but AI loading states in the front-end string (`Loading...`) can shift UI abruptly. The edge-case error messaging in the component lacks robust Toast or retry mechanisms.

# ANTIGRAVITY AGENT CONFIGURATION

### Agent 1: Data Integrity & State Architect
- **Specific Focus**: Replacing hardcoded component data with robust global state management and database readiness.
- **Initial Prompt**: "Extract the hardcoded `BOOKS` array and statistics present in `app/dashboard/page.tsx`. Implement a global state solution (e.g., Zustand) to manage reading progress, shelf state, and bookmarking. Scaffold a scalable database schema (Supabase or Prisma) and connect `app/dashboard/[slug]/page.tsx` to query data dynamically from this global store."

### Agent 2: Accessibility & Platform Engineer (TTS/AI)
- **Specific Focus**: Fortifying the Text-to-Speech infrastructure and AI edge-case handling.
- **Initial Prompt**: "Refactor `Reader.tsx` to remove reliance on native `window.speechSynthesis`. Instead, finalize the implementation in `app/api/tts/route.ts` using robust cloud TTS (such as ElevenLabs or Google Cloud TTS API) with proper audio streaming or pre-fetching. Improve the Gemini AI tooltip component to show an aesthetic skeleton loader instead of raw text, and implement Toast notifications for API failures."

### Agent 3: UI/UX & Responsive Interactions Builder
- **Specific Focus**: Hardening the reader component popups, completing missing UI elements, and fixing layout bugs on mobile devices.
- **Initial Prompt**: "Replace the custom manual absolute positioning of popups (`selectionMenu`, `wordPopup`) in `components/Reader.tsx` using a robust positioning library like Floating UI to prevent viewport clipping and mobile overflow. Next, replace the `alert('Settings panel placeholder')` with a fully functional settings modal that allows users to toggle font sizes, spacing, typeface, and theme using the existing `theme-controller.tsx` variables."
