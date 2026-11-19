/* Читает локальное состояние браузера и превращает его в одну небольшую модель для рендеринга.
   Ничего здесь не обращается к сети. */

import { api, safe, isNavigable, normalizeUrl, startOfToday, DAY } from "./api.js";
import { hostOf, basename, fileExt } from "./format.js";

export const SESSION_KEY = "mono.session.startedAt";
const HISTORY_SESSION_LIMIT = 1000;
const HISTORY_WEEK_LIMIT = 500;
const LIST_LIMIT = 80;

function selfPrefix() {
  try {
    return api.runtime.getURL("");
  } catch {
    return "moz-extension://";
  }
}

export function normalizeHistory(items = []) {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item) => item && isNavigable(item.url))
    .map((item) => ({
      id: item.id,
      url: item.url,
      title: (item.title || "").trim(),
      host: hostOf(item.url),
      lastVisitTime: Number(item.lastVisitTime) || 0,
      visitCount: Number(item.visitCount) || 0,
    }))
    .sort((a, b) => b.lastVisitTime - a.lastVisitTime);
}

export function normalizeBookmarks(tree = []) {
  if (!Array.isArray(tree)) tree = [];
  const all = [];
  const folders = [];
  const roots = Array.isArray(tree?.[0]?.children) ? tree[0].children : [];
  const toolbar =
    roots.find((node) => node.id === "toolbar_____") ??
    roots.find((node) => /toolbar/i.test(node.id ?? "")) ??
    null;

  function walk(node, ancestors) {
    if (!node || node.type === "separator") return;
    if (Array.isArray(node.children)) {
      for (const child of node.children) walk(child, [...ancestors, node]);
      return;
    }
    if (!node.url) return;
    const host = hostOf(node.url);
    const titled = ancestors.filter((ancestor) => ancestor.title);
    all.push({
      id: node.id,
      title: (node.title || "").trim() || host || node.url,
      url: node.url,
      host,
      dateAdded: Number(node.dateAdded) || 0,
      folderIds: ancestors.map((ancestor) => ancestor.id),
      folderTitle: titled.length ? titled[titled.length - 1].title : "",
    });
  }

  for (const root of roots) walk(root, []);

  if (toolbar?.children) {
    const folderCounts = new Map();
    for (const bookmark of all) {
      for (const folderId of bookmark.folderIds) {
        folderCounts.set(folderId, (folderCounts.get(folderId) ?? 0) + 1);
      }
    }
    for (const child of toolbar.children) {
      if (Array.isArray(child.children)) {
        folders.push({
          id: child.id,
          title: child.title || "—",
          count: folderCounts.get(child.id) ?? 0,
        });
      }
    }
  }

  const visible = all.filter((bookmark) => isNavigable(bookmark.url));
  return { all, visible, folders, total: all.length };
}

export function normalizeTabs(allTabs = [], currentTab = null, prefix = selfPrefix()) {
  if (!Array.isArray(allTabs)) allTabs = [];
  const selfId = currentTab?.id;
  const list = allTabs
    .filter((tab) => tab && tab.id !== selfId)
    .filter((tab) => !String(tab.url ?? "").startsWith(prefix))
    .map((tab) => ({
      id: tab.id,
      title: (tab.title || "").trim() || hostOf(tab.url) || tab.url || "",
      url: tab.url ?? "",
      host: hostOf(tab.url),
      windowId: tab.windowId,
      active: Boolean(tab.active),
      pinned: Boolean(tab.pinned),
      audible: Boolean(tab.audible),
    }));

  const currentWindowId = currentTab?.windowId ?? list[0]?.windowId ?? null;
  const windowIds = [];
  for (const tab of list) {
    if (!windowIds.includes(tab.windowId)) windowIds.push(tab.windowId);
  }
  windowIds.sort((a, b) => {
    if (a === currentWindowId) return -1;
    if (b === currentWindowId) return 1;
    return a - b;
  });

  const groups = windowIds.map((id) => ({
    id,
    isCurrent: id === currentWindowId,
    tabs: list.filter((tab) => tab.windowId === id),
  }));

  const byUrl = new Map();
  for (const tab of list) {
    if (!tab.url) continue;
    const key = normalizeUrl(tab.url);
    const bucket = byUrl.get(key);
    if (bucket) bucket.push(tab);
    else byUrl.set(key, [tab]);
  }
  const duplicates = [];
  for (const bucket of byUrl.values()) {
    if (bucket.length < 2) continue;
    const keeper =
      bucket.find((tab) => tab.active) ?? bucket.find((tab) => tab.pinned) ?? bucket[0];
    duplicates.push(
      ...bucket.filter((tab) => tab.id !== keeper.id && !tab.pinned)
    );
  }

  return { groups, all: list, duplicates, currentWindowId };
}

export function normalizeDownloads(entries = []) {
  if (!Array.isArray(entries)) return [];
  return entries
    .map((item) => ({
      id: item.id,
      filename: item.filename ?? "",
      name: basename(item.filename ?? ""),
      ext: fileExt(item.filename ?? ""),
      host: hostOf(item.url ?? item.finalUrl ?? ""),
      state: item.state ?? "complete",
      received: Number(item.bytesReceived) || 0,
      total: Number(item.totalBytes) || 0,
      exists: item.exists !== false,
      error: item.error ?? "",
      startTime: Number(item.startTime) || 0,
    }))
    .filter((item) => item.id != null)
    .sort((a, b) => b.startTime - a.startTime)
    .slice(0, 6);
}

