#!/usr/bin/env node

/*
 * Dev-only real UI diagnostic runner for Outline heading shortcuts.
 *
 * Preferred use:
 *   pnpm -C app start -- --remote-debugging-port=9229 --workspace=F:\SiYuan\test-workspace
 *   node --experimental-strip-types app/scripts/outline-shortcut-runtime-check.ts --cdp-url=http://127.0.0.1:9229
 *
 * Fallback:
 *   node --experimental-strip-types app/scripts/outline-shortcut-runtime-check.ts --print-fallback
 */

const childProcess = require("child_process");
const fs = require("fs");
const http = require("http");
const path = require("path");

const DEFAULT_CDP_URL = "http://127.0.0.1:9229";
const DEFAULT_KERNEL_PORT = "6806";
const WAIT_TIMEOUT_MS = 60000;

const cases = [
    {caseName: "single Alt+=", shortcut: "Alt+=", multi: false, key: "=", code: "Equal", modifiers: ["Alt"]},
    {caseName: "single Alt+-", shortcut: "Alt+-", multi: false, key: "-", code: "Minus", modifiers: ["Alt"]},
    {caseName: "multi Alt+=", shortcut: "Alt+=", multi: true, key: "=", code: "Equal", modifiers: ["Alt"]},
    {caseName: "multi Alt+-", shortcut: "Alt+-", multi: true, key: "-", code: "Minus", modifiers: ["Alt"]},
    {caseName: "multi Ctrl+Alt+3", shortcut: "Ctrl+Alt+3", multi: true, key: "3", code: "Digit3", modifiers: ["Control", "Alt"]},
];

