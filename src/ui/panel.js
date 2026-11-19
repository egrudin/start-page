/* Shared mechanics for the settings drawer and the shortcuts sheet:
   focus trap, Escape, scrim, enter/leave transitions. */

export function createLayer(layer, { onClose } = {}) {
  let open = false;
  let lastFocus = null;
  let hideTimer = 0;

  const focusables = () =>
    [...layer.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )].filter((node) => node.offsetParent !== null);

  function onKeydown(event) {
    if (!open) return;
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== "Tab") return;
    const nodes = focusables();
    if (!nodes.length) return;
    if (!nodes.includes(document.activeElement)) {
      event.preventDefault();
      nodes[0].focus({ preventScroll: true });
      return;
    }
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function openLayer(trigger) {
    if (open) return;
    open = true;
    window.clearTimeout(hideTimer);
    lastFocus = trigger ?? document.activeElement;
    layer.classList.remove("is-open");
    layer.hidden = false;
    // Commit the closed transform before flipping to is-open. Without this
    // forced style flush Firefox can paint the drawer already open and skip
    // the transition, while closing still animates normally.
    void layer.offsetWidth;
    document.body.classList.add("is-locked");
    document.addEventListener("keydown", onKeydown, true);
    requestAnimationFrame(() => {
      if (!open) return;
      layer.classList.add("is-open");
      const nodes = focusables();
      nodes[0]?.focus({ preventScroll: true });
    });
  }

  function close(options = {}) {
    if (!open) return;
    open = false;
    layer.classList.remove("is-open");
    document.removeEventListener("keydown", onKeydown, true);
    document.body.classList.remove("is-locked");
    hideTimer = window.setTimeout(() => {
      if (!open) layer.hidden = true;
    }, 320);
    if (options.restoreFocus !== false && lastFocus?.isConnected) {
      lastFocus.focus?.({ preventScroll: true });
    }
    onClose?.();
  }

  return {
    open: openLayer,
    close,
    isOpen: () => open,
  };
}
