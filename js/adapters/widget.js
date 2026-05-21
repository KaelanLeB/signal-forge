// Stage 3 input adapter — in-game feedback widget (HTTP POST from embedded HTML form).
//
// In Stage 3 this adapter runs server-side inside a Supabase Edge Function, not in the browser.
// It receives individual POST payloads and writes them to Supabase Postgres.
// The clustering/PRD pipeline then reads a batch from Postgres rather than receiving an array
// directly — so the function signature here is a placeholder and will change in Stage 3.
//
// Contract (Stage 3): parse(postBody: object) => FeedbackItem
//
// Expected POST body shape:
//   { session_id, feedback_text, game_version, level?, user_id? }
//
// Implementation notes for Stage 3:
//   - Sanitize feedback_text (strip HTML, enforce max length).
//   - Map session_id -> id, game_version + level -> metadata.
//   - Set source = 'widget'.
//   - API key must NOT come from the client in Stage 3 — it lives in Supabase secrets.

export function parse(_postBody) {
  throw new Error('Widget adapter not yet implemented (Stage 3).');
}
