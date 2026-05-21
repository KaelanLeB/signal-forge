// LLM client module — the only place in the app that knows the API key source and endpoint.
//
// Stage 1: calls api.anthropic.com directly from the browser using the user's stored key.
// Stage 3: replace this file with one that POSTs to a Supabase Edge Function URL instead.
//          The Edge Function holds the key server-side. No other module changes.
//
// The rest of the app calls only: callLLM(systemPrompt, userPrompt, options)
// options.task is used in STUB_MODE to route mock responses; ignored in real API calls.

import { getItem } from '../storage/storage.js';

const MODEL   = 'claude-sonnet-4-6';
const API_URL = 'https://api.anthropic.com/v1/messages';

// Set to false to make real API calls (requires a saved API key).
const STUB_MODE = true;

export async function callLLM(systemPrompt, userPrompt, options = {}) {
  if (STUB_MODE) return _stubResponse(options.task, userPrompt);

  const apiKey = getItem('apiKey');
  if (!apiKey) throw new Error('No API key saved. Enter your Claude API key and click Save Key.');

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: options.maxTokens ?? 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message ?? `API error ${res.status}`);
  }

  const data = await res.json();
  return { content: data.content[0].text };
}

// ── Stub responses for UI development ─────────────────────────────────────────

async function _stubResponse(task, userPrompt) {
  await new Promise(r => setTimeout(r, 700));

  if (task === 'cluster') {
    return {
      content: JSON.stringify({
        themes: [
          {
            theme_name: 'Controls & Movement Feel',
            theme_description: 'Multiple players report that movement — especially jumping and dashing — feels sluggish and imprecise, hurting moment-to-moment enjoyment.',
            item_ids: ['paste-1', 'paste-4'],
          },
          {
            theme_name: 'Tutorial & Onboarding',
            theme_description: 'Players are confused during early levels and don\'t know what to do after the opening sequence, leading to early drop-off.',
            item_ids: ['paste-2', 'paste-6'],
          },
          {
            theme_name: 'Audio Repetition',
            theme_description: 'Sound design is well-received but becomes repetitive over longer sessions, risking reduced playtime.',
            item_ids: ['paste-3'],
          },
        ],
      }),
    };
  }

  if (task === 'prd') {
    const themeName = (userPrompt.match(/^Theme: "([^"]+)"/) ?? [])[1] ?? '';
    return { content: JSON.stringify(_stubPRD(themeName)) };
  }

  return { content: '{}' };
}

function _stubPRD(themeName) {
  const map = {
    'Controls & Movement Feel': {
      problem_statement: 'Players report that jumping and dashing feel sluggish and imprecise. This undermines the core game loop and is a primary driver of frustration in early levels.',
      proposed_solution: 'Audit and retune jump arc curves, coyote time, and input buffering. Add a post-processing polish pass for the dash. Run a dedicated movement playtest with 5 participants after fixes are in.',
      success_metrics: [
        'Movement NPS in post-session survey improves by ≥ 20 points vs. baseline',
        'Death events attributed to missed jumps drop ≥ 30% in telemetry',
        'Zero new movement-related negatives in the following Steam review batch',
      ],
      priority: 'P0',
      priority_reasoning: 'Movement is the core loop — if it feels bad, everything else suffers regardless of quality.',
      affected_user_segment: 'All players; most acute for players attempting precision sections in levels 3–6.',
    },
    'Tutorial & Onboarding': {
      problem_statement: 'A significant share of new players drop off after the opening sequence because the tutorial fails to teach core mechanics. Players discover fundamental controls by accident or not at all.',
      proposed_solution: 'Replace text-heavy instruction screens with contextual prompts tied to first-encounter moments (first gap, first enemy, first required dash). Add a missed-mechanic detector that re-surfaces a hint if a player fails the same obstacle 3+ times.',
      success_metrics: [
        'Level 3 completion rate for new players increases ≥ 25%',
        'Average time-to-first-dash decreases ≥ 40%',
        '"Confusing tutorial" mentions reach zero in the next playtest round',
      ],
      priority: 'P0',
      priority_reasoning: 'Drop-off in the first 10 minutes directly limits retention and word-of-mouth for early access.',
      affected_user_segment: 'New players and first-time early access buyers; especially players unfamiliar with the genre.',
    },
    'Audio Repetition': {
      problem_statement: 'Players enjoy the music and sound effects but report both become repetitive during longer sessions (20+ min), risking session-length reduction and lower perceived polish.',
      proposed_solution: 'Add 2–3 dynamic track variants per biome with state-based crossfading (exploration vs. combat vs. boss). Implement a sound-effect variation pool for high-frequency actions (footsteps, jumps) to reduce pattern recognition.',
      success_metrics: [
        'Average session length increases ≥ 10% after the audio update ships',
        '"Repetitive audio" mentions in feedback drop ≥ 75%',
        'Music/audio rating in post-session survey improves vs. current baseline',
      ],
      priority: 'P2',
      priority_reasoning: 'Polish improvement — important for full release but not blocking early access progression.',
      affected_user_segment: 'Players with sessions over 20 minutes; players sensitive to audio production quality.',
    },
  };

  return map[themeName] ?? {
    problem_statement: 'Stub: theme not matched.',
    proposed_solution: 'N/A',
    success_metrics: ['N/A'],
    priority: 'P2',
    priority_reasoning: 'Stub data — theme name did not match stub map.',
    affected_user_segment: 'Unknown.',
  };
}
