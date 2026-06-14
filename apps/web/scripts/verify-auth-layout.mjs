import { execFileSync, execSync } from "node:child_process";

const baseUrl = process.env.AUTH_LAYOUT_URL ?? process.argv[2] ?? "http://127.0.0.1:5173";
const npx = process.platform === "win32" ? "npx.cmd" : "npx";

const viewports = [
  { width: 393, height: 852 },
  { width: 402, height: 874 },
  { width: 390, height: 844 },
  { width: 375, height: 812 },
  { width: 360, height: 800 }
];

function withCacheBust(url, viewport) {
  const parsed = new URL(url);
  parsed.searchParams.set("auth-layout-check", `${viewport.width}x${viewport.height}-${Date.now()}`);
  return parsed.toString();
}

function quoteForCmd(value) {
  return `"${value.replace(/"/g, '\\"')}"`;
}

function runAgentBrowser(args, input) {
  if (process.platform === "win32") {
    return execSync([npx, "--yes", "agent-browser", ...args.map(quoteForCmd)].join(" "), {
      encoding: "utf8",
      input,
      stdio: ["pipe", "pipe", "inherit"]
    }).trim();
  }

  return execFileSync(npx, ["--yes", "agent-browser", ...args], {
    encoding: "utf8",
    input,
    stdio: ["ignore", "pipe", "inherit"]
  }).trim();
}

function decodeAgentResult(raw) {
  if (!raw) return null;
  const decoded = JSON.parse(raw);
  return typeof decoded === "string" ? JSON.parse(decoded) : decoded;
}

function evaluate(pageFunction, ...args) {
  const source = `(${pageFunction})(...${JSON.stringify(args)})`;
  return decodeAgentResult(runAgentBrowser(["eval", "--stdin"], source));
}

function wait(ms) {
  runAgentBrowser(["wait", String(ms)]);
}

function openFresh(viewport) {
  runAgentBrowser(["set", "viewport", String(viewport.width), String(viewport.height)]);
  runAgentBrowser(["open", withCacheBust(baseUrl, viewport)]);
  wait(250);
  evaluate(async () => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }
    return JSON.stringify({ ok: true });
  });
  runAgentBrowser(["open", withCacheBust(baseUrl, viewport)]);
  wait(450);
}