const BROWSER_HELPER_SOURCE = String.raw`
(() => {
    const classify = (caseName, shortcut, rawLogs) => {
        const logs = Array.isArray(rawLogs) ? rawLogs : [];
        const hasPoint = (point) => logs.some((item) => item && item.point === point);
        const firstPoint = (point) => logs.find((item) => item && item.point === point);
        const selectedLog = firstPoint("Outline:getSelectedHeadingItems");
        const headingEndLog = firstPoint("Outline:getHeadingElementsForTransaction:end");
        const earlyReturn = firstPoint("panelTreeKeydown:early-return");
        return {
            caseName,
            shortcut,
            sawWindowKeyDown: hasPoint("windowKeyDown"),
            sawPanelTreeKeydownStart: hasPoint("panelTreeKeydown:start"),
            sawTargetOutlineModel: hasPoint("panelTreeKeydown:target-outline-model") || hasPoint("panelTreeKeydown:model"),
            sawRouteOutlineHeadingShortcut: hasPoint("routeOutlineHeadingShortcut"),
            sawOutlineAction: hasPoint("Outline:changeHeadingLevel") || hasPoint("Outline:setHeadingLevel"),
            sawSelectedHeadingItems: hasPoint("Outline:getSelectedHeadingItems"),
            selectedItemsLength: selectedLog?.data?.selectedItemsLength ?? null,
            headingElementsLength: headingEndLog?.data?.headingElementsLength ?? null,
            sawTransaction: hasPoint("Outline:changeHeadingLevel:transaction") || hasPoint("Outline:setHeadingLevel:transaction"),
            earlyReturnReason: earlyReturn?.data?.reason ?? null,
            rawLogs: logs,
        };
    };

    const enable = () => {
        if (!window.siyuan) {
            throw new Error("window.siyuan is not available yet");
        }
        window.siyuan.config = window.siyuan.config || {};
        window.siyuan.config.system = window.siyuan.config.system || {};
        window.siyuan.config.system.debugOutlineShortcut = true;
        window.__outlineShortcutLogs = [];
    };

    const outline = () => document.querySelector(".sy__outline");
    const postJSON = async (url, data) => {
        const response = await fetch(url, {
            body: JSON.stringify(data),
            headers: {"Content-Type": "application/json"},
            method: "POST",
        });
        return response.json();
    };
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const allHeadingItems = () => Array.from(document.querySelectorAll('.sy__outline li[data-node-id][data-type="NodeHeading"]'))
        .filter((item) => item instanceof HTMLElement);
    const headingItems = () => allHeadingItems().filter((item) => item.offsetParent !== null);

    const waitForHeadingItems = async (count) => {
        const started = Date.now();
        while (Date.now() - started < 20000) {
            const visibleItems = headingItems();
            if (visibleItems.length >= count) {
                return visibleItems;
            }
            await delay(500);
        }
        return headingItems();
    };

    const ensureDiagnosticDocument = async (minimumHeadingCount) => {
        if (headingItems().length >= minimumHeadingCount) {
            return;
        }
        const notebooksResponse = await postJSON("/api/notebook/lsNotebooks", {});
        const notebook = notebooksResponse?.data?.notebooks?.find((item) => !item.closed) ||
            notebooksResponse?.data?.notebooks?.[0];
        if (!notebook?.id) {
            throw new Error("No open notebook is available for creating the runtime diagnostic document");
        }
        const createResponse = await postJSON("/api/filetree/createDocWithMd", {
            markdown: "# Outline Shortcut Runtime H1\n\n## Outline Shortcut Runtime H2\n",
            notebook: notebook.id,
            path: "/outline-shortcut-runtime-" + Date.now(),
        });
        const id = createResponse?.data;
        if (!id) {
            throw new Error("Failed to create runtime diagnostic document: " + JSON.stringify(createResponse));
        }
        if (typeof window.openFileByURL !== "function" || !window.openFileByURL("siyuan://blocks/" + id)) {
            throw new Error("window.openFileByURL could not open the runtime diagnostic document");
        }
        const items = await waitForHeadingItems(minimumHeadingCount);
        if (items.length < minimumHeadingCount) {
            throw new Error("Runtime diagnostic document opened, but Outline has " + items.length + "/" + minimumHeadingCount + " visible heading item(s)");
        }
    };

    const mouse = (element, type, options = {}) => {
        element.dispatchEvent(new MouseEvent(type, {
            bubbles: true,
            cancelable: true,
            view: window,
            ...options,
        }));
    };

    const clickHeading = (element, options = {}) => {
        const previousCtrl = window.siyuan.ctrlIsPressed;
        const previousAlt = window.siyuan.altIsPressed;
        const previousShift = window.siyuan.shiftIsPressed;
        window.siyuan.ctrlIsPressed = Boolean(options.ctrlKey || options.metaKey);
        window.siyuan.altIsPressed = Boolean(options.altKey);
        window.siyuan.shiftIsPressed = Boolean(options.shiftKey);
        element.scrollIntoView({block: "center", inline: "nearest"});
        try {
            mouse(element, "pointerdown", options);
            mouse(element, "mousedown", options);
            mouse(element, "mouseup", options);
            mouse(element, "click", options);
        } finally {
            window.siyuan.ctrlIsPressed = previousCtrl;
            window.siyuan.altIsPressed = previousAlt;
            window.siyuan.shiftIsPressed = previousShift;
        }
    };

    const prepareCase = async (caseConfig) => {
        enable();
        const outlineElement = outline();
        if (!outlineElement) {
            throw new Error("Outline panel .sy__outline was not found");
        }
        await ensureDiagnosticDocument(caseConfig.multi ? 2 : 1);
        const items = headingItems();
        if (items.length === 0) {
            throw new Error("No visible Outline heading item was found; total hidden/visible heading items=" + allHeadingItems().length);
        }
        clickHeading(items[0]);
        if (caseConfig.multi) {
            if (items.length < 2) {
                throw new Error("Multi-select case requires at least two Outline heading items");
            }
            clickHeading(items[1], {ctrlKey: true, metaKey: navigator.platform.toLowerCase().includes("mac")});
        }
        if (!items[0].hasAttribute("tabindex")) {
            items[0].setAttribute("tabindex", "-1");
        }
        items[0].focus({preventScroll: true});
        window.__outlineShortcutTarget = items[0];
        window.__outlineShortcutLogs = [];
        return {
            headingIds: items.slice(0, caseConfig.multi ? 2 : 1).map((item) => item.getAttribute("data-node-id")),
            outlineFound: true,
        };
    };

    const dispatchSyntheticShortcut = (caseConfig) => {
        const target = window.__outlineShortcutTarget || document.activeElement || document.body;
        const modifierState = {
            altKey: caseConfig.modifiers.includes("Alt"),
            ctrlKey: caseConfig.modifiers.includes("Control"),
            metaKey: caseConfig.modifiers.includes("Meta"),
            shiftKey: caseConfig.modifiers.includes("Shift"),
        };
        const keydown = new KeyboardEvent("keydown", {
            bubbles: true,
            cancelable: true,
            code: caseConfig.code,
            key: caseConfig.key,
            ...modifierState,
        });
        target.dispatchEvent(keydown);
        const keyup = new KeyboardEvent("keyup", {
            bubbles: true,
            cancelable: true,
            code: caseConfig.code,
            key: caseConfig.key,
            ...modifierState,
        });
        target.dispatchEvent(keyup);
    };

    const collect = (caseConfig) => classify(caseConfig.caseName, caseConfig.shortcut, window.__outlineShortcutLogs || []);

    window.__outlineShortcutRuntime = {
        classify,
        collect,
        dispatchSyntheticShortcut,
        enable,
        prepareCase,
    };

    window.__runOutlineShortcutDiagnostics = async () => {
        const cases = __OUTLINE_SHORTCUT_CASES__;
        const reports = [];
        for (const caseConfig of cases) {
            try {
                await prepareCase(caseConfig);
                dispatchSyntheticShortcut(caseConfig);
                reports.push(collect(caseConfig));
            } catch (error) {
                reports.push({
                    caseName: caseConfig.caseName,
                    shortcut: caseConfig.shortcut,
                    error: error instanceof Error ? error.message : String(error),
                    rawLogs: window.__outlineShortcutLogs || [],
                });
            }
        }
        return reports;
    };

    return true;
})()
`;

