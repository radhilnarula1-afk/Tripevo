# WANDR.AI — System Architecture & Developer Reference Guide

This reference guide is designed to help you understand the architectural layout and under-the-hood systems of WANDR.AI. If you need to discuss the tech stack with other developers, this guide provides all the technical details, implementation specifics, and directory maps.

---

## 🚀 The Core Tech Stack

WANDR.AI is a modern, responsive single-page experience designed around a premium dark glassmorphic UI.

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | **Next.js 14** (App Router) | Server-side rendering (SSR), optimized builds, client-side routing, and API route hosting. |
| **Programming Language** | **TypeScript** | Static typing and interfaces for type safety across frontend and backend. |
| **Styling** | **Tailwind CSS** + **Vanilla CSS CSS variables** | Responsive design, glassmorphism UI, scroll animations, and clean media print directives for PDF exports. |
| **Backend & Auth** | **Supabase** (Postgres DB + Go auth + REST API) | User registration, credential/Google OAuth logins, and session persistence. |
| **Real-time Sync** | **Supabase Realtime** (WebSockets) | Live sync for group chat, participant presence, and itinerary voting. |
| **AI Generation** | **Gemini 1.5 Flash** (via `@google/generative-ai`) | Structured JSON itinerary curation and geocoding. |
| **Visa Intelligence** | **Groq Cloud API** (`llama-3.1-8b-instant`) | Live visa requirement extraction based on passport and destination. |
| **Mapping Engine** | **Leaflet** + **OpenStreetMap / Carto Voyager** | Geocoded travel routes, active day markers, and smooth fly-to panning. |

---

## 💬 How Real-Time Collaboration Works (WebSockets & Channels)

When a developer asks: *"How is the live group planning chat and cursor synchronization implemented?"* or *"What WebSocket connection did you use?"*, here is the exact technical explanation:

We use **Supabase Realtime**, which is a server-side engine written in **Elixir** (using **Phoenix Channels**) that multiplexes a single bi-directional WebSocket connection between the client browser and the server. We leverage three features of this WebSocket link:

### 1. Realtime Broadcast (Group Chat & Live Events)
- **Concept**: Short-lived, high-frequency messages passed directly from client-to-client with sub-100ms latency. Messages are not written to the database; they are simply sent to other connected browsers in the channel.
- **Implementation**:
  - We subscribe to a collaborative channel based on a generated room code (e.g. `wandr-collab-wndr-1234` or `wandr-chat-[itineraryId]`).
  - To join a channel:
    ```typescript
    const chatChannel = supabase.channel(chatChannelName, {
      config: { broadcast: { self: true }, presence: { key: voterSessionId } }
    });
    ```
  - When a user sends a message or adds an activity, we dispatch a broadcast event over the WebSocket:
    ```typescript
    chatChannel.send({
      type: 'broadcast',
      event: 'chat_message',
      payload: { id, text, senderName, timestamp }
    });
    ```
  - Receivers listen to the `'broadcast'` event on the websocket and append the incoming message to their local state:
    ```typescript
    chatChannel.on('broadcast', { event: 'chat_message' }, ({ payload }) => {
      setChatMessages(prev => [...prev, payload]);
    });
    ```

### 2. Realtime Presence (Live User Count)
- **Concept**: Tracks client online/offline statuses and metadata (e.g., username, cursor coordinates). It uses a conflict-free replicated data type (CRDT) to synchronize state without a central database.
- **Implementation**:
  - Users track themselves in the channel via `chatChannel.track({ joined_at: new Date().toISOString() })`.
  - When presence updates occur, the `sync` event fires over the WebSocket, and we read the connected client count:
    ```typescript
    chatChannel.on('presence', { event: 'sync' }, () => {
      const activeCount = Object.keys(chatChannel.presenceState()).length;
      setActivePlanners(activeCount);
    });
    ```

