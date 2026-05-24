import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

const mocks = vi.hoisted(() => ({
    avRender: vi.fn(),
    blockRender: vi.fn(),
    fetchPost: vi.fn(),
    focusBlock: vi.fn(),
    focusByWbr: vi.fn(),
    hideElements: vi.fn(),
    highlightRender: vi.fn(),
    processRender: vi.fn(),
    setFold: vi.fn(),
}));

vi.mock("../../util/fetch", () => ({
    fetchPost: mocks.fetchPost,
    fetchSyncPost: vi.fn(),
}));

vi.mock("../../constants", () => ({
    Constants: {
        SIYUAN_APPID: "test-app",
        SIZE_UNDO: 128,
        TIMEOUT_INPUT: 1,
        ZWSP: "\u200b",
    },
}));

vi.mock("../util/selection", () => ({
    focusBlock: mocks.focusBlock,
    focusByWbr: mocks.focusByWbr,
    focusSideBlock: vi.fn(),
    getEditorRange: vi.fn(),
}));

vi.mock("./getBlock", () => ({
    getContenteditableElement: vi.fn(),
    getFirstBlock: vi.fn((element: Element) => element),
    getTopAloneElement: vi.fn((element: Element) => element),
}));

vi.mock("../render/blockRender", () => ({
    blockRender: mocks.blockRender,
}));

vi.mock("../util/processCode", () => ({
    processRender: mocks.processRender,
}));

vi.mock("../render/highlightRender", () => ({
    highlightRender: mocks.highlightRender,
    lineNumberRender: vi.fn(),
}));

vi.mock("../util/hasClosest", () => ({
    hasClosestBlock: vi.fn(),
    hasClosestByAttribute: vi.fn(),
    hasTopClosestByAttribute: vi.fn(),
    isInEmbedBlock: vi.fn(() => false),
}));

vi.mock("../../menus/protyle", () => ({
    setFold: mocks.setFold,
    zoomOut: vi.fn(),
}));

vi.mock("../util/onGet", () => ({
    disabledProtyle: vi.fn(),
    enableProtyle: vi.fn(),
    onGet: vi.fn(),
}));

vi.mock("../../layout/getAll", () => ({
    getAllModels: vi.fn(() => ({editor: []})),
}));

vi.mock("../render/av/render", () => ({
    avRender: mocks.avRender,
    refreshAV: vi.fn(),
}));

vi.mock("../util/heading", () => ({
    removeFoldHeading: vi.fn(),
}));

vi.mock("../../block/util", () => ({
    cancelSB: vi.fn(),
    genEmptyElement: vi.fn(),
    genSBElement: vi.fn(),
}));

vi.mock("../ui/hideElements", () => ({
    hideElements: mocks.hideElements,
}));

vi.mock("../util/reload", () => ({
    reloadProtyle: vi.fn(),
}));

vi.mock("../../layout/status", () => ({
    countBlockWord: vi.fn(),
}));

vi.mock("../../layout/dock/Backlink", () => ({
    Backlink: class {},
}));

vi.mock("../../layout/util", () => ({
    getInstanceById: vi.fn(),
}));

vi.mock("../../util/needSubscribe", () => ({
    isPaidUser: vi.fn(() => false),
    needSubscribe: vi.fn(() => false),
}));

vi.mock("../util/resize", () => ({
    resize: vi.fn(),
}));

vi.mock("../render/util", () => ({
    processClonePHElement: vi.fn((element: Element) => element),
}));

vi.mock("../../util/highlightById", () => ({
    scrollCenter: vi.fn(),
}));

import {turnsIntoTransaction} from "./transaction";

type TTestOperation = IOperation & {
    action: "update",
    id: string,
    data: string
};

const makeHeading = (id: string, level: number, text: string) => {
    return `<div data-subtype="h${level}" data-node-id="${id}" data-type="NodeHeading" class="h${level}"><div contenteditable="true" spellcheck="false">${text}</div><div class="protyle-attr" contenteditable="false">\u200b</div></div>`;
};

const getHeadingLevel = (element: Element) => parseInt(element.getAttribute("data-subtype")?.replace("h", "") || "0");

const getHeadingLevels = (root: HTMLElement) => {
    const levels: Record<string, number> = {};
    root.querySelectorAll('[data-type="NodeHeading"]').forEach(item => {
        levels[item.getAttribute("data-node-id")] = getHeadingLevel(item);
    });
    return levels;
};

