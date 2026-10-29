import { describe, expect, it } from "vitest";
import { slugify } from "./books";

describe("slugify", () => {
  it("transliterates Greek", () => expect(slugify("Ο Δράκος Τίκο")).toBe("o-drakos-tiko"));
  it("keeps Latin text", () => expect(slugify("The Frozen River!")).toBe("the-frozen-river"));
});
