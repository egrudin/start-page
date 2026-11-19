import { api, isNavigable } from "./lib/api.js";
import { $, $$, prefersReducedMotion } from "./lib/dom.js";
import { timeHM } from "./lib/format.js";
import {
  activateTab as activateTabApi,
  cacheSnapshot,
  closeTab as closeTabApi,
  closeTabs,
  collectData,
  deleteHistoryUrl,
  loadBookmarks,
  loadTabs,
  openDownload,
  openInNewTab,
  readSessionStart,
  showDownload,
  toggleBookmark as toggleBookmarkApi,
} from "./lib/data.js";
import {
  SETTINGS_KEY,
  clearCaches,
  loadSettings,
  normalizeSettings,
  readCache,
  resetSettings as resetSettingsStore,
  saveSettings,
  writeCache,
} from "./lib/store.js";
import { applyTranslations, createI18n, resolveLocale } from "./i18n.js";
import { createClock } from "./ui/clock.js";
import { createToaster } from "./ui/toast.js";
import { initSearch } from "./ui/search.js";
import { initSettings } from "./ui/settings.js";
import { initShortcuts } from "./ui/shortcuts.js";
import { renderStats } from "./ui/stats.js";
import {
  renderBookmarkSkeleton,
  renderBookmarks,
  renderDownloads,
  renderHistory,
  renderSkeleton,
  renderTabs,
} from "./ui/lists.js";

const state = {
  settings: null,
  locale: "ru",
  i18n: null,
  data: null,
  bookmarked: new Set(),
  refreshing: false,
  version: "1.0.0",
  ui: {
    historyRange: "today",
    historyExpanded: false,
    bookmarkFolder: "all",
    bookmarksExpanded: false,
  },
};

const toaster = createToaster($("#toasts"));

let clock = null;
let search = null;
let settingsPanel = null;
let shortcutsPanel = null;
let settingsQueue = Promise.resolve();

const els = {
  history: {
    list: $("#history-list"),
    empty: $("#history-empty"),
    foot: $("#history-foot"),
    more: $("#history-more"),
  },
  bookmarks: {
    chips: $("#bookmarks-chips"),
    list: $("#bookmarks-list"),
    empty: $("#bookmarks-empty"),
    foot: $("#bookmarks-foot"),
    more: $("#bookmarks-more"),
    count: $("#bookmarks-count"),
  },
  tabs: {
    list: $("#tabs-list"),
    empty: $("#tabs-empty"),
    count: $("#tabs-count"),
    dupes: $("#tabs-dupes"),
    confirm: $("#tabs-confirm"),
    confirmText: $("#tabs-confirm-text"),
    confirmYes: $("#tabs-confirm-yes"),
    confirmNo: $("#tabs-confirm-no"),
  },
  downloads: {
    list: $("#downloads-list"),
    empty: $("#downloads-empty"),
  },
};

const ctx = {
  get settings() {
    return state.settings;
  },
  get locale() {
    return state.locale;
  },
  get version() {
    return state.version;
  },
  get bookmarked() {
    return state.bookmarked;
  },
  t: (key, params) => state.i18n(key, params),
  getSnapshot: () => state.data,
  toast: (message) => toaster.show(message),
  openUrl,
  activateTab,
  openSettings: () => openSettings(),
  openShortcuts: () => openShortcuts(),
  cycleTheme,
  refresh,
  updateSettings,
  resetSettings,
  clearCache,
  requestCloseDuplicates,
  actions: {
    toggleBookmark: toggleBookmarkAction,
    deleteHistory,
    openNewTab,
    activateTab,
    closeTab,
    setBookmarkFolder,
    copyUrl,
    openDownload: openDownloadAction,
    showDownload: showDownloadAction,
  },
};

function setLocale() {
  state.locale = resolveLocale(
    state.settings.locale,
    api?.i18n?.getUILanguage?.() ?? navigator.language
  );
  state.i18n = createI18n(state.locale);
}

