import { Delete } from "lucide-react";

const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "del"];

/**
 * Appends digits to a string amount. Keeps at most 2 decimals, one dot.
 */
export function pushKey(current: string, key: string): string {
  if (key === "del") return current.slice(0, -1);
  if (key === ".") {
    if (current.includes(".")) return current;
    return current === "" ? "0." : current + ".";
  }
  // block 3rd decimal
  if (current.includes(".")) {
    const [, dec] = current.split(".");
    if (dec.length >= 2) return current;
  }
  // avoid leading zeros like 00
  if (current === "0") return key;
  return current + key;
}

export default function Numpad({
  onKey,
}: {
  onKey: (key: string) => void;
}) {
  const press = (k: string) => {
    // Subtle haptic tap on supported devices.
    navigator.vibrate?.(8);
    onKey(k);
  };
  return (
    <div className="grid grid-cols-3 gap-2">
      {keys.map((k) => (
        <button
          key={k}
          onClick={() => press(k)}
          className="flex h-12 items-center justify-center rounded-2xl bg-card text-xl font-semibold text-text shadow-sm transition-transform duration-100 active:scale-90 active:bg-border"
        >
          {k === "del" ? <Delete size={22} /> : k}
        </button>
      ))}
    </div>
  );
}