const FALLBACK_SNIPPET = BROWSER_HELPER_SOURCE.replace("__OUTLINE_SHORTCUT_CASES__", JSON.stringify(cases, null, 4)) +
    "\n\nawait window.__runOutlineShortcutDiagnostics();";

const parseArgs = () => {
    const args = process.argv.slice(2);
    const options = {
        cdpUrl: "",
        kernelPort: DEFAULT_KERNEL_PORT,
        launch: false,
        printFallback: false,
        workspace: "",
    };
    args.forEach((arg) => {
        if (arg === "--launch") {
            options.launch = true;
        } else if (arg === "--print-fallback") {
            options.printFallback = true;
        } else if (arg.startsWith("--cdp-url=")) {
            options.cdpUrl = arg.slice("--cdp-url=".length);
        } else if (arg.startsWith("--kernel-port=")) {
            options.kernelPort = arg.slice("--kernel-port=".length);
        } else if (arg.startsWith("--workspace=")) {
            options.workspace = arg.slice("--workspace=".length);
        }
    });
    return options;
};

const readJson = (url) => new Promise((resolve, reject) => {
    const request = http.get(url, (response) => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
            body += chunk;
        });
        response.on("end", () => {
            try {
                resolve(JSON.parse(body));
            } catch (error) {
                reject(error);
            }
        });
    });
    request.on("error", reject);
    request.setTimeout(5000, () => {
        request.destroy(new Error(`Timed out reading ${url}`));
    });
});

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const readEndpoint = async (cdpUrl, pathName) => {
    const url = `${cdpUrl.replace(/\/$/, "")}${pathName}`;
    try {
        return {
            ok: true,
            result: await readJson(url),
            url,
        };
    } catch (error) {
        return {
            error: error instanceof Error ? error.message : String(error),
            ok: false,
            url,
        };
    }
};

const targetRejectionReason = (target) => {
    if (target.type !== "page") {
        return `type ${target.type} is not page`;
    }
    if (typeof target.webSocketDebuggerUrl !== "string") {
        return "missing webSocketDebuggerUrl";
    }
    if (target.url.includes("/appearance/boot/")) {
        return "boot page, not app renderer";
    }
    if (!target.url.includes("/stage/build/app") && !target.url.includes("127.0.0.1") && !target.url.includes("localhost")) {
        return `URL does not look like SiYuan app renderer: ${target.url}`;
    }
    return "";
};

const inspectTargets = (targets) => targets.map((target) => {
    const rejectionReason = targetRejectionReason(target);
    return {
        accepted: rejectionReason === "",
        id: target.id,
        rejectionReason,
        title: target.title,
        type: target.type,
        url: target.url,
    };
});

const getExistingElectronProcesses = () => {
    if (process.platform !== "win32") {
        return [];
    }
    try {
        const output = childProcess.execFileSync("powershell", [
            "-NoProfile",
            "-Command",
            "Get-CimInstance Win32_Process | Where-Object { $_.Name -like 'electron*' -or $_.Name -like 'SiYuan-Kernel*' } | ForEach-Object { [pscustomobject]@{ ProcessId=$_.ProcessId; Name=$_.Name; CommandLine=$_.CommandLine } } | ConvertTo-Json -Compress",
        ], {encoding: "utf8"});
        if (!output.trim()) {
            return [];
        }
        const parsed = JSON.parse(output);
        return Array.isArray(parsed) ? parsed : [parsed];
    } catch (error) {
        return [{
            error: error instanceof Error ? error.message : String(error),
        }];
    }
};

