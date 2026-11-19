/* Выполняется синхронно в <head>, чтобы не было вспышки темы до первой отрисовки.
   Полные настройки лежат в browser.storage.local; здесь только несколько
   значений, нужных для мгновенного и правильного первого кадра. */
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
    /* Сломанное зеркало не должно ломать страницу. */
  }
})();
