import express from "express";
import cors from "cors";
import { readFile, writeFile } from "fs/promises";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "data");
const DATA_PATH = path.join(DATA_DIR, "holidays.json");
const CLIENT_DIST = path.join(__dirname, "..", "client", "dist");

const DEFAULT_STATE = { allowance: 25, entries: [] };

async function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_PATH)) {
    await writeFile(DATA_PATH, JSON.stringify(DEFAULT_STATE, null, 2), "utf-8");
  }
}

async function loadState() {
  await ensureDataFile();
  const raw = await readFile(DATA_PATH, "utf-8");
  try {
    const parsed = JSON.parse(raw);
    return { allowance: parsed.allowance ?? 25, entries: parsed.entries ?? [] };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

async function saveState(state) {
  await writeFile(DATA_PATH, JSON.stringify(state, null, 2), "utf-8");
}

function daysBetween(start, end) {
  const a = new Date(start + "T00:00:00");
  const b = new Date(end + "T00:00:00");
  return Math.round((b - a) / 86400000) + 1;
}

const app = express();
app.use(cors());
app.use(express.json());

// ---- API routes ----

app.get("/api/state", async (req, res) => {
  const state = await loadState();
  res.json(state);
});

app.get("/api/entries", async (req, res) => {
  const state = await loadState();
  res.json(state.entries);
});

app.post("/api/entries", async (req, res) => {
  const { name, start, end, type, note } = req.body;
  if (!name || !start || !end) {
    return res.status(400).json({ error: "Name, start date, and end date are required." });
  }
  if (end < start) {
    return res.status(400).json({ error: "End date can't be before the start date." });
  }
  const state = await loadState();
  const entry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    name: name.trim(),
    start,
    end,
    type: ["annual", "sick", "other"].includes(type) ? type : "annual",
    note: (note || "").trim(),
  };
  state.entries.push(entry);
  await saveState(state);
  res.status(201).json(entry);
});

app.delete("/api/entries/:id", async (req, res) => {
  const state = await loadState();
  const next = state.entries.filter((e) => e.id !== req.params.id);
  if (next.length === state.entries.length) {
    return res.status(404).json({ error: "Entry not found." });
  }
  state.entries = next;
  await saveState(state);
  res.status(204).end();
});

app.put("/api/allowance", async (req, res) => {
  const { allowance } = req.body;
  if (typeof allowance !== "number" || allowance < 0) {
    return res.status(400).json({ error: "Allowance must be a non-negative number." });
  }
  const state = await loadState();
  state.allowance = allowance;
  await saveState(state);
  res.json({ allowance });
});

app.get("/api/summary", async (req, res) => {
  const state = await loadState();
  const summary = {};
  state.entries.forEach((e) => {
    if (!summary[e.name]) summary[e.name] = { annual: 0, sick: 0, other: 0 };
    summary[e.name][e.type] += daysBetween(e.start, e.end);
  });
  res.json({ allowance: state.allowance, summary });
});

app.get("/api/health", (req, res) => res.json({ ok: true }));

// ---- Serve the built React app in production ----
if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.get("*", (req, res) => {
    res.sendFile(path.join(CLIENT_DIST, "index.html"));
  });
}

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Holiday tracker running on http://localhost:${PORT}`);
});
