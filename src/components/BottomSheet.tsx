import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

// Track open sheets so Esc only closes the top-most one when stacked.
const stack: symbol[] = [];

/**
 * Focus-mode bottom sheet: dim backdrop + upward-sliding panel.
 * Tapping the backdrop (or Esc) closes it. Renders in a portal so it
 * overlays the whole app viewport, above the bottom nav.
 */
export default function BottomSheet({
  open,
  onClose,
  children,
  maxHeight,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  maxHeight?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(Symbol("sheet"));

  // Esc closes only the top-most sheet; restore focus to the opener on close.
  useEffect(() => {
    if (!open) return;
    const id = idRef.current;
    stack.push(id);
    const opener = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && stack[stack.length - 1] === id) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      stack.splice(stack.indexOf(id), 1);
      opener?.focus?.();
    };
  }, [open, onClose]);

  // iOS: the on-screen keyboard shrinks only the visual viewport while the
  // body can't scroll — cap the sheet to the visible height so focused
  // inputs aren't hidden behind the keyboard.
  useEffect(() => {
    if (!open) return;
    const vv = window.visualViewport;
    if (!vv) return;
    const sync = () => {
      if (panelRef.current)
        panelRef.current.style.maxHeight = `${Math.round(vv.height * 0.92)}px`;
    };
    vv.addEventListener("resize", sync);
    return () => vv.removeEventListener("resize", sync);
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div
        onClick={onClose}
        aria-hidden="true"
        className="absolute inset-0 bg-[var(--scrim)] animate-[fadeIn_0.15s_ease]"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className="noscroll absolute inset-x-0 bottom-0 mx-auto max-w-md overflow-y-auto rounded-t-[26px] bg-surface px-5 pb-[calc(18px+env(safe-area-inset-bottom))] pt-3 shadow-[0_-18px_50px_-12px_rgba(20,16,45,0.35)] outline-none animate-[sheetUp_0.24s_cubic-bezier(0.22,1,0.36,1)]"
        style={{ maxHeight: maxHeight ?? "82%" }}
      >
        <div className="mx-auto mb-3 mt-0.5 h-[5px] w-10 rounded-full bg-border" />
        {children}
      </div>
    </div>,
    document.body,
  );
}
