/* Настройки и кэш снимка. storage.local — источник истины;
   localStorage хранит только зеркало, нужное boot.js до первой отрисовки. */

import { api, safe } from "./api.js";

export const SETTINGS_KEY = "mono.settings.v1";
export const CACHE_PREFIX = "mono.cache.v2.";
const MIRROR_KEY = "mono.settings.mirror.v1";

export const DEFAULT_SETTINGS = Object.freeze({
  theme: "system",
  width: "comfort",
  clock24: true,
  seconds: false,
  locale: "auto",
  sections: Object.freeze({
    bookmarks: true,
    tabs: true,
    history: true,
    downloads: true,
  }),
});

const THEMES = new Set(["system", "light", "dark"]);
const WIDTHS = new Set(["comfort", "wide"]);
const LOCALES = new Set(["auto", "ru", "en"]);

export function normalizeSettings(raw) {
  const input = raw && typeof raw === "object" ? raw : {};
  const sections = { ...DEFAULT_SETTINGS.sections };
  if (input.sections && typeof input.sections === "object") {
    for (const key of Object.keys(sections)) {
      if (typeof input.sections[key] === "boolean") sections[key] = input.sections[key];
    }
  }
  return {
    theme: THEMES.has(input.theme) ? input.theme : DEFAULT_SETTINGS.theme,
    width: WIDTHS.has(input.width) ? input.width : DEFAULT_SETTINGS.width,
    clock24: typeof input.clock24 === "boolean" ? input.clock24 : DEFAULT_SETTINGS.clock24,
    seconds: typeof input.seconds === "boolean" ? input.seconds : DEFAULT_SETTINGS.seconds,
    locale: LOCALES.has(input.locale) ? input.locale : DEFAULT_SETTINGS.locale,
    sections,
  };
}

function readMirror() {
  try {
    const raw = localStorage.getItem(MIRROR_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function mirrorSettings(settings) {
  try {
    localStorage.setItem(MIRROR_KEY, JSON.stringify(settings));
  } catch {
    /* Приватные окна и лимиты квоты могут ответить отказом. */
  }
}

export async function loadSettings() {
  const stored = await safe(
    () => api.storage.local.get(SETTINGS_KEY).then((result) => result?.[SETTINGS_KEY]),
    null,
    "settings.load"
  );
  return normalizeSettings(stored ?? readMirror() ?? DEFAULT_SETTINGS);
}

export async function saveSettings(settings) {
  const normalized = normalizeSettings(settings);
  mirrorSettings(normalized);
  const ok = await safe(
    () => api.storage.local.set({ [SETTINGS_KEY]: normalized }).then(() => true),
    false,
    "settings.save"
  );
  if (!ok) mirrorSettings(normalized);
  return normalized;
}

export async function resetSettings() {
  const defaults = normalizeSettings(DEFAULT_SETTINGS);
  mirrorSettings(defaults);
  await safe(
    () => api.storage.local.set({ [SETTINGS_KEY]: defaults }),
    null,
    "settings.reset"
  );
  return defaults;
}

export async function readCache(name) {
  const entry = await safe(
    () => api.storage.local.get(CACHE_PREFIX + name).then((result) => result?.[CACHE_PREFIX + name]),
    null,
    "cache.read"
  );
  if (!entry || typeof entry !== "object" || !entry.data) return null;
  return entry;
}

export async function writeCache(name, data, at = Date.now()) {
  await safe(
    () => api.storage.local.set({ [CACHE_PREFIX + name]: { at, data } }),
    null,
    "cache.write"
  );
}

export async function clearCaches() {
  const all = await safe(() => api.storage.local.get(null), {}, "cache.list");
  const keys = Object.keys(all ?? {}).filter((key) => key.startsWith(CACHE_PREFIX));
  if (keys.length) {
    await safe(() => api.storage.local.remove(keys), null, "cache.clear");
  }
}