function measureViewportStructure(label, viewport, mode = "auth") {
  return evaluate(async (screenLabel, expectedViewport, measurementMode) => {
    const tolerance = 1;
    const unitProbeValues = ["100vh", "100dvh", "100lvh", "100svh"];
    const selectors = {
      html: "html",
      body: "body",
      root: "#root",
      authRoot: ".auth-stack-root",
      shell: ".auth-redesign-shell",
      screen: ".auth-redesign-screen",
      stage: ".auth-redesign-stage",
      decorLayer: ".auth-redesign-decor-layer",
      character: ".auth-redesign-character-bg",
      splash: ".splash-screen",
      splashFrame: ".splash-layout-frame",
      orangeFill: ".auth-redesign-orange-fill, .auth-orange-fill, .AuthOrangeFill"
    };

    function getElement(selector) {
      if (selector === "html") return document.documentElement;
      if (selector === "body") return document.body;
      return document.querySelector(selector);
    }

    function rect(selector) {
      const element = getElement(selector);
      if (!element) return null;

      const box = element.getBoundingClientRect();
      const styles = window.getComputedStyle(element);
      return {
        top: box.top,
        right: box.right,
        bottom: box.bottom,
        left: box.left,
        width: box.width,
        height: box.height,
        overflow: styles.overflow,
        overflowX: styles.overflowX,
        overflowY: styles.overflowY,
        position: styles.position,
        background: styles.backgroundColor,
        paddingBottom: styles.paddingBottom,
        marginBottom: styles.marginBottom
      };
    }

    function closeEnough(actual, expected) {
      return typeof actual === "number" && typeof expected === "number" && Math.abs(actual - expected) <= tolerance;
    }

    function probeHeight(heightValue) {
      const probe = document.createElement("div");
      probe.style.cssText = [
        "position:fixed",
        "left:-10000px",
        "top:0",
        "width:1px",
        `height:${heightValue}`,
        "visibility:hidden",
        "pointer-events:none"
      ].join(";");
      document.body.appendChild(probe);
      const height = probe.getBoundingClientRect().height;
      probe.remove();
      return height;
    }

    function controlRects() {
      return [...document.querySelectorAll([
        ".auth-redesign-logo",
        ".auth-redesign-back",
        ".auth-redesign-title",
        ".auth-redesign-field",
        ".auth-redesign-primary-button",
        ".auth-redesign-welcome-character",
        ".auth-redesign-welcome-wordmark",
        ".auth-redesign-welcome-copy",
        ".auth-redesign-welcome-button",
        ".auth-redesign-onboarding-character",
        ".auth-redesign-onboarding-title",
        ".auth-redesign-onboarding-copy",
        ".auth-redesign-dots",
        ".auth-redesign-note",
        ".auth-redesign-interest-grid",
        ".auth-redesign-certificate-upload",
        ".auth-redesign-certificate-help",
        ".auth-redesign-error"
      ].join(","))].map((element, index) => {
        const box = element.getBoundingClientRect();
        return {
          index,
          tag: element.tagName.toLowerCase(),
          className: element.className,
          top: box.top,
          right: box.right,
          bottom: box.bottom,
          left: box.left,
          width: box.width,
          height: box.height
        };
      });
    }

    function clippingAncestors(element) {
      const ancestors = [];
      let current = element?.parentElement ?? null;
      while (current) {
        const box = current.getBoundingClientRect();
        const styles = window.getComputedStyle(current);
        ancestors.push({
          tag: current.tagName.toLowerCase(),
          className: current.className,
          position: styles.position,
          overflow: styles.overflow,
          overflowX: styles.overflowX,
          overflowY: styles.overflowY,
          width: box.width,
          height: box.height,
          top: box.top,
          bottom: box.bottom
        });
        current = current.parentElement;
      }
      return ancestors;
    }

    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    const unitProbes = Object.fromEntries(unitProbeValues.map((value) => [value, probeHeight(value)]));
    const cssVariables = {
      authVisualHeight: probeHeight("var(--auth-visual-height)"),
      authLayoutHeight: probeHeight("var(--auth-layout-height)"),
      authVisualBottomExtension: window.getComputedStyle(document.documentElement).getPropertyValue("--auth-visual-bottom-extension").trim()
    };
    const measurements = Object.fromEntries(
      Object.entries(selectors).map(([key, selector]) => [key, rect(selector)])
    );
    const beforeControls = controlRects();

    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    const afterControls = controlRects();
    const controlsChanged = afterControls
      .map((control, index) => {
        const previous = beforeControls[index];
        if (!previous) return { index, reason: "MISSING_BASELINE", control };
        const deltas = {
          top: Math.abs(control.top - previous.top),
          right: Math.abs(control.right - previous.right),
          bottom: Math.abs(control.bottom - previous.bottom),
          left: Math.abs(control.left - previous.left),
          width: Math.abs(control.width - previous.width),
          height: Math.abs(control.height - previous.height)
        };
        const moved = Object.values(deltas).some((value) => value > tolerance);
        return moved ? { index, className: control.className, deltas, before: previous, after: control } : null;
      })
      .filter(Boolean);
    const controlCountStable = beforeControls.length === afterControls.length;

    const innerWidth = window.innerWidth;
    const innerHeight = window.innerHeight;
    const visualHeight = cssVariables.authVisualHeight || unitProbes["100vh"] || innerHeight;
    const layoutHeight = cssVariables.authLayoutHeight || unitProbes["100vh"] || innerHeight;
    const isSplash = measurementMode === "splash";
    const requiresDecor = ["university", "interests", "profile", "password", "login"].includes(screenLabel);
    const viewportMatchesExpected =
      closeEnough(innerWidth, expectedViewport.width) &&
      closeEnough(innerHeight, expectedViewport.height);

    const visualTargets = isSplash
      ? ["splash"]
      : ["html", "body", "root", "authRoot", "shell", "screen"];
    const layoutTargets = isSplash
      ? ["splashFrame"]
      : ["stage"];

    if (!isSplash && requiresDecor) layoutTargets.push("decorLayer");
    if (!isSplash && requiresDecor) visualTargets.push("character");

    const visualMismatches = visualTargets
      .map((key) => ({ key, height: measurements[key]?.height, expected: visualHeight }))
      .filter((item) => !closeEnough(item.height, item.expected));
    const layoutMismatches = layoutTargets
      .map((key) => ({ key, height: measurements[key]?.height, expected: layoutHeight }))
      .filter((item) => !closeEnough(item.height, item.expected));
    const requiredMissing = [...visualTargets, ...layoutTargets].filter((key) => !measurements[key]);
    const authRoot = measurements.authRoot;
    const stage = measurements.stage;
    const decor = measurements.decorLayer;
    const character = measurements.character;
    const splash = measurements.splash;
    const splashFrame = measurements.splashFrame;
    const authRootCoversWidth =
      isSplash ||
      (Boolean(authRoot) &&
        closeEnough(authRoot.left, 0) &&
        closeEnough(authRoot.right, innerWidth) &&
        closeEnough(authRoot.width, innerWidth));
    const stageCoversWidth =
      isSplash ||
      (Boolean(stage) &&
        closeEnough(stage.left, 0) &&
        closeEnough(stage.right, innerWidth) &&
        closeEnough(stage.width, innerWidth));
    const decorCoversWidth =
      !requiresDecor ||
      (Boolean(decor) &&
        closeEnough(decor.left, 0) &&
        closeEnough(decor.right, innerWidth) &&
        closeEnough(decor.width, innerWidth));
    const characterHasNoSideMargins =
      !requiresDecor ||
      (Boolean(character) &&
        closeEnough(character.left, 0) &&
        closeEnough(character.width, innerWidth));
    const splashCoversWidth =
      !isSplash ||
      (Boolean(splash) &&
        closeEnough(splash.left, 0) &&
        closeEnough(splash.right, innerWidth) &&
        closeEnough(splash.width, innerWidth));
    const splashFrameCoversWidth =
      !isSplash ||
      (Boolean(splashFrame) &&
        closeEnough(splashFrame.left, 0) &&
        closeEnough(splashFrame.right, innerWidth) &&
        closeEnough(splashFrame.width, innerWidth));
    const orangeFillAbsent = !document.querySelector(".auth-redesign-orange-fill, .auth-orange-fill, .AuthOrangeFill");
    const scrollState = {
      windowScrollY: window.scrollY,
      htmlScrollTop: document.documentElement.scrollTop,
      bodyScrollTop: document.body.scrollTop,
      htmlScrollHeight: document.documentElement.scrollHeight,
      bodyScrollHeight: document.body.scrollHeight,
      htmlScrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth
    };
    const noScrollOffset =
      scrollState.windowScrollY === 0 &&
      scrollState.htmlScrollTop === 0 &&
      scrollState.bodyScrollTop === 0;
    const noHorizontalScroll =
      scrollState.htmlScrollWidth <= innerWidth + tolerance &&
      scrollState.bodyScrollWidth <= innerWidth + tolerance;
    const pseudoElements = {
      htmlAfter: window.getComputedStyle(document.documentElement, "::after").content,
      bodyAfter: window.getComputedStyle(document.body, "::after").content
    };
    const hiddenOverflows = Object.entries(measurements)
      .filter(([, measurement]) => measurement?.overflow === "hidden" || measurement?.overflowY === "hidden" || measurement?.overflowX === "hidden")
      .map(([key, measurement]) => ({ key, overflow: measurement?.overflow, overflowX: measurement?.overflowX, overflowY: measurement?.overflowY }));
    const unexpectedHidden = isSplash
      ? hiddenOverflows.filter((item) => !["html", "body", "root", "splash"].includes(item.key))
      : hiddenOverflows.filter((item) => !["html", "body", "root", "authRoot", "splash"].includes(item.key));
    const ok =
      viewportMatchesExpected &&
      requiredMissing.length === 0 &&
      visualMismatches.length === 0 &&
      layoutMismatches.length === 0 &&
      authRootCoversWidth &&
      stageCoversWidth &&
      decorCoversWidth &&
      characterHasNoSideMargins &&
      splashCoversWidth &&
      splashFrameCoversWidth &&
      controlCountStable &&
      controlsChanged.length === 0 &&
      orangeFillAbsent &&
      noScrollOffset &&
      noHorizontalScroll &&
      unexpectedHidden.length === 0;

    return JSON.stringify({
      ok,
      label: isSplash ? "splash" : screenLabel,
      mode: measurementMode,
      expectedViewport,
      innerWidth,
      innerHeight,
      visualViewport: window.visualViewport
        ? {
            width: window.visualViewport.width,
            height: window.visualViewport.height,
            offsetTop: window.visualViewport.offsetTop,
            offsetLeft: window.visualViewport.offsetLeft
          }
        : null,
      unitProbes,
      cssVariables,
      visualHeight,
      layoutHeight,
      viewportMatchesExpected,
      requiredMissing,
      visualMismatches,
      layoutMismatches,
      authRootCoversWidth,
      stageCoversWidth,
      decorCoversWidth,
      characterHasNoSideMargins,
      splashCoversWidth,
      splashFrameCoversWidth,
      controlCountStable,
      controlsChanged,
      orangeFillAbsent,
      noScrollOffset,
      noHorizontalScroll,
      hiddenOverflows,
      unexpectedHidden,
      pseudoElements,
      scrollState,
      clippingAncestors: clippingAncestors(document.querySelector(".auth-redesign-character-bg, .auth-redesign-decor-layer, .splash-screen")),
      measurements
    });
  }, label, viewport, mode);
}

