import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

const mocks = vi.hoisted(() => ({
    getInstanceById: vi.fn(),
    getAllModels: vi.fn(),
    getAllTabs: vi.fn(() => []),
    getAllDocks: vi.fn(() => []),
    headingsLevelTransaction: vi.fn(),
    isMac: vi.fn(() => false),
}));

vi.hoisted(() => {
    (globalThis as never as { SIYUAN_VERSION: string }).SIYUAN_VERSION = "0.0.0-test";
    (globalThis as never as { NODE_ENV: string }).NODE_ENV = "test";
});

vi.mock("electron", () => ({
    ipcRenderer: {
        send: vi.fn(),
    },
}));

vi.mock("../../protyle/util/compatibility", () => ({
    copyPlainText: vi.fn(),
    getEventName: vi.fn(() => "click"),
    getLocalStorage: vi.fn(() => undefined),
    isHuawei: vi.fn(() => false),
    isIPhone: vi.fn(() => false),
    isIPad: vi.fn(() => false),
    isInAndroid: vi.fn(() => false),
    isInIOS: vi.fn(() => false),
    isNotCtrl: vi.fn((event: KeyboardEvent | MouseEvent) => !event.metaKey && !event.ctrlKey),
    isOnlyMeta: vi.fn((event: KeyboardEvent | MouseEvent) => mocks.isMac() ?
        event.metaKey && !event.ctrlKey :
        !event.metaKey && event.ctrlKey),
    isMac: mocks.isMac,
    openByMobile: vi.fn(),
    readText: vi.fn(),
    setStorageVal: vi.fn(),
    updateHotkeyTip: vi.fn(),
    writeText: vi.fn(),
}));

vi.mock("../../layout/util", () => ({
    getInstanceById: mocks.getInstanceById,
    saveLayout: vi.fn(),
}));

vi.mock("../../layout/getAll", async (importOriginal) => {
    const actual = await importOriginal<typeof import("../../layout/getAll")>();
    return {
        ...actual,
        getAllDocks: mocks.getAllDocks,
        getAllModels: mocks.getAllModels,
        getAllTabs: mocks.getAllTabs,
    };
});

vi.mock("../../protyle/wysiwyg/transaction", () => ({
    headingsLevelTransaction: mocks.headingsLevelTransaction,
    transaction: vi.fn(),
}));

import {panelTreeKeydown, routeOutlineHeadingShortcut} from "./keydown";
import {Outline} from "../../layout/dock/Outline";

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

const makeOutlineModel = () => ({
    changeHeadingLevel: vi.fn(() => true),
    setHeadingLevel: vi.fn(() => true),
} as unknown as Outline & {
    changeHeadingLevel: ReturnType<typeof vi.fn>,
    setHeadingLevel: ReturnType<typeof vi.fn>,
});

type TOutlineShortcutLog = {
    data: Record<string, unknown>,
    point: string,
};

type TOutlineShortcutDebugWindow = Window & {
    __outlineShortcutLogs?: TOutlineShortcutLog[],
};

const makeEditorHeading = (id: string, level: number, text: string) => {
    return `<div data-node-id="${id}" data-type="NodeHeading" data-subtype="h${level}" class="h${level}">${text}</div>`;
};

const useEditorHeadings = (html: string) => {
    const wysiwygElement = document.createElement("div");
    wysiwygElement.innerHTML = html;
    const protyle = {
        block: {rootID: "root"},
        wysiwyg: {element: wysiwygElement},
    };
    mocks.getAllModels.mockReturnValue({
        editor: [{
            editor: {
                protyle,
            },
        }],
    });
    return protyle;
};

const makeRuntimeOutline = (selectedIds: string[], protyle: unknown) => {
    const outlinePanel = document.createElement("div");
    outlinePanel.className = "sy__outline";
    outlinePanel.dataset.id = "outline-tab";
    selectedIds.forEach(id => {
        const headingItem = document.createElement("li");
        headingItem.className = "b3-list-item b3-list-item--focus";
        headingItem.dataset.nodeId = id;
        headingItem.dataset.type = "NodeHeading";
        const textElement = document.createElement("span");
        textElement.className = "b3-list-item__text";
        textElement.textContent = id;
        headingItem.append(textElement);
        outlinePanel.append(headingItem);
    });
    document.body.append(outlinePanel);
    const outline = Object.create(Outline.prototype) as Outline;
    (outline as unknown as { blockId: string }).blockId = "root";
    (outline as unknown as { element: HTMLElement }).element = outlinePanel;
    (outline as unknown as { getProtyle: () => unknown }).getProtyle = () => protyle;
    (outline as unknown as { selectedHeadingIds: Set<string> }).selectedHeadingIds = new Set(selectedIds);
    mocks.getInstanceById.mockReturnValue({model: outline});
    return {
        outline,
        outlinePanel,
        firstHeadingItem: outlinePanel.querySelector(`[data-node-id="${selectedIds[0]}"]`) as HTMLElement,
    };
};

