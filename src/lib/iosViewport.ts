// iOS standalone-PWA viewport workarounds.
//
// 1. Launch height: iOS 26+ cold-launches a home-screen PWA with a SHORT
//    layout viewport (the status-bar/safe area isn't counted until the first
//    scroll gesture forces a recompute). 100dvh and position:fixed;bottom:0
//    both trust that short viewport, so the bottom nav floated ~100pt up
//    until the user swiped. In standalone portrait the app covers the whole
//    screen, so screen.height is the true height from the first frame —
//    publish it as --app-h and size the shell from it.
//
// 2. Keyboard pan: with body overflow hidden, iOS still pans the window to
//    reveal a focused input and can leave it panned after dismissal.

const isStandalone = () =>
  (navigator as Navigator & { standalone?: boolean }).standalone === true ||
  window.matchMedia("(display-mode: standalone)").matches;

function setAppHeight() {
  let h = window.innerHeight;
  if (isStandalone()) {
    const portrait = window.innerHeight >= window.innerWidth;
    const screenH = portrait
      ? Math.max(screen.height, screen.width)
      : Math.min(screen.height, screen.width);
    h = Math.max(h, screenH);
  }
  document.documentElement.style.setProperty("--app-h", `${h}px`);
}

function snapBack() {
  if (window.scrollY !== 0 || window.scrollX !== 0) window.scrollTo(0, 0);
  if (document.documentElement.scrollTop !== 0)
    document.documentElement.scrollTop = 0;
}

setAppHeight();
// innerHeight (unlike visualViewport.height) doesn't shrink for the keyboard,
// so resize-driven re-measuring won't collapse the shell while typing.
window.addEventListener("resize", setAppHeight);
window.addEventListener("orientationchange", () =>
  setTimeout(setAppHeight, 300),
);

const vv = window.visualViewport;
if (vv) {
  vv.addEventListener("resize", () => {
    // Keyboard closed: visual viewport back to (roughly) full height.
    if (vv.height >= window.innerHeight - 60) snapBack();
  });
}

window.addEventListener("focusout", () => setTimeout(snapBack, 250));

const onResume = () =>
  setTimeout(() => {
    setAppHeight();
    snapBack();
  }, 100);
window.addEventListener("pageshow", onResume);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") onResume();
});
