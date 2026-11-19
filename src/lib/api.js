/* Тонкий защитный слой над WebExtension API.
   Любой вызов может завершиться ошибкой: дашборд должен деградировать, а не падать. */

export const api = globalThis.browser ?? globalThis.chrome;

export async function safe(fn, fallback = null, label = "api") {
  try {
    const value = await fn();
    return value ?? fallback;
  } catch (error) {
    console.warn(`[start-page] ${label} failed`, error);
    return fallback;
  }
}

export function isNavigable(url) {
  if (typeof url !== "string" || !url) return false;
  try {
    const parsed = new URL(url);
    return ["http:", "https:", "file:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

export function normalizeUrl(raw) {
  try {
    const url = new URL(raw);
    url.hash = "";
    let text = url.toString();
    if (text.endsWith("/")) text = text.slice(0, -1);
    return text;
  } catch {
    return raw;
  }
}

export function startOfToday(now = Date.now()) {
  const date = new Date(now);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export const DAY = 24 * 60 * 60_000;
