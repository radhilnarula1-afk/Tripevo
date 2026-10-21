# WANDR.AI - Learning & Project Journal

This journal serves as a continuous log of everything that has happened, features we've added, ideas we've omitted, and core architectural decisions made throughout the development of WANDR.AI.

## Phase 1: Foundation & Prototypes
*   **Kept:** Scaffolded a Next.js 14 (App Router) project using Tailwind CSS and TypeScript.
*   **Kept:** Migrated the initial `Wanderlust` HTML/CSS template into React/JSX, successfully maintaining complex DOM interactions like custom cursor tracking, scroll-triggered animations, and theme-switching.
*   **Kept:** Integrated Google's Gemini 1.5 Flash AI to generate dynamic, JSON-structured travel itineraries based on destination and preferences.
*   **Omitted/Replaced:** The initial `Wanderlust` UI prototype was replaced entirely by a newer, more feature-rich template (`wandr_ai_frontend.html`).

## Phase 2: Backend Architecture & UI Overhaul
*   **Kept:** Completely overhauled `page.tsx` and `globals.css` with the new UI. Migrated raw JavaScript event listeners (Vibe Check, Trend Panel, Budget Tracker) into Next.js `useEffect` hooks to ensure compatibility with React.
*   **Kept:** Established the PostgreSQL database schema (`users`, `itineraries`, `destination_trends_cache`, `affiliate_clicks`) in `supabase/migrations/0001_init.sql`.
*   **Kept:** Added graceful failure handling to the `/api/generate-itinerary` route so that the Gemini AI generation continues to function flawlessly even before the Supabase database connection is fully initialized by the user.
*   **Omitted:** We did not forcefully overwrite `page.tsx` with Supabase's generic "Todo list" boilerplate when upgrading to SSR, intentionally keeping our custom travel UI intact.

## Phase 3: Infrastructure Upgrades
*   **Kept:** Upgraded Supabase from standard client to Server-Side Rendering (SSR) via `@supabase/ssr`. Created `server.ts`, `client.ts`, and `middleware.ts` utilities.
*   **Kept:** Set up the Supabase Model Context Protocol (MCP) server so AI agents can natively interact with the database.
*   **Kept:** Integrated `@fission-ai/openspec` to enforce Spec-Driven Development (SDD) for future feature planning, preventing context loss.

## Phase 4: Architecture & Organization
*   **Kept:** Successfully split the monolithic project structure by grouping files into strict `src/frontend` and `src/backend` directories. Next.js App Router now acts purely as a routing layer between the two.
*   **Omitted:** We consciously decided NOT to aggressively extract components from the massive `page.tsx` file via automated scripts, as the complex raw JavaScript animations (`useEffect`) were too fragile. We will extract them manually as we bind real data to them.
*   **Omitted:** We discarded the `<CustomCursor />` and its CSS overrides in favor of keeping the browser's default native cursor.

## Phase 5: PDF Feature Alignment & LLM Integration
*   **Kept:** Refactored the core search interface into a modular `SearchBar` with granular "Where", "When" (Custom Date Range Picker), and "Who" (Traveller Counters) inputs to perfectly match the PDF wireframes.
*   **Kept:** Overhauled the Itinerary graph to feature a chronological vertical timeline with dynamically injected map UI overlay cards.
*   **Kept:** Implemented the core earning layout, positioning the `ContentParser` module cleanly in the right sidebar for extracting Instagram/Blog locations.
*   **Kept:** Integrated a real-time **Groq LLM** backend route (`/api/visa`) to replace static visa mockups. The system dynamically queries visa laws using `llama-3.1-8b-instant` based on the user's specific nationality and destination.
*   **Kept:** Swapped the LottieFiles JSON player out for a resilient HTML5 `<video>` element serving `loading.mp4` to bypass CORS blocks on the loading animation.
*   **Omitted:** We opted against building the complex "Agent Orchestration" (Mixture of Experts) immediately, instead saving the architectural plan to `FUTURE_IMPLEMENTATIONS.md` to avoid MVP scope creep.

## Phase 6: Live Social Intelligence, Real Weather & Mapping (Sprint 2)
*   **Kept:** Integrated dynamic Geocoding using the Nominatim OpenStreetMap API, which updates location markers dynamically on a premium customized Leaflet Map view.
*   **Kept:** Created the **Live Social Intelligence** visual panel (`TrendPanel.tsx`) combining Google Trends momentum metrics and curated Reddit context bubble feeds, showing orange-to-rose glowing animations when a destination trends.
*   **Kept:** Wired actual Open-Meteo API forecasts to replace mock weather data, complete with safety rescheduling alerts for high rain precipitation.
*   **Kept:** Integrated live budget threshold logic with category breakdowns and interactive sliders.