const waitForKernel = async (kernelPort, diagnostics) => {
    const kernelUrl = `http://127.0.0.1:${kernelPort}`;
    const started = Date.now();
    while (Date.now() - started < WAIT_TIMEOUT_MS) {
        const version = await readEndpoint(kernelUrl, "/api/system/version");
        diagnostics.kernelVersion = version;
        diagnostics.kernelReachable = version.ok;
        if (version.ok) {
            return;
        }
        await delay(1000);
    }
    diagnostics.kernelStartupTimedOut = true;
    throw new Error(`Kernel did not become reachable at ${kernelUrl}`);
};

const waitForTargets = async (cdpUrl, diagnostics) => {
    const started = Date.now();
    while (Date.now() - started < WAIT_TIMEOUT_MS) {
        diagnostics.version = await readEndpoint(cdpUrl, "/json/version");
        diagnostics.portReachable = diagnostics.version.ok;
        const list = await readEndpoint(cdpUrl, "/json/list");
        diagnostics.list = list;
        if (list.ok) {
            diagnostics.targets = list.result;
            diagnostics.targetDecisions = inspectTargets(list.result);
            const page = list.result.find((target) => targetRejectionReason(target) === "");
            if (page) {
                diagnostics.acceptedTarget = {
                    id: page.id,
                    title: page.title,
                    url: page.url,
                };
                return page;
            }
        }
        await delay(1000);
    }
    diagnostics.startupTimedOut = true;
    throw new Error(`No debuggable Electron page found at ${cdpUrl}`);
};

class CDPSession {
    constructor(wsUrl) {
        this.nextId = 1;
        this.pending = new Map();
        this.ws = new WebSocket(wsUrl);
    }

    async open() {
        await new Promise((resolve, reject) => {
            this.ws.addEventListener("open", resolve, {once: true});
            this.ws.addEventListener("error", reject, {once: true});
        });
        this.ws.addEventListener("message", (event) => {
            const message = JSON.parse(event.data);
            if (!message.id || !this.pending.has(message.id)) {
                return;
            }
            const {resolve, reject} = this.pending.get(message.id);
            this.pending.delete(message.id);
            if (message.error) {
                reject(new Error(message.error.message || JSON.stringify(message.error)));
            } else {
                resolve(message.result);
            }
        });
    }

    send(method, params = {}) {
        const id = this.nextId++;
        this.ws.send(JSON.stringify({id, method, params}));
        return new Promise((resolve, reject) => {
            this.pending.set(id, {resolve, reject});
        });
    }

    close() {
        this.ws.close();
    }
}

const evaluate = async (session, expression) => {
    const result = await session.send("Runtime.evaluate", {
        awaitPromise: true,
        expression,
        returnByValue: true,
    });
    if (result.exceptionDetails) {
        throw new Error(result.exceptionDetails.text || "Runtime.evaluate failed");
    }
    return result.result.value;
};

const modifierBits = (modifiers) => {
    let bits = 0;
    if (modifiers.includes("Alt")) {
        bits |= 1;
    }
    if (modifiers.includes("Control")) {
        bits |= 2;
    }
    if (modifiers.includes("Meta")) {
        bits |= 4;
    }
    if (modifiers.includes("Shift")) {
        bits |= 8;
    }
    return bits;
};

const keyInfo = (key) => {
    if (key === "Alt") {
        return {key: "Alt", code: "AltLeft", windowsVirtualKeyCode: 18};
    }
    if (key === "Control") {
        return {key: "Control", code: "ControlLeft", windowsVirtualKeyCode: 17};
    }
    if (key === "Meta") {
        return {key: "Meta", code: "MetaLeft", windowsVirtualKeyCode: 91};
    }
    if (key === "=") {
        return {key: "=", code: "Equal", windowsVirtualKeyCode: 187};
    }
    if (key === "-") {
        return {key: "-", code: "Minus", windowsVirtualKeyCode: 189};
    }
    if (key === "3") {
        return {key: "3", code: "Digit3", windowsVirtualKeyCode: 51};
    }
    throw new Error(`Unsupported key ${key}`);
};

