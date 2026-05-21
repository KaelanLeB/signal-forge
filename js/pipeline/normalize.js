// Canonical FeedbackItem shape used throughout the pipeline.
// Every input adapter must produce an array conforming to this shape.
//
// { id: string, text: string, source: string,
//   author?: string, timestamp?: string, metadata?: object }

export function createFeedbackItem({ id, text, source, author, timestamp, metadata }) {
  if (!id || !text || !source) throw new Error('FeedbackItem requires id, text, and source.');
  return {
    id,
    text: text.trim(),
    source,
    author:    author    ?? null,
    timestamp: timestamp ?? null,
    metadata:  metadata  ?? {},
  };
}

export function validateFeedbackItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('No feedback items found. Paste at least one item and try again.');
  }
  return items.filter(item => item.text.length > 0);
}
