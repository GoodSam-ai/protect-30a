import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const showPagePath = join(process.cwd(), "public/legacy/show/index.html");
const defaultInnerWidth = window.innerWidth;

async function readShowPage() {
  return readFile(showPagePath, "utf8");
}

function showMenuMarkup() {
  return `
    <header class="nav">
      <nav class="navlinks" id="nav">
        <a class="back" href="/#plan">The Stormwater Plan</a>
        <a href="#show">The Show</a>
      </nav>
      <button class="menu-btn" id="menuBtn" aria-label="Open menu" aria-expanded="false" aria-controls="nav">Menu</button>
    </header>`;
}

async function loadShowMenuHandler() {
  const html = await readShowPage();
  const start = html.indexOf("var mb=document.getElementById('menuBtn')");
  const end = html.indexOf("</script>", start);
  if (start < 0 || end < 0) throw new Error("Could not locate /show mobile-menu handler");
  window.eval(html.slice(start, end));
}

afterEach(() => {
  document.body.innerHTML = "";
  Object.defineProperty(window, "innerWidth", { configurable: true, value: defaultInnerWidth });
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("legacy show page accessibility", () => {
  it("focuses the first menu link when the mobile menu opens", async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 860 });
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    document.body.innerHTML = showMenuMarkup();
    await loadShowMenuHandler();

    document.getElementById("menuBtn")?.click();

    expect(document.activeElement).toBe(document.querySelector("#nav > a"));
  });

  it("closes the open mobile menu on Escape and returns focus to its toggle", async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 860 });
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    document.body.innerHTML = showMenuMarkup();
    await loadShowMenuHandler();
    const toggle = document.getElementById("menuBtn")!;
    const nav = document.getElementById("nav")!;
    toggle.click();

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

    expect(nav).not.toHaveClass("open");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(document.activeElement).toBe(toggle);
  });

  it("does not move focus back into the menu when it closes before queued focus runs", async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 860 });
    let queuedFocus: FrameRequestCallback | undefined;
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      queuedFocus = callback;
      return 1;
    });
    document.body.innerHTML = showMenuMarkup();
    await loadShowMenuHandler();
    const toggle = document.getElementById("menuBtn")!;

    toggle.click();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    queuedFocus?.(0);

    expect(document.getElementById("nav")).not.toHaveClass("open");
    expect(document.activeElement).toBe(toggle);
  });

  it("provides skip, navigation, and main landmarks", async () => {
    const page = new DOMParser().parseFromString(await readShowPage(), "text/html");
    const skipLink = page.querySelector<HTMLAnchorElement>('body > a[href="#main"]');
    const primaryNav = page.querySelector<HTMLElement>("header nav");

    expect(skipLink?.textContent).toBe("Skip to main content");
    expect(skipLink?.classList.contains("skip-link")).toBe(true);
    expect(page.querySelector("style")?.textContent).toContain(
      ".skip-link{position:fixed"
    );
    expect(page.querySelector("main#main")).not.toBeNull();
    expect(primaryNav?.getAttribute("aria-label")).toBeTruthy();
  });

  it("exposes merchant-special headings at level three without changing their styled elements", async () => {
    const page = new DOMParser().parseFromString(await readShowPage(), "text/html");
    const merchantHeadings = Array.from(page.querySelectorAll("#specials .special h4"));

    expect(merchantHeadings).toHaveLength(3);
    expect(merchantHeadings.every((heading) => heading.getAttribute("aria-level") === "3")).toBe(true);
  });
});
