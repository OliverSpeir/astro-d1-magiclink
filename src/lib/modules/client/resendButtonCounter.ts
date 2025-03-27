const resendBtn = document.getElementById(
  "resend-btn"
) as HTMLButtonElement | null;

if (resendBtn) {
  const BUTTON_TEXT = "Resend Link";
  let countdown = 30;
  let lastTime = performance.now();
  let rafId: number | null = null;

  resendBtn.disabled = true;
  resendBtn.textContent = `${BUTTON_TEXT} (${countdown})`;

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  const updateInterval = prefersReducedMotion ? 5 : 1;

  (function tick(now: number) {
    if (!resendBtn && rafId) {
      cancelAnimationFrame(rafId);
      return;
    }

    const elapsed = (now - lastTime) / 1000;

    if (elapsed >= updateInterval) {
      countdown = Math.max(0, countdown - Math.floor(elapsed));
      lastTime = now;
      resendBtn.textContent = countdown
        ? `${BUTTON_TEXT} (${countdown})`
        : BUTTON_TEXT;

      if (countdown <= 0) {
        resendBtn.disabled = false;
        return;
      }
    }

    rafId = requestAnimationFrame(tick);
  })(lastTime);
}
