/* A small fuzzy matcher with highlight ranges.
   Biased toward prefix and word-boundary hits, which is what feels "smart"
   in a command palette. Returns null when the query is not a subsequence. */

const BOUNDARY = /[\s\-_/.:?&=#|()[\]{}'"«»,]/;

function normalize(text) {
  return String(text).toLowerCase().replace(/ё/g, "е");
}

function mergeRanges(ranges) {
  const sorted = ranges.filter(([a, b]) => b > a).sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const range of sorted) {
    const last = merged[merged.length - 1];
    if (last && range[0] <= last[1]) {
      last[1] = Math.max(last[1], range[1]);
    } else {
      merged.push([...range]);
    }
  }
  return merged;
}

export function score(query, text) {
  const q = normalize(query).trim();
  const haystack = normalize(text);
  if (!q) return { score: 0, ranges: [] };
  if (!haystack) return null;

  let best = null;

  const direct = haystack.indexOf(q);
  if (direct !== -1) {
    const atStart = direct === 0;
    const atBoundary = direct > 0 && BOUNDARY.test(haystack[direct - 1]);
    const density = Math.min(24, (haystack.length - q.length) * 0.18);
    best = {
      score: 130 + (atStart ? 45 : 0) + (atBoundary ? 26 : 0) - density,
      ranges: [[direct, direct + q.length]],
    };
  }

  let cursor = 0;
  let consecutive = 0;
  let bonus = 0;
  let first = -1;
  const ranges = [];
  let matched = true;

  for (const char of q) {
    if (char === " ") {
      consecutive = 0;
      continue;
    }
    const index = haystack.indexOf(char, cursor);
    if (index === -1) {
      matched = false;
      break;
    }
    if (first === -1) first = index;
    if (index === cursor && cursor > 0) {
      consecutive += 1;
      bonus += 9;
    } else {
      consecutive = 0;
      if (index === 0 || BOUNDARY.test(haystack[index - 1])) bonus += 7;
    }
    ranges.push([index, index + 1]);
    cursor = index + 1;
  }

  if (matched) {
    const density = Math.min(30, (haystack.length - q.length) * 0.12);
    const subsequence = 70 + bonus + (first === 0 ? 22 : 0) - first * 0.25 - density;
    if (!best || subsequence > best.score) {
      best = { score: subsequence, ranges: mergeRanges(ranges) };
    }
  }

  return best;
}
