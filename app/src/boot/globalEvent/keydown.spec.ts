import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

const mocks = vi.hoisted(() => ({
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

import {routeOutlineHeadingShortcut} from "./keydown";
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

describe("global keydown Outline heading routing", () => {
    beforeEach(() => {
        mocks.isMac.mockReturnValue(false);
        (window as never as { siyuan: Record<string, unknown> }).siyuan = {
            config: {
                readonly: false,
            },
        };
    });

    afterEach(() => {
        delete (window as never as { siyuan?: unknown }).siyuan;
        vi.clearAllMocks();
    });

    it("routes Windows/Linux Ctrl+Alt+number to exact Outline heading levels", () => {
        const outline = makeOutlineModel();
        const {event, preventDefault, stopPropagation} = makeEvent({altKey: true, ctrlKey: true, key: "3"});

        expect(routeOutlineHeadingShortcut(outline, event)).toBe(true);

        expect(outline.setHeadingLevel).toHaveBeenCalledWith(3);
        expect(outline.changeHeadingLevel).not.toHaveBeenCalled();
        expect(preventDefault).toHaveBeenCalledTimes(1);
        expect(stopPropagation).toHaveBeenCalledTimes(1);
    });

    it("routes macOS Cmd+Alt+number to exact Outline heading levels", () => {
        mocks.isMac.mockReturnValue(true);
        const outline = makeOutlineModel();
        const {event} = makeEvent({altKey: true, key: "6", metaKey: true});

        expect(routeOutlineHeadingShortcut(outline, event)).toBe(true);

        expect(outline.setHeadingLevel).toHaveBeenCalledWith(6);
        expect(outline.changeHeadingLevel).not.toHaveBeenCalled();
    });

    it("routes Alt+= and Alt+- to Outline heading upgrade and downgrade actions", () => {
        const outline = makeOutlineModel();

        expect(routeOutlineHeadingShortcut(outline, makeEvent({altKey: true, key: "="}).event)).toBe(true);
        expect(routeOutlineHeadingShortcut(outline, makeEvent({altKey: true, key: "-"}).event)).toBe(true);

        expect(outline.changeHeadingLevel).toHaveBeenNthCalledWith(1, "upgrade");
        expect(outline.changeHeadingLevel).toHaveBeenNthCalledWith(2, "downgrade");
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

        expect(outline.changeHeadingLevel).toHaveBeenCalledWith("upgrade");
        expect(outline.changeHeadingLevel).not.toHaveBeenCalledWith("upgrade", expect.anything());
    });
});
