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
  recordStep(checks, measure("welcome", viewport));
  recordStep(checks, clickButton("Comenzar"));
  wait(150);
  recordStep(checks, clickButton("Continuar"));
  wait(150);
  recordStep(checks, clickButton("Registrarse"));
  wait(250);
  recordStep(checks, measure("university", viewport));
  recordStep(checks, setFieldValue("Selecciona una universidad", "uade"));
  recordStep(checks, setFieldValue("Ingresa tu legajo", "123456"));
  wait(150);
  recordStep(checks, clickButton("Continuar"));
  wait(400);

  const interests = waitForInterests();
  recordStep(checks, interests);

  if (interests.ok) {
    recordStep(checks, clickButton("Continuar"));
    wait(250);
    recordStep(checks, measure("profile", viewport));
    recordStep(checks, setFieldValue("Nombre y Apellido", "Kreis Tester"));
    recordStep(checks, setFieldValue("Mail universitario", "tester"));
    wait(150);
    recordStep(checks, clickButton("Continuar"));
    wait(250);
    recordStep(checks, measure("password", viewport));
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
  recordStep(checks, clickButton("Ya tengo cuenta"));
  wait(250);
  recordStep(checks, measure("login", viewport));
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
