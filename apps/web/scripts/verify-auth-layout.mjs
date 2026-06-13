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
    return execSync([npx, "agent-browser", ...args.map(quoteForCmd)].join(" "), {
      encoding: "utf8",
      input,
      stdio: ["pipe", "pipe", "inherit"]
    }).trim();
  }

  return execFileSync(npx, ["agent-browser", ...args], {
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
  wait(700);
}

function measure(label, viewport) {
  return evaluate((screenLabel, expectedViewport) => {
    const tolerance = 1;
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
      orangeFill: ".auth-redesign-orange-fill"
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
      return typeof actual === "number" && Math.abs(actual - expected) <= tolerance;
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

    const measurements = Object.fromEntries(
      Object.entries(selectors).map(([key, selector]) => [key, rect(selector)])
    );
    const innerWidth = window.innerWidth;
    const innerHeight = window.innerHeight;
    const heightKeys = ["html", "body", "root", "authRoot", "shell", "screen", "stage"];
    const heightMismatches = heightKeys
      .map((key) => ({ key, height: measurements[key]?.height }))
      .filter((item) => !closeEnough(item.height, innerHeight));
    const stage = measurements.stage;
    const decor = measurements.decorLayer;
    const character = measurements.character;
    const requiresDecor = ["university", "profile", "password", "login"].includes(screenLabel);
    const stageCoversViewport =
      Boolean(stage) &&
      closeEnough(stage.left, 0) &&
      closeEnough(stage.right, innerWidth) &&
      closeEnough(stage.width, innerWidth) &&
      closeEnough(stage.height, innerHeight);
    const decorCoversViewport =
      !requiresDecor ||
      (Boolean(decor) &&
        closeEnough(decor.left, 0) &&
        closeEnough(decor.right, innerWidth) &&
        closeEnough(decor.width, innerWidth) &&
        closeEnough(decor.top, 0) &&
        closeEnough(decor.height, innerHeight));
    const characterHasNoSideMargins =
      !requiresDecor ||
      (Boolean(character) &&
        closeEnough(character.left, 0) &&
        closeEnough(character.width, innerWidth));
    const orangeFillPresent = Boolean(document.querySelector(".auth-redesign-orange-fill"));
    const scrollLeak =
      window.scrollY !== 0 ||
      document.documentElement.scrollTop !== 0 ||
      document.body.scrollTop !== 0 ||
      document.documentElement.scrollHeight > innerHeight + tolerance ||
      document.body.scrollHeight > innerHeight + tolerance ||
      document.documentElement.scrollWidth > innerWidth + tolerance ||
      document.body.scrollWidth > innerWidth + tolerance;
    const pseudoElements = {
      htmlAfter: window.getComputedStyle(document.documentElement, "::after").content,
      bodyAfter: window.getComputedStyle(document.body, "::after").content
    };
    const viewportMatchesExpected =
      closeEnough(innerWidth, expectedViewport.width) &&
      closeEnough(innerHeight, expectedViewport.height);
    const ok =
      viewportMatchesExpected &&
      heightMismatches.length === 0 &&
      stageCoversViewport &&
      decorCoversViewport &&
      characterHasNoSideMargins &&
      !orangeFillPresent &&
      !scrollLeak;

    return JSON.stringify({
      ok,
      label: screenLabel,
      expectedViewport,
      innerWidth,
      innerHeight,
      viewportMatchesExpected,
      heightMismatches,
      stageCoversViewport,
      decorCoversViewport,
      characterHasNoSideMargins,
      orangeFillPresent,
      scrollLeak,
      pseudoElements,
      clippingAncestors: clippingAncestors(document.querySelector(".auth-redesign-character-bg, .auth-redesign-decor-layer")),
      measurements
    });
  }, label, viewport);
}

function measureSyntheticExtension(label, viewport) {
  return evaluate((screenLabel, expectedViewport) => {
    const tolerance = 1;
    const extension = 34;
    const previousExtension = document.documentElement.style.getPropertyValue("--auth-visual-bottom-extension");

    function rect(selector) {
      const element = selector === "html"
        ? document.documentElement
        : selector === "body"
          ? document.body
          : document.querySelector(selector);
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
      return typeof actual === "number" && Math.abs(actual - expected) <= tolerance;
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

    function collect() {
      return {
        html: rect("html"),
        body: rect("body"),
        root: rect("#root"),
        authRoot: rect(".auth-stack-root"),
        shell: rect(".auth-redesign-shell"),
        screen: rect(".auth-redesign-screen"),
        stage: rect(".auth-redesign-stage"),
        decorLayer: rect(".auth-redesign-decor-layer"),
        character: rect(".auth-redesign-character-bg"),
        orangeFill: rect(".auth-redesign-orange-fill"),
        controls: controlRects(),
        scroll: {
          scrollY: window.scrollY,
          htmlTop: document.documentElement.scrollTop,
          bodyTop: document.body.scrollTop,
          htmlHeight: document.documentElement.scrollHeight,
          bodyHeight: document.body.scrollHeight,
          htmlWidth: document.documentElement.scrollWidth,
          bodyWidth: document.body.scrollWidth
        }
      };
    }

    function setExtension(value) {
      document.documentElement.style.setProperty("--auth-visual-bottom-extension", `${value}px`);
      document.body.getBoundingClientRect();
    }

    setExtension(0);
    const before = collect();
    setExtension(extension);
    const after = collect();

    if (previousExtension) {
      document.documentElement.style.setProperty("--auth-visual-bottom-extension", previousExtension);
    } else {
      document.documentElement.style.removeProperty("--auth-visual-bottom-extension");
    }

    const innerWidth = window.innerWidth;
    const innerHeight = window.innerHeight;
    const requiresDecor = ["university", "interests", "profile", "password", "login"].includes(screenLabel);
    const controlsChanged = after.controls
      .map((control, index) => {
        const previous = before.controls[index];
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
    const controlCountStable = before.controls.length === after.controls.length;
    const rootExtends =
      Boolean(after.authRoot) &&
      closeEnough(after.authRoot.top, 0) &&
      closeEnough(after.authRoot.bottom, innerHeight + extension) &&
      closeEnough(after.authRoot.height, innerHeight + extension);
    const shellExtends =
      Boolean(after.shell) &&
      closeEnough(after.shell.top, 0) &&
      closeEnough(after.shell.bottom, innerHeight + extension) &&
      closeEnough(after.shell.height, innerHeight + extension);
    const screenExtends =
      Boolean(after.screen) &&
      closeEnough(after.screen.top, 0) &&
      closeEnough(after.screen.bottom, innerHeight + extension) &&
      closeEnough(after.screen.height, innerHeight + extension);
    const stagePreservesViewport =
      Boolean(after.stage) &&
      closeEnough(after.stage.top, 0) &&
      closeEnough(after.stage.bottom, innerHeight) &&
      closeEnough(after.stage.left, 0) &&
      closeEnough(after.stage.width, innerWidth) &&
      closeEnough(after.stage.height, innerHeight);
    const decorPreservesViewport =
      !requiresDecor ||
      (Boolean(after.decorLayer) &&
        closeEnough(after.decorLayer.top, 0) &&
        closeEnough(after.decorLayer.bottom, innerHeight) &&
        closeEnough(after.decorLayer.left, 0) &&
        closeEnough(after.decorLayer.width, innerWidth) &&
        closeEnough(after.decorLayer.height, innerHeight));
    const characterTopStable =
      !requiresDecor ||
      (Boolean(after.character) &&
        Boolean(before.character) &&
        closeEnough(after.character.top, before.character.top));
    const characterHeightExtended =
      !requiresDecor ||
      (Boolean(after.character) &&
        Boolean(before.character) &&
        closeEnough(after.character.height, before.character.height + extension));
    const characterBottomExtended =
      !requiresDecor ||
      (Boolean(after.character) &&
        Boolean(before.character) &&
        closeEnough(after.character.bottom, before.character.bottom + extension));
    const characterCoversPhysicalBottom =
      !requiresDecor ||
      (Boolean(after.character) &&
        after.character.bottom >= innerHeight + extension - tolerance);
    const characterHasNoSideMargins =
      !requiresDecor ||
      (Boolean(after.character) &&
        closeEnough(after.character.left, 0) &&
        closeEnough(after.character.width, innerWidth));
    const orangeFillAbsent = !after.orangeFill;
    const noScroll =
      after.scroll.scrollY === 0 &&
      after.scroll.htmlTop === 0 &&
      after.scroll.bodyTop === 0 &&
      after.scroll.htmlHeight <= innerHeight + tolerance &&
      after.scroll.bodyHeight <= innerHeight + tolerance &&
      after.scroll.htmlWidth <= innerWidth + tolerance &&
      after.scroll.bodyWidth <= innerWidth + tolerance;
    const viewportMatchesExpected =
      closeEnough(innerWidth, expectedViewport.width) &&
      closeEnough(innerHeight, expectedViewport.height);
    const ok =
      viewportMatchesExpected &&
      rootExtends &&
      shellExtends &&
      screenExtends &&
      stagePreservesViewport &&
      decorPreservesViewport &&
      characterTopStable &&
      characterHeightExtended &&
      characterBottomExtended &&
      characterCoversPhysicalBottom &&
      characterHasNoSideMargins &&
      controlCountStable &&
      controlsChanged.length === 0 &&
      orangeFillAbsent &&
      noScroll;

    return JSON.stringify({
      ok,
      label: `${screenLabel} synthetic safe-area`,
      expectedViewport,
      innerWidth,
      innerHeight,
      extension,
      viewportMatchesExpected,
      rootExtends,
      shellExtends,
      screenExtends,
      stagePreservesViewport,
      decorPreservesViewport,
      characterTopStable,
      characterHeightExtended,
      characterBottomExtended,
      characterCoversPhysicalBottom,
      characterHasNoSideMargins,
      controlCountStable,
      controlsChanged,
      orangeFillAbsent,
      noScroll,
      before,
      after
    });
  }, label, viewport);
}

function measureSplashSyntheticExtension(viewport) {
  return evaluate((expectedViewport) => {
    const tolerance = 1;
    const extension = 34;
    const previousExtension = document.documentElement.style.getPropertyValue("--auth-visual-bottom-extension");
    document.querySelectorAll(".splash-screen, .splash-mark-shell, .splash-lockup").forEach((element) => {
      element.style.animationPlayState = "paused";
    });

    function rect(selector) {
      const element = document.querySelector(selector);
      if (!element) return null;
      const box = element.getBoundingClientRect();
      return {
        top: box.top,
        right: box.right,
        bottom: box.bottom,
        left: box.left,
        width: box.width,
        height: box.height
      };
    }

    function closeEnough(actual, expected) {
      return typeof actual === "number" && Math.abs(actual - expected) <= tolerance;
    }

    function collect() {
      return {
        splash: rect(".splash-screen"),
        frame: rect(".splash-layout-frame"),
        mark: rect(".splash-mark-shell"),
        lockup: rect(".splash-lockup"),
        scroll: {
          scrollY: window.scrollY,
          htmlTop: document.documentElement.scrollTop,
          bodyTop: document.body.scrollTop,
          htmlHeight: document.documentElement.scrollHeight,
          bodyHeight: document.body.scrollHeight,
          htmlWidth: document.documentElement.scrollWidth,
          bodyWidth: document.body.scrollWidth
        }
      };
    }

    function setExtension(value) {
      document.documentElement.style.setProperty("--auth-visual-bottom-extension", `${value}px`);
      document.body.getBoundingClientRect();
    }

    setExtension(0);
    const before = collect();
    setExtension(extension);
    const after = collect();

    if (previousExtension) {
      document.documentElement.style.setProperty("--auth-visual-bottom-extension", previousExtension);
    } else {
      document.documentElement.style.removeProperty("--auth-visual-bottom-extension");
    }

    const innerWidth = window.innerWidth;
    const innerHeight = window.innerHeight;
    const lockupStable =
      Boolean(before.lockup) &&
      Boolean(after.lockup) &&
      closeEnough(before.lockup.top, after.lockup.top) &&
      closeEnough(before.lockup.bottom, after.lockup.bottom) &&
      closeEnough(before.lockup.left, after.lockup.left) &&
      closeEnough(before.lockup.right, after.lockup.right);
    const markStable =
      Boolean(before.mark) &&
      Boolean(after.mark) &&
      closeEnough(before.mark.top, after.mark.top) &&
      closeEnough(before.mark.bottom, after.mark.bottom) &&
      closeEnough(before.mark.left, after.mark.left) &&
      closeEnough(before.mark.right, after.mark.right);
    const splashExtends =
      Boolean(after.splash) &&
      closeEnough(after.splash.top, 0) &&
      closeEnough(after.splash.bottom, innerHeight + extension) &&
      closeEnough(after.splash.height, innerHeight + extension) &&
      closeEnough(after.splash.left, 0) &&
      closeEnough(after.splash.width, innerWidth);
    const framePreservesViewport =
      Boolean(after.frame) &&
      closeEnough(after.frame.top, 0) &&
      closeEnough(after.frame.bottom, innerHeight) &&
      closeEnough(after.frame.height, innerHeight) &&
      closeEnough(after.frame.left, 0) &&
      closeEnough(after.frame.width, innerWidth);
    const noScroll =
      after.scroll.scrollY === 0 &&
      after.scroll.htmlTop === 0 &&
      after.scroll.bodyTop === 0 &&
      after.scroll.htmlHeight <= innerHeight + tolerance &&
      after.scroll.bodyHeight <= innerHeight + tolerance &&
      after.scroll.htmlWidth <= innerWidth + tolerance &&
      after.scroll.bodyWidth <= innerWidth + tolerance;
    const viewportMatchesExpected =
      closeEnough(innerWidth, expectedViewport.width) &&
      closeEnough(innerHeight, expectedViewport.height);
    const ok =
      viewportMatchesExpected &&
      splashExtends &&
      framePreservesViewport &&
      lockupStable &&
      markStable &&
      noScroll;

    return JSON.stringify({
      ok,
      label: "splash synthetic safe-area",
      expectedViewport,
      innerWidth,
      innerHeight,
      extension,
      viewportMatchesExpected,
      splashExtends,
      framePreservesViewport,
      lockupStable,
      markStable,
      noScroll,
      before,
      after
    });
  }, viewport);
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
  recordStep(checks, measureSplashSyntheticExtension(viewport));
  recordStep(checks, measure("welcome", viewport));
  recordStep(checks, measureSyntheticExtension("welcome", viewport));
  recordStep(checks, clickButton("Comenzar"));
  wait(150);
  recordStep(checks, clickButton("Continuar"));
  wait(150);
  recordStep(checks, clickButton("Registrarse"));
  wait(250);
  recordStep(checks, measure("university", viewport));
  recordStep(checks, measureSyntheticExtension("university", viewport));
  recordStep(checks, setFieldValue("Selecciona una universidad", "uade"));
  recordStep(checks, setFieldValue("Ingresa tu legajo", "123456"));
  wait(150);
  recordStep(checks, clickButton("Continuar"));
  wait(400);
  recordStep(checks, measure("interests", viewport));
  recordStep(checks, measureSyntheticExtension("interests", viewport));

  const interests = waitForInterests();
  recordStep(checks, interests);

  if (interests.ok) {
    recordStep(checks, clickButton("Continuar"));
    wait(250);
    recordStep(checks, measure("profile", viewport));
    recordStep(checks, measureSyntheticExtension("profile", viewport));
    recordStep(checks, setFieldValue("Nombre y Apellido", "Kreis Tester"));
    recordStep(checks, setFieldValue("Mail universitario", "tester"));
    wait(150);
    recordStep(checks, clickButton("Continuar"));
    wait(250);
    recordStep(checks, measure("password", viewport));
    recordStep(checks, measureSyntheticExtension("password", viewport));
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
  recordStep(checks, measureSplashSyntheticExtension(viewport));
  recordStep(checks, clickButton("Ya tengo cuenta"));
  wait(250);
  recordStep(checks, measure("login", viewport));
  recordStep(checks, measureSyntheticExtension("login", viewport));
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
