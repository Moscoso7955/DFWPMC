// Render every page of the consolidated app before a deploy.
//
// Starts nothing itself: run the apps/site dev server first (port 3110),
// then
//   node scripts/render-pages.mjs [outDir]
// Screenshots land in <outDir> (default ./page-renders, git-ignored),
// one per section/route/viewport, full page. Tipsy embeds are served by a
// local stand-in so provider outages never block a deploy. Admin pages
// sign in with ADMIN_PASSWORD from apps/site/.env.local.
//
// Exits non-zero if any route fails to render (HTTP error, Next error
// overlay, or an empty page).

import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright-core";

const OUT = process.argv[2] || "page-renders";
const CHROMIUM = process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium";

const PUBLIC_ROUTES = [
  "/", "/menu", "/calendar", "/story", "/visit", "/contact", "/careers",
  "/reservations", "/private-events", "/privacy", "/terms", "/accessibility",
];
const ADMIN_ROUTES = [
  "/admin", "/admin/analytics", "/admin/calendar", "/admin/careers",
  "/admin/contact", "/admin/hours", "/admin/mailing-list", "/admin/menu",
  "/admin/private-events", "/admin/reservations", "/admin/story",
  "/admin/submissions", "/admin/visit",
];

// One app serves the hub and every venue; /admin/* without a venue prefix
// is the collective (selector, settings, people & access).
const PORT = 3110;
const APPS = [
  { name: "willow", port: PORT, basePath: "/willow", routes: [...PUBLIC_ROUTES, ...ADMIN_ROUTES], adminLogin: true },
  { name: "madrone", port: PORT, basePath: "/madrone", routes: [...PUBLIC_ROUTES, ...ADMIN_ROUTES], adminLogin: true },
  { name: "pmcafe", port: PORT, basePath: "/publicmarketcafe", routes: [...PUBLIC_ROUTES, ...ADMIN_ROUTES], adminLogin: true },
  { name: "hub", port: PORT, basePath: "", routes: ["/", "/visit", "/admin/login", "/admin", "/admin/settings", "/admin/settings/access", "/admin/no-access", "/blackbook"], adminLogin: true },
];
const APP_DIRS = { willow: "site", madrone: "site", pmcafe: "site", hub: "site" };

const VIEWPORTS = [
  { label: "1440", width: 1440, height: 900 },
  { label: "390", width: 390, height: 844 },
];

// Stand-in for every Tipsy embed: transparent page, white 16px card
// filling the frame, posts its height — the contract the live embeds
// follow since Tipsy's embeds-consistent change.
const TIPSY_STUB = `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>
*{box-sizing:border-box}html,body{margin:0;padding:0;background:transparent;font-family:sans-serif}
.card{background:#fff;border-radius:16px;padding:24px}
h2{margin:0 0 8px;font-size:22px}p{margin:0 0 16px;color:#666;font-size:14px}
input{width:100%;margin:0 0 14px;padding:12px 16px;font-size:16px;border:1px solid #ddd;border-radius:12px}
button{width:100%;padding:12px 16px;font-size:16px;font-weight:600;border:0;border-radius:12px;background:#171717;color:#fff}
</style></head><body><div class="card"><h2>Tipsy stand-in</h2><p>Local render pass placeholder.</p>
<input placeholder="Name"><input placeholder="Email"><button>Submit</button></div>
<script>function post(){const c=document.querySelector('.card');parent.postMessage({type:'tipsy-embed-height',height:Math.ceil(c.getBoundingClientRect().height)},'*')}
window.addEventListener('load',post);new ResizeObserver(post).observe(document.querySelector('.card'));</script></body></html>`;

function adminPassword(appDir) {
  try {
    const env = readFileSync(join("apps", appDir, ".env.local"), "utf8");
    const line = env.split("\n").find((l) => l.startsWith("ADMIN_PASSWORD="));
    return line ? line.slice("ADMIN_PASSWORD=".length).trim() : null;
  } catch {
    return null;
  }
}

const failures = [];
const browser = await chromium.launch({
  executablePath: CHROMIUM,
  args: ["--no-sandbox", "--disable-features=IsolateOrigins,site-per-process"],
});

for (const app of APPS) {
  const base = `http://127.0.0.1:${app.port}${app.basePath}`;
  const password = app.adminLogin ? adminPassword(APP_DIRS[app.name]) : null;
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    await context.route(/tipsyapp\.io/, (route) =>
      route.fulfill({ status: 200, contentType: "text/html", body: TIPSY_STUB }),
    );
    const page = await context.newPage();

    if (password) {
      // Sign the context in once so /admin routes render the editors.
      const res = await page.request.post(`http://127.0.0.1:${app.port}/admin/api/login`, {
        form: { password },
        maxRedirects: 0,
      });
      if (res.status() !== 303) failures.push(`${app.name} admin login -> HTTP ${res.status()}`);
    }

    for (const route of app.routes) {
      if (route.startsWith("/admin") && route !== "/admin/login" && !password && app.adminLogin) continue;
      const url = `${base}${route === "/" ? "" : route}` || `${base}/`;
      const slug = route === "/" ? "home" : route.slice(1).replaceAll("/", "-");
      const file = join(OUT, `${app.name}-${slug}-${vp.label}.png`);
      try {
        const response = await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
        const status = response?.status() ?? 0;
        if (status >= 400) {
          failures.push(`${app.name} ${route} @${vp.label}: HTTP ${status}`);
          continue;
        }
        const broken = await page.evaluate(() => {
          // The nextjs-portal element also hosts the harmless dev-tools
          // badge; only a mounted error dialog inside it counts.
          for (const portal of document.querySelectorAll("nextjs-portal")) {
            const root = portal.shadowRoot;
            if (root?.querySelector("[data-nextjs-dialog], [data-nextjs-dialog-overlay]")) {
              return "next error overlay";
            }
          }
          if (!document.body || document.body.innerText.trim().length === 0) return "empty page";
          return null;
        });
        if (broken) {
          failures.push(`${app.name} ${route} @${vp.label}: ${broken}`);
        }
        mkdirSync(OUT, { recursive: true });
        await page.screenshot({ path: file, fullPage: true });
        console.log(`ok   ${app.name} ${route} @${vp.label}`);
      } catch (error) {
        failures.push(`${app.name} ${route} @${vp.label}: ${String(error).split("\n")[0]}`);
        console.log(`FAIL ${app.name} ${route} @${vp.label}`);
      }
    }
    await context.close();
  }
}

await browser.close();
if (failures.length) {
  console.error(`\n${failures.length} route(s) failed:`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log("\nAll routes rendered clean.");