async function recentDownloads() {
  try {
    return await api.downloads.search({ orderBy: ["-startTime"], limit: 6 });
  } catch {
    const items = await safe(() => api.downloads.search({}), [], "downloads");
    return (Array.isArray(items) ? items : [])
      .sort((a, b) => (b.startTime ?? 0) - (a.startTime ?? 0))
      .slice(0, 6);
  }
}

export async function loadTabs() {
  const [tabs, currentTab] = await Promise.all([
    safe(() => api.tabs.query({}), [], "tabs"),
    safe(() => api.tabs.getCurrent(), null, "tabs.current"),
  ]);
  return normalizeTabs(tabs, currentTab);
}

export async function loadBookmarks() {
  const tree = await safe(() => api.bookmarks.getTree(), [], "bookmarks");
  return normalizeBookmarks(tree);
}

/**
 * Сеанс браузера начинается при запуске Firefox. Фоновая страница записывает
 * время в storage.session; если этого ещё не произошло, используем начало
 * сегодняшнего дня, чтобы после чистой установки число всё равно было полезным.
 */
export async function readSessionStart() {
  const stored = await safe(
    () => api.storage.session.get(SESSION_KEY).then((result) => result?.[SESSION_KEY]),
    null,
    "session.read"
  );
  return typeof stored === "number" && stored > 0 ? stored : null;
}

async function getSessionStart() {
  const now = Date.now();
  const stored = await readSessionStart();
  if (stored && stored <= now) return stored;

  const fallback = startOfToday(now);
  await safe(
    () => api.storage.session.set({ [SESSION_KEY]: fallback }),
    null,
    "session.mark"
  );
  return fallback;
}

export async function collectData() {
  const now = Date.now();
  const todayStart = startOfToday(now);
  const weekStart = todayStart - 6 * DAY;
  const sessionStart = await getSessionStart();

  const [sessionItems, weekItems, bookmarks, tabs, downloads] = await Promise.all([
    safe(
      () =>
        api.history.search({
          text: "",
          startTime: sessionStart,
          maxResults: HISTORY_SESSION_LIMIT,
        }),
      [],
      "history.session"
    ),
    safe(
      () =>
        api.history.search({
          text: "",
          startTime: weekStart,
          maxResults: HISTORY_WEEK_LIMIT,
        }),
      [],
      "history.week"
    ),
    loadBookmarks(),
    loadTabs(),
    safe(() => recentDownloads(), [], "downloads"),
  ]);

  const sessionHistory = normalizeHistory(sessionItems);
  const weekHistory = normalizeHistory(weekItems);
  const todayHistory = weekHistory.filter((item) => item.lastVisitTime >= todayStart);
  const sites = new Set(sessionHistory.map((item) => item.host).filter(Boolean));

  return {
    generatedAt: now,
    sessionStartedAt: sessionStart,
    stats: {
      sites: sites.size,
      pages: sessionHistory.length,
      tabs: tabs.all.length,
      capped: Array.isArray(sessionItems) && sessionItems.length >= HISTORY_SESSION_LIMIT,
    },
    history: {
      today: todayHistory.slice(0, LIST_LIMIT),
      week: weekHistory.slice(0, LIST_LIMIT),
      totalToday: todayHistory.length,
      totalWeek: weekHistory.length,
    },
    bookmarks,
    tabs,
    downloads: normalizeDownloads(downloads),
  };
}

/** Намеренно небольшой снимок для мгновенной первой отрисовки; живые данные придут следом. */
export function cacheSnapshot(data) {
  return {
    generatedAt: data.generatedAt,
    sessionStartedAt: data.sessionStartedAt,
    stats: data.stats,
    history: {
      today: data.history.today.slice(0, 40),
      week: data.history.week.slice(0, 40),
      totalToday: data.history.totalToday,
      totalWeek: data.history.totalWeek,
    },
    bookmarks: {
      all: data.bookmarks.all.slice(0, 400),
      visible: data.bookmarks.visible.slice(0, 400),
      folders: data.bookmarks.folders,
      total: data.bookmarks.total,
    },
    tabs: data.tabs,
    downloads: data.downloads,
  };
}

/* ---------- изменения ---------- */

export async function deleteHistoryUrl(url) {
  return api.history.deleteUrl({ url });
}

export async function toggleBookmark({ url, title }) {
  const result = await safe(() => api.bookmarks.search({ url }), null, "bookmarks.find");
  const fallback = Array.isArray(result)
    ? result
    : await safe(() => api.bookmarks.search(url), [], "bookmarks.find");
  const nodes = Array.isArray(fallback) ? fallback : [];
  const matches = nodes.filter((node) => node.url === url);

  if (matches.length) {
    for (const node of matches) await api.bookmarks.remove(node.id);
    return false;
  }
  await api.bookmarks.create({ title: title || hostOf(url), url });
  return true;
}

export async function activateTab(tabId, windowId) {
  await api.tabs.update(tabId, { active: true });
  if (windowId != null) {
    await safe(() => api.windows.update(windowId, { focused: true }), null, "window.focus");
  }
}

export async function closeTab(tabId) {
  await api.tabs.remove(tabId);
}

export async function closeTabs(tabIds) {
  if (!tabIds.length) return;
  await api.tabs.remove(tabIds);
}

export async function openDownload(id) {
  await api.downloads.open(id);
}

export async function showDownload(id) {
  await api.downloads.show(id);
}

export async function openInNewTab(url) {
  if (!isNavigable(url)) return;
  await api.tabs.create({ url });
}
