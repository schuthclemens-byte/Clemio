#!/usr/bin/env node
/**
 * Sitemap validator
 *
 * Checks:
 *   1. Every public, SEO-relevant route in src/App.tsx exists in public/sitemap.xml
 *   2. Every <loc> in sitemap.xml maps to a real route in src/App.tsx
 *   3. (Optional, --http) Every <loc> returns HTTP 200 (no redirects)
 *   4. No <loc> is blocked by public/robots.txt Disallow rules
 *
 * Internal/redirect/dynamic routes are excluded via robots.txt Disallow rules
 * and the DYNAMIC_ROUTE_ALLOWLIST below.
 *
 * Usage:
 *   node scripts/sitemap-validate.mjs              # local checks only
 *   node scripts/sitemap-validate.mjs --http       # + HTTP 200 check against BASE_URL
 *   BASE_URL=https://clemio.app node scripts/sitemap-validate.mjs --http
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const BASE_URL = process.env.BASE_URL || "https://clemio.app";
const RUN_HTTP = process.argv.includes("--http");
const ROOT = resolve(process.cwd());

/**
 * Allowlist of dynamic route templates that SHOULD appear in the sitemap
 * (with explicit param values listed here). Leave empty — we have no public
 * dynamic SEO routes today. Example:
 *   "/blog/:slug": ["my-post", "another-post"]
 */
const DYNAMIC_ROUTE_ALLOWLIST = {
  // "/blog/:slug": ["best-voice-messaging-apps-2024"],
};

const COLOR = {
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
};

// ---------- parse App.tsx routes ----------
function extractRoutes() {
  const src = readFileSync(resolve(ROOT, "src/App.tsx"), "utf8");
  const routes = [];
  const re = /<Route\s+path=["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const p = m[1];
    if (p === "*") continue;
    routes.push(p);
  }
  return routes;
}

// ---------- parse robots.txt ----------
function parseRobots() {
  const txt = readFileSync(resolve(ROOT, "public/robots.txt"), "utf8");
  const lines = txt.split(/\r?\n/);
  const disallows = [];
  let inStar = false;
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const ua = t.match(/^User-agent:\s*(.+)$/i);
    if (ua) {
      inStar = ua[1].trim() === "*";
      continue;
    }
    if (!inStar) continue;
    const d = t.match(/^Disallow:\s*(.*)$/i);
    if (d && d[1].trim()) disallows.push(d[1].trim());
  }
  return disallows;
}

function isDisallowed(path, disallows) {
  return disallows.some((rule) =>
    rule.endsWith("/") ? path.startsWith(rule) : path === rule || path.startsWith(rule + "/") || path === rule
  );
}

// ---------- parse sitemap.xml ----------
function parseSitemap() {
  const xml = readFileSync(resolve(ROOT, "public/sitemap.xml"), "utf8");
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  return locs;
}

function urlToPath(url) {
  try {
    const u = new URL(url);
    const p = u.pathname;
    return p.length > 1 && p.endsWith("/") ? p.slice(0, -1) : p;
  } catch {
    return url;
  }
}

// ---------- expected sitemap paths ----------
function expectedSitemapPaths(routes, disallows) {
  const out = new Set();
  for (const r of routes) {
    if (r.includes(":")) {
      const params = DYNAMIC_ROUTE_ALLOWLIST[r];
      if (!params) continue;
      const paramName = r.match(/:([A-Za-z0-9_]+)/)[1];
      for (const v of params) out.add(r.replace(`:${paramName}`, v));
      continue;
    }
    if (isDisallowed(r, disallows)) continue;
    out.add(r);
  }
  return out;
}

// ---------- HTTP checks ----------
async function checkHttp(url) {
  try {
    const res = await fetch(url, { redirect: "manual", headers: { "user-agent": "clemio-sitemap-validator/1.0" } });
    return { status: res.status, location: res.headers.get("location") };
  } catch (e) {
    return { status: 0, error: e.message };
  }
}

// ---------- main ----------
async function main() {
  const errors = [];
  const warnings = [];

  const routes = extractRoutes();
  const disallows = parseRobots();
  const sitemapUrls = parseSitemap();
  const sitemapPaths = sitemapUrls.map(urlToPath);
  const expected = expectedSitemapPaths(routes, disallows);

  console.log(COLOR.dim(`Routes found in src/App.tsx: ${routes.length}`));
  console.log(COLOR.dim(`Disallow rules (User-agent: *): ${disallows.length}`));
  console.log(COLOR.dim(`URLs in sitemap.xml: ${sitemapUrls.length}`));
  console.log(COLOR.dim(`Expected public SEO routes: ${expected.size}`));
  console.log();

  // Check 1: routes missing from sitemap
  for (const p of expected) {
    if (!sitemapPaths.includes(p)) {
      errors.push(`[1] Route missing in sitemap: ${p}`);
    }
  }

  // Check 2: sitemap URLs that aren't real routes
  const staticRoutes = new Set(routes.filter((r) => !r.includes(":")));
  for (const path of sitemapPaths) {
    const matchesStatic = staticRoutes.has(path);
    const matchesDynamic = Object.entries(DYNAMIC_ROUTE_ALLOWLIST).some(([tpl, vals]) => {
      const paramMatch = tpl.match(/:([A-Za-z0-9_]+)/);
      if (!paramMatch) return false;
      return vals.some((v) => tpl.replace(`:${paramMatch[1]}`, v) === path);
    });
    if (!matchesStatic && !matchesDynamic) {
      errors.push(`[2] Sitemap URL has no matching public route: ${path}`);
    }
  }

  // Check 4: sitemap URLs blocked by robots.txt
  for (const path of sitemapPaths) {
    if (isDisallowed(path, disallows)) {
      errors.push(`[4] Sitemap URL is Disallow'd in robots.txt: ${path}`);
    }
  }

  // Check 3: HTTP 200 (optional)
  if (RUN_HTTP) {
    console.log(COLOR.dim(`HTTP-checking ${sitemapUrls.length} URLs against ${BASE_URL}...`));
    for (const url of sitemapUrls) {
      const target = url.startsWith("http") ? url : `${BASE_URL}${url}`;
      const r = await checkHttp(target);
      if (r.status === 200) {
        console.log(COLOR.green(`  200  ${target}`));
      } else if (r.status >= 300 && r.status < 400) {
        errors.push(`[3] Sitemap URL returns ${r.status} (redirect to ${r.location}): ${target}`);
      } else if (r.status === 0) {
        errors.push(`[3] Sitemap URL unreachable: ${target} (${r.error})`);
      } else {
        errors.push(`[3] Sitemap URL returns HTTP ${r.status}: ${target}`);
      }
    }
    console.log();
  }

  // Report
  if (warnings.length) {
    console.log(COLOR.yellow(`Warnings (${warnings.length}):`));
    for (const w of warnings) console.log(`  ${w}`);
    console.log();
  }

  if (errors.length) {
    console.log(COLOR.red(`Errors (${errors.length}):`));
    for (const e of errors) console.log(`  ${COLOR.red(e)}`);
    console.log();
    console.log(COLOR.red(`FAIL: sitemap validation failed with ${errors.length} error(s).`));
    process.exit(1);
  }

  console.log(COLOR.green(`OK: sitemap.xml is in sync with routes and robots.txt.`));
}

main().catch((e) => {
  console.error(COLOR.red(`Unexpected error: ${e.stack || e.message}`));
  process.exit(2);
});
