import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const foundationPath = join(process.cwd(), "public/assets/pillar-page-foundation.css");
const defaultInnerWidth = window.innerWidth;
const pillarRoutes = [
  "public/act/index.html",
  "public/records/index.html",
  "public/impact/index.html"
];

async function loadPillarBehavior() {
  await vi.resetModules();
  // @ts-expect-error This browser-only static module intentionally has no TypeScript declaration.
  await import("../public/assets/pillars.js");
}

function mobileNavMarkup() {
  return `
    <nav id="nav">
      <ul class="nav-links" id="nav-menu">
        <li class="has-menu">
          <button class="nav-top" aria-expanded="false" aria-controls="menu-plan">Why &amp; Plan</button>
          <ul class="nav-panel" id="menu-plan"><li><a href="#why">Why now</a></li></ul>
        </li>
        <li class="keep"><a class="nav-cta" href="#help">Show support</a></li>
      </ul>
      <button id="nav-burger" data-p30a-mobile-nav aria-expanded="false" aria-label="Open menu" aria-controls="nav-menu">Menu</button>
    </nav>`;
}

afterEach(() => {
  document.body.innerHTML = "";
  Object.defineProperty(window, "innerWidth", { configurable: true, value: defaultInnerWidth });
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("pillar-page visual foundation", () => {
  it("provides the shared layout, navigation, and content styles", async () => {
    const css = await readFile(foundationPath, "utf8");

    expect(css).toContain("body{");
    expect(css).toContain("#nav{");
    expect(css).toContain(".pillar-head{");
    expect(css).toContain(".site-footer{");
    expect(css).toContain("main .pillar-head .pillar-intro{color:rgba(255,255,255,.88)}");
    for (const token of [
      "--aqua:#8fcdc4!important",
      "--ink-soft:#51625f!important",
      "--clay:#a97e54!important",
      "--line:rgba(14,59,56,.16)!important",
      "--shadow-lg:0 18px 60px rgba(14,59,56,.16)!important"
    ]) {
      expect(css).toContain(token);
    }
  });

  it.each(pillarRoutes)("loads the shared foundation before the additive pillar layer: %s", async (route) => {
    const html = await readFile(join(process.cwd(), route), "utf8");
    const foundation = '<link rel="stylesheet" href="/assets/pillar-page-foundation.css">';
    const additiveLayer = '<link rel="stylesheet" href="/assets/pillars.css">';

    expect(html).toContain(foundation);
    expect(html.indexOf(foundation)).toBeLessThan(html.indexOf(additiveLayer));
  });

  it("focuses the first top-level control when the standalone mobile menu opens", async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 820 });
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    document.body.innerHTML = mobileNavMarkup();
    await loadPillarBehavior();

    document.getElementById("nav-burger")?.click();

    expect(document.activeElement).toBe(document.querySelector("#nav-menu > li > .nav-top"));
  });

  it("does not move focus when the standalone menu is activated above the mobile breakpoint", async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 821 });
    document.body.innerHTML = mobileNavMarkup();
    await loadPillarBehavior();
    const burger = document.getElementById("nav-burger")!;
    burger.focus();

    burger.click();

    expect(document.activeElement).toBe(burger);
  });

  it("does not move focus back into the menu when it closes before queued focus runs", async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 820 });
    let queuedFocus: FrameRequestCallback | undefined;
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      queuedFocus = callback;
      return 1;
    });
    document.body.innerHTML = mobileNavMarkup();
    await loadPillarBehavior();
    const burger = document.getElementById("nav-burger")!;

    burger.click();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    queuedFocus?.(0);

    expect(document.getElementById("nav")).not.toHaveClass("menu-open");
    expect(document.activeElement).toBe(burger);
  });
});
