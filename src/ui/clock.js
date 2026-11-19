import { dateLong, dayOfYear, isoWeek, timeParts } from "../lib/format.js";

export function createClock({ main, sec, period: periodNode, date, getI18n, getSettings }) {
  let timer = 0;

  function schedule() {
    window.clearTimeout(timer);
    const interval = getSettings().seconds ? 1000 : 60_000;
    const now = Date.now();
    timer = window.setTimeout(render, interval - (now % interval) + 40);
  }

  function render() {
    const now = new Date();
    const settings = getSettings();
    const t = getI18n();
    const { hour, minute, period } = timeParts(now.getTime(), t.locale, !settings.clock24);

    main.textContent = `${hour}:${minute}`;
    sec.textContent = settings.seconds ? `:${String(now.getSeconds()).padStart(2, "0")}` : "";
    periodNode.textContent = period || "";
    const week = isoWeek(now);
    const day = dayOfYear(now);
    const note =
      t.locale === "ru"
        ? `${week} ${t("clock.week")} · ${day} ${t("clock.day")}`
        : `${t("clock.week")} ${week} · ${t("clock.day")} ${day}`;
    date.textContent = `${dateLong(now.getTime(), t.locale, true)} — ${note}`;

    schedule();
  }

  render();

  return {
    render,
    destroy() {
      window.clearTimeout(timer);
    },
  };
}
