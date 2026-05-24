import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

const mocks = vi.hoisted(() => ({
    fetchPost: vi.fn(),
    headingsLevelTransaction: vi.fn(),
    openFileById: vi.fn(),
    checkFold: vi.fn((_id: string, callback: (zoomIn: boolean) => void) => callback(false)),
    mathRender: vi.fn(),
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
    getDockByType: vi.fn(() => ({
        toggleModel: vi.fn(),
    })),
}));

vi.mock("../../util/fetch", () => ({
    fetchPost: mocks.fetchPost,
}));

vi.mock("../getAll", () => ({
    getAllModels: vi.fn(() => ({editor: []})),
}));

vi.mock("../../protyle/util/hasClosest", () => {
    const closestByClass = (element: Element, className: string) => {
        let current = element as HTMLElement | null;
        while (current) {
            if (current.classList?.contains(className)) {
                return current;
            }
            current = current.parentElement;
        }
        return null;
    };

    return {
        hasClosestBlock: vi.fn((element: Element) => closestByClass(element, "protyle-block")),
        hasClosestByClassName: vi.fn(closestByClass),
        hasClosestByTag: vi.fn((element: Element, tagName: string) => {
            let current = element as HTMLElement | null;
            while (current) {
                if (current.tagName === tagName) {
                    return current;
                }
                current = current.parentElement;
            }
            return null;
        }),
        hasTopClosestByClassName: vi.fn(() => null),
    };
});

vi.mock("../../protyle/util/compatibility", () => ({
    isInAndroid: vi.fn(() => false),
    isInHarmony: vi.fn(() => false),
    setStorageVal: vi.fn(),
    updateHotkeyAfterTip: vi.fn(() => ""),
    writeText: vi.fn(),
}));

vi.mock("../../editor/util", () => ({
    openFileById: mocks.openFileById,
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

        constructor(options: { id?: string }) {
            if (options.id) {
                this.element.setAttribute("data-id", options.id);
            }
        }
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
    checkFold: mocks.checkFold,
}));

