/* Locale-aware formatting without external dependencies. */

const formatterCache = new Map();

function formatter(locale, options) {
  const key = `${locale}|${JSON.stringify(options)}`;
  let value = formatterCache.get(key);
  if (!value) {
    value = new Intl.DateTimeFormat(locale, options);
    formatterCache.set(key, value);
  }
  return value;
}

function numberFormatter(locale, options = {}) {
  const key = `${locale}|${JSON.stringify(options)}`;
  let value = formatterCache.get(key);
  if (!value) {
    value = new Intl.NumberFormat(locale, options);
    formatterCache.set(key, value);
  }
  return value;
}

export function number(value, locale) {
  return numberFormatter(locale).format(Number(value) || 0);
}

export function timeParts(timestamp, locale, hour12 = false) {
  const parts = formatter(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12,
  }).formatToParts(new Date(timestamp));
  const pick = (type) => parts.find((part) => part.type === type)?.value ?? "";
  return { hour: pick("hour"), minute: pick("minute"), period: pick("dayPeriod") };
}

export function timeHM(timestamp, locale, hour12 = false) {
  const { hour, minute, period } = timeParts(timestamp, locale, hour12);
  return `${hour}:${minute}${period ? ` ${period}` : ""}`;
}

export function dateLong(timestamp, locale, withYear = false) {
  let text = formatter(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    ...(withYear ? { year: "numeric" } : {}),
  }).format(new Date(timestamp));
  // Intl renders Russian years as "2026 г."; the dash line reads better without it.
  if (withYear && locale.startsWith("ru")) text = text.replace(/\s*г\.$/, "");
  return text;
}

export function dateShort(timestamp, locale) {
  return formatter(locale, {
    day: "numeric",
    month: "short",
  }).format(new Date(timestamp));
}

const RELATIVE = new Map();

export function relative(timestamp, locale, now = Date.now()) {
  const delta = Number(timestamp) - now;
  const abs = Math.abs(delta);
  if (!Number.isFinite(delta) || abs < 45_000) {
    return locale.startsWith("ru") ? "сейчас" : "now";
  }
  let unit = "minute";
  let divisor = 60_000;
  if (abs >= 7 * 86_400_000) return dateShort(timestamp, locale);
  if (abs >= 86_400_000) {
    unit = "day";
    divisor = 86_400_000;
  } else if (abs >= 3_600_000) {
    unit = "hour";
    divisor = 3_600_000;
  }
  const amount = Math.round(delta / divisor);
  const key = `${locale}|relative`;
  let rtf = RELATIVE.get(key);
  if (!rtf) {
    rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto", style: "short" });
    RELATIVE.set(key, rtf);
  }
  return rtf.format(amount, unit);
}

export function hostOf(raw) {
  try {
    const url = new URL(raw);
    if (url.hostname) return url.hostname.replace(/^www\./i, "");
    return url.protocol.replace(/:$/, "") || "link";
  } catch {
    return "";
  }
}


export function letterOf(...candidates) {
  for (const candidate of candidates) {
    if (!candidate) continue;
    const match = String(candidate).match(/[\p{L}\p{N}]/u);
    if (match) return match[0].toLocaleUpperCase();
  }
  return "·";
}

export function basename(path = "") {
  const parts = String(path).split(/[\\/]/);
  const last = parts[parts.length - 1] || parts[parts.length - 2] || "";
  try {
    return decodeURIComponent(last);
  } catch {
    return last;
  }
}

export function fileExt(filename = "") {
  const name = String(filename);
  const index = name.lastIndexOf(".");
  if (index <= 0) return "FILE";
  const ext = name.slice(index + 1).replace(/[^a-z0-9]/gi, "").toUpperCase();
  return ext.slice(0, 3) || "FILE";
}

export function bytes(value, locale) {
  const size = Number(value);
  if (!Number.isFinite(size) || size <= 0) return "";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let amount = size;
  let index = 0;
  while (amount >= 1024 && index < units.length - 1) {
    amount /= 1024;
    index += 1;
  }
  const digits = amount >= 10 || index === 0 ? 0 : 1;
  return `${numberFormatter(locale, { maximumFractionDigits: digits }).format(amount)} ${units[index]}`;
}

export function percent(received, total) {
  if (!total) return 0;
  return Math.max(0, Math.min(100, Math.round((received / total) * 100)));
}

export function isoWeek(date = new Date()) {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - day + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const firstDay = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDay + 3);
  return 1 + Math.round((target - firstThursday) / (7 * 86_400_000));
}

export function dayOfYear(date = new Date()) {
  const start = Date.UTC(date.getFullYear(), 0, 1);
  const current = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.floor((current - start) / 86_400_000) + 1;
}


export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
