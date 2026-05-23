import {readFileSync} from "fs";
import {resolve} from "path";
import {describe, expect, it} from "vitest";

const readAppFile = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Outline heading shortcuts", () => {
    it.todo("Ctrl+Alt+1 changes all selected Outline headings to exact H1");
    // Current Outline has no clean shortcut handler seam to invoke without exposing production internals.

    it.todo("Ctrl+Alt+2 changes all selected Outline headings to exact H2");
    // Current Outline has no clean shortcut handler seam to invoke without exposing production internals.

    it.todo("Ctrl+Alt+6 changes all selected Outline headings to exact H6");
    // Current Outline has no clean shortcut handler seam to invoke without exposing production internals.

    it.todo("undo/redo works for Ctrl+Alt+number batch exact-heading-level shortcuts");
    // Requires the eventual batch heading shortcut to route through the same transaction path as batch upgrade/downgrade.

    it("documents Ctrl+Alt+number as the exact heading-level shortcut family", () => {
        const constants = readAppFile("src/constants.ts");
        const editorKeydown = readAppFile("src/protyle/wysiwyg/keydown.ts");

        expect(constants).toContain('heading1: {default: "⌥⌘1", custom: "⌥⌘1"}');
        expect(constants).toContain('heading2: {default: "⌥⌘2", custom: "⌥⌘2"}');
        expect(constants).toContain('heading6: {default: "⌥⌘6", custom: "⌥⌘6"}');
        expect(editorKeydown).toContain("window.siyuan.config.keymap.editor.heading.heading2.custom");
        expect(editorKeydown).toContain("level: 2");
    });

    it("registers Alt++ as heading upgrade", () => {
        const constants = readAppFile("src/constants.ts");
        const outline = readAppFile("src/layout/dock/Outline.ts");

        expect(constants).toContain('headingUpgrade: {default: "⌥+"');
        expect(outline).toContain('matchHotKey(window.siyuan.config.keymap.editor.heading.headingUpgrade.custom');
    });

    it("registers Alt+- as heading downgrade", () => {
        const constants = readAppFile("src/constants.ts");
        const outline = readAppFile("src/layout/dock/Outline.ts");

        expect(constants).toContain('headingDowngrade: {default: "⌥-"');
        expect(outline).toContain('matchHotKey(window.siyuan.config.keymap.editor.heading.headingDowngrade.custom');
    });

    it.todo("Alt++ on one selected Outline heading calls the existing upgrade path");
    // Alt++ is locked to upgrade, meaning H3 becomes H2. Needs a shortcut handler seam that can be invoked in jsdom.

    it.todo("Alt+- on one selected Outline heading calls the existing downgrade path");
    // Alt+- is locked to downgrade, meaning H3 becomes H4. Needs a shortcut handler seam that can be invoked in jsdom.

    it.todo("Alt++ and Alt+- use the batch path for multiple Outline headings");
    // Needs a public or extracted handler that chooses single vs batch operation from Outline selection state.

    it.todo("editor Ctrl+Alt+number dispatch on a single editor heading calls the exact heading-level path");
    // The real handler lives in protyle/wysiwyg/keydown.ts. A clean unit needs extractHeadingShortcutLevel(event, keymap) or collectHeadingBlocksForShortcut(rangeOrCurrentBlock, outlineSelectionState).

    it.todo("editor Ctrl+Alt+number dispatch with a selection/range containing multiple headings calls the batch exact-level path");
    // Needs collectHeadingBlocksForShortcut(rangeOrCurrentBlock, outlineSelectionState) so range-based heading collection can be tested without full editor runtime integration.
});
