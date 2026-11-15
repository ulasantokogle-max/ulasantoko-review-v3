import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("business navigation routes to local product description, not shared auth", () => {
  const home = read("app/page.tsx");
  const nav = read("app/dashboard/DashboardNav.tsx");
  assert.match(home, /href="\/bisnis\/wifi"/);
  assert.match(nav, /href: "\/bisnis\/wifi"/);
  assert.match(home, /href="\/dashboard"/);
});

test("portal links are isolated from YukReview Supabase credentials", () => {
  const helper = read("lib/wiv1Portal.ts");
  const page = read("app/bisnis/wifi/page.tsx");
  assert.match(helper, /NEXT_PUBLIC_WIV1_PORTAL_URL/);
  assert.match(helper, /candidate\.protocol !== "https:"/);
  assert.match(helper, /hostname === "wifi\.yukreview\.id"/);
  assert.match(page, /portal \? /);
  assert.match(page, /portal\.clientUrl/);
  assert.match(page, /portal\.providerUrl/);
  assert.doesNotMatch(helper + page, /(service_role|SUPABASE_SERVICE_ROLE_KEY|signInWithPassword|auth\.getSession|Authorization:|localStorage)/);
});

test("existing Google Review dashboard routes remain intact", () => {
  const nav = read("app/dashboard/DashboardNav.tsx");
  for (const url of ["/dashboard/cards", "/dashboard/landing-page", "/dashboard/feedback", "/dashboard/analytics"]) {
    assert.ok(nav.includes('href: "' + url + '"'), url + " was removed");
  }
});

test("live YukReview homepage product, pricing and customer access remain intact", () => {
  const home = read("app/page.tsx");
  assert.match(home, /Ulasan Google jadi/);
  assert.match(home, /Rp65\.000/);
  assert.match(home, /Rp125\.000/);
  assert.match(home, /href="\/dashboard"/);
  assert.match(home, /YUKREVIEW_SEARCH_TITLE/);
});
test("live dashboard keeps language switching and existing auth guard", () => {
  const nav = read("app/dashboard/DashboardNav.tsx");
  const layout = read("app/dashboard/layout.tsx");
  assert.match(nav, /useLanguage/);
  assert.match(nav, /auth\.getSession/);
  assert.match(layout, /ProviderMfaGate/);
});