function clickButton(label) {
  return evaluate((buttonLabel) => {
    const button = [...document.querySelectorAll("button")].find((item) => item.textContent?.includes(buttonLabel));
    if (!button) {
      return JSON.stringify({
        ok: false,
        reason: "BUTTON_NOT_FOUND",
        label: buttonLabel,
        text: document.body.innerText.slice(0, 240)
      });
    }
    button.click();
    return JSON.stringify({ ok: true, label: buttonLabel });
  }, label);
}

function setFieldValue(label, value) {
  return evaluate((fieldLabel, nextValue) => {
    const field = [...document.querySelectorAll("input, select")].find((item) => item.getAttribute("aria-label") === fieldLabel);
    if (!field) return JSON.stringify({ ok: false, reason: "FIELD_NOT_FOUND", label: fieldLabel });
    const prototype = field instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
    descriptor?.set?.call(field, nextValue);
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
    return JSON.stringify({ ok: true, label: fieldLabel });
  }, label, value);
}

function selectThreeInterests() {
  return evaluate(() => {
    const grid = document.querySelector(".auth-redesign-interest-grid");
    const buttons = [...document.querySelectorAll(".auth-redesign-interest-grid button")];
    const loading = Boolean(document.querySelector(".auth-redesign-interest-pill--loading"));
    const error = document.querySelector(".auth-redesign-error--interests")?.textContent ?? null;
    if (!grid || loading || error || buttons.length < 3) {
      return JSON.stringify({
        ok: false,
        reason: error ? "INTERESTS_ERROR" : loading ? "INTERESTS_LOADING" : "INTERESTS_NOT_READY",
        buttonCount: buttons.length,
        error
      });
    }
    buttons.slice(0, 3).forEach((button) => button.click());
    return JSON.stringify({ ok: true, selected: buttons.slice(0, 3).map((button) => button.textContent) });
  });
}