function applyChrome() {
  const root = document.documentElement;
  root.dataset.theme = state.settings.theme;
  root.dataset.width = state.settings.width;
  root.lang = state.locale;
  document.title = state.i18n("brand.name");
  applyTranslations(document, state.i18n);

  for (const section of $$("[data-section]")) {
    const enabled = state.settings.sections[section.dataset.section] !== false;
    section.hidden = !enabled;
  }

  for (const button of $$("[data-history-range]")) {
    const active = button.dataset.historyRange === state.ui.historyRange;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  }
}

function applySettings() {
  applyChrome();
  clock?.render();
  search?.close();
  if (state.data) {
    renderAll();
    setFooter();
  } else {
    const updated = $("#footer-updated");
    if (updated) updated.textContent = state.i18n("footer.waiting");
  }
  settingsPanel?.sync();
}

function enqueueSettings(task) {
  const run = settingsQueue.then(task, task);
  settingsQueue = run.catch((error) => {
    console.error("[start-page] settings update failed", error);
  });
  return run;
}

async function updateSettings(patch) {
  return enqueueSettings(async () => {
    const merged = {
      ...state.settings,
      ...patch,
      sections: { ...state.settings.sections, ...(patch.sections ?? {}) },
    };
    state.settings = await saveSettings(merged);
    setLocale();
    applySettings();
    return state.settings;
  });
}

async function resetSettings() {
  return enqueueSettings(async () => {
    state.settings = await resetSettingsStore();
    setLocale();
    applySettings();
    return state.settings;
  });
}

async function clearCache() {
  await clearCaches();
}

function setFooter() {
  const updated = $("#footer-updated");
  if (!updated) return;
  const stamp = state.data?.generatedAt
    ? timeHM(state.data.generatedAt, state.locale, !state.settings.clock24)
    : "—";
  updated.textContent = `${state.i18n("footer.updated")} ${stamp}`;
}

function ensureData(data) {
  const fallback = {
    generatedAt: 0,
    sessionStartedAt: 0,
    stats: { sites: 0, pages: 0, tabs: 0, capped: false },
    history: { today: [], week: [], totalToday: 0, totalWeek: 0 },
    bookmarks: { all: [], visible: [], folders: [], total: 0 },
    tabs: { groups: [], all: [], duplicates: [], currentWindowId: null },
    downloads: [],
  };
  if (!data) return fallback;

  const stats = { ...fallback.stats, ...(data.stats ?? {}) };
  const history = { ...fallback.history, ...(data.history ?? {}) };
  const bookmarks = { ...fallback.bookmarks, ...(data.bookmarks ?? {}) };
  const tabs = { ...fallback.tabs, ...(data.tabs ?? {}) };
  for (const key of ["today", "week"]) {
    if (!Array.isArray(history[key])) history[key] = [];
  }
  for (const key of ["all", "visible", "folders"]) {
    if (!Array.isArray(bookmarks[key])) bookmarks[key] = [];
  }
  for (const key of ["groups", "all", "duplicates"]) {
    if (!Array.isArray(tabs[key])) tabs[key] = [];
  }
  return {
    ...fallback,
    ...data,
    stats,
    history,
    bookmarks,
    tabs,
    downloads: Array.isArray(data.downloads) ? data.downloads : [],
  };
}

function renderHistorySection() {
  if (!state.data) return;
  const range = state.ui.historyRange;
  const items = range === "week" ? state.data.history.week : state.data.history.today;
  renderHistory(els.history, items ?? [], ctx, {
    expanded: state.ui.historyExpanded,
  });
}

function renderBookmarksSection() {
  if (!state.data) return;
  const folders = state.data.bookmarks.folders ?? [];
  if (
    state.ui.bookmarkFolder !== "all" &&
    !folders.some((folder) => folder.id === state.ui.bookmarkFolder)
  ) {
    state.ui.bookmarkFolder = "all";
  }
  renderBookmarks(els.bookmarks, state.data.bookmarks, ctx, {
    folder: state.ui.bookmarkFolder,
    expanded: state.ui.bookmarksExpanded,
  });
}