const getSelectedHeadings = (root: HTMLElement) => {
    return Array.from(root.querySelectorAll(".protyle-wysiwyg--select")) as HTMLElement[];
};

const blocks2Hs = (html: string, level: number) => {
    const template = document.createElement("template");
    template.innerHTML = html;
    const heading = template.content.firstElementChild as HTMLElement;
    heading.setAttribute("data-subtype", `h${level}`);
    heading.className = `h${level}`;
    return heading.outerHTML;
};

const createProtyle = (root: HTMLElement) => {
    return {
        id: "test-protyle",
        disabled: false,
        updated: false,
        transactionTime: 0,
        observerLoad: {
            disconnect: vi.fn(),
        },
        block: {
            parentID: "root",
            rootID: "root",
        },
        options: {},
        scroll: {
            lastScrollTop: 0,
        },
        wysiwyg: {
            element: root,
            lastHTMLs: {},
        },
        lute: {
            Blocks2Hs: vi.fn(blocks2Hs),
        },
        undo: {
            add: vi.fn(),
            replace: vi.fn(),
        },
    } as unknown as IProtyle;
};

const runBatchHeadingShortcut = (level: number) => {
    const root = document.createElement("div");
    root.innerHTML = [
        makeHeading("heading-a", 3, "Heading A"),
        makeHeading("heading-b", 4, "Heading B"),
    ].join("");
    root.querySelectorAll('[data-type="NodeHeading"]').forEach(item => item.classList.add("protyle-wysiwyg--select"));
    const protyle = createProtyle(root);

    turnsIntoTransaction({
        protyle,
        selectsElement: getSelectedHeadings(root),
        type: "Blocks2Hs",
        level,
    });

    const undo = protyle.undo.add as unknown as ReturnType<typeof vi.fn>;
    expect(undo).toHaveBeenCalledTimes(1);
    const [doOperations] = undo.mock.calls[0] as [TTestOperation[], TTestOperation[]];
    return {doOperations, root};
};

describe("editor exact heading level shortcut transactions", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.clearAllMocks();
        (window as never as { siyuan: Record<string, unknown> }).siyuan = {
            transactions: [],
            config: {
                fileTree: {
                    openFilesUseCurrentTab: false,
                },
                sync: {},
            },
        };
    });

    afterEach(() => {
        vi.clearAllTimers();
        delete (window as never as { siyuan?: unknown }).siyuan;
        vi.useRealTimers();
    });

    it("Ctrl+Alt+1 transaction-layer input maps pre-collected editor heading blocks to exact H1", () => {
        const {doOperations, root} = runBatchHeadingShortcut(1);

        // Transaction-layer only: this test starts after shortcut dispatch has already collected selected heading elements.
        expect(getHeadingLevels(root)).toEqual({"heading-a": 1, "heading-b": 1});
        expect(doOperations.map(item => item.id)).toEqual(["heading-a", "heading-b"]);
        expect(doOperations.every(item => item.data.includes('data-subtype="h1"'))).toBe(true);
    });

    it("Ctrl+Alt+2 transaction-layer input maps pre-collected editor heading blocks to exact H2", () => {
        const {doOperations, root} = runBatchHeadingShortcut(2);

        // Transaction-layer only: this does not cover real keyboard dispatch or Outline multi-selection collection.
        expect(getHeadingLevels(root)).toEqual({"heading-a": 2, "heading-b": 2});
        expect(doOperations.map(item => item.id)).toEqual(["heading-a", "heading-b"]);
        expect(doOperations.every(item => item.data.includes('data-subtype="h2"'))).toBe(true);
    });

    it("Ctrl+Alt+6 transaction-layer input maps pre-collected editor heading blocks to exact H6", () => {
        const {doOperations, root} = runBatchHeadingShortcut(6);

        // Transaction-layer only: Ctrl+Alt+number is the exact-level shortcut family; Alt++/Alt+- are separate relative shortcuts.
        expect(getHeadingLevels(root)).toEqual({"heading-a": 6, "heading-b": 6});
        expect(doOperations.map(item => item.id)).toEqual(["heading-a", "heading-b"]);
        expect(doOperations.every(item => item.data.includes('data-subtype="h6"'))).toBe(true);
    });
});
