import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

const mocks = vi.hoisted(() => ({
    fetchPost: vi.fn(),
    getAllModels: vi.fn(),
    mathRender: vi.fn(),
    transaction: vi.fn(),
}));

vi.mock("../Model", () => ({
    Model: class {
        public app: unknown;

        constructor(options: { app: unknown }) {
            this.app = options.app;
        }
    },
}));

vi.mock("../util", () => ({
    getInstanceById: vi.fn(),
    setPanelFocus: vi.fn(),
}));

vi.mock("../tabUtil", () => ({
    getDockByType: vi.fn(() => ({toggleModel: vi.fn()})),
}));

vi.mock("../../util/fetch", () => ({
    fetchPost: mocks.fetchPost,
}));

vi.mock("../getAll", () => ({
    getAllModels: mocks.getAllModels,
}));

vi.mock("../../protyle/util/hasClosest", () => ({
    hasClosestBlock: vi.fn(),
    hasClosestByClassName: vi.fn(() => null),
    hasClosestByTag: vi.fn(),
    hasTopClosestByClassName: vi.fn(() => null),
}));

vi.mock("../../protyle/util/compatibility", () => ({
    isInAndroid: vi.fn(() => false),
    isInHarmony: vi.fn(() => false),
    setStorageVal: vi.fn(),
    updateHotkeyAfterTip: vi.fn(() => ""),
    writeText: vi.fn(),
}));

vi.mock("../../editor/util", () => ({
    openFileById: vi.fn(),
}));

vi.mock("../../constants", () => ({
    Constants: {
        CB_GET_ALL: "all",
        CB_GET_CONTEXT: "context",
        CB_GET_FOCUS: "focus",
        CB_GET_HTML: "html",
        CB_GET_OUTLINE: "outline",
        CB_GET_SCROLL: "scroll",
        CB_GET_SETID: "setid",
        LOCAL_IMAGES: "local-images",
        LOCAL_OUTLINE: "local-outline",
        MENU_OUTLINE_CONTEXT: "outline-context",
        SIYUAN_APPID: "test-app",
        TIMEOUT_LOAD: 1,
        ZWSP: "\u200b",
    },
}));

vi.mock("../../menus/Menu", () => ({
    MenuItem: class {
        public element = document.createElement("button");
    },
}));

vi.mock("../../util/escape", () => ({
    escapeAriaLabel: vi.fn((value: string) => value),
    escapeAttr: vi.fn((value: string) => value),
    escapeHtml: vi.fn((value: string) => value),
}));

vi.mock("../../emoji", () => ({
    unicode2Emoji: vi.fn(() => ""),
}));

vi.mock("../../editor/getIcon", () => ({
    getIconByType: vi.fn(() => "iconHeading"),
}));

vi.mock("../../protyle/wysiwyg/getBlock", () => ({
    getPreviousBlock: vi.fn(() => null),
}));

vi.mock("../../index", () => ({
    App: class {},
}));

vi.mock("../../util/noRelyPCFunction", () => ({
    checkFold: vi.fn((_id: string, callback: (zoomIn: boolean) => void) => callback(false)),
}));

vi.mock("../../protyle/wysiwyg/transaction", () => ({
    headingsLevelTransaction: vi.fn(),
    transaction: mocks.transaction,
}));

vi.mock("../../protyle/wysiwyg/commonHotkey", () => ({
    goHome: vi.fn(),
}));

vi.mock("../../editor", () => ({
    Editor: class {},
}));

vi.mock("../../protyle/render/mathRender", () => ({
    mathRender: mocks.mathRender,
}));

vi.mock("../../block/util", () => ({
    genEmptyElement: vi.fn(),
}));

vi.mock("../../protyle/util/selection", () => ({
    focusBlock: vi.fn(),
    focusByWbr: vi.fn(),
}));

vi.mock("../../boot/globalEvent/dragover", () => ({
    dragOverScroll: vi.fn(),
    stopScrollAnimation: vi.fn(),
}));

vi.mock("../../util/functions", () => ({
    isMobile: vi.fn(() => false),
}));

import {Outline} from "./Outline";

const makeHeading = (id: string, level: number, text: string) => {
    return `<div data-subtype="h${level}" data-node-id="${id}" data-type="NodeHeading" class="h${level}"><div contenteditable="true" spellcheck="false">${text}</div><div class="protyle-attr" contenteditable="false">\u200b</div></div>`;
};

const makeOutline = () => {
    const panelElement = document.createElement("div");
    document.body.append(panelElement);
    return new Outline({
        app: {} as never,
        tab: {
            id: "tab",
            panelElement,
        } as never,
        blockId: "root",
        type: "pin",
        isPreview: false,
    });
};

const createProtyle = (root: HTMLElement) => ({
    block: {
        rootID: "root",
    },
    lute: {
        Blocks2Hs: vi.fn((html: string, level: number) => {
            const template = document.createElement("template");
            template.innerHTML = html;
            const heading = template.content.firstElementChild as HTMLElement;
            heading.setAttribute("data-subtype", `h${level}`);
            heading.className = `h${level}`;
            return heading.outerHTML;
        }),
    },
    wysiwyg: {
        element: root,
    },
}) as unknown as IProtyle;

const makeHeadingTree = () => [
    {
        id: "parent-a",
        type: "outline",
        nodeType: "NodeHeading",
        subType: "h2",
        depth: 0,
        name: "Parent A",
        folded: false,
        blocks: [{
            id: "child-a",
            type: "NodeHeading",
            subType: "h3",
            depth: 1,
            content: "Child A",
            refText: "",
            defID: "",
            defPath: "",
        }],
    },
    {
        id: "parent-b",
        type: "outline",
        nodeType: "NodeHeading",
        subType: "h2",
        depth: 0,
        name: "Parent B",
        folded: false,
        blocks: [],
    },
] as unknown as IBlockTree[];

