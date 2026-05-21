# Feedback-to-PRD MVP

A personal-use prototype that takes raw user/playtester feedback and uses AI to:
1. Cluster it into themes
2. Draft a PRD backlog item for each theme (problem statement, proposed solution, success metrics, priority, affected user segment)
3. Export the full set as a downloadable `.md` file

**Target use case:** Indie game devs running early access on Steam who collect feedback from Discord, in-game forms, and playtest sessions but lack PM capacity to synthesize it.

---

## How to Run Locally

No build step required. Open `index.html` directly in your browser:

```
# Option 1 — just double-click index.html in your file explorer

# Option 2 — serve with any static server (avoids CORS quirks)
npx serve .
# or
python -m http.server 8080
```

---

## How to Deploy (GitHub Pages)

1. Push this repo to GitHub.
2. Go to **Settings → Pages**.
3. Set source to: **Deploy from branch → main → / (root)**.
4. GitHub Pages will serve `index.html` at `https://<your-username>.github.io/<repo-name>/`.

No build step, no CI configuration needed.

---

## How to Provide Your Claude API Key

This prototype calls the Claude API directly from your browser.

1. Get an API key at [console.anthropic.com](https://console.anthropic.com).
2. Paste it into the **API Key** field when you open the app.
3. Click **Save Key** — it is stored in your browser's `localStorage` only.
4. A **Clear Key** button is always visible so you can remove it at any time.

**Prototype-only warning:** Storing an API key in `localStorage` means it is accessible to any JavaScript running on that page. This is acceptable for a personal-use local prototype. Do not share the deployed URL or the key with anyone. See `DECISIONS.md` for the planned Stage 3 migration to a secure backend proxy.

---

## Where Everything Lives

```
/
├── index.html              # Single-page app shell
├── README.md               # This file
├── DECISIONS.md            # Decision log for engineering review
├── css/
│   └── style.css           # All styles
└── js/
    ├── app.js              # Main orchestrator — wires all modules together
    ├── api/
    │   └── llm-client.js   # Single LLM client module; proxy-swappable for Stage 3
    ├── adapters/
    │   ├── paste.js        # Stage 1: normalizes pasted text into FeedbackItem[]
    │   ├── discord.js      # Stage 2 placeholder: will parse Discord JSON exports
    │   └── widget.js       # Stage 3 placeholder: will receive in-game widget posts
    ├── storage/
    │   └── storage.js      # Storage adapter; localStorage now, Supabase Postgres in Stage 3
    └── pipeline/
        ├── normalize.js    # Common FeedbackItem shape definition + validation
        ├── cluster.js      # Clustering LLM call — groups items into themes
        └── prd.js          # PRD drafting LLM call — one PRD per theme
```

---

## Stages Overview

| Stage | Input | Backend | Storage | Status |
|-------|-------|---------|---------|--------|
| 1 | Paste textarea | None — browser calls Claude directly | localStorage | **This build** |
| 2 | Discord JSON export | None — browser calls Claude directly | localStorage | Planned |
| 3 | In-game widget form | Supabase Edge Function proxy | Supabase Postgres | Planned |
