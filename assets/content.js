/*!
 * content.js — Protect30A content loader (framework-free, no dependencies)
 * -----------------------------------------------------------------------------
 * Loads JSON seed files from /content/<name>.json and provides small helpers to
 * render them into the DOM with accessible loading / empty / error states.
 *
 * Public API (all attached to window):
 *   window.p30aLoadContent(name)                  -> Promise<any>   (cached)
 *   window.p30aRender(list, el, rowFn)            -> void
 *   window.p30aContentLoadingState(el, on, msg)   -> void           (aria-live helper)
 *   window.p30aContentClearCache(name?)           -> void
 *
 * Notes:
 *  - No cookies, no localStorage. Cache is in-memory only (lives for the page).
 *  - Everything is guarded; a bad fetch resolves to a rejected promise the
 *    caller can catch, and the render helper shows a friendly empty/error state.
 *  - Content is public (FL Ch. 119); this module handles no PII.
 */
(function () {
  'use strict';

  if (window.p30aLoadContent) return; // idempotent: don't redefine if already loaded

  // In-memory cache: name -> Promise (so concurrent callers share one fetch).
  var CACHE = Object.create(null);

  // Base path for content files. Root-relative so it works on any route.
  var BASE = '/content/';

  /**
   * Fetch and cache a content file by logical name (no extension).
   * @param {string} name e.g. "meetings" -> /content/meetings.json
   * @returns {Promise<any>} parsed JSON
   */
  function p30aLoadContent(name) {
    if (typeof name !== 'string' || !name) {
      return Promise.reject(new Error('p30aLoadContent: name required'));
    }
    // Whitelist-safe: strip anything that isn't a simple slug so we can never
    // be pointed at an arbitrary path.
    var safe = name.replace(/[^a-z0-9\-_/]/gi, '');
    if (!safe) {
      return Promise.reject(new Error('p30aLoadContent: invalid name'));
    }
    if (CACHE[safe]) return CACHE[safe];

    var url = BASE + safe + '.json';
    var p = fetch(url, { credentials: 'omit', cache: 'no-cache' })
      .then(function (res) {
        if (!res || !res.ok) {
          throw new Error('p30aLoadContent: HTTP ' + (res && res.status) + ' for ' + url);
        }
        return res.json();
      })
      .catch(function (err) {
        // Drop the failed promise from cache so a later call can retry.
        delete CACHE[safe];
        throw err;
      });

    CACHE[safe] = p;
    return p;
  }

  /**
   * Clear the in-memory cache (all, or a single name).
   * @param {string} [name]
   */
  function p30aContentClearCache(name) {
    if (name == null) {
      CACHE = Object.create(null);
      return;
    }
    var safe = String(name).replace(/[^a-z0-9\-_/]/gi, '');
    delete CACHE[safe];
  }

  /**
   * Toggle an accessible loading state on a container element.
   * Adds/removes aria-busy and an aria-live="polite" status line so screen
   * readers announce loading without stealing focus.
   * @param {Element} el   container
   * @param {boolean} on    true=show loading, false=clear
   * @param {string}  [msg] loading message
   */
  function p30aContentLoadingState(el, on, msg) {
    if (!el || !el.setAttribute) return;
    try {
      if (on) {
        el.setAttribute('aria-busy', 'true');
        var status = el.querySelector('[data-p30a-status]');
        if (!status) {
          status = document.createElement('p');
          status.setAttribute('data-p30a-status', '');
          status.setAttribute('role', 'status');
          status.setAttribute('aria-live', 'polite');
          status.className = 'p30a-content-status';
          el.appendChild(status);
        }
        status.textContent = msg || 'Loading…';
        status.hidden = false;
      } else {
        el.removeAttribute('aria-busy');
        var s = el.querySelector('[data-p30a-status]');
        if (s) s.hidden = true;
      }
    } catch (_) { /* no-op */ }
  }

  /**
   * Render an array into a container using a per-row render function.
   * Handles empty and error states so callers don't have to.
   *
   * @param {Array|any} list   array to render (non-arrays are coerced/emptied)
   * @param {Element}   el      container element (cleared before render)
   * @param {function}  rowFn   (item, index) => (Node | string | falsy)
   *                            return a DOM Node, an HTML string, or nothing to skip.
   * @param {Object}   [opts]  { empty: string|Node, error: string|Node }
   */
  function p30aRender(list, el, rowFn, opts) {
    if (!el) return;
    opts = opts || {};

    // Clear existing content (but keep an aria-live status node reusable).
    try { el.innerHTML = ''; } catch (_) { return; }
    el.removeAttribute('aria-busy');

    // Error state: caller passed an Error (or opts.error explicitly).
    if (list instanceof Error) {
      _appendState(el, opts.error, 'Sorry, this content could not be loaded right now. Please try again later.', 'p30a-content-error');
      return;
    }

    if (!Array.isArray(list) || list.length === 0) {
      _appendState(el, opts.empty, 'Nothing to show here yet.', 'p30a-content-empty');
      return;
    }

    var frag = document.createDocumentFragment();
    for (var i = 0; i < list.length; i++) {
      var out;
      try {
        out = typeof rowFn === 'function' ? rowFn(list[i], i) : null;
      } catch (e) {
        out = null; // one bad row shouldn't break the whole list
      }
      if (!out) continue;
      if (typeof out === 'string') {
        var wrap = document.createElement('div');
        wrap.innerHTML = out;
        while (wrap.firstChild) frag.appendChild(wrap.firstChild);
      } else if (out.nodeType) {
        frag.appendChild(out);
      }
    }
    el.appendChild(frag);
  }

  function _appendState(el, custom, fallbackText, cls) {
    if (custom && custom.nodeType) { el.appendChild(custom); return; }
    var p = document.createElement('p');
    p.className = cls;
    p.setAttribute('role', 'status');
    p.textContent = (typeof custom === 'string' && custom) ? custom : fallbackText;
    el.appendChild(p);
  }

  // Expose API.
  window.p30aLoadContent = p30aLoadContent;
  window.p30aRender = p30aRender;
  window.p30aContentLoadingState = p30aContentLoadingState;
  window.p30aContentClearCache = p30aContentClearCache;
})();