function waitForInterests(timeoutMs = 6000) {
  const start = Date.now();
  let result = selectThreeInterests();
  while (!result.ok && result.reason === "INTERESTS_LOADING" && Date.now() - start < timeoutMs) {
    wait(300);
    result = selectThreeInterests();
  }
  return result;
}

function recordStep(checks, step) {
  checks.push(step);
  return step.ok;
}

function runSignupTraversal(viewport) {
  const checks = [];
  openFresh(viewport);
  recordStep(checks, measureViewportStructure("splash", viewport, "splash"));
  recordStep(checks, measureViewportStructure("welcome", viewport));
  recordStep(checks, clickButton("Comenzar"));
  wait(150);
  recordStep(checks, clickButton("Continuar"));
  wait(150);
  recordStep(checks, clickButton("Registrarse"));
  wait(250);
  recordStep(checks, measureViewportStructure("university", viewport));
  recordStep(checks, setFieldValue("Selecciona una universidad", "uade"));
  recordStep(checks, setFieldValue("Ingresa tu legajo", "123456"));
  wait(150);
  recordStep(checks, clickButton("Continuar"));
  wait(400);
  recordStep(checks, measureViewportStructure("interests", viewport));

  const interests = waitForInterests();
  recordStep(checks, interests);

  if (interests.ok) {
    recordStep(checks, clickButton("Continuar"));
    wait(250);
    recordStep(checks, measureViewportStructure("profile", viewport));
    recordStep(checks, setFieldValue("Nombre y Apellido", "Kreis Tester"));
    recordStep(checks, setFieldValue("Mail universitario", "tester"));
    wait(150);
    recordStep(checks, clickButton("Continuar"));
    wait(250);
    recordStep(checks, measureViewportStructure("password", viewport));
  } else {
    recordStep(checks, {
      ok: false,
      label: "profile/password traversal",
      reason: "Could not reach profile/password because interests did not become ready",
      interests
    });
  }

  return checks;
}

function runLoginTraversal(viewport) {
  const checks = [];
  openFresh(viewport);
  recordStep(checks, measureViewportStructure("splash", viewport, "splash"));
  recordStep(checks, clickButton("Ya tengo cuenta"));
  wait(250);
  recordStep(checks, measureViewportStructure("login", viewport));
  return checks;
}

const checks = [];

for (const viewport of viewports) {
  checks.push(...runSignupTraversal(viewport));
  checks.push(...runLoginTraversal(viewport));
}

const result = {
  ok: checks.every((check) => check.ok),
  viewports,
  checks
};

if (!result.ok) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(result, null, 2));
