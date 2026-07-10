// src/parseOptions.js — parse quick-reply options out of a bot message.
// Options come from a structured [[OPTIONS]] JSON block, not from scanning prose.
// Everything from the marker onward is stripped from the displayed text; malformed
// JSON degrades to no options + clean text.

export function parseOptions(content) {
  const MARKER = "[[OPTIONS]]";
  const idx = content.indexOf(MARKER);
  if (idx === -1) return { text: content.trim(), options: [] };
  const text = content.slice(0, idx).trim();
  let options = [];
  const match = content.slice(idx + MARKER.length).match(/\[[\s\S]*\]/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed)) options = parsed.filter((o) => typeof o === "string");
    } catch {}
  }
  return { text, options };
}
