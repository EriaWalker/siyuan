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
        expect(globalKeydown).toContain("routeOutlineHeadingShortcut(model, event, fallbackElement)");
        expect(globalKeydown).toContain("model.setHeadingLevel(outlineHeadingShortcut.level, fallbackElement)");
        expect(globalKeydown).toContain("model.changeHeadingLevel(outlineHeadingShortcut.direction, fallbackElement)");
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

});