const setEventTarget = (event: KeyboardEvent, target: HTMLElement) => {
    Object.defineProperty(event, "target", {value: target});
};

const outlineShortcutLogs = () => ((window as TOutlineShortcutDebugWindow).__outlineShortcutLogs || []);

const expectRuntimeLogPath = (actionPoint: string) => {
    const points = outlineShortcutLogs().map(item => item.point);
    expect(points).toEqual(expect.arrayContaining([
        "panelTreeKeydown:start",
        "panelTreeKeydown:target-outline-model",
        "routeOutlineHeadingShortcut",
        actionPoint,
        "Outline:getSelectedHeadingItems",
        "Outline:getHeadingElementsForTransaction:start",
        "Outline:getHeadingElementsForTransaction:end",
        `${actionPoint}:transaction`,
    ]));
};

describe("global keydown Outline heading routing", () => {
    beforeEach(() => {
        mocks.isMac.mockReturnValue(false);
        (window as never as { siyuan: Record<string, unknown> }).siyuan = {
            config: {
                readonly: false,
                system: {
                    debugOutlineShortcut: false,
                },
            },
            layout: {
                layout: {},
            },
        };
        (window as TOutlineShortcutDebugWindow).__outlineShortcutLogs = [];
        mocks.getAllModels.mockReturnValue({editor: []});
    });

    afterEach(() => {
        delete (window as never as { siyuan?: unknown }).siyuan;
        delete (window as TOutlineShortcutDebugWindow).__outlineShortcutLogs;
        document.body.replaceChildren();
        vi.clearAllMocks();
    });

    it("routes Windows/Linux Ctrl+Alt+number to exact Outline heading levels", () => {
        const outline = makeOutlineModel();
        const {event, preventDefault, stopPropagation} = makeEvent({altKey: true, ctrlKey: true, key: "3"});

        expect(routeOutlineHeadingShortcut(outline, event)).toBe(true);

        expect(outline.setHeadingLevel).toHaveBeenCalledWith(3, undefined);
        expect(outline.changeHeadingLevel).not.toHaveBeenCalled();
        expect(preventDefault).toHaveBeenCalledTimes(1);
        expect(stopPropagation).toHaveBeenCalledTimes(1);
    });

    it("routes macOS Cmd+Alt+number to exact Outline heading levels", () => {
        mocks.isMac.mockReturnValue(true);
        const outline = makeOutlineModel();
        const {event} = makeEvent({altKey: true, key: "6", metaKey: true});

        expect(routeOutlineHeadingShortcut(outline, event)).toBe(true);

        expect(outline.setHeadingLevel).toHaveBeenCalledWith(6, undefined);
        expect(outline.changeHeadingLevel).not.toHaveBeenCalled();
    });

    it("routes Alt+= on one selected Outline heading to upgrade", () => {
        const outline = makeOutlineModel();
        const {event} = makeEvent({altKey: true, key: "="});

        expect(routeOutlineHeadingShortcut(outline, event)).toBe(true);

        expect(outline.changeHeadingLevel).toHaveBeenCalledWith("upgrade", undefined);
        expect(outline.setHeadingLevel).not.toHaveBeenCalled();
    });

    it("routes Alt+- on one selected Outline heading to downgrade", () => {
        const outline = makeOutlineModel();
        const {event} = makeEvent({altKey: true, key: "-"});

        expect(routeOutlineHeadingShortcut(outline, event)).toBe(true);

        expect(outline.changeHeadingLevel).toHaveBeenCalledWith("downgrade", undefined);
        expect(outline.setHeadingLevel).not.toHaveBeenCalled();
    });

    it("does not route legacy Alt++ through the Outline shortcut path", () => {
        const outline = makeOutlineModel();
        const {event, preventDefault, stopPropagation} = makeEvent({altKey: true, key: "+"});

        expect(routeOutlineHeadingShortcut(outline, event)).toBe(false);

        expect(outline.setHeadingLevel).not.toHaveBeenCalled();
        expect(outline.changeHeadingLevel).not.toHaveBeenCalled();
        expect(preventDefault).not.toHaveBeenCalled();
        expect(stopPropagation).not.toHaveBeenCalled();
    });

    it("lets the Outline action method preserve multi-selection resolution", () => {
        const outline = makeOutlineModel();
        const {event} = makeEvent({altKey: true, key: "="});

        expect(routeOutlineHeadingShortcut(outline, event)).toBe(true);

        expect(outline.changeHeadingLevel).toHaveBeenCalledWith("upgrade", undefined);
        expect(outline.changeHeadingLevel).not.toHaveBeenCalledWith("upgrade", expect.any(HTMLElement));
    });

    it("routes a real Outline panel keydown from the event target even when another tab is active", () => {
        const activeEditor = document.createElement("div");
        activeEditor.className = "layout__tab--active";
        const outlinePanel = document.createElement("div");
        outlinePanel.className = "sy__outline";
        outlinePanel.dataset.id = "outline-tab";
        const headingItem = document.createElement("li");
        headingItem.dataset.nodeId = "heading-a";
        outlinePanel.append(headingItem);
        document.body.append(activeEditor, outlinePanel);
        const outline = makeOutlineModel();
        Object.setPrototypeOf(outline, Outline.prototype);
        mocks.getInstanceById.mockReturnValue({model: outline});
        const {event, preventDefault, stopPropagation} = makeEvent({altKey: true, code: "Equal", key: "Dead"});
        Object.defineProperty(event, "target", {value: headingItem});

        expect(panelTreeKeydown({plugins: []} as never, event)).toBe(true);

        expect(mocks.getInstanceById).toHaveBeenCalledWith("outline-tab", {});
        expect(outline.changeHeadingLevel).toHaveBeenCalledWith("upgrade", headingItem);
        expect(preventDefault).toHaveBeenCalledTimes(1);
        expect(stopPropagation).toHaveBeenCalledTimes(1);
    });

    it("routes an Outline-origin Alt+= shortcut before the generic ignored-target guard", () => {
        const outlinePanel = document.createElement("div");
        outlinePanel.className = "sy__outline";
        outlinePanel.dataset.id = "outline-tab";
        const headingItem = document.createElement("li");
        headingItem.className = "b3-list-item";
        headingItem.dataset.nodeId = "heading-a";
        const input = document.createElement("input");
        headingItem.append(input);
        outlinePanel.append(headingItem);
        document.body.append(outlinePanel);
        const outline = makeOutlineModel();
        Object.setPrototypeOf(outline, Outline.prototype);
        mocks.getInstanceById.mockReturnValue({model: outline});
        const {event, preventDefault, stopPropagation} = makeEvent({altKey: true, key: "="});
        Object.defineProperty(event, "target", {value: input});

        expect(panelTreeKeydown({plugins: []} as never, event)).toBe(true);

        expect(mocks.getInstanceById).toHaveBeenCalledWith("outline-tab", {});
        expect(outline.changeHeadingLevel).toHaveBeenCalledWith("upgrade", headingItem);
        expect(preventDefault).toHaveBeenCalledTimes(1);
        expect(stopPropagation).toHaveBeenCalledTimes(1);
    });

    it("routes an Outline-origin Ctrl+Alt+number shortcut without an active panel", () => {
        const outlinePanel = document.createElement("div");
        outlinePanel.className = "sy__outline";
        outlinePanel.dataset.id = "outline-tab";
        const headingItem = document.createElement("li");
        headingItem.className = "b3-list-item";
        headingItem.dataset.nodeId = "heading-a";
        outlinePanel.append(headingItem);
        document.body.append(outlinePanel);
        const outline = makeOutlineModel();
        Object.setPrototypeOf(outline, Outline.prototype);
        mocks.getInstanceById.mockReturnValue({model: outline});
        const {event, preventDefault, stopPropagation} = makeEvent({altKey: true, ctrlKey: true, key: "3"});
        Object.defineProperty(event, "target", {value: headingItem});

        expect(panelTreeKeydown({plugins: []} as never, event)).toBe(true);

        expect(mocks.getInstanceById).toHaveBeenCalledWith("outline-tab", {});
        expect(outline.setHeadingLevel).toHaveBeenCalledWith(3, headingItem);
        expect(preventDefault).toHaveBeenCalledTimes(1);
        expect(stopPropagation).toHaveBeenCalledTimes(1);
    });

    it.each([
        {
            name: "ignored target Alt+=",
            activePanel: "none",
            eventInit: {altKey: true, key: "="},
            ignoredTarget: true,
            expectedActionPoint: "Outline:changeHeadingLevel",
            expectedDirection: "upgrade",
            expectedHeadingIds: ["heading-a"],
            selectedIds: ["heading-a"],
        },
        {
            name: "ignored target Alt+-",
            activePanel: "none",
            eventInit: {altKey: true, key: "-"},
            ignoredTarget: true,
            expectedActionPoint: "Outline:changeHeadingLevel",
            expectedDirection: "downgrade",
            expectedHeadingIds: ["heading-a"],
            selectedIds: ["heading-a"],
        },
        {
            name: "no active panel Alt+=",
            activePanel: "none",
            eventInit: {altKey: true, key: "="},
            expectedActionPoint: "Outline:changeHeadingLevel",
            expectedDirection: "upgrade",
            expectedHeadingIds: ["heading-a", "heading-b"],
            selectedIds: ["heading-a", "heading-b"],
        },
        {
            name: "no active panel Alt+-",
            activePanel: "none",
            eventInit: {altKey: true, key: "-"},
            expectedActionPoint: "Outline:changeHeadingLevel",
            expectedDirection: "downgrade",
            expectedHeadingIds: ["heading-a", "heading-b"],
            selectedIds: ["heading-a", "heading-b"],
        },
        {
            name: "no active panel Ctrl+Alt+3",
            activePanel: "none",
            eventInit: {altKey: true, ctrlKey: true, key: "3"},
            expectedActionPoint: "Outline:setHeadingLevel",
            expectedHeadingIds: ["heading-a", "heading-b"],
            expectedLevel: 3,
            selectedIds: ["heading-a", "heading-b"],
        },
        {
            name: "another active tab Ctrl+Alt+3",
            activePanel: "other",
            eventInit: {altKey: true, ctrlKey: true, key: "3"},
            expectedActionPoint: "Outline:setHeadingLevel",
            expectedHeadingIds: ["heading-a", "heading-b"],
            expectedLevel: 3,
            selectedIds: ["heading-a", "heading-b"],
        },
    ])("verifies the runtime Outline shortcut path reaches headingsLevelTransaction: $name", (scenario) => {
        (window.siyuan.config.system as { debugOutlineShortcut: boolean }).debugOutlineShortcut = true;
        if (scenario.activePanel === "other") {
            const activeEditor = document.createElement("div");
            activeEditor.className = "layout__tab--active sy__file";
            document.body.append(activeEditor);
        }
        const protyle = useEditorHeadings(scenario.selectedIds.map((id, index) => makeEditorHeading(id, index + 2, id)).join(""));
        const {firstHeadingItem} = makeRuntimeOutline(scenario.selectedIds, protyle);
        const shortcutTarget = scenario.ignoredTarget ? document.createElement("input") : firstHeadingItem;
        if (scenario.ignoredTarget) {
            firstHeadingItem.append(shortcutTarget);
        }
        const {event, preventDefault, stopPropagation} = makeEvent(scenario.eventInit);
        setEventTarget(event, shortcutTarget);

        expect(panelTreeKeydown({plugins: []} as never, event)).toBe(true);

        expectRuntimeLogPath(scenario.expectedActionPoint);
        expect(outlineShortcutLogs()).not.toContainEqual(expect.objectContaining({
            point: "panelTreeKeydown:early-return",
        }));
        expect(mocks.getInstanceById).toHaveBeenCalledWith("outline-tab", {});
        expect(mocks.headingsLevelTransaction).toHaveBeenCalledTimes(1);
        const expectedTransaction = {
            headingElements: scenario.expectedHeadingIds.map(id =>
                expect.objectContaining({dataset: expect.objectContaining({nodeId: id})})
            ),
            ...(scenario.expectedDirection ? {direction: scenario.expectedDirection} : {}),
            ...(scenario.expectedLevel ? {level: scenario.expectedLevel} : {}),
        };
        expect(mocks.headingsLevelTransaction).toHaveBeenCalledWith(expect.objectContaining(expectedTransaction));
        expect(outlineShortcutLogs()).toContainEqual(expect.objectContaining({
            point: "Outline:getSelectedHeadingItems",
            data: expect.objectContaining({
                selectedHeadingIds: scenario.selectedIds,
                selectedItemsLength: scenario.selectedIds.length,
            }),
        }));
        expect(outlineShortcutLogs()).toContainEqual(expect.objectContaining({
            point: "Outline:getHeadingElementsForTransaction:end",
            data: expect.objectContaining({
                headingElementIds: scenario.expectedHeadingIds,
                headingElementsLength: scenario.expectedHeadingIds.length,
            }),
        }));
        expect(preventDefault).toHaveBeenCalledTimes(1);
        expect(stopPropagation).toHaveBeenCalledTimes(1);
    });
});
