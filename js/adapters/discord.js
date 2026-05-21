// Stage 2 input adapter — Discord channel JSON export (DiscordChatExporter format).
// Contract: parse(jsonString: string) => FeedbackItem[]
//
// Expected input shape (DiscordChatExporter v2):
//   { messages: [{ id, content, author: { name }, timestamp }] }
//
// Implementation notes for Stage 2:
//   - Filter out bot messages and messages shorter than a minimum length threshold.
//   - Map author.name -> author, timestamp -> timestamp (ISO 8601).
//   - Strip Discord-flavoured markdown (@mentions, #channels, emoji codes) from content.
//   - Set source = 'discord'.

export function parse(_jsonString) {
  throw new Error('Discord adapter not yet implemented (Stage 2).');
}
