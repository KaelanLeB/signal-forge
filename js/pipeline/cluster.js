import { callLLM } from '../api/llm-client.js';

const SYSTEM_PROMPT = `You are a product manager assistant. Your job is to cluster raw user feedback into 2–6 distinct, actionable themes.

Return ONLY valid JSON — no markdown fences, no explanation — in this exact shape:
{
  "themes": [
    {
      "theme_name": "Short descriptive name (3–6 words)",
      "theme_description": "1–2 sentences summarising what users are experiencing and why it matters",
      "item_ids": ["id1", "id2"]
    }
  ]
}

Rules:
- Every item_id must appear in exactly one theme.
- Merge near-duplicate items into the same theme.
- Prefer fewer, clearer themes over many narrow ones.`;

export async function clusterFeedback(feedbackItems) {
  const userPrompt = feedbackItems
    .map(item => `ID: ${item.id}\n"${item.text}"`)
    .join('\n\n');

  const result = await callLLM(SYSTEM_PROMPT, userPrompt, { task: 'cluster' });

  try {
    const parsed = JSON.parse(result.content);
    return parsed.themes;
  } catch {
    throw new Error('Could not parse the clustering response. Try again.');
  }
}
