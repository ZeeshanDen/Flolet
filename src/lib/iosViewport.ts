// iOS standalone-PWA keyboard workaround. With body overflow hidden, iOS
// still pans the WINDOW to reveal a focused input; after the keyboard closes
// it can stay panned, leaving dead space under the fixed bottom nav.
// Snap back whenever the keyboard dismisses or focus leaves an input.

function snapBack() {
  if (window.scrollY !== 0 || window.scrollX !== 0) window.scrollTo(0, 0);
  // documentElement can also be left scrolled in standalone mode.
  if (document.documentElement.scrollTop !== 0)
    document.documentElement.scrollTop = 0;
}

const vv = window.visualViewport;
if (vv) {
  vv.addEventListener("resize", () => {
    // Keyboard closed: visual viewport back to (roughly) full height.
    if (vv.height >= window.innerHeight - 60) snapBack();
  });
}

window.addEventListener("focusout", () => {
  // Let iOS finish its keyboard-dismiss dance first.
  setTimeout(snapBack, 250);
});

// Standalone relaunch can RESTORE the panned viewport from the previous
// session — the nav then floats mid-screen until the user swipes. Snap on
// launch and whenever the app returns to the foreground.
setTimeout(snapBack, 100);
window.addEventListener("pageshow", () => setTimeout(snapBack, 100));
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") setTimeout(snapBack, 100);
});
