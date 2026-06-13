import { execFileSync, execSync } from "node:child_process";

const url = process.env.AUTH_LAYOUT_URL ?? process.argv[2] ?? "http://127.0.0.1:5173";
const npx = process.platform === "win32" ? "npx.cmd" : "npx";

function quoteForCmd(value) {
  return `"${value.replace(/"/g, '\\"')}"`;
}

function runAgentBrowser(args) {
  if (process.platform === "win32") {
    return execSync([npx, "agent-browser", ...args.map(quoteForCmd)].join(" "), {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "inherit"]
    }).trim();
  }

  return execFileSync(npx, ["agent-browser", ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"]
  }).trim();
}

runAgentBrowser(["set", "viewport", "393", "852"]);
runAgentBrowser(["open", url]);

function evaluate(js) {
  const raw = runAgentBrowser(["eval", js]);
  const decoded = JSON.parse(raw);
  return typeof decoded === "string" ? JSON.parse(decoded) : decoded;
}

function measure(label) {
  return evaluate(
    `(()=>{window.resizeTo?.(393,852);const rect=(selector)=>{const element=selector==='html'?document.documentElement:selector==='body'?document.body:document.querySelector(selector);if(!element)return null;const box=element.getBoundingClientRect();const styles=getComputedStyle(element);return{top:box.top,bottom:box.bottom,height:box.height,overflow:styles.overflow,position:styles.position,background:styles.backgroundColor};};const measurements={innerHeight:window.innerHeight,html:rect('html'),body:rect('body'),root:rect('#root'),authRoot:rect('.auth-stack-root'),shell:rect('.auth-redesign-shell'),screen:rect('.auth-redesign-screen'),stage:rect('.auth-redesign-stage'),decorLayer:rect('.auth-redesign-decor-layer'),orangeFill:rect('.auth-redesign-orange-fill')};if(!measurements.authRoot||!measurements.shell){return JSON.stringify({ok:false,label:'${label}',reason:'AUTH_LAYOUT_NOT_VISIBLE',measurements});}const expected=window.innerHeight;const keys=['root','authRoot','shell','screen','stage'];const mismatches=keys.map((key)=>({key,height:measurements[key]?.height})).filter((item)=>typeof item.height!=='number'||Math.abs(item.height-expected)>1);const scrollLeak=document.documentElement.scrollHeight>expected+1||document.body.scrollHeight>expected+1;return JSON.stringify({ok:mismatches.length===0&&!scrollLeak,label:'${label}',expected,mismatches,scrollLeak,measurements});})()`
  );
}

function clickButton(label) {
  evaluate(
    `(()=>{const button=[...document.querySelectorAll('button')].find((item)=>item.textContent?.includes('${label}'));if(!button)return JSON.stringify({ok:false,reason:'BUTTON_NOT_FOUND',label:'${label}',text:document.body.innerText.slice(0,160)});button.click();return JSON.stringify({ok:true,label:'${label}'});})()`
  );
}

const welcome = measure("welcome");
clickButton("Comenzar");
clickButton("Continuar");
clickButton("Registrarse");
const university = measure("university");
const parsed = {
  ok: welcome.ok && university.ok && Boolean(university.measurements.orangeFill),
  checks: [welcome, university]
};

if (!parsed.ok) {
  console.error(JSON.stringify(parsed, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(parsed, null, 2));
