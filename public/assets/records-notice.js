/* assets/records-notice.js — Protect30A mandatory public-records notice
 * ---------------------------------------------------------------------------
 * Framework-free. Attaches window.p30aRecordsNotice(target?).
 *
 * Given a container element (or, if omitted, every element matching
 * [data-records-notice]), injects an accessible FS Ch. 119 records notice
 * immediately BEFORE the container's submit control (button[type=submit],
 * input[type=submit], or [data-submit]). Falls back to appending at the end
 * of the container if no submit control is found.
 *
 * Rendered as role="note" (keyboard-agnostic, no focus traps) and links to
 * /records-privacy/. Idempotent per container.
 * ------------------------------------------------------------------------- */
(function () {
  "use strict";

  var NOTICE_CLASS = "p30a-records-notice";
  var NOTICE_TEXT =
    "Notice: Florida has broad public-records laws (FS Ch. 119). " +
    "Because this site is operated by an individual who also holds public " +
    "office, information you submit here — including your name, message, and " +
    "email — may be subject to public disclosure and may not be confidential. " +
    "Do not submit sensitive personal information. If you wish to communicate " +
    "with a government office confidentially or as an official matter, use " +
    "that office's official channels.";
  var PRIVACY_HREF = "/records-privacy/";
  var PRIVACY_LABEL = "Records privacy";

  function findSubmitControl(container) {
    return container.querySelector(
      'button[type="submit"], input[type="submit"], [data-submit]'
    );
  }

  function buildNotice(doc) {
    var note = doc.createElement("div");
    note.className = NOTICE_CLASS;
    note.setAttribute("role", "note");

    var text = doc.createElement("span");
    text.className = NOTICE_CLASS + "__text";
    text.textContent = NOTICE_TEXT + " ";
    note.appendChild(text);

    var link = doc.createElement("a");
    link.className = NOTICE_CLASS + "__link";
    link.setAttribute("href", PRIVACY_HREF);
    link.textContent = PRIVACY_LABEL;
    note.appendChild(link);

    return note;
  }

  function injectInto(container) {
    if (!container || container.nodeType !== 1) return null;
    // Idempotent: don't double-inject into the same container.
    if (container.querySelector("." + NOTICE_CLASS)) return null;

    var doc = container.ownerDocument || document;
    var note = buildNotice(doc);
    var submit = findSubmitControl(container);

    if (submit && submit.parentNode) {
      submit.parentNode.insertBefore(note, submit);
    } else {
      container.appendChild(note);
    }
    return note;
  }

  function p30aRecordsNotice(target) {
    // Explicit element.
    if (target && target.nodeType === 1) {
      return injectInto(target);
    }
    // Otherwise inject into all opted-in containers.
    var nodes = document.querySelectorAll("[data-records-notice]");
    var out = [];
    for (var i = 0; i < nodes.length; i++) {
      var n = injectInto(nodes[i]);
      if (n) out.push(n);
    }
    return out;
  }

  // Expose globally.
  if (typeof window !== "undefined") {
    window.p30aRecordsNotice = p30aRecordsNotice;

    // Auto-run for any [data-records-notice] containers already in the DOM.
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function () {
        p30aRecordsNotice();
      });
    } else {
      p30aRecordsNotice();
    }
  }
})();
