import { callLLM } from '../api/llm-client.js';

const SYSTEM_PROMPT = `You are a product manager assistant. Given a feedback theme and its supporting items, write one PRD backlog entry.

Return ONLY valid JSON — no markdown fences, no explanation — in this exact shape:
{
  "problem_statement": "1–2 sentences: what users are experiencing and why it matters",
  "proposed_solution": "2–3 sentences: a concrete solution approach",
  "success_metrics": ["Metric 1", "Metric 2", "Metric 3"],
  "priority": "P0",
  "priority_reasoning": "One sentence explaining the priority choice",
  "affected_user_segment": "Who is most affected and in what context"
}

Priority guide:
  P0 — blocks core experience or causes significant drop-off. Fix immediately.
  P1 — important improvement with clear user impact. Next sprint.
  P2 — quality-of-life or polish. Backlog.`;

export async function draftPRD(theme, allFeedbackItems) {
  const relevant = allFeedbackItems.filter(item => theme.item_ids.includes(item.id));

  const userPrompt =
    `Theme: "${theme.theme_name}"\n` +
    `Description: ${theme.theme_description}\n\n` +
    `Supporting feedback (${relevant.length} item${relevant.length !== 1 ? 's' : ''}):\n` +
    relevant.map(item => `- "${item.text}"`).join('\n');

  const result = await callLLM(SYSTEM_PROMPT, userPrompt, { task: 'prd' });

  try {
    return JSON.parse(result.content);
  } catch {
    throw new Error(`Could not parse the PRD response for theme: ${theme.theme_name}`);
  }
}
