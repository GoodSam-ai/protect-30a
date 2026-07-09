import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const actionCenterPath = join(process.cwd(), "public/assets/action-center.js");
const legacyHomepagePath = join(process.cwd(), "public/legacy/index.html");
const defaultInnerWidth = window.innerWidth;
const appWindow = window as Window & typeof globalThis & {
  p30aLoadContent?: () => Promise<unknown>;
  p30aTrack?: (...args: unknown[]) => void;
};

async function loadActionCenter() {
  window.eval(await readFile(actionCenterPath, "utf8"));
}

async function loadNav() {
  await vi.resetModules();
  // @ts-expect-error This browser-only static module intentionally has no TypeScript declaration.
  await import("../public/assets/pillars.js");
}

function activateTopControl(control: HTMLElement, key: "Enter" | " ") {
  const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
  control.dispatchEvent(event);

  // Browser button activation follows Enter/Space keydown unless it is cancelled.
  if (!event.defaultPrevented) {
    control.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  }
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
      <button id="nav-burger" aria-expanded="false" aria-label="Open menu" aria-controls="nav-menu"><span></span></button>
    </nav>`;
}

function staticPillarMobileNavMarkup() {
  return `
    <nav id="nav">
      <a class="nav-logo" href="/">Protect 30A</a>
      <ul class="nav-links" id="nav-menu">
        <li class="has-menu">
          <button class="nav-top" aria-expanded="false" aria-controls="menu-plan">Why &amp; Plan</button>
          <ul class="nav-panel" id="menu-plan"><li><a href="#why">Why now</a></li></ul>
        </li>
        <li class="keep"><a class="nav-cta" href="#help">Show support</a></li>
      </ul>
      <button id="nav-burger" data-p30a-mobile-nav aria-expanded="false" aria-label="Open menu" aria-controls="nav-menu"><span></span></button>
    </nav>`;
}

async function loadLegacyMobileMenuHandler() {
  const html = await readFile(legacyHomepagePath, "utf8");
  const start = html.indexOf("// ---------- nav scroll state ----------");
  const end = html.indexOf("// ---------- scroll reveal ----------", start);
  if (start < 0 || end < 0) throw new Error("Could not locate legacy mobile-menu handler");
  window.eval(html.slice(start, end));
}

afterEach(() => {
  document.body.innerHTML = "";
  Object.defineProperty(window, "innerWidth", { configurable: true, value: defaultInnerWidth });
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Action Center browser behavior", () => {
  it("blocks an invalid optional RSVP reminder email before fetch", async () => {
    document.body.innerHTML = `
      <form id="pp-rsvp-form">
        <select id="pp-rsvp-hearing"><option value="meeting-1">Meeting</option></select>
        <input id="pp-rsvp-first" value="Sam">
        <input id="pp-rsvp-email" type="email" value="x@">
        <input id="pp-rsvp-consent" type="checkbox" checked>
        <output id="pp-rsvp-status"></output>
      </form>`;
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    appWindow.p30aLoadContent = vi.fn().mockImplementation(() => new Promise(() => {}));

    await loadActionCenter();
    document.getElementById("pp-rsvp-form")?.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(document.getElementById("pp-rsvp-status")).toHaveTextContent(/valid email/i);
    expect(document.activeElement).toBe(document.getElementById("pp-rsvp-email"));
  });

  it("blocks an invalid signup email before fetch", async () => {
    document.body.innerHTML = `
      <form id="pp-signup-form">
        <input id="pp-signup-email" type="email" value="x@">
        <input id="pp-signup-consent" type="checkbox" checked>
        <output id="pp-signup-status"></output>
      </form>`;
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await loadActionCenter();
    document.getElementById("pp-signup-form")?.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(document.getElementById("pp-signup-status")).toHaveTextContent(/valid email/i);
    expect(document.activeElement).toBe(document.getElementById("pp-signup-email"));
  });

  it("toggles a primary dropdown once on Enter", async () => {
    document.body.innerHTML = mobileNavMarkup();
    await loadNav();
    const trigger = document.querySelector<HTMLElement>(".nav-top")!;

    activateTopControl(trigger, "Enter");

    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("toggles a primary dropdown once on Space", async () => {
    document.body.innerHTML = mobileNavMarkup();
    await loadNav();
    const trigger = document.querySelector<HTMLElement>(".nav-top")!;

    activateTopControl(trigger, " ");

    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("opens a primary dropdown and focuses its first item on ArrowDown", async () => {
    document.body.innerHTML = mobileNavMarkup();
    await loadNav();
    const trigger = document.querySelector<HTMLElement>(".nav-top")!;

    trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(document.activeElement).toHaveTextContent("Why now");
  });

  it("makes collapsed mobile panels inert until their control expands them", async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 820 });
    document.body.innerHTML = mobileNavMarkup();
    await loadNav();
    const panel = document.querySelector(".nav-panel")!;
    const trigger = document.querySelector<HTMLElement>(".nav-top")!;

    expect(panel).toHaveAttribute("inert");
    expect(panel).toHaveAttribute("aria-hidden", "true");

    trigger.click();

    expect(panel).not.toHaveAttribute("inert");
    expect(panel).not.toHaveAttribute("aria-hidden");
  });

  it("toggles the mobile menu on standalone pillar pages", async () => {
    document.body.innerHTML = staticPillarMobileNavMarkup();
    await loadNav();
    const nav = document.getElementById("nav")!;
    const burger = document.getElementById("nav-burger")!;

    burger.click();

    expect(nav).toHaveClass("menu-open");
    expect(burger).toHaveAttribute("aria-expanded", "true");
    expect(burger).toHaveAttribute("aria-label", "Close menu");

    burger.click();

    expect(nav).not.toHaveClass("menu-open");
    expect(burger).toHaveAttribute("aria-expanded", "false");
    expect(burger).toHaveAttribute("aria-label", "Open menu");
  });

  it("focuses the first visible primary control when the mobile menu opens", async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 820 });
    appWindow.p30aTrack = vi.fn();
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    document.body.innerHTML = mobileNavMarkup();
    await loadLegacyMobileMenuHandler();

    document.getElementById("nav-burger")?.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true })
    );

    expect(document.activeElement).toHaveClass("nav-top");
  });
});
