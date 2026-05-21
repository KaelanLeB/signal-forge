# DECISIONS.md — Feedback-to-PRD MVP

This document is written for an engineer reviewing the architecture before Stage 2 or 3 work begins.
It explains every non-obvious choice: what was picked, what was considered, why this choice fits now, and where it needs to change later.

---

## 1. Frontend Stack: Vanilla HTML/CSS/JS, No Framework, No Build Step

**Chosen:** Plain HTML + CSS + vanilla ES modules. Deployed as a static site to GitHub Pages from the repo root.

**Alternatives considered:**
- React/Vite — better component model, but adds a build step, node_modules, and CI configuration
- Svelte — same tradeoff
- Lit (web components) — lighter, but still a build step

**Why this choice fits Stage 1:**
This is a personal-use validation prototype. The goal is to go from zero to a working clickable demo as fast as possible, shareable via a GitHub Pages URL with no deployment infrastructure. A build step adds friction for every iteration and for the engineer reviewing it.

**Why it's compatible with Stages 2/3:**
The adapter + pipeline architecture (see §3) means the business logic is module-scoped and portable. Stage 3 does not require rewriting the frontend in a framework — it only requires swapping the LLM client and storage modules. If the product proves out and a proper engineering team picks it up, migrating to a framework is a natural phase at that point, not a blocker now.

**Architectural commitment vs. scaffolding:**
The no-framework choice is scaffolding for Stage 1. The file/folder structure and module interfaces are architectural commitments.

---

## 2. File and Folder Structure + Adapter Pattern Rationale

**Chosen:**
```
js/
  app.js              — orchestrator
  api/llm-client.js   — LLM calls, proxy-swappable
  adapters/           — one file per input source
    paste.js          — Stage 1
    discord.js        — Stage 2 (placeholder)
    widget.js         — Stage 3 (placeholder)
  storage/storage.js  — storage adapter
  pipeline/
    normalize.js      — common FeedbackItem shape
    cluster.js        — clustering
    prd.js            — PRD drafting
```

**Why the adapter pattern for inputs:**
The same downstream pipeline (normalize → cluster → draft PRDs → export) must work for three different input sources: pasted text (Stage 1), a Discord JSON export file (Stage 2), and HTTP posts from an in-game widget (Stage 3). Each adapter's job is to convert its source format into a common `FeedbackItem` array. The pipeline never knows or cares where the data came from.

```js
// The common shape every adapter must produce:
{
  id: string,           // unique per run; adapters generate this (e.g. uuid or index)
  text: string,         // the feedback content
  source: string,       // 'paste' | 'discord' | 'widget'
  author?: string,      // Discord username, widget user ID, etc. — optional
  timestamp?: string,   // ISO 8601 if available
  metadata?: object     // anything source-specific that might be useful later
}
```

**Why placeholder files for discord.js and widget.js:**
They make the intended extension points explicit and findable. An engineer onboarding for Stage 2 should be able to open `adapters/discord.js`, read the comment header, and know exactly what contract they need to implement — without reading the rest of the codebase.

**Architectural commitment:** The adapter interface (the `FeedbackItem` shape and the `parse(rawInput): FeedbackItem[]` function signature) is a commitment. Changing it in Stage 2 would require updating Stage 1's adapter too.

---

## 3. API Key Handling: localStorage in Stage 1, Supabase Edge Function Proxy in Stage 3

**Stage 1 approach:** User pastes their own Anthropic API key into the UI. It is stored in `localStorage` under a namespaced key (`feedbackPrd.apiKey`). The UI shows a persistent "prototype only — do not share this key" warning and a "Clear Key" button.

**Security tradeoff acknowledged:**
`localStorage` is readable by any JavaScript running on the page. For a personal-use prototype accessed only by the developer, this risk is acceptable. The key is never transmitted to any server other than `api.anthropic.com` (the Anthropic API directly). The user is the key's owner.

**This approach is NOT acceptable for:**
- Any shared or multi-user deployment
- Any public URL given to playtester users
- Stage 3 (where in-game widget users would be posting, not the developer)

**Stage 3 migration:**
The LLM client module (`js/api/llm-client.js`) is the only place where the API key is read and the fetch call is made. In Stage 3, this module is replaced with one that:
1. Reads no key from localStorage
2. Calls a Supabase Edge Function URL instead of `api.anthropic.com` directly
3. The Edge Function holds the API key server-side and proxies the request