vi.mock("../../protyle/wysiwyg/transaction", () => ({
    headingsLevelTransaction: mocks.headingsLevelTransaction,
    transaction: vi.fn(),
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

import {getAllModels} from "../getAll";
import {Outline} from "./Outline";

const makeOutline = () => {
    const panelElement = document.createElement("div");
    document.body.append(panelElement);
    const outline = new Outline({
        app: {} as never,
        tab: {
            id: "tab",
            panelElement,
        } as never,
        blockId: "root",
        type: "pin",
        isPreview: false,
    });
    return outline;
};

const makeHeadingTree = () => [
    {
        id: "parent-a",
        type: "outline",
        nodeType: "NodeHeading",
        subType: "h1",
        depth: 0,
        name: "Parent A",
        folded: true,
        blocks: [
            {
                id: "child-a",
                type: "NodeHeading",
                subType: "h2",
                depth: 1,
                content: "Child A",
                refText: "",
                defID: "",
                defPath: "",
            },
        ],
    },
    {
        id: "parent-b",
        type: "outline",
        nodeType: "NodeHeading",
        subType: "h1",
        depth: 0,
        name: "Parent B",
        folded: true,
        blocks: [
            {
                id: "child-b",
                type: "NodeHeading",
                subType: "h2",
                depth: 1,
                content: "Child B",
                refText: "",
                defID: "",
                defPath: "",
            },
        ],
    },
] as unknown as IBlockTree[];

const selectedIds = (outline: Outline, className = "b3-list-item--focus") => {
    return Array.from(outline.element.querySelectorAll(`li.${className}`)).map(item => item.getAttribute("data-node-id"));
};

const batchSelectedIds = (outline: Outline) => {
    return (outline as unknown as { getSelectedHeadingItems: () => HTMLElement[] })
        .getSelectedHeadingItems()
        .map(item => item.getAttribute("data-node-id"));
};

const clickHeading = (outline: Outline, id: string, ctrl = false) => {
    (window as never as { siyuan: { ctrlIsPressed: boolean } }).siyuan.ctrlIsPressed = ctrl;
    const element = outline.element.querySelector(`li[data-node-id="${id}"]`) as HTMLElement;
    element.dispatchEvent(new MouseEvent("click", {bubbles: true}));
    (window as never as { siyuan: { ctrlIsPressed: boolean } }).siyuan.ctrlIsPressed = false;
};

const setOutlineHeadingLevel = (outline: Outline, level: 1 | 2 | 6) => {
    outline.setHeadingLevel(level);
};

const makeEditorHeading = (id: string, level: number, text: string) => {
    return `<div data-node-id="${id}" data-type="NodeHeading" data-subtype="h${level}" class="h${level}">${text}</div>`;
};

const useEditorHeadings = (html: string) => {
    const wysiwygElement = document.createElement("div");
    wysiwygElement.innerHTML = html;
    vi.mocked(getAllModels).mockReturnValue({
        editor: [{
            editor: {
                protyle: {
                    block: {rootID: "root"},
                    wysiwyg: {element: wysiwygElement},
                },
            },
        }],
    } as never);
    return wysiwygElement;
};

describe("Outline heading selection", () => {
    beforeEach(() => {
        document.body.innerHTML = "";
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
        vi.mocked(getAllModels).mockReturnValue({editor: []} as never);
    });

    afterEach(() => {
        delete (window as never as { siyuan?: unknown }).siyuan;
        delete (globalThis as never as { Lute?: unknown }).Lute;
        vi.clearAllMocks();
    });

    it("selects a folded non-final parent without selecting hidden children", () => {
        const outline = makeOutline();
        outline.tree.updateData(makeHeadingTree());
        const parentA = outline.element.querySelector('li[data-node-id="parent-a"]') as HTMLElement;
        const parentB = outline.element.querySelector('li[data-node-id="parent-b"]') as HTMLElement;

        (outline as unknown as { lastSelectedElement: HTMLElement }).lastSelectedElement = parentA;
        (outline as unknown as { selectOutlineRange: (element: HTMLElement) => void }).selectOutlineRange(parentB);

        expect(selectedIds(outline, "b3-list-item--focus")).toEqual(["parent-a", "parent-b"]);
    });

    it("selects a folded final parent with the same parent-only rule", () => {
        const outline = makeOutline();
        outline.tree.updateData(makeHeadingTree());
        const parentB = outline.element.querySelector('li[data-node-id="parent-b"]') as HTMLElement;

        (outline as unknown as { replaceOutlineSelection: (element: HTMLElement) => void }).replaceOutlineSelection(parentB);

        expect(selectedIds(outline, "b3-list-item--focus")).toEqual(["parent-b"]);
    });

    it.todo("maps an editor DOM selection spanning multiple headings to all outline heading ids");
    // Needs a pure helper such as getHeadingIdsInEditorRange(range, root). The current public sync path accepts one block via setCurrent().

    it.todo("marks every corresponding outline heading when the editor selection spans multiple headings");
    // Needs an Outline sync method that accepts a Range or a list of heading ids instead of only the focused/current heading block.

    it("ordinary click followed by Ctrl/Cmd click keeps the first heading selected and adds the second", () => {
        const outline = makeOutline();
        outline.tree.updateData(makeHeadingTree());

        clickHeading(outline, "parent-a");
        clickHeading(outline, "parent-b", true);

        expect(selectedIds(outline)).toEqual(["parent-a", "parent-b"]);
    });

    it("ordinary left-click heading A records A in the batch command selection state", () => {
        const outline = makeOutline();
        outline.tree.updateData(makeHeadingTree());

        clickHeading(outline, "parent-a");

        expect(batchSelectedIds(outline)).toEqual(["parent-a"]);
    });

    it("left-click A then Ctrl/Cmd-click B makes the batch selection collector return A and B", () => {
        const outline = makeOutline();
        outline.tree.updateData(makeHeadingTree());

        clickHeading(outline, "parent-a");
        clickHeading(outline, "parent-b", true);

        expect(batchSelectedIds(outline)).toEqual(["parent-a", "parent-b"]);
    });

    it("multi-selecting two Outline headings immediately enters the primary multi-selection visual state", () => {
        const outline = makeOutline();
        outline.tree.updateData(makeHeadingTree());

        clickHeading(outline, "parent-a");
        clickHeading(outline, "parent-b", true);

        expect(selectedIds(outline)).toEqual(["parent-a", "parent-b"]);
        expect(outline.element.classList.contains("sy__outline--multi-select")).toBe(true);
    });

    it("Ctrl/Cmd click on an already selected heading toggles only that heading", () => {
        const outline = makeOutline();
        outline.tree.updateData(makeHeadingTree());

        clickHeading(outline, "parent-a");
        clickHeading(outline, "parent-b", true);
        clickHeading(outline, "parent-b", true);

        expect(selectedIds(outline)).toEqual(["parent-a"]);
    });

    it("Ctrl/Cmd-click an already selected heading toggles only that heading in the batch selection collector", () => {
        const outline = makeOutline();
        outline.tree.updateData(makeHeadingTree());

        clickHeading(outline, "parent-a");
        clickHeading(outline, "parent-b", true);
        clickHeading(outline, "parent-b", true);

        expect(batchSelectedIds(outline)).toEqual(["parent-a"]);
    });

    it("Outline single H3 action calls the exact H1 heading-level transaction path", () => {
        useEditorHeadings(makeEditorHeading("parent-a", 3, "Parent A"));
        const outline = makeOutline();
        outline.tree.updateData(makeHeadingTree());

        clickHeading(outline, "parent-a");
        setOutlineHeadingLevel(outline, 1);

        expect(mocks.headingsLevelTransaction).toHaveBeenCalledWith(expect.objectContaining({
            headingElements: [
                expect.objectContaining({
                    dataset: expect.objectContaining({
                        nodeId: "parent-a",
                        subtype: "h3",
                    }),
                }),
            ],
            level: 1,
        }));
    });

    it("setHeadingLevel(2) with one selected Outline heading calls the exact H2 heading-level path for that heading", () => {
        useEditorHeadings(makeEditorHeading("parent-a", 3, "Parent A"));
        const outline = makeOutline();
        outline.tree.updateData(makeHeadingTree());

        clickHeading(outline, "parent-a");
        setOutlineHeadingLevel(outline, 2);

        expect(mocks.headingsLevelTransaction).toHaveBeenCalledWith(expect.objectContaining({
            headingElements: [
                expect.objectContaining({dataset: expect.objectContaining({nodeId: "parent-a"})}),
            ],
            level: 2,
        }));
    });

    it("Outline multi-selected H2/H3 + setHeadingLevel(6) calls the exact H6 batch heading-level path for both headings", () => {
        useEditorHeadings([
            makeEditorHeading("parent-a", 2, "Parent A"),
            makeEditorHeading("parent-b", 3, "Parent B"),
        ].join(""));
        const outline = makeOutline();
        outline.tree.updateData(makeHeadingTree());

        clickHeading(outline, "parent-a");
        clickHeading(outline, "parent-b", true);
        setOutlineHeadingLevel(outline, 6);

        expect(mocks.headingsLevelTransaction).toHaveBeenCalledWith(expect.objectContaining({
            headingElements: [
                expect.objectContaining({dataset: expect.objectContaining({nodeId: "parent-a"})}),
                expect.objectContaining({dataset: expect.objectContaining({nodeId: "parent-b"})}),
            ],
            level: 6,
        }));
    });

    it("setHeadingLevel(1) and setHeadingLevel(6) are exact Outline heading-level actions, not relative upgrade/downgrade actions", () => {
        useEditorHeadings(makeEditorHeading("parent-a", 3, "Parent A"));
        const outline = makeOutline();
        outline.tree.updateData(makeHeadingTree());

        clickHeading(outline, "parent-a");
        setOutlineHeadingLevel(outline, 1);
        setOutlineHeadingLevel(outline, 6);

        expect(mocks.headingsLevelTransaction).toHaveBeenNthCalledWith(1, expect.objectContaining({level: 1}));
        expect(mocks.headingsLevelTransaction).toHaveBeenNthCalledWith(2, expect.objectContaining({level: 6}));
    });
});
