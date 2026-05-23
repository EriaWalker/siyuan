import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

const mocks = vi.hoisted(() => ({
    setFold: vi.fn(),
    fetchPost: vi.fn(),
    focusBlock: vi.fn(),
    focusByWbr: vi.fn(),
    hideElements: vi.fn(),
    processRender: vi.fn(),
    highlightRender: vi.fn(),
    avRender: vi.fn(),
    blockRender: vi.fn(),
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

import {headingsLevelTransaction} from "./transaction";

type TTestOperation = IOperation & {
    action: "update" | "foldHeading" | "unfoldHeading",
    id: string,
    data?: string
};

const makeHeading = (id: string, level: number, text: string, fold = false) => {
    return `<div data-subtype="h${level}" data-node-id="${id}" data-type="NodeHeading" class="h${level}"${fold ? ' fold="1"' : ""}><div contenteditable="true" spellcheck="false">${text}</div><div class="protyle-attr" contenteditable="false">​</div></div>`;
};

const getHeadingElements = (root: HTMLElement, ids: string[]) => {
    return ids.map(id => root.querySelector(`[data-node-id="${id}"]`) as HTMLElement);
};

const getHeadingLevel = (element: Element) => {
    return parseInt(element.getAttribute("data-subtype")?.replace("h", "") || "0");
};

const getHeadingLevels = (root: HTMLElement, hiddenHeadings = new Map<string, string[]>()) => {
    const levels: Record<string, number> = {};
    root.querySelectorAll('[data-type="NodeHeading"]').forEach(item => {
        levels[item.getAttribute("data-node-id")] = getHeadingLevel(item);
    });
    hiddenHeadings.forEach(items => {
        items.forEach(html => {
            const template = document.createElement("template");
            template.innerHTML = html;
            const heading = template.content.firstElementChild;
            levels[heading.getAttribute("data-node-id")] = getHeadingLevel(heading);
        });
    });
    return levels;
};

const blocks2Hs = (html: string, level: number) => {
    const template = document.createElement("template");
    template.innerHTML = html;
    const heading = template.content.firstElementChild as HTMLElement;
    heading.setAttribute("data-subtype", `h${level}`);
    heading.className = `h${level}`;
    return heading.outerHTML;
};

const createProtyle = (root: HTMLElement, overrideBlocks2Hs = blocks2Hs) => {
    return {
        id: "test-protyle",
        disabled: false,
        updated: false,
        transactionTime: 0,
        observerLoad: {
            disconnect: vi.fn(),
        },
        block: {
            rootID: "root",
        },
        options: {},
        wysiwyg: {
            element: root,
            lastHTMLs: {},
        },
        lute: {
            Blocks2Hs: vi.fn(overrideBlocks2Hs),
        },
        undo: {
            add: vi.fn(),
            replace: vi.fn(),
        },
    } as unknown as IProtyle;
};

const getUndoBatch = (protyle: IProtyle) => {
    const undo = protyle.undo.add as unknown as ReturnType<typeof vi.fn>;
    expect(undo).toHaveBeenCalledTimes(1);
    const [doOperations, undoOperations] = undo.mock.calls[0] as [TTestOperation[], TTestOperation[]];
    return {doOperations, undoOperations};
};

const collectDescendantHeadings = (heading: Element) => {
    const parentLevel = getHeadingLevel(heading);
    const descendants: Element[] = [];
    let nextElement = heading.nextElementSibling;
    while (nextElement) {
        if (nextElement.getAttribute("data-type") === "NodeHeading" && getHeadingLevel(nextElement) <= parentLevel) {
            break;
        }
        if (nextElement.getAttribute("data-type") === "NodeHeading") {
            descendants.push(nextElement);
        }
        nextElement = nextElement.nextElementSibling;
    }
    return descendants;
};

const applyOperations = (root: HTMLElement, operations: TTestOperation[], hiddenHeadings = new Map<string, string[]>()) => {
    operations.forEach(operation => {
        const target = root.querySelector(`[data-node-id="${operation.id}"]`) as HTMLElement;
        if (!target) {
            throw new Error(`Missing target for ${operation.action}: ${operation.id}`);
        }
        if (operation.action === "update") {
            target.outerHTML = operation.data;
            return;
        }
        if (operation.action === "foldHeading") {
            const descendants = collectDescendantHeadings(target);
            hiddenHeadings.set(operation.id, descendants.map(item => item.outerHTML));
            descendants.forEach(item => item.remove());
            target.setAttribute("fold", "1");
            return;
        }
        if (operation.action === "unfoldHeading") {
            const hidden = hiddenHeadings.get(operation.id) || [];
            target.insertAdjacentHTML("afterend", hidden.join(""));
            hiddenHeadings.delete(operation.id);
            target.removeAttribute("fold");
        }
    });
    return hiddenHeadings;
};

describe("headingsLevelTransaction", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.clearAllMocks();
        (window as any).siyuan = {
            transactions: [],
            config: {
                fileTree: {
                    openFilesUseCurrentTab: false,
                },
                sync: {},
            },
        };
        mocks.setFold.mockImplementation((protyle: IProtyle, nodeElement: Element) => {
            const id = nodeElement.getAttribute("data-node-id");
            const hasFold = nodeElement.getAttribute("fold") === "1";
            if (hasFold) {
                nodeElement.removeAttribute("fold");
                return {
                    fold: 0,
                    doOperations: [{action: "unfoldHeading", id}],
                    undoOperations: [{action: "foldHeading", id}],
                };
            }
            nodeElement.setAttribute("fold", "1");
            return {
                fold: 1,
                doOperations: [{action: "foldHeading", id}],
                undoOperations: [{action: "unfoldHeading", id}],
            };
        });
    });

    afterEach(() => {
        vi.useRealTimers();
        delete (window as any).siyuan;
    });

    it("downgrades mixed heading levels and replays undo/redo as one batch", () => {
        const root = document.createElement("div");
        root.innerHTML = [
            makeHeading("h2", 2, "H2"),
            makeHeading("h3", 3, "H3"),
            makeHeading("h6", 6, "H6"),
        ].join("");
        const protyle = createProtyle(root);

        headingsLevelTransaction({
            protyle,
            headingElements: getHeadingElements(root, ["h2", "h3", "h6"]),
            direction: "downgrade",
        });

        expect(getHeadingLevels(root)).toEqual({h2: 3, h3: 4, h6: 6});
        const {doOperations, undoOperations} = getUndoBatch(protyle);
        expect(doOperations).toHaveLength(2);
        applyOperations(root, undoOperations);
        expect(getHeadingLevels(root)).toEqual({h2: 2, h3: 3, h6: 6});
        applyOperations(root, doOperations);
        expect(getHeadingLevels(root)).toEqual({h2: 3, h3: 4, h6: 6});
    });

    it("upgrades mixed heading levels and replays undo/redo as one batch", () => {
        const root = document.createElement("div");
        root.innerHTML = [
            makeHeading("h1", 1, "H1"),
            makeHeading("h3", 3, "H3"),
            makeHeading("h4", 4, "H4"),
        ].join("");
        const protyle = createProtyle(root);

        headingsLevelTransaction({
            protyle,
            headingElements: getHeadingElements(root, ["h1", "h3", "h4"]),
            direction: "upgrade",
        });

        expect(getHeadingLevels(root)).toEqual({h1: 1, h3: 2, h4: 3});
        const {doOperations, undoOperations} = getUndoBatch(protyle);
        expect(doOperations).toHaveLength(2);
        applyOperations(root, undoOperations);
        expect(getHeadingLevels(root)).toEqual({h1: 1, h3: 3, h4: 4});
        applyOperations(root, doOperations);
        expect(getHeadingLevels(root)).toEqual({h1: 1, h3: 2, h4: 3});
    });

    it("does not create empty transactions for boundary-only operations", () => {
        const upgradeRoot = document.createElement("div");
        upgradeRoot.innerHTML = makeHeading("h1", 1, "H1");
        const upgradeProtyle = createProtyle(upgradeRoot);
        headingsLevelTransaction({
            protyle: upgradeProtyle,
            headingElements: getHeadingElements(upgradeRoot, ["h1"]),
            direction: "upgrade",
        });
        expect(getHeadingLevels(upgradeRoot)).toEqual({h1: 1});
        expect(upgradeProtyle.undo.add).not.toHaveBeenCalled();

        const downgradeRoot = document.createElement("div");
        downgradeRoot.innerHTML = makeHeading("h6", 6, "H6");
        const downgradeProtyle = createProtyle(downgradeRoot);
        headingsLevelTransaction({
            protyle: downgradeProtyle,
            headingElements: getHeadingElements(downgradeRoot, ["h6"]),
            direction: "downgrade",
        });
        expect(getHeadingLevels(downgradeRoot)).toEqual({h6: 6});
        expect(downgradeProtyle.undo.add).not.toHaveBeenCalled();
        expect((window as any).siyuan.transactions).toHaveLength(0);
    });

    it("captures folded heading undo HTML before setFold mutates the live DOM", () => {
        const root = document.createElement("div");
        root.innerHTML = makeHeading("folded", 2, "Folded", true);
        const protyle = createProtyle(root);

        headingsLevelTransaction({
            protyle,
            headingElements: getHeadingElements(root, ["folded"]),
            direction: "upgrade",
        });

        const {undoOperations} = getUndoBatch(protyle);
        const headingUndo = undoOperations.find(item => item.action === "update" && item.id === "folded");
        expect(headingUndo?.data).toContain('fold="1"');
    });

    it("skips converted headings when Blocks2Hs does not preserve the original id", () => {
        const root = document.createElement("div");
        root.innerHTML = makeHeading("heading", 2, "Heading");
        const protyle = createProtyle(root, (html, level) => {
            return blocks2Hs(html, level).replace('data-node-id="heading"', 'data-node-id="different"');
        });

        headingsLevelTransaction({
            protyle,
            headingElements: getHeadingElements(root, ["heading"]),
            direction: "upgrade",
        });

        expect(getHeadingLevels(root)).toEqual({heading: 2});
        expect(protyle.undo.add).not.toHaveBeenCalled();
        expect((window as any).siyuan.transactions).toHaveLength(0);
    });

    it("replays nested folded parent-child undo/redo safely when the parent is folded", () => {
        const root = document.createElement("div");
        root.innerHTML = [
            makeHeading("parent", 2, "Parent", true),
            makeHeading("child", 3, "Child"),
        ].join("");
        const protyle = createProtyle(root);

        headingsLevelTransaction({
            protyle,
            headingElements: getHeadingElements(root, ["parent", "child"]),
            direction: "upgrade",
        });

        expect(getHeadingLevels(root)).toEqual({parent: 1, child: 2});
        const {doOperations, undoOperations} = getUndoBatch(protyle);
        const hiddenAfterUndo = applyOperations(root, undoOperations);
        expect(getHeadingLevels(root, hiddenAfterUndo)).toEqual({parent: 2, child: 3});
        applyOperations(root, doOperations, hiddenAfterUndo);
        expect(getHeadingLevels(root)).toEqual({parent: 1, child: 2});
    });

    it("replays nested folded parent-child undo/redo safely when both headings are folded", () => {
        const root = document.createElement("div");
        root.innerHTML = [
            makeHeading("parent", 2, "Parent", true),
            makeHeading("child", 3, "Child", true),
        ].join("");
        const protyle = createProtyle(root);

        headingsLevelTransaction({
            protyle,
            headingElements: getHeadingElements(root, ["parent", "child"]),
            direction: "upgrade",
        });

        expect(getHeadingLevels(root)).toEqual({parent: 1, child: 2});
        const {doOperations, undoOperations} = getUndoBatch(protyle);
        const hiddenAfterUndo = applyOperations(root, undoOperations);
        expect(getHeadingLevels(root, hiddenAfterUndo)).toEqual({parent: 2, child: 3});
        applyOperations(root, doOperations, hiddenAfterUndo);
        expect(getHeadingLevels(root)).toEqual({parent: 1, child: 2});
    });
});
