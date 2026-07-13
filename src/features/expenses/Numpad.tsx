const MAX_INT_DIGITS = 9; // keeps cents math well inside Number.MAX_SAFE_INTEGER

/**
 * Appends digits to a string amount. Keeps at most 2 decimals, one dot,
 * and caps the integer part so cent arithmetic never overflows.
 */
export function pushKey(current: string, key: string): string {
  if (key === "del") return current.slice(0, -1);
  if (key === ".") {
    if (current.includes(".")) return current;
    return current === "" ? "0." : current + ".";
  }
  if (current.includes(".")) {
    // block 3rd decimal
    const [, dec] = current.split(".");
    if (dec.length >= 2) return current;
  } else if (current.length >= MAX_INT_DIGITS) {
    return current;
  }
  // avoid leading zeros like 00
  if (current === "0") return key;
  return current + key;
}
