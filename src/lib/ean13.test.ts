import { describe, expect, it } from "vitest";
import { checkDigit, encodeEan13, normalizeIsbn13 } from "./ean13";

const L = ["0001101", "0011001", "0010011", "0111101", "0100011", "0110001", "0101111", "0111011", "0110111", "0001011"];
const G = ["0100111", "0110011", "0011011", "0100001", "0011101", "0111001", "0000101", "0010001", "0001001", "0010111"];

describe("ISBN-13", () => {
  it("accepts a valid ISBN with hyphens", () => expect(normalizeIsbn13("978-0-306-40615-7")).toBe("9780306406157"));
  it("rejects a wrong check digit", () => expect(normalizeIsbn13("978-0-306-40615-8")).toBeNull());
  it("rejects non-book prefixes", () => expect(normalizeIsbn13("4006381333931")).toBeNull());
  it("computes the check digit", () => expect(checkDigit("978030640615")).toBe(7));
});

describe("encodeEan13", () => {
  const bits = encodeEan13("9780306406157");

  it("has 95 modules with guards", () => {
    expect(bits).toHaveLength(95);
    expect(bits.slice(0, 3)).toBe("101");
    expect(bits.slice(45, 50)).toBe("01010");
    expect(bits.slice(92)).toBe("101");
  });

  it("decodes back to the same digits", () => {
    const left = Array.from({ length: 6 }, (_, i) => bits.slice(3 + i * 7, 10 + i * 7));
    const right = Array.from({ length: 6 }, (_, i) => bits.slice(50 + i * 7, 57 + i * 7));
    const leftDigits = left.map((c) => (L.includes(c) ? L.indexOf(c) : G.indexOf(c)));
    // Right-hand codes are the bitwise complement of the L codes.
    const rightDigits = right.map((c) => L.indexOf([...c].map((b) => (b === "1" ? "0" : "1")).join("")));
    expect([...leftDigits, ...rightDigits].join("")).toBe("780306406157");
    // The first digit (9) is carried by the L/G pattern of the left half: LGGLGL.
    expect(left.map((c) => (L.includes(c) ? "L" : "G")).join("")).toBe("LGGLGL");
  });
});
