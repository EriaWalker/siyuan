import {readFileSync} from "fs";
import {resolve} from "path";
import {describe, expect, it} from "vitest";

const readAppFile = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Outline heading shortcuts", () => {
    it("documents Ctrl+Alt+number as the exact heading-level shortcut family", () => {
        const constants = readAppFile("src/constants.ts");
        const editorKeydown = readAppFile("src/protyle/wysiwyg/keydown.ts");

        expect(constants).toContain('heading1: {default: "⌥⌘1", custom: "⌥⌘1"}');
        expect(constants).toContain('heading2: {default: "⌥⌘2", custom: "⌥⌘2"}');
        expect(constants).toContain('heading6: {default: "⌥⌘6", custom: "⌥⌘6"}');
        expect(editorKeydown).toContain("window.siyuan.config.keymap.editor.heading.heading2.custom");
        expect(editorKeydown).toContain("level: 2");
    });

    it("routes active Outline panel heading shortcuts through global keydown and Outline actions", () => {
        const globalKeydown = readAppFile("src/boot/globalEvent/keydown.ts");
        const outline = readAppFile("src/layout/dock/Outline.ts");

        expect(globalKeydown).toContain('activePanelElement.classList.contains("sy__outline")');
        expect(globalKeydown).toContain("model instanceof Outline");
        expect(globalKeydown).toContain("routeOutlineHeadingShortcut(model, event)");
        expect(globalKeydown).toContain("model.setHeadingLevel(outlineHeadingShortcut.level)");
        expect(globalKeydown).toContain("model.changeHeadingLevel(outlineHeadingShortcut.direction)");
        expect(outline).toContain("public setHeadingLevel(level: number");
        expect(outline).toContain("public changeHeadingLevel(direction: TOutlineHeadingLevelDirection");
        expect(outline).not.toContain("handleHeadingShortcut(event");
        expect(outline).not.toContain('options.tab.panelElement.addEventListener("keydown"');
    });

    it("registers Alt+= as heading upgrade and does not accept Alt++ in Outline routing", () => {
        const constants = readAppFile("src/constants.ts");
        const globalKeydown = readAppFile("src/boot/globalEvent/keydown.ts");

        expect(constants).toContain('headingUpgrade: {default: "⌥=", custom: "⌥="}');
        expect(globalKeydown).toContain('event.key === "="');
        expect(globalKeydown).not.toContain('["+", "=", "-"].includes(event.key)');
        expect(globalKeydown).not.toContain("headingConfig.headingUpgrade");
    });

    it("registers Alt+- as heading downgrade", () => {
        const constants = readAppFile("src/constants.ts");
        const globalKeydown = readAppFile("src/boot/globalEvent/keydown.ts");

        expect(constants).toContain('headingDowngrade: {default: "⌥-"');
        expect(globalKeydown).toContain('event.key === "-"');
    });

    it.todo("Alt+= on one selected Outline heading calls the existing upgrade path through global keydown");

    it.todo("Alt+- on one selected Outline heading calls the existing downgrade path through global keydown");

    it.todo("Alt+= and Alt+- use the batch path for multiple Outline headings through global keydown");

    it.todo("editor Ctrl+Alt+number dispatch on a single editor heading calls the exact heading-level path");
    // The real handler lives in protyle/wysiwyg/keydown.ts. A clean unit needs extractHeadingShortcutLevel(event, keymap) or collectHeadingBlocksForShortcut(rangeOrCurrentBlock, outlineSelectionState).

    it.todo("editor Ctrl+Alt+number dispatch with a selection/range containing multiple headings calls the batch exact-level path");
    // Needs collectHeadingBlocksForShortcut(rangeOrCurrentBlock, outlineSelectionState) so range-based heading collection can be tested without full editor runtime integration.
});
