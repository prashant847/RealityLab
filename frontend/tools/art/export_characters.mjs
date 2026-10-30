// Exports every character expression from the #/char-export page to a transparent PNG. Needs the dev server on :5173 and puppeteer-core.
import puppeteer from "puppeteer-core";
const OUT = process.argv[2], EDGE = process.env.EDGE ?? "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const b = await puppeteer.launch({ executablePath: EDGE, headless: "new", args: ["--no-sandbox"] });
const p = await b.newPage(); await p.setViewport({ width: 900, height: 1100 });
await p.goto("http://127.0.0.1:5173/#/char-export", { waitUntil: "networkidle0" });
await p.addStyleTag({ content: "html,body,#root{background:transparent !important}" });
for (const t of await p.$$(".char-tile")) { const n = await t.evaluate((e) => e.dataset.name); await t.screenshot({ path: `${OUT}/${n}.png`, omitBackground: true }); console.log(n); }
await b.close();
