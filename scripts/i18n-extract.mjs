// Extracts the site's visible English UI copy from the public (non-admin) source files.
import { readdirSync, statSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOTS = ["src/routes", "src/components/site", "src/components/promo"];
const SKIP = /(^|\/)(admin|api|lovable|email)/;

function files(dir) {
  let out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (SKIP.test(p)) continue;
    const st = statSync(p);
    if (st.isDirectory()) out = out.concat(files(p));
    else if (/\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

const junk = (s) =>
  !s ||
  s.length < 2 ||
  s.length > 220 ||
  !/[A-Za-z]/.test(s) ||
  /^[A-Z_]+$/.test(s) ||
  /[{}<>]/.test(s) ||
  /^https?:|^\/|^#|@|\.(tsx?|jpg|png|svg|webp)$/.test(s) ||
  /^[a-z-]+(\s[a-z-]+)*$/.test(s) === false && false;

const classy = (s) =>
  /(^|\s)(flex|grid|text-|bg-|px-|py-|mt-|mb-|rounded|border|hidden|absolute|relative|w-|h-|gap-|font-|items-|justify-)/.test(
    s,
  );

const strings = new Set();

for (const root of ROOTS) {
  for (const f of files(root)) {
    const src = readFileSync(f, "utf8");

    // JSX text nodes
    for (const m of src.matchAll(/>\s*([^<>{}\n][^<>{}]{1,200}?)\s*</g)) {
      const t = m[1].replace(/\s+/g, " ").trim();
      if (!junk(t) && !classy(t)) strings.add(t);
    }
    // Attributes and common object fields
    for (const m of src.matchAll(
      /\b(placeholder|aria-label|ariaLabel|title|alt|label|heading|subtitle|cta|question|answer|text|description)\s*[:=]\s*"([^"\\]{2,200})"/g,
    )) {
      const t = m[2].replace(/\s+/g, " ").trim();
      if (!junk(t) && !classy(t)) strings.add(t);
    }
  }
}

const codey = (s) =>
  /[;=]|=>|&&|\|\||\bconst\b|\buseState\b|\breturn\b|\bnull\b|\bundefined\b|\.\.\.|\(|\)|\[|\]|`|\$\{/.test(s) ||
  !/^[A-Za-z0-9€"'“]/.test(s);

const list = [...strings]
  .filter((s) => !codey(s))
  .filter((s) => /[A-Za-z]{3}/.test(s))
  .filter((s) => !/^[a-z0-9-]+$/.test(s))
  .sort();

process.stdout.write(JSON.stringify(list, null, 0));
