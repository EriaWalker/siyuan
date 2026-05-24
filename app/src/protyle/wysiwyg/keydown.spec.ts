import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

const mocks = vi.hoisted(() => ({
    headingsLevelTransaction: vi.fn(),
    isMac: vi.fn(() => false),
}));

vi.hoisted(() => {
    (globalThis as never as { SIYUAN_VERSION: string }).SIYUAN_VERSION = "0.0.0-test";
    (globalThis as never as { NODE_ENV: string }).NODE_ENV = "test";
});

vi.mock("./transaction", () => ({
    headingsLevelTransaction: mocks.headingsLevelTransaction,
    transaction: vi.fn(),
    turnsIntoOneTransaction: vi.fn(),
    turnsIntoTransaction: vi.fn(),
    turnsOneInto: vi.fn(),
    updateBatchTransaction: vi.fn(),
    updateTransaction: vi.fn(),
}));

vi.mock("../util/compatibility", () => ({
    copyPlainText: vi.fn(),
    getEventName: vi.fn(() => "click"),
    getLocalStorage: vi.fn(() => undefined),
    isHuawei: vi.fn(() => false),
    isInAndroid: vi.fn(() => false),
    isInIOS: vi.fn(() => false),
    isIPhone: vi.fn(() => false),
    isIPad: vi.fn(() => false),
    isMac: mocks.isMac,
    isNotCtrl: vi.fn((event: KeyboardEvent | MouseEvent) => !event.metaKey && !event.ctrlKey),
    isOnlyMeta: vi.fn((event: KeyboardEvent | MouseEvent) => mocks.isMac() ?
        event.metaKey && !event.ctrlKey :
        !event.metaKey && event.ctrlKey),
    openByMobile: vi.fn(),
    readText: vi.fn(),
    setStorageVal: vi.fn(),
    updateHotkeyTip: vi.fn(),
    writeText: vi.fn(),
}));

import {dispatchEditorHeadingShortcut} from "./keydown";

const makeHeading = (id: string, level: number, text: string) => {
    const element = document.createElement("div");
    element.dataset.nodeId = id;
    element.dataset.type = "NodeHeading";
    element.dataset.subtype = `h${level}`;
    element.className = `h${level}`;
    element.textContent = text;
    return element;
};

const makeProtyle = (root: HTMLElement) => ({
    wysiwyg: {
        element: root,
    },
} as unknown as IProtyle);

const makeEvent = (options: KeyboardEventInit) => {
    const event = new KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        ...options,
    });
    return {
        event,
        preventDefault: vi.spyOn(event, "preventDefault"),
        stopPropagation: vi.spyOn(event, "stopPropagation"),
    };
};

const keymap = {
    heading1: {custom: ""},
    heading2: {custom: ""},
    heading3: {custom: ""},
    heading4: {custom: ""},
    heading5: {custom: ""},
    heading6: {custom: ""},
} as Config.IKeymap["editor"]["heading"];

describe("editor heading shortcut dispatch", () => {
    beforeEach(() => {
        mocks.isMac.mockReturnValue(false);
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it("dispatches Ctrl+Alt+number on one heading to headingsLevelTransaction", () => {
        const root = document.createElement("div");
        const heading = makeHeading("heading-a", 3, "Heading A");
        root.append(heading);
        const protyle = makeProtyle(root);
        const {event, preventDefault, stopPropagation} = makeEvent({altKey: true, ctrlKey: true, key: "2"});

        expect(dispatchEditorHeadingShortcut({event, keymap, nodeElement: heading, protyle})).toBe(true);

        expect(mocks.headingsLevelTransaction).toHaveBeenCalledWith(expect.objectContaining({
            headingElements: [heading],
            level: 2,
            protyle,
        }));
        expect(preventDefault).toHaveBeenCalledTimes(1);
        expect(stopPropagation).toHaveBeenCalledTimes(1);
    });

    it("dispatches Cmd+Alt+number on macOS to headingsLevelTransaction", () => {
        mocks.isMac.mockReturnValue(true);
        const root = document.createElement("div");
        const heading = makeHeading("heading-a", 4, "Heading A");
        root.append(heading);
        const protyle = makeProtyle(root);
        const {event} = makeEvent({altKey: true, key: "5", metaKey: true});

        expect(dispatchEditorHeadingShortcut({event, keymap, nodeElement: heading, protyle})).toBe(true);

        expect(mocks.headingsLevelTransaction).toHaveBeenCalledWith(expect.objectContaining({
            headingElements: [heading],
            level: 5,
            protyle,
        }));
    });

    it("dispatches a range containing multiple headings to headingsLevelTransaction", () => {
        const root = document.createElement("div");
        const headingA = makeHeading("heading-a", 3, "Heading A");
        const paragraph = document.createElement("div");
        paragraph.dataset.nodeId = "paragraph-a";
        paragraph.dataset.type = "NodeParagraph";
        paragraph.textContent = "Paragraph";
        const headingB = makeHeading("heading-b", 4, "Heading B");
        root.append(headingA, paragraph, headingB);
        const range = document.createRange();
        range.setStartBefore(headingA);
        range.setEndAfter(headingB);
        const protyle = makeProtyle(root);
        const {event} = makeEvent({altKey: true, ctrlKey: true, key: "6"});

        expect(dispatchEditorHeadingShortcut({event, keymap, nodeElement: headingA, protyle, range})).toBe(true);

        expect(mocks.headingsLevelTransaction).toHaveBeenCalledWith(expect.objectContaining({
            headingElements: [headingA, headingB],
            level: 6,
            protyle,
            range,
        }));
    });
});
