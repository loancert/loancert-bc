// src/parseOptions.js — parse quick-reply options out of a bot message.
// Options come from a structured [[OPTIONS]] JSON block, not from scanning prose.
// Everything from the marker onward is stripped from the displayed text; malformed
// JSON degrades to no options + clean text.

const MAX_OPTIONS = 8; // cap quick-reply buttons so a malformed reply can't flood the UI

export function parseOptions(content) {
  const MARKER = "[[OPTIONS]]";
  const idx = content.indexOf(MARKER);
  if (idx === -1) return { text: content.trim(), options: [] };
  const text = content.slice(0, idx).trim();
  const after = content.slice(idx + MARKER.length);

  const tryParse = (s) => {
    if (!s) return null;
    try {
      const parsed = JSON.parse(s[0]);
      return Array.isArray(parsed) ? parsed.filter((o) => typeof o === "string").slice(0, MAX_OPTIONS) : null;
    } catch {
      return null;
    }
  };

  // Greedy first (handles brackets inside option strings); fall back to lazy
  // (handles stray text/brackets appended after the array) so trailing junk
  // doesn't void otherwise-valid options.
  const options = tryParse(after.match(/\[[\s\S]*\]/)) || tryParse(after.match(/\[[\s\S]*?\]/)) || [];
  return { text, options };
}
