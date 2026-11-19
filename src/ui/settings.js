import { $, $$, confirmInline } from "../lib/dom.js";
import { createLayer } from "./panel.js";

export function initSettings(ctx) {
  const layer = $("#settings-layer");
  if (!layer) return { open() {}, close() {}, sync() {} };

  const panel = createLayer(layer);
  const segs = $$("[data-seg]", layer);
  const switches = $$("[data-switch]", layer);
  const language = $("#language");
  const resetButton = $("#reset-settings");
  const clearButton = $("#clear-cache");
  const versionLabel = $("#version-label");

  layer.querySelectorAll("[data-close-settings]").forEach((node) => {
    node.addEventListener("click", () => panel.close());
  });

  function sync() {
    const settings = ctx.settings;
    for (const seg of segs) {
      const current = settings[seg.dataset.seg];
      for (const button of seg.querySelectorAll("[data-value]")) {
        const active = button.dataset.value === current;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", String(active));
      }
    }
    for (const control of switches) {
      const key = control.dataset.switch;
      const checked = key.startsWith("section:")
        ? Boolean(settings.sections[key.slice("section:".length)])
        : Boolean(settings[key]);
      const label = control
        .closest(".setting-row")
        ?.querySelector(".setting-row__label")
        ?.textContent?.trim();
      if (label) control.setAttribute("aria-label", label);
      control.setAttribute("aria-checked", String(checked));
    }
    language.value = settings.locale;
    versionLabel.textContent = `v${ctx.version}`;
  }

  async function update(patch) {
    try {
      await ctx.updateSettings(patch);
    } catch (error) {
      console.error("[start-page] settings action failed", error);
    } finally {
      sync();
    }
  }

  for (const seg of segs) {
    seg.addEventListener("click", (event) => {
      const button = event.target.closest("[data-value]");
      if (!button) return;
      const key = seg.dataset.seg;
      if (key !== "theme" && key !== "width") return;
      void update({ [key]: button.dataset.value });
    });
  }

  for (const control of switches) {
    control.addEventListener("click", () => {
      const key = control.dataset.switch;
      if (key.startsWith("section:")) {
        const name = key.slice("section:".length);
        void update({
          sections: { ...ctx.settings.sections, [name]: !ctx.settings.sections[name] },
        });
        return;
      }
      void update({ [key]: !ctx.settings[key] });
    });
  }

  language.addEventListener("change", () => {
    void update({ locale: language.value });
  });

  resetButton?.addEventListener("click", () => {
    const container = resetButton.parentElement;
    if (!container) return;
    confirmInline(container, ctx.t("settings.resetConfirm"), {
      yesLabel: ctx.t("history.confirm"),
      noLabel: ctx.t("history.cancel"),
      onYes: async () => {
        try {
          await ctx.resetSettings();
          sync();
          ctx.toast(ctx.t("settings.resetDone"));
        } catch (error) {
          console.error("[start-page] settings reset failed", error);
        }
      },
    });
  });

  clearButton?.addEventListener("click", async () => {
    try {
      await ctx.clearCache();
      ctx.toast(ctx.t("settings.cacheCleared"));
    } catch (error) {
      console.error("[start-page] cache clear failed", error);
    }
  });


  sync();

  return {
    open(trigger) {
      sync();
      panel.open(trigger);
    },
    close: panel.close,
    sync,
  };
}