const dispatchKey = (session, type, info, modifiers) => session.send("Input.dispatchKeyEvent", {
    type,
    key: info.key,
    code: info.code,
    windowsVirtualKeyCode: info.windowsVirtualKeyCode,
    nativeVirtualKeyCode: info.windowsVirtualKeyCode,
    modifiers,
});

const pressShortcut = async (session, caseConfig) => {
    let currentModifiers = 0;
    for (const modifier of caseConfig.modifiers) {
        currentModifiers = modifierBits(caseConfig.modifiers.slice(0, caseConfig.modifiers.indexOf(modifier) + 1));
        await dispatchKey(session, "rawKeyDown", keyInfo(modifier), currentModifiers);
    }
    const allModifiers = modifierBits(caseConfig.modifiers);
    await dispatchKey(session, "rawKeyDown", keyInfo(caseConfig.key), allModifiers);
    await dispatchKey(session, "keyUp", keyInfo(caseConfig.key), allModifiers);
    for (const modifier of [...caseConfig.modifiers].reverse()) {
        const remaining = caseConfig.modifiers.filter((item) => item !== modifier);
        currentModifiers = modifierBits(remaining);
        await dispatchKey(session, "keyUp", keyInfo(modifier), currentModifiers);
    }
};

const maybeLaunchElectron = (options) => {
    if (!options.launch) {
        return undefined;
    }
    const appDir = path.resolve(__dirname, "..");
    const electronExe = process.platform === "win32" ?
        path.join(appDir, "node_modules", "electron", "dist", "electron.exe") :
        path.join(appDir, "node_modules", ".bin", "electron");
    if (!fs.existsSync(electronExe)) {
        throw new Error(`Electron binary not found at ${electronExe}`);
    }
    const args = [
        path.join(appDir, "electron", "main.js"),
        `--remote-debugging-port=${new URL(options.cdpUrl || DEFAULT_CDP_URL).port}`,
    ];
    if (options.workspace) {
        args.push(`--workspace=${options.workspace}`);
    }
    options.launchCommand = {
        args,
        command: electronExe,
        cwd: appDir,
        env: {
            NODE_ENV: "development",
            SIYUAN_E2E_REMOTE_DEBUGGING_PORT: new URL(options.cdpUrl || DEFAULT_CDP_URL).port,
        },
    };
    return childProcess.spawn(electronExe, args, {
        cwd: appDir,
        env: {
            ...process.env,
            NODE_ENV: "development",
            SIYUAN_E2E_REMOTE_DEBUGGING_PORT: new URL(options.cdpUrl || DEFAULT_CDP_URL).port,
        },
        stdio: "inherit",
        windowsHide: true,
    });
};

const maybeLaunchKernel = async (options, diagnostics) => {
    if (!options.launch) {
        return undefined;
    }
    const appDir = path.resolve(__dirname, "..");
    const kernelExe = process.platform === "win32" ?
        path.join(appDir, "kernel", "SiYuan-Kernel.exe") :
        path.join(appDir, "kernel", "SiYuan-Kernel");
    if (!fs.existsSync(kernelExe)) {
        throw new Error(`SiYuan kernel binary not found at ${kernelExe}`);
    }
    const args = [
        "--port",
        options.kernelPort || DEFAULT_KERNEL_PORT,
        "--wd",
        appDir,
        "--mode",
        "dev",
    ];
    if (options.workspace) {
        args.push("--workspace", options.workspace);
    }
    diagnostics.kernelCommand = {
        args,
        command: kernelExe,
        cwd: appDir,
    };
    const processHandle = childProcess.spawn(kernelExe, args, {
        cwd: appDir,
        stdio: "inherit",
        windowsHide: true,
    });
    await waitForKernel(options.kernelPort || DEFAULT_KERNEL_PORT, diagnostics);
    return processHandle;
};

const waitForAppReady = async (session, diagnostics) => {
    const started = Date.now();
    let lastState;
    while (Date.now() - started < WAIT_TIMEOUT_MS) {
        try {
            lastState = await evaluate(session, `(() => ({
                hasSiyuan: Boolean(window.siyuan),
                hasConfig: Boolean(window.siyuan?.config),
                hasOutline: Boolean(document.querySelector(".sy__outline")),
                headingCount: document.querySelectorAll('.sy__outline li[data-node-id][data-type="NodeHeading"]').length,
                href: location.href,
                readyState: document.readyState,
            }))()`);
            diagnostics.appReadyState = lastState;
            if (lastState.hasSiyuan && lastState.hasConfig && lastState.hasOutline) {
                return;
            }
        } catch (error) {
            diagnostics.appReadyState = {
                error: error instanceof Error ? error.message : String(error),
            };
        }
        await delay(1000);
    }
    diagnostics.appReadyTimedOut = true;
    throw new Error(`SiYuan app renderer was not ready: ${JSON.stringify(lastState)}`);
};

