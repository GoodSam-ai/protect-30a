/*!
 * metrics.js — Protect30A civic-engagement metrics helpers
 * -----------------------------------------------------------------------------
 * Thin, privacy-preserving wrappers over window.p30aTrack (which is defined in
 * index.html — this file NEVER defines it). If p30aTrack is absent, every
 * helper is a silent no-op.
 *
 * PRIVACY GUARANTEES (by construction):
 *   - No cookies are set or read.
 *   - No localStorage / sessionStorage is used.
 *   - Per-session dedupe uses an in-memory Set keyed by a random nonce that
 *     exists only for the life of the page (lost on reload — intentional).
 *   - No PII or free-text is added to payloads by these helpers. Callers pass
 *     small, non-identifying prop objects only.
 *
 * Public API (all attached to window, all guarded in try/catch):
 *   window.p30aCivicAction(name, props={})            // fire once per session per key
 *   window.p30aDwell(selector, seconds, eventName)    // fire once after N visible seconds
 *   window.p30aScrollDepth(selector, pct, eventName)  // fire once at N% scrolled through
 */
(function () {
  'use strict';

  if (window.p30aCivicAction) return; // idempotent

  // Per-page random nonce; namespaces the in-memory dedupe Set. Not persisted.
  var SESSION_NONCE = (function () {
    try {
      if (window.crypto && typeof window.crypto.randomUUID === 'function') {
        return window.crypto.randomUUID();
      }
    } catch (_) {}
    // Fallback nonce (still non-persistent, non-identifying).
    return 'p30a-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
  })();

  // In-memory dedupe registry: Set of "<nonce>::<key>" strings. Never stored.
  var FIRED = (typeof Set === 'function') ? new Set() : null;

  function _track(eventName, props) {
    try {
      if (typeof window.p30aTrack === 'function' && eventName) {
        window.p30aTrack(eventName, props || {});
      }
    } catch (_) { /* no-op */ }
  }

  function _firedKey(key) {
    return SESSION_NONCE + '::' + key;
  }

  function _hasFired(key) {
    try {
      if (FIRED) return FIRED.has(_firedKey(key));
    } catch (_) {}
    return false;
  }

  function _markFired(key) {
    try {
      if (FIRED) FIRED.add(_firedKey(key));
    } catch (_) {}
  }

  /**
   * Record a civic action (e.g., "email_official_clicked", "agenda_opened").
   * De-dupes so the same action fires at most once per page session.
   * @param {string} name  event name (no PII)
   * @param {Object} [props] small non-identifying properties (no free text / PII)
   */
  function p30aCivicAction(name, props) {
    try {
      if (!name) return;
      // Dedupe key: event name + optional caller-provided 'key' discriminator.
      var disc = (props && (props.key || props.id || props.label)) || '';
      var dedupeKey = 'civic:' + name + (disc ? ':' + disc : '');
      if (_hasFired(dedupeKey)) return;
      _markFired(dedupeKey);
      _track(name, props || {});
    } catch (_) { /* no-op */ }
  }

  /**
   * Fire an event once the given element has been visible for `seconds`.
   * Uses IntersectionObserver + a timer; fires a single time then disconnects.
   * @param {string} selector  CSS selector for the element to watch
   * @param {number} seconds   dwell threshold in seconds
   * @param {string} eventName event to fire (no PII)
   */
  function p30aDwell(selector, seconds, eventName) {
    try {
      if (!selector || !eventName) return;
      if (typeof window.IntersectionObserver !== 'function') return;
      var el = document.querySelector(selector);
      if (!el) return;

      var dedupeKey = 'dwell:' + eventName + ':' + selector;
      if (_hasFired(dedupeKey)) return;

      var ms = Math.max(0, (Number(seconds) || 0) * 1000);
      var timer = null;

      var io = new IntersectionObserver(function (entries) {
        for (var i = 0; i < entries.length; i++) {
          var e = entries[i];
          if (e.isIntersecting) {
            if (timer == null) {
              timer = window.setTimeout(function () {
                if (_hasFired(dedupeKey)) return;
                _markFired(dedupeKey);
                _track(eventName, { selector: selector, seconds: Number(seconds) || 0 });
                try { io.disconnect(); } catch (_) {}
              }, ms);
            }
          } else if (timer != null) {
            window.clearTimeout(timer);
            timer = null;
          }
        }
      }, { threshold: 0.5 });

      io.observe(el);
    } catch (_) { /* no-op */ }
  }

  /**
   * Fire an event once the user has scrolled at least `pct` percent through the
   * element (0–100). Fires a single time then removes its listener.
   * @param {string} selector  CSS selector for the element to watch
   * @param {number} pct       scroll-through threshold, 0–100
   * @param {string} eventName event to fire (no PII)
   */
  function p30aScrollDepth(selector, pct, eventName) {
    try {
      if (!selector || !eventName) return;
      var el = document.querySelector(selector);
      if (!el) return;

      var threshold = Math.min(100, Math.max(0, Number(pct) || 0));
      var dedupeKey = 'scroll:' + eventName + ':' + selector + ':' + threshold;
      if (_hasFired(dedupeKey)) return;

      var onScroll = function () {
        try {
          if (_hasFired(dedupeKey)) { _detach(); return; }
          var rect = el.getBoundingClientRect();
          var vh = window.innerHeight || document.documentElement.clientHeight;
          var total = rect.height + vh; // distance from first-appear to fully-passed
          if (total <= 0) return;
          // How far we've progressed through the element, as a percentage.
          var passed = vh - rect.top;
          var progress = (passed / total) * 100;
          if (progress >= threshold) {
            _markFired(dedupeKey);
            _track(eventName, { selector: selector, pct: threshold });
            _detach();
          }
        } catch (_) { _detach(); }
      };

      var _detach = function () {
        try {
          window.removeEventListener('scroll', onScroll);
          window.removeEventListener('resize', onScroll);
        } catch (_) {}
      };

      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll, { passive: true });
      // Evaluate once in case the element is already past the threshold on load.
      onScroll();
    } catch (_) { /* no-op */ }
  }

  // Expose API.
  window.p30aCivicAction = p30aCivicAction;
  window.p30aDwell = p30aDwell;
  window.p30aScrollDepth = p30aScrollDepth;
})();
