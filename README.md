# Bus Aunty Dashboard 🚌

A high-visibility, "calm technology" dashboard for Singaporean commuters. Translates raw LTA bus arrival data into actionable instructions: **Stay ☕**, **Leave 🏃**, or **Gone 💨**.

## Project Structure

```
Bus Buddy/
├── backend/    Node.js BFF — proxies LTA & Open-Meteo APIs, normalizes data
└── frontend/   React + Tailwind + Lucide — kiosk-optimized dashboard UI
```

## Quick Start

### 1. Backend setup

```bash
cd backend
cp .env.example .env
# Edit .env and fill in your LTA_API_KEY
npm run dev
# Runs on http://localhost:3001
```

### 2. Frontend setup

```bash
cd frontend
npm run dev
# Runs on http://localhost:5173
```

### 3. Get an LTA API key

Register at [LTA DataMall](https://datamall.lta.gov.sg/content/datamall/en/request-for-api.html) and paste your key into `backend/.env`.

Weather data comes from [Open-Meteo](https://open-meteo.com/) — **no API key required**.

## Architecture

```
Browser (React)  <──30s poll──>  BFF Node (Express)  ──>  LTA DataMall BusArrivalv2
                                                      ──>  Open-Meteo (weather)
```

The BFF caches bus data for 25 seconds (just under the 30s refresh cycle) to prevent hammering LTA's API on multiple browser tabs.

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `LTA_API_KEY` | ✅ | — | LTA DataMall API key |
| `PORT` | | `3001` | Backend HTTP port |
| `CACHE_TTL_MS` | | `25000` | Bus data cache TTL |
| `NODE_ENV` | | `development` | `development` / `production` / `test` |

## Action Engine Logic

| Status | Condition | Icon |
|---|---|---|
| **Stay** | `leaveAt` is > 5 mins away | ☕ |
| **Leave** | `leaveAt` is 0–5 mins away | 🏃 |
| **Gone** | Current time is past `leaveAt` | 💨 |

Where: `leaveAt = arrivalTime − walkTimeMin`

## Running Tests

```bash
# Backend
cd backend && npm test

# Frontend
cd frontend && npm test
```

## Kiosk Deployment

For a dedicated display (Raspberry Pi, tablet):
1. Build the frontend: `cd frontend && npm run build`
2. Serve `frontend/dist` with any static server (or `npm run preview`)
3. Set `NODE_ENV=production` in the backend `.env`
4. Run the backend with `npm start` (after `npm run build`)

## API Keys (exact location)

- Put your LTA key in `backend/.env`:

```env
LTA_API_KEY=your_real_lta_key_here
```

- File to copy from: `backend/.env.example`
- Weather uses Open-Meteo and does not require an API key.

## Host On Your PC (local first)

Run in two terminals:

```bash
# Terminal 1
cd backend
npm run dev
```

```bash
# Terminal 2
cd frontend
npm run dev -- --host
```

Then open:
- Local machine: `http://localhost:5173`
- Same network devices: `http://<your-pc-ip>:5173`