## Phase 7: Authentication, Retention, Sharing & Monetization (Sprint 3)
*   **Kept:** Setup PostgreSQL schema tables, triggers, and Row Level Security (RLS) policies for `users`, `itineraries`, `collab_sessions`, `itinerary_votes`, and `affiliate_clicks`.
*   **Kept:** Overhauled user authentication with a premium glassmorphic `/login` page supporting both email/password credentials and Google OAuth provider.
*   **Kept:** Integrated a dynamic `AuthButton` in the main navigation.
*   **Kept:** Built the POST redirect save itinerary restoration flow, queueing guest itinerary IDs via local storage (`wandr_pending_save_itinerary_id`) to automatically save once the user signs up/logs in.
*   **Kept:** Deployed the premium "Saved Trips History Drawer" slide-out history panel.
*   **Kept:** Built public itinerary viewing (`/share/[token]`) supporting interactive real-time collaborative voting synchronized instantly across co-planners using Supabase Broadcast Channels.
*   **Kept:** Programmed affiliate click tracking API (`/api/track`) logging partner redirects for monetization statistics.

## Phase 8: Affiliate Planning
*   **Kept:** Implemented traveler-type URL builder logic (`buildBookingURL()`, `buildGoibiboURL()`, `buildGetYourGuideURL()`, `buildZomatoURL()`) in [affiliates.ts](file:///c:/Users/rajiv/WANDR.AI/wandr-ai/src/backend/utils/affiliates.ts) using parameters from the WANDR Affiliate Blueprint.
*   **Kept:** Added hotel search/booking strips after day headers (Insertion Point A) and cafes search chips inside activity cards (Insertion Point B).
*   **Kept:** Developed the "Complete Your Trip" sticky footer (Insertion Point C) aggregating dynamic estimated costs for activities and hotels with direct partner booking buttons.
*   **Kept:** Wired interactive clickable hotel rate estimations to day-meta headers, redirecting to partner bookings.
*   **Kept:** Added required legal affiliate disclosures near all call-to-actions.

## Phase 9: Map Layout Optimization
*   **Kept:** Moved the Leaflet interactive map from its sidebar position to a full-width banner at the top of the itinerary view (directly below the action buttons and above the Weather Reschedule Alert) for cleaner presentation on desktop and mobile.
*   **Kept:** Removed the mobile map toggle buttons and wrapper code, ensuring the map is always active and scales responsive-first (height 280px on mobile, 450px on desktop) across all viewport widths.

## Phase 10: Activity-Level Map Focus & Zoom
*   **Kept:** Implemented detailed individual activity-level zoom-in and marker highlighting. When an activity card is clicked in the timeline, the Leaflet map performs a smooth fly-to transition and opens the popup for that activity.
*   **Kept:** High-fidelity visual styling updates: active timeline cards now display a warm orange border (`#E87C5A`) and soft glow.
*   **Kept:** Maintained full parity for activity-level interactivity and map zoom transitions between the main page (`src/app/page.tsx`) and the shared collaborative page (`src/app/share/[token]/page.tsx`).
*   **Kept:** Resolved Next.js stylesheet resolution dev server 404 cache errors by purging the `.next` directory.

## Phase 11: Agentation & Developer Reference Integration
*   **Kept:** Installed the `agentation` devDependency and created the `AgentationWrapper` dynamic client component to allow browser-based annotation feedback for AI coding agents without breaking Server-Side Rendering (SSR).
*   **Kept:** Exported `DEVELOPER_REFERENCE.md` to both the project root and the `wandr-ai` subdirectory, laying out the exact WebSocket (Supabase Realtime Elixir/Phoenix Channels Broadcast + Presence) system structure for other developers.

---

## 📌 Currently Pending / Next Steps
1.  **Staging Deployment**: Deploy the Next.js application to a hosting provider (like Vercel) and map the OAuth redirect configuration to the production domain.
2.  **Affiliate Integration expansion**: Expand affiliate mapping logic to dynamically fetch real-time hotel/experience links based on destination geocodes instead of predefined simulations.
3.  **Real-Time Collaborative Cursor/Chat**: Expand the `collab_sessions` capabilities to support a full Discord-style shared chat room and live cursors.