function hideDuplicateConfirm() {
  if (els.tabs.confirm) els.tabs.confirm.hidden = true;
}

function renderTabsSection() {
  if (!state.data) return;
  hideDuplicateConfirm();
  renderTabs(els.tabs, state.data.tabs, ctx);
}

function renderDownloadsSection() {
  if (!state.data) return;
  renderDownloads(els.downloads, state.data.downloads ?? [], ctx);
}

function renderStatsSection() {
  renderStats($("#stats"), state.data?.stats, { locale: state.locale });
}

function safeRender(fn, label) {
  try {
    fn();
  } catch (error) {
    console.error(`[start-page] ${label} render failed`, error);
  }
}

function renderAll() {
  if (!state.data) return;
  safeRender(renderStatsSection, "stats");
  safeRender(renderBookmarksSection, "bookmarks");
  safeRender(renderTabsSection, "tabs");
  safeRender(renderHistorySection, "history");
  safeRender(renderDownloadsSection, "downloads");
  safeRender(setFooter, "footer");
}

function renderSkeletons() {
  renderBookmarkSkeleton(els.bookmarks.list, 6);
  renderSkeleton(els.tabs.list, 6);
  renderSkeleton(els.history.list, 6);
  renderSkeleton(els.downloads.list, 3);
  if (els.bookmarks.count) els.bookmarks.count.textContent = "";
  renderStatsSection();
}

function persistSnapshot() {
  if (state.data) void writeCache("snapshot", cacheSnapshot(state.data));
}

/* ---------- действия ---------- */

function openUrl(url, newTab = false) {
  if (!isNavigable(url)) {
    toaster.error(state.i18n("toast.error"));
    return;
  }
  if (newTab) {
    void openInNewTab(url).catch(() => toaster.error(state.i18n("toast.error")));
    return;
  }
  window.location.assign(url);
}

async function openDownloadAction(item) {
  try {
    await openDownload(item.id);
  } catch {
    toaster.error(state.i18n("toast.error"));
  }
}

async function showDownloadAction(item) {
  try {
    await showDownload(item.id);
  } catch {
    toaster.error(state.i18n("toast.error"));
  }
}

async function copyUrl(url) {
  try {
    await navigator.clipboard.writeText(url);
    toaster.show(state.i18n("toast.copied"));
  } catch {
    toaster.error(state.i18n("toast.error"));
  }
}

async function openNewTab(url) {
  try {
    await openInNewTab(url);
  } catch {
    toaster.error(state.i18n("toast.error"));
  }
}

async function activateTab(tab) {
  try {
    await activateTabApi(tab.id, tab.windowId);
  } catch {
    toaster.error(state.i18n("toast.error"));
  }
}

async function refreshTabsOnly() {
  if (!state.data) return;
  const tabs = await loadTabs();
  state.data.tabs = tabs;
  if (state.data.stats) state.data.stats.tabs = tabs.all.length;
  renderTabsSection();
  renderStatsSection();
  persistSnapshot();
}

async function closeTab(tab) {
  try {
    await closeTabApi(tab.id);
  } catch {
    toaster.error(state.i18n("toast.error"));
    return;
  }
  await refreshTabsOnly();
  toaster.show(state.i18n("toast.tabClosed"));
}

function requestCloseDuplicates() {
  const duplicates = state.data?.tabs?.duplicates ?? [];
  if (!duplicates.length) return;
  const section = document.querySelector('[data-section="tabs"]');
  section?.scrollIntoView({
    behavior: prefersReducedMotion() ? "auto" : "smooth",
    block: "nearest",
  });
  if (els.tabs.confirm) {
    els.tabs.confirm.hidden = false;
    els.tabs.confirmText.textContent = state.i18n("tabs.dupesConfirm", {
      n: duplicates.length,
    });
    const body = els.tabs.confirm.closest(".card__body");
    if (body) body.scrollTop = 0;
    els.tabs.confirmYes?.focus({ preventScroll: true });
  }
}