### 3. Postgres Changes Listeners (Itinerary Vote Synchronization)
- **Concept**: Listens to changes in the underlying PostgreSQL database. When a database transaction (INSERT, UPDATE, DELETE) commits, Supabase's Realtime listener captures the write-ahead log (WAL) and publishes the update to subscribed WebSockets.
- **Implementation**:
  - We listen to changes on the `itinerary_votes` table:
    ```typescript
    const channel = supabase
      .channel(`realtime-shared-votes-${itineraryId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'itinerary_votes', filter: `itinerary_id=eq.${itineraryId}` },
        (payload) => {
          // Reactively update local upvotes/downvotes
        }
      )
      .subscribe();
    ```

---

## 🗄️ Database Architecture (PostgreSQL Schema)

All transactions, itineraries, and clicks are persistent in a relational PostgreSQL database hosted on Supabase:

- **`users` (managed by Supabase Auth)**: Tracks basic auth records.
- **`itineraries`**: Holds generated itinerary JSON. Contains a custom `share_token` (UUID) used for collaborative shared links `/share/[token]`.
- **`collab_sessions`**: Tracks active shared session rooms (matching room code to itinerary).
- **`itinerary_votes`**: Stores user votes (up/down) on activities. Employs a composite key (`itinerary_id`, `day_idx`, `activity_idx`, `voter_session_id`) to ensure unique voters can only upvote/downvote once per activity.
- **`affiliate_clicks`**: Stores monetization telemetry. Logs clicks to partners (Booking.com, Goibibo, GetYourGuide, Zomato) to track CTR (Click-Through Rate) metrics.

---

## 🤖 AI & External Integrations

We split LLM routing based on tasks to maintain high speed and keep operating costs low:

1. **Itinerary Curation (Gemini 1.5 Flash)**:
   - Configured in `src/backend/services/ai.service.ts`.
   - Takes input parameters (destination, vibe ratings, budget, duration, date range).
   - Enforces a strict JSON Schema returning:
     - `days` array containing titles, descriptions, and slots (`activities` string array).
     - `map_locations` array containing geo-coordinates (`lat`, `lng`), day references, and name strings for map pins.
2. **Visa Onboarding Engine (Groq Llama 3.1 8B)**:
   - Configured in `/api/visa/route.ts`.
   - Uses `llama-3.1-8b-instant` to check international visa codes on-the-fly based on the traveler's nationality.
3. **Weather Rescheduling (Open-Meteo API)**:
   - Queries real-time precipitation forecasts. If a rain precipitation alert (>60% risk) is detected, it triggers a warning panel and suggests shifting outdoor slots indoors.

---

## 📂 Codebase Directory Layout

```
wandr-ai/
├── src/
│   ├── app/                      # Next.js App Router Pages & API Routes
│   │   ├── api/                  # API endpoints (visa check, itinerary generation, click tracking)
│   │   │   ├── generate-itinerary/
│   │   │   └── visa/
│   │   ├── share/[token]/        # Public shared collaborate route
│   │   │   └── page.tsx          # Real-time group timeline, chat room, and shared map
│   │   ├── login/                # Auth route (credential + Google OAuth UI)
│   │   ├── layout.tsx            # Global layout wrapper
│   │   ├── globals.css           # Vanilla variables + Tailwind declarations
│   │   └── page.tsx              # Main application hub (Search, Vibe Check, Active Map & Timeline)
│   │
│   ├── backend/                  # Server-Side Business Logic
│   │   ├── services/
│   │   │   ├── ai.service.ts     # Gemini LLM integration service
│   │   │   └── supabase.service.ts
│   │   └── utils/
│   │       └── affiliates.ts     # Affiliate URL parameters builder
│   │
│   ├── frontend/                 # Client-Side Helpers
│   │   └── components/           # Extracted UI elements (TrendPanel, Weather alerts)
│   │
│   └── lib/                      # Configuration layers
│       └── supabase/
│           ├── client.ts         # Client-side Supabase setup
│           └── server.ts         # SSR server-side Supabase setup
│
├── supabase/                     # Supabase database configuration
│   └── migrations/               # PostgreSQL schema structure & RLS policies
│
├── tailwind.config.ts            # Tailwind UI configuration
│   └── postcss.config.mjs        # PostCSS compiler configuration
```
