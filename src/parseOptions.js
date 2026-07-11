// src/parseOptions.js — parse quick-reply options out of a bot message.
// Options come from a structured [[OPTIONS]] JSON block, not from scanning prose.
// Everything from the marker onward is stripped from the displayed text; malformed
// JSON degrades to no options + clean text.

const MAX_OPTIONS = 8; // cap quick-reply buttons so a malformed reply can't flood the UI

export function parseOptions(content) {
  if (typeof content !== "string") return { text: "", options: [] };
  const MARKER = "[[OPTIONS]]";
  const idx = content.indexOf(MARKER);
  if (idx === -1) return { text: content.trim(), options: [] };
  const text = content.slice(0, idx).trim();
  const after = content.slice(idx + MARKER.length);

  // Scan each '[' after the marker; take the first that parses as a JSON array of non-empty
  // strings. String-aware (brackets inside option strings are fine) and skips stray prose
  // brackets before the array (e.g. a citation like [1] or a markdown link [text]).
  for (let start = after.indexOf("["); start !== -1; start = after.indexOf("[", start + 1)) {
    let depth = 0, inStr = false, esc = false;
    for (let i = start; i < after.length; i++) {
      const c = after[i];
      if (inStr) {
        if (esc) esc = false;
        else if (c === "\\") esc = true;
        else if (c === '"') inStr = false;
      } else if (c === '"') inStr = true;
      else if (c === "[") depth++;
      else if (c === "]" && --depth === 0) {
        try {
          const arr = JSON.parse(after.slice(start, i + 1));
          if (Array.isArray(arr)) {
            const options = arr
              .filter((o) => typeof o === "string" && o.trim())
              .map((o) => o.trim())
              .slice(0, MAX_OPTIONS);
            if (options.length) return { text, options };
          }
        } catch { /* not a JSON array — try the next '[' */ }
        break;
      }
    }
  }
  return { text, options: [] };
}
