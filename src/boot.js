/* Runs synchronously in <head> to avoid a theme flash before the first paint.
   The full settings live in browser.storage.local; this mirror only carries
   the handful of values needed for an instant, correct first frame. */
(() => {
  const root = document.documentElement;
  try {
    const raw = localStorage.getItem("mono.settings.mirror.v1");
    if (!raw) return;
    const settings = JSON.parse(raw);
    if (["system", "light", "dark"].includes(settings.theme)) {
      root.dataset.theme = settings.theme;
    }
    if (["comfort", "wide"].includes(settings.width)) {
      root.dataset.width = settings.width;
    }
    if (settings.locale === "ru" || settings.locale === "en") {
      root.lang = settings.locale;
    }
  } catch {
    /* A broken mirror should never break the page. */
  }
})();
