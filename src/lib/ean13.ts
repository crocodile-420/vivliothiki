// EAN-13 barcodes, as printed on the back cover from the book's ISBN-13.

const L = ["0001101", "0011001", "0010011", "0111101", "0100011", "0110001", "0101111", "0111011", "0110111", "0001011"];
const G = ["0100111", "0110011", "0011011", "0100001", "0011101", "0111001", "0000101", "0010001", "0001001", "0010111"];
const R = ["1110010", "1100110", "1101100", "1000010", "1011100", "1001110", "1010000", "1000100", "1001000", "1110100"];
// Which of the left six digits use the G table, chosen by the first digit (which is not drawn as bars).
const PARITY = ["LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG", "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL"];

export function checkDigit(first12: string): number {
  const sum = [...first12].reduce((s, d, i) => s + Number(d) * (i % 2 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10;
}

// Accepts an ISBN-13 with or without hyphens/spaces; returns its 13 digits, or null if it isn't valid.
export function normalizeIsbn13(input: string): string | null {
  const digits = input.replace(/[\s-]/g, "");
  if (!/^97[89]\d{10}$/.test(digits)) return null;
  return checkDigit(digits.slice(0, 12)) === Number(digits[12]) ? digits : null;
}

// The 95 modules of the barcode, "1" for a bar and "0" for a space.
export function encodeEan13(digits: string): string {
  if (!/^\d{13}$/.test(digits)) throw new Error("EAN-13 needs 13 digits");
  const parity = PARITY[Number(digits[0])];
  let bits = "101";
  for (let i = 1; i <= 6; i++) bits += (parity[i - 1] === "L" ? L : G)[Number(digits[i])];
  bits += "01010";
  for (let i = 7; i <= 12; i++) bits += R[Number(digits[i])];
  return bits + "101";
}

// Guard bars (start, middle, end) are drawn longer than the digit bars.
export function isGuardModule(index: number): boolean {
  return index < 3 || (index >= 45 && index < 50) || index >= 92;
}