This is a one-file swap. No other module in the app knows where the key comes from or where the HTTP call goes.

---

## 4. LLM Client Module: Proxy-Swappable Interface

**File:** `js/api/llm-client.js`

**Interface:**
```js
// The rest of the app only ever calls this:
export async function callLLM(systemPrompt, userPrompt, options = {}) {
  // Returns: { content: string }
}
```

The module internally handles:
- Reading the API key (Stage 1: from localStorage; Stage 3: not needed, proxied)
- Setting the `anthropic-dangerous-direct-browser-access: true` header (Stage 1 only)
- Constructing the full Anthropic Messages API request
- Error handling and surfacing useful messages

**Why this interface:**
`cluster.js` and `prd.js` call `callLLM()` with a system prompt and a user prompt. They don't know the model, the key source, or whether the call goes to Anthropic directly or through a proxy. Swapping to a proxy in Stage 3 means rewriting `llm-client.js` only — the pipeline modules are untouched.

**Model choice:** `claude-sonnet-4-6`

Rationale: Sonnet-class models provide the reasoning quality needed for coherent theme clustering and PRD drafting, at a cost-per-token that is practical for interactive prototype use (where the user pays via their own key). Opus would be higher quality but slower and more expensive per run; Haiku would be cheaper but less reliable for multi-step structured output tasks.

---

## 5. Storage: localStorage Adapter, Supabase Postgres Migration Path

**File:** `js/storage/storage.js`

**Interface:**
```js
export function saveItem(key, value) { ... }
export function getItem(key) { ... }
export function removeItem(key) { ... }
export function clearAll() { ... }
```

Stage 1 implements these with `window.localStorage`. All keys are namespaced (`feedbackPrd.*`) to avoid collisions.

**What gets stored in Stage 1:**
- The API key (`feedbackPrd.apiKey`)
- Optionally: the most recent cluster/PRD output, so the user doesn't lose work on refresh

**Stage 3 migration:**
Replace the implementation inside `storage.js` with calls to the Supabase JS client. The interface is unchanged, so no other module is affected. User-specific data will require Supabase Auth, which is a Stage 3 concern — the storage adapter can be extended with an `init(userId)` pattern at that point.

---

## 6. Prompt Design for Clustering and PRD Drafting

**Two-step pipeline:**

**Step 1 — Cluster:** Send all normalized feedback items to Claude in a single prompt. Ask it to group them into themes and return structured JSON: an array of `{ theme_name, theme_description, item_ids[] }`.

**Step 2 — PRD per theme:** For each theme, send the theme description + the original feedback items in that cluster to Claude. Ask it to return structured JSON for a single PRD: `{ problem_statement, proposed_solution, success_metrics[], priority, priority_reasoning, affected_user_segment }`.

**Why two steps instead of one:**
A single prompt asking Claude to both cluster and draft all PRDs tends to produce lower-quality PRDs when there are many themes (attention dilution) and makes it harder to show incremental progress in the UI. Two steps also makes it easy to add a "re-draft this PRD" button in a future iteration without re-running clustering.

**Why JSON output:**
The UI needs to render structured fields (priority badge, success metrics list, etc.). JSON is more reliable than asking Claude to produce markdown with a specific structure. Both calls use explicit JSON schemas in the system prompt and ask Claude to return only valid JSON.

---

## 7. Decisions That Are Temporary Scaffolding vs. Architectural Commitments

| Decision | Type | Notes |
|----------|------|-------|
| Vanilla JS / no framework | Scaffolding | Replace with framework when product proves out |
| localStorage for API key | Scaffolding | Replace with Supabase Edge Function proxy in Stage 3 |
| Browser-direct Anthropic API call | Scaffolding | Replace with proxy in Stage 3 |
| localStorage for data | Scaffolding | Replace with Supabase Postgres in Stage 3 |
| Adapter interface (`FeedbackItem` shape) | Commitment | Changing this requires updating all adapters |
| `callLLM(systemPrompt, userPrompt)` signature | Commitment | Changing this requires updating all pipeline modules |
| Two-step cluster → PRD pipeline | Commitment | Structural choice; Stage 2/3 inherit this |
| `storage.js` interface | Commitment | Changing this requires updating all callers |
| `claude-sonnet-4-6` model | Scaffolding | Easy to change in `llm-client.js`; no downstream impact |
