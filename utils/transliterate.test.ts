import { describe, it, expect } from "vitest";
import { transliterateSinhala } from "./transliterate";

describe("transliterateSinhala", () => {
    it("should transliterate -ෙහි correctly", () => {
        // -ෙහි
        // \u002D \u0DD9 \u0DC4 \u0DD2
        const input = "-\u0DD9\u0DC4\u0DD2"; 
        expect(transliterateSinhala(input)).toBe("-ehi");
    });

    it("should handle correctly ordered Sinhala normally", () => {
        // හෙ (හ + ෙ)
        expect(transliterateSinhala("\u0DC4\u0DD9")).toBe("he");
    });
});
