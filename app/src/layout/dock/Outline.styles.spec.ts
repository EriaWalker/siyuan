import {readFileSync} from "fs";
import {resolve} from "path";
import {describe, expect, it} from "vitest";

const readAppFile = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Outline multi-select styling", () => {
    it("uses the DocTree/FileTree selected row token for Outline multi-selection", () => {
        const outlineSource = readAppFile("src/layout/dock/Outline.ts");
        const fileTreeSource = readAppFile("src/layout/dock/Files.ts");

        expect(fileTreeSource).toContain("b3-list-item--focus");
        expect(outlineSource).toContain('classList.toggle("b3-list-item--focus"');
    });

    it("does not introduce a separate Outline-only selected row class", () => {
        const outlineSource = readAppFile("src/layout/dock/Outline.ts");
        const listStyles = readAppFile("src/assets/scss/component/_list.scss");

        expect(outlineSource).not.toContain("b3-list-item--selected");
        expect(listStyles).not.toContain("&--selected");
    });
});