const getHeadingLevelTransactionPayload = () => {
    const call = mocks.fetchPost.mock.calls.find(item => item[0] === "/api/block/getHeadingLevelTransaction");
    expect(call).toBeTruthy();
    return call?.[1];
};

describe("Outline transform with sub-headings", () => {
    beforeEach(() => {
        document.body.innerHTML = "";
        (HTMLElement.prototype as unknown as { scrollIntoView: () => void }).scrollIntoView = vi.fn();
        (globalThis as never as { Lute: { BlockDOM2Content: (value: string) => string } }).Lute = {
            BlockDOM2Content: (value: string) => value,
        };
        (window as never as { siyuan: Record<string, unknown> }).siyuan = {
            altIsPressed: false,
            ctrlIsPressed: false,
            shiftIsPressed: false,
            config: {
                keymap: {
                    editor: {
                        general: {
                            collapse: {custom: ""},
                            expand: {custom: ""},
                        },
                    },
                    general: {
                        closeTab: {custom: ""},
                    },
                },
                readonly: false,
            },
            isPublish: false,
            languages: {
                emptyContent: "Empty",
                expandAll: "Expand all",
                filter: "Filter",
                filterKeywordEnter: "Filter",
                foldAll: "Fold all",
                heading1: "Heading 1",
                heading2: "Heading 2",
                heading3: "Heading 3",
                heading4: "Heading 4",
                heading5: "Heading 5",
                heading6: "Heading 6",
                min: "Min",
                outline: "Outline",
                outlineKeepCurrentExpand: "Keep current",
            },
            menus: {
                menu: {
                    append: vi.fn(),
                    element: document.createElement("div"),
                    popup: vi.fn(),
                    remove: vi.fn(),
                },
            },
            storage: {
                "local-images": {file: ""},
                "local-outline": {keepCurrentExpand: false},
            },
        };
        mocks.fetchPost.mockReset();
        mocks.getAllModels.mockReset();
        mocks.mathRender.mockClear();
        mocks.transaction.mockClear();
    });

    afterEach(() => {
        delete (window as never as { siyuan?: unknown }).siyuan;
        delete (globalThis as never as { Lute?: unknown }).Lute;
    });

    it("single heading transform with sub-headings requests and replays one heading transaction", () => {
        const outline = makeOutline();
        const root = document.createElement("div");
        root.innerHTML = makeHeading("parent-a", 2, "Parent A");
        const protyle = createProtyle(root);
        const newHTML = makeHeading("parent-a", 1, "Parent A");
        mocks.getAllModels.mockReturnValue({editor: [{editor: {protyle}}]});
        mocks.fetchPost.mockImplementation((_url: string, _payload: unknown, callback: (response: unknown) => void) => {
            callback({
                data: {
                    doOperations: [{action: "update", id: "parent-a", data: newHTML}],
                    undoOperations: [{action: "update", id: "parent-a", data: makeHeading("parent-a", 2, "Parent A")}],
                },
            });
        });

        (outline as unknown as { genHeadingTransform: (id: string, level: number) => { click: () => void } })
            .genHeadingTransform("parent-a", 1)
            .click();

        expect(mocks.fetchPost).toHaveBeenCalledWith("/api/block/getHeadingLevelTransaction", {
            id: "parent-a",
            level: 1,
        }, expect.any(Function));
        expect(root.querySelector('[data-node-id="parent-a"]')?.getAttribute("data-subtype")).toBe("h1");
        expect(mocks.transaction).toHaveBeenCalledWith(protyle, [{action: "update", id: "parent-a", data: newHTML}], expect.any(Array));
    });

    it("batch transform with sub-headings emits one transaction containing all selected heading subtrees", () => {
        const outline = makeOutline();
        outline.tree.updateData(makeHeadingTree());
        mocks.getAllModels.mockReturnValue({editor: [{editor: {protyle: createProtyle(document.createElement("div"))}}]});
        (outline as unknown as { selectedHeadingIds: Set<string> }).selectedHeadingIds = new Set(["parent-a", "parent-b"]);

        (outline as unknown as { genHeadingTransform: (id: string, level: number) => { click: () => void } })
            .genHeadingTransform("parent-a", 2)
            .click();

        expect(getHeadingLevelTransactionPayload()).toEqual({
            ids: ["parent-a", "parent-b"],
            level: 2,
        });
    });

    it("nested selected headings do not double-transform the same subtree", () => {
        const outline = makeOutline();
        outline.tree.updateData(makeHeadingTree());
        mocks.getAllModels.mockReturnValue({editor: [{editor: {protyle: createProtyle(document.createElement("div"))}}]});
        (outline as unknown as { selectedHeadingIds: Set<string> }).selectedHeadingIds = new Set(["parent-a", "child-a"]);

        (outline as unknown as { genHeadingTransform: (id: string, level: number) => { click: () => void } })
            .genHeadingTransform("parent-a", 3)
            .click();

        expect(getHeadingLevelTransactionPayload()).toEqual({
            ids: ["parent-a"],
            level: 3,
        });
    });

    it.todo("undo and redo restore all affected heading subtrees");
    // Needs a pure batch transform-with-subheadings transaction helper extracted from the current menu/API replay path.

    it.todo("boundary heading levels are handled safely");
    // Needs the same pure helper so boundary-level assertions can run without Electron/menu integration.
});