const runCdp = async (options) => {
    const cdpUrl = options.cdpUrl || DEFAULT_CDP_URL;
    const launchOptions = {...options, cdpUrl};
    const diagnostics = {
        appReadyTimedOut: false,
        cdpUrl,
        existingProcessesBeforeLaunch: getExistingElectronProcesses(),
        kernelCommand: null,
        kernelReachable: false,
        kernelStartupTimedOut: false,
        kernelVersion: null,
        launchCommand: null,
        portReachable: false,
        startupTimedOut: false,
        targetDecisions: [],
        targets: [],
    };
    let launchedKernel;
    if (launchOptions.launch) {
        launchedKernel = await maybeLaunchKernel(launchOptions, diagnostics);
    }
    const launched = maybeLaunchElectron(launchOptions);
    diagnostics.launchCommand = launchOptions.launchCommand || null;
    try {
        const target = await waitForTargets(cdpUrl, diagnostics);
        const session = new CDPSession(target.webSocketDebuggerUrl);
        await session.open();
        await session.send("Runtime.enable");
        await session.send("Input.setIgnoreInputEvents", {ignore: false});
        await waitForAppReady(session, diagnostics);
        await evaluate(session, BROWSER_HELPER_SOURCE.replace("__OUTLINE_SHORTCUT_CASES__", JSON.stringify(cases)));

        const reports = [];
        for (const caseConfig of cases) {
            try {
                await evaluate(session, `window.__outlineShortcutRuntime.prepareCase(${JSON.stringify(caseConfig)})`);
                await delay(100);
                await evaluate(session, "window.__outlineShortcutTarget?.focus({preventScroll: true})");
                await pressShortcut(session, caseConfig);
                reports.push(await evaluate(session, `window.__outlineShortcutRuntime.collect(${JSON.stringify(caseConfig)})`));
            } catch (error) {
                reports.push({
                    caseName: caseConfig.caseName,
                    shortcut: caseConfig.shortcut,
                    error: error instanceof Error ? error.message : String(error),
                    rawLogs: await evaluate(session, "window.__outlineShortcutLogs || []").catch(() => []),
                });
            }
        }
        session.close();
        const failed = reports.filter((report, index) => {
            if (!report.sawTransaction) {
                return true;
            }
            const expectedLength = cases[index].multi ? 2 : 1;
            return report.selectedItemsLength < expectedLength || report.headingElementsLength < expectedLength;
        });
        console.log(JSON.stringify({
            automation: "cdp",
            cdpUrl,
            diagnostics,
            ok: failed.length === 0,
            reports,
        }, null, 2));
        if (failed.length > 0) {
            process.exitCode = 1;
        }
    } catch (error) {
        console.log(JSON.stringify({
            automation: "cdp",
            cdpUrl,
            diagnostics,
            error: error instanceof Error ? error.message : String(error),
            ok: false,
            fallback: {
                command: "node --experimental-strip-types app/scripts/outline-shortcut-runtime-check.ts --print-fallback",
                note: "Paste the printed snippet into the real SiYuan DevTools console.",
            },
        }, null, 2));
        process.exitCode = 2;
    } finally {
        if (launched && !launched.killed) {
            launched.kill();
        }
        if (launchedKernel && !launchedKernel.killed) {
            launchedKernel.kill();
        }
    }
};

const main = async () => {
    const options = parseArgs();
    if (options.printFallback) {
        console.log(FALLBACK_SNIPPET);
        return;
    }
    try {
        await runCdp(options);
    } catch (error) {
        console.log(JSON.stringify({
            automation: "cdp",
            ok: false,
            error: error instanceof Error ? error.message : String(error),
            cdpUrl: options.cdpUrl || DEFAULT_CDP_URL,
            existingProcesses: getExistingElectronProcesses(),
            fallback: {
                command: "node --experimental-strip-types app/scripts/outline-shortcut-runtime-check.ts --print-fallback",
                note: "Paste the printed snippet into the real SiYuan DevTools console.",
            },
        }, null, 2));
        process.exitCode = 2;
    }
};

main();