async function closeDuplicatesConfirmed() {
  const duplicates = state.data?.tabs?.duplicates ?? [];
  if (!duplicates.length) return;
  try {
    await closeTabs(duplicates.map((tab) => tab.id));
  } catch {
    toaster.error(state.i18n("toast.error"));
    return;
  }
  hideDuplicateConfirm();
  toaster.show(state.i18n("toast.tabsClosed", { n: duplicates.length }));
  await refreshTabsOnly();
}

async function deleteHistory(item) {
  try {
    await deleteHistoryUrl(item.url);
  } catch {
    toaster.error(state.i18n("toast.error"));
    return false;
  }
  if (!state.data) return true;
  for (const key of ["today", "week"]) {
    state.data.history[key] = state.data.history[key].filter(
      (entry) => entry.url !== item.url
    );
  }
  renderHistorySection();
  persistSnapshot();
  toaster.show(state.i18n("toast.historyRemoved"));
  // Пересчитываем страницы и сайты сеанса, не блокируя удаление.
  void refresh({ force: true, silent: true });
  return true;
}

function updateBookmarkStars() {
  for (const button of $$("[data-bookmark-url]")) {
    const saved = state.bookmarked.has(button.dataset.bookmarkUrl);
    button.setAttribute("aria-pressed", String(saved));
    const use = button.querySelector("use");
    if (use) use.setAttribute("href", saved ? "#i-star-filled" : "#i-star");
    const label = state.i18n(saved ? "history.removeBookmark" : "history.addBookmark");
    button.title = label;
    button.setAttribute("aria-label", label);
  }
}

async function toggleBookmarkAction(item) {
  let saved;
  try {
    saved = await toggleBookmarkApi({ url: item.url, title: item.title });
  } catch {
    toaster.error(state.i18n("toast.error"));
    return null;
  }
  const bookmarks = await loadBookmarks();
  if (state.data) {
    state.data.bookmarks = bookmarks;
  }
  state.bookmarked = new Set(bookmarks.visible.map((bookmark) => bookmark.url));
  renderBookmarksSection();
  updateBookmarkStars();
  persistSnapshot();
  toaster.show(
    state.i18n(saved ? "toast.bookmarkAdded" : "toast.bookmarkRemoved")
  );
  return saved;
}

function setBookmarkFolder(folder) {
  state.ui.bookmarkFolder = folder;
  state.ui.bookmarksExpanded = false;
  renderBookmarksSection();
}

async function cycleTheme() {
  const order = ["system", "light", "dark"];
  const next = order[(order.indexOf(state.settings.theme) + 1) % order.length];
  try {
    await updateSettings({ theme: next });
  } catch {
    toaster.error(state.i18n("toast.error"));
    return;
  }
  const key = {
    system: "settings.themeSystem",
    light: "settings.themeLight",
    dark: "settings.themeDark",
  }[next];
  toaster.show(`${state.i18n("settings.theme")} — ${state.i18n(key)}`);
}

/* ---------- загрузка ---------- */

function setBusy(busy) {
  const button = $("#refresh-btn");
  if (!button) return;
  button.classList.toggle("is-busy", busy);
  button.setAttribute("aria-busy", String(busy));
}

async function refresh({ force = false, announce = false, silent = false } = {}) {
  if (state.refreshing) return;
  if (!force && state.data && Date.now() - state.data.generatedAt < 12_000) return;

  state.refreshing = true;
  setBusy(true);
  try {
    const data = ensureData(await collectData());
    state.data = data;
    state.bookmarked = new Set(
      (data.bookmarks.visible ?? []).map((bookmark) => bookmark.url)
    );
    renderAll();
    await writeCache("snapshot", cacheSnapshot(data));
    if (announce) toaster.show(state.i18n("toast.refreshed"));
  } catch (error) {
    console.error("[start-page] refresh failed", error);
    if (!silent) toaster.error(state.i18n("toast.error"));
  } finally {
    state.refreshing = false;
    setBusy(false);
  }
}

