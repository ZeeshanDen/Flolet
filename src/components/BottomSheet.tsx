import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

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
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-[rgba(20,16,45,0.36)] animate-[fadeIn_0.15s_ease]"
      />
      <div
        className="noscroll absolute inset-x-0 bottom-0 mx-auto max-w-md overflow-y-auto rounded-t-[26px] bg-surface px-5 pb-[calc(18px+env(safe-area-inset-bottom))] pt-3 shadow-[0_-18px_50px_-12px_rgba(20,16,45,0.35)] animate-[sheetUp_0.24s_cubic-bezier(0.22,1,0.36,1)]"
        style={{ maxHeight: maxHeight ?? "82%" }}
      >
        <div className="mx-auto mb-3 mt-0.5 h-[5px] w-10 rounded-full bg-border" />
        {children}
      </div>
    </div>,
    document.body,
  );
}
