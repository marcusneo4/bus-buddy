# Deploy Bus Buddy to Vercel (Phase 1)

This gets the app online, avoids LTA DataMall CORS, and keeps your API key server-side only.

## 1. Push to GitHub

- Commit and push the full project to a repo on your GitHub account.
- Use a **single** repo that contains the Bus Buddy code (this folder as repo root, or the repo root containing `backend/`, `frontend/`, `api/`, `vercel.json`).

## 2. Sign up for Vercel

- Go to [vercel.com](https://vercel.com) and sign up / log in with **GitHub**.

## 3. Import project

- In Vercel: **Add New → Project**.
- Choose your **Bus Buddy** repository from the list.
- Leave **Root Directory** as the repo root (where `vercel.json` lives).

## 4. Environment variables (required)

Before deploying, open **Environment Variables** and add:

| Name          | Value                    | Notes                          |
|---------------|--------------------------|--------------------------------|
| `LTA_API_KEY` | Your LTA DataMall key    | **Required.** Never commit it. |

Optional (defaults are fine for most cases):

- `LTA_BASE_URL` — default: `https://datamall2.mytransport.sg/ltaodataservice`
- `PORT` — not used on Vercel (serverless)
- `NODE_ENV` — set to `production` by Vercel
- `CACHE_TTL_MS`, `OPEN_METEO_BASE_URL`, `SINGAPORE_LAT`, `SINGAPORE_LON` — see `backend/.env.example`

**Important:** The backend expects the key as **`LTA_API_KEY`** (it is sent to LTA as the `AccountKey` header). Add it in Vercel for **Production** (and Preview if you want).

## 5. Deploy

- Click **Deploy**.
- Vercel will run `install:all`, then build backend and frontend.
- When it finishes, copy the live URL (e.g. `https://your-bus-buddy.vercel.app`). Use it for the frontend and for any later steps that need the app URL.

## After deploy

- The site is served from the **frontend** build; `/api/*` and `/health` are handled by the **backend** via serverless functions, so the LTA key stays on the server.
- If build fails, check the Vercel build logs (e.g. missing `LTA_API_KEY` or backend/frontend build errors).