function openSettings(trigger) {
  search?.close();
  settingsPanel?.open(trigger ?? document.activeElement);
}

function openShortcuts() {
  search?.close();
  shortcutsPanel?.open();
}

function bindStaticActions() {
  $("#settings-btn")?.addEventListener("click", (event) => {
    openSettings(event.currentTarget);
  });
  $("#shortcuts-btn")?.addEventListener("click", (event) => {
    shortcutsPanel?.open(event.currentTarget);
  });
  $("#refresh-btn")?.addEventListener("click", () => {
    void refresh({ force: true, announce: true });
  });

  for (const button of $$("[data-history-range]")) {
    button.addEventListener("click", () => {
      state.ui.historyRange = button.dataset.historyRange;
      state.ui.historyExpanded = false;
      applyChrome();
      renderHistorySection();
    });
  }

  $("#history-more")?.addEventListener("click", () => {
    state.ui.historyExpanded = !state.ui.historyExpanded;
    renderHistorySection();
  });

  $("#bookmarks-more")?.addEventListener("click", () => {
    state.ui.bookmarksExpanded = !state.ui.bookmarksExpanded;
    renderBookmarksSection();
  });

  $("#tabs-dupes")?.addEventListener("click", requestCloseDuplicates);
  $("#tabs-confirm-no")?.addEventListener("click", hideDuplicateConfirm);
  $("#tabs-confirm-yes")?.addEventListener("click", () => {
    void closeDuplicatesConfirmed();
  });
}

function setupModules() {
  clock = createClock({
    main: $("#clock-main"),
    sec: $("#clock-sec"),
    period: $("#clock-period"),
    date: $("#clock-date"),
    getI18n: () => state.i18n,
    getSettings: () => state.settings,
  });

  search = initSearch(ctx);
  settingsPanel = initSettings(ctx);
  shortcutsPanel = initShortcuts();
}

function listenForExternalChanges() {
  if (!api?.storage?.onChanged) return;
  api.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !changes[SETTINGS_KEY]?.newValue) return;
    const next = normalizeSettings(changes[SETTINGS_KEY].newValue);
    if (JSON.stringify(next) === JSON.stringify(state.settings)) return;
    state.settings = next;
    setLocale();
    applySettings();
  });
}

async function boot() {
  state.version = api?.runtime?.getManifest?.().version ?? "1.0.0";
  state.settings = await loadSettings();
  setLocale();
  applyChrome();
  setupModules();
  bindStaticActions();
  applySettings();
  listenForExternalChanges();

  const cached = await readCache("snapshot");
  if (cached?.data) {
    state.data = ensureData(cached.data);
    // Счётчики сеанса от прошлого запуска браузера не должны выдавать себя
    // за текущий сеанс, пока живое обновление ещё выполняется.
    const currentSession = await readSessionStart();
    if (!currentSession || state.data.sessionStartedAt !== currentSession) {
      state.data.stats = null;
    }
    state.bookmarked = new Set(
      (state.data.bookmarks.visible ?? []).map((bookmark) => bookmark.url)
    );
    renderAll();
  } else {
    renderSkeletons();
    const updated = $("#footer-updated");
    if (updated) updated.textContent = state.i18n("footer.waiting");
  }

  await refresh({ silent: true });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) void refresh();
  });

  window.setInterval(() => {
    if (!document.hidden) void refresh();
  }, 5 * 60_000);

  document.body.classList.add("is-ready");
}

void boot().catch((error) => {
  console.error("[start-page] startup failed", error);
  document.body.classList.add("is-ready");
});
