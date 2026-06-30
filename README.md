# Out of Office — Team Holiday Tracker

A small team holiday/leave tracker. One Node/Express server serves both the API and the built React app, so it deploys as a single service with one URL.

## Project structure

```
holiday-app/
  server/
    index.js          Express API + serves the built client
    data/holidays.json  Where entries are stored (plain JSON file)
  client/              React app (Vite)
    src/
  package.json         Root scripts (build / start)
```

## Running it locally

You'll need Node.js 18+ installed.

```bash
npm run install:all   # installs both server and client dependencies
npm run dev:server    # terminal 1 — API on http://localhost:4000
npm run dev:client    # terminal 2 — React dev server on http://localhost:5173
```

Open `http://localhost:5173` while developing — it proxies `/api` calls to the server automatically.

## Deploying it

This app is built to deploy as **one service**: the build step compiles the React app into static files, and the Express server serves them directly, so you only need one host and you get one URL for the whole team.

### Option A: Render (recommended, free tier available)

1. Push this project to a GitHub repository.
2. Go to **render.com** → New → Web Service → connect your repo.
3. Set:
   - **Build command:** `npm install && npm run build`
   - **Start command:** `npm start`
4. Click deploy. Render will give you a URL like `https://your-app.onrender.com` — share that with your team.

Note: Render's free tier uses temporary disk storage, so the `holidays.json` data file may reset if the service restarts after inactivity. For anything beyond casual/demo use, see "Persisting your data" below.

### Option B: Railway

1. Push to GitHub, then go to **railway.app** → New Project → Deploy from GitHub repo.
2. Railway auto-detects Node. Set the **build command** to `npm run build` and **start command** to `npm start` if it doesn't infer them.
3. Railway gives you a persistent disk by default, so your data file will survive restarts. Add a **Volume** mounted at `/server/data` for guaranteed persistence.

### Option C: Fly.io / a VPS

Build and run the same way:
```bash
npm install && npm run build
npm start
```
Then point a reverse proxy (or Fly's built-in routing) at the port the server listens on (`process.env.PORT`, defaulting to 4000).

## Persisting your data

By default, entries are saved to `server/data/holidays.json` on disk. This is fine for a small team on a host with persistent storage (Railway, a VPS, Fly.io with a volume). On hosts with ephemeral disks (like Render's free tier), this file can reset on redeploys or after the service sleeps.

If you outgrow the JSON file (e.g. want guaranteed durability, multiple environments, or more users), the natural next step is swapping the file read/writes in `server/index.js` for a small database like SQLite or Postgres — happy to help with that migration when you're ready.

## API reference

| Method | Endpoint              | Description                       |
|--------|-------------------------|------------------------------------|
| GET    | `/api/state`            | Get allowance + all entries        |
| GET    | `/api/entries`          | Get all entries                    |
| POST   | `/api/entries`          | Add a new entry                    |
| DELETE | `/api/entries/:id`      | Remove an entry                    |
| PUT    | `/api/allowance`        | Update the shared annual allowance |
| GET    | `/api/summary`          | Per-person day totals by type      |

## Notes

- No login/authentication — anyone with the link can view and add entries. Fine for an internal team tool; add auth if you need to restrict access.
- Allowance is shared across the whole team (one number), not per-person. Say the word if you'd like per-person allowances instead.
