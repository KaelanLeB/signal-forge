// Stage 1 input adapter — pasted plain text.
// Contract: parse(rawText: string) => FeedbackItem[]
//
// Splitting strategy:
//   - If the text contains any double newline, split on double newlines (paragraph mode).
//   - Otherwise split on single newlines (one item per line).
// Empty chunks are discarded.

import { createFeedbackItem } from '../pipeline/normalize.js';

export function parse(rawText) {
  const separator = rawText.includes('\n\n') ? /\n\n+/ : /\n/;
  return rawText
    .split(separator)
    .map(chunk => chunk.trim())
    .filter(chunk => chunk.length > 0)
    .map((text, i) => createFeedbackItem({ id: `paste-${i + 1}`, text, source: 'paste' }));
}
