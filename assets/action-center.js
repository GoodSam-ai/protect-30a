/*!
 * action-center.js — Protect30A Engagement "Action Center" (Phase 1)
 * -----------------------------------------------------------------------------
 * Framework-free, defensive, deferred. Powers the reframed #help / #act section:
 *   R-16 Pledge wall        R-17 Commissioner email generator
 *   R-18 Share row          R-19 "I'll show up" RSVP + .ics
 *   R-20 Email-list signup   R-21 instrumentation
 *
 * COMPLIANCE
 *  - Private-citizen advocacy tool, NOT an official government channel.
 *  - Sunshine: RSVP is resident -> event ONLY. It never creates a channel to
 *    officials and never renders any attendee email.
 *  - FS Ch. 119: pledge / RSVP / signup forms carry the records notice
 *    (records-notice.js auto-injects on [data-records-notice]).
 *  - Language: "special assessment" (never "tax"); NO per-property dollars.
 *  - Analytics: p30aCivicAction / p30aTrack payloads carry NO PII (no names,
 *    no emails, no free text). Only booleans / counts / stable ids.
 *
 * ELEMENT-ID <-> HANDLER CONTRACT (every id below must exist in index.html):
 *   #pp-pledge-count      live count line (aria-live=polite); "Be the first…"
 *   #pp-pledge-form       pledge form            -> POST /api/pledge
 *   #pp-pledge-first      first name (required)
 *   #pp-pledge-hood       neighborhood <select>
 *   #pp-pledge-public     "show on wall" checkbox (default unchecked)
 *   #pp-pledge-records    required public-record ack checkbox
 *   #pp-pledge-status     inline status (aria-live)
 *   #pp-pledge-wall       consented first-name+neighborhood wall
 *   #pp-email-name        commissioner-email name input
 *   #pp-email-neighborhood commissioner-email neighborhood input
 *   #pp-email-preview     read-only <textarea> live preview
 *   #pp-email-open        "Open in email app" -> mailto: 5 commissioners
 *   #pp-email-copy        "Copy email text" -> clipboard + #copied-toast
 *   #pp-share-row         share button row (native + fallbacks)
 *   #pp-share-native      navigator.share primary button
 *   #pp-share-x / -fb / -email / -copy  fallback links/buttons
 *   #pp-rsvp-form         RSVP form              -> POST /api/capture (rsvp)
 *   #pp-rsvp-hearing      hearing <select> (from meetings.json)
 *   #pp-rsvp-first        first name (required)
 *   #pp-rsvp-email        optional email
 *   #pp-rsvp-consent      required consent checkbox
 *   #pp-rsvp-status       inline status (aria-live)
 *   #pp-rsvp-ics          "Add to calendar (.ics)" button
 *   #pp-signup-form       email-list signup      -> POST /api/capture (signup)
 *   #pp-signup-email      email (required)
 *   #pp-signup-consent    required consent checkbox
 *   #pp-signup-status     inline status (aria-live)
 * ------------------------------------------------------------------------- */
(function () {
  "use strict";

  /* ---------- tiny helpers -------------------------------------------- */
  var doc = document;
  function $(id) { return doc.getElementById(id); }
  function on(el, ev, fn) { if (el && el.addEventListener) el.addEventListener(ev, fn); }
  function track(name, props) {
    try { if (typeof window.p30aTrack === "function") window.p30aTrack(name, props || {}); }
    catch (_) {}
  }
  function civic(name, props) {
    try { if (typeof window.p30aCivicAction === "function") window.p30aCivicAction(name, props || {}); }
    catch (_) {}
  }
  function setStatus(el, msg, tone) {
    if (!el) return;
    el.textContent = msg || "";
    el.setAttribute("data-tone", tone || "");
  }
  function submitJson(url, payload) {
    return fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "omit",
      body: JSON.stringify(payload)
    }).then(function (r) {
      if (r && r.ok) return r;
      var status = r && r.status ? r.status : 0;
      var err = new Error("request_failed");
      err.status = status;
      if (r && r.json) {
        return r.json().then(
          function (body) {
            err.code = body && body.error;
            throw err;
          },
          function () { throw err; }
        );
      }
      throw err;
    });
  }
  function fallbackName(v) { return (v && v.trim()) || "[Your name]"; }
  function fallbackHood(v) { return (v && v.trim()) || "[Your neighborhood]"; }

  /* Shared toast (reuse the existing #copied-toast from index.html). */
  var TOAST_TIMER = null;
  function toast(msg) {
    var t = $("copied-toast");
    if (!t) return;
    if (msg) t.textContent = msg;
    t.classList.add("show");
    if (TOAST_TIMER) window.clearTimeout(TOAST_TIMER);
    TOAST_TIMER = window.setTimeout(function () { t.classList.remove("show"); }, 2600);
  }

  /* Copy helper: async clipboard -> execCommand fallback. Resolves boolean. */
  function copyText(text) {
    return new Promise(function (resolve) {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(
            function () { resolve(true); },
            function () { resolve(legacyCopy(text)); }
          );
          return;
        }
      } catch (_) {}
      resolve(legacyCopy(text));
    });
  }
  function legacyCopy(text) {
    try {
      var ta = doc.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "absolute";
      ta.style.left = "-9999px";
      doc.body.appendChild(ta);
      ta.select();
      var ok = doc.execCommand("copy");
      ta.remove();
      return !!ok;
    } catch (_) { return false; }
  }

  /* ---------- commissioner email (MUST match the inline handler) ------- */
  /* Addresses verified 2026-06-10 from mywaltonfl.gov/112/Commissioners
     (kept identical to the existing inline #email-btn handler). */
  var COMMISSIONERS = [
    "dan.curry@mywaltonfl.gov",
    "danny.glidewell@mywaltonfl.gov",
    "brad.drake@mywaltonfl.gov",
    "donna.johns@mywaltonfl.gov",
    "tony.anderson@mywaltonfl.gov"
  ];
  var EMAIL_SUBJECT =
    "Please support the 30A Stormwater Plan — adopt the intent resolution in 2026";
  function emailBody(name, hood) {
    return (
      "Dear Commissioners,\n\n" +
      "I live in / own property in the 30A corridor of South Walton, and I'm writing to ask you to support the 30A Stormwater Plan — specifically, to adopt the resolution of intent under FS § 197.3632 before January 1, 2027, so the first stormwater projects can be funded in the November 2027 cycle.\n\n" +
      "Flooding in our neighborhoods is getting worse, and our coastal dune lakes — among the rarest waters in the world — bear the cost of every untreated storm. This plan keeps money raised on 30A working on 30A, apportions costs fairly by benefit, and pairs local funding with state Resilient Florida grants.\n\n" +
      "Please don't let the January 1, 2027 deadline slip. Our community is ready to do its part.\n\n" +
      "Respectfully,\n" +
      fallbackName(name) + "\n" +
      fallbackHood(hood)
    );
  }

  /* ==================================================================== */
  /* R-17  COMMISSIONER EMAIL GENERATOR                                    */
  /* ==================================================================== */
  function initEmail() {
    var nameEl = $("pp-email-name");
    var hoodEl = $("pp-email-neighborhood");
    var preview = $("pp-email-preview");
    var openBtn = $("pp-email-open");
    var copyBtn = $("pp-email-copy");
    if (!preview && !openBtn && !copyBtn) return;

    function render() {
      if (preview) {
        preview.value =
          "To: Walton County Commissioners\n" +
          "Subject: " + EMAIL_SUBJECT + "\n\n" +
          emailBody(nameEl ? nameEl.value : "", hoodEl ? hoodEl.value : "");
      }
    }
    on(nameEl, "input", render);
    on(hoodEl, "input", render);
    render();

    on(openBtn, "click", function (e) {
      e.preventDefault();
      var subject = encodeURIComponent(EMAIL_SUBJECT);
      var body = encodeURIComponent(emailBody(nameEl ? nameEl.value : "", hoodEl ? hoodEl.value : ""));
      // No PII in analytics — only whether the user personalized the fields.
      civic("commission_email_sent", {
        pillar: "engagement", section: "help", method: "mailto",
        personalized: !!((nameEl && nameEl.value.trim()) || (hoodEl && hoodEl.value.trim()))
      });
      window.location.href =
        "mailto:" + COMMISSIONERS.join(",") + "?subject=" + subject + "&body=" + body;
    });

    on(copyBtn, "click", function (e) {
      e.preventDefault();
      var text =
        "Subject: " + EMAIL_SUBJECT + "\n\n" +
        emailBody(nameEl ? nameEl.value : "", hoodEl ? hoodEl.value : "") +
        "\n\n(Send to: " + COMMISSIONERS.join(", ") + ")";
      copyText(text).then(function (ok) {
        toast(ok ? "Email text copied — paste it into your email app. 🌊"
                 : "Couldn't copy automatically — select the text above.");
        civic("commission_email_sent", {
          pillar: "engagement", section: "help", method: "copy", copied: ok,
          personalized: !!((nameEl && nameEl.value.trim()) || (hoodEl && hoodEl.value.trim()))
        });
      });
    });
  }

  /* ==================================================================== */
  /* R-18  SHARE ROW                                                       */
  /* ==================================================================== */
  var SHARE_TITLE = "Protect 30A — South Walton Stormwater Plan";
  var SHARE_TEXT =
    "30A needs a real stormwater plan. See how the funding works and how to help before the Jan 1, 2027 deadline:";
  function shareUrl() {
    try { return window.location.href; } catch (_) { return ""; }
  }
  function initShare() {
    var row = $("pp-share-row");
    if (!row) return;
    var nativeBtn = $("pp-share-native");
    var url = shareUrl();

    // Native share (hide the button if unavailable so we don't show a dead control).
    if (nativeBtn) {
      if (navigator.share) {
        on(nativeBtn, "click", function (e) {
          e.preventDefault();
          track("share_attempt", { section: "help", method: "native", target: url });
          navigator.share({ title: SHARE_TITLE, text: SHARE_TEXT, url: url }).then(
            function () {
              track("share_success", { section: "help", method: "native" });
              civic("email_signup_share", { pillar: "engagement", section: "help", method: "native" });
            },
            function () { /* user canceled — no-op */ }
          );
        });
      } else {
        nativeBtn.setAttribute("hidden", "");
      }
    }

    var xBtn = $("pp-share-x");
    if (xBtn) {
      xBtn.setAttribute(
        "href",
        "https://twitter.com/intent/tweet?text=" +
          encodeURIComponent(SHARE_TEXT) + "&url=" + encodeURIComponent(url)
      );
      on(xBtn, "click", function () {
        track("share_success", { section: "help", method: "x" });
      });
    }
    var fbBtn = $("pp-share-fb");
    if (fbBtn) {
      fbBtn.setAttribute(
        "href",
        "https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(url)
      );
      on(fbBtn, "click", function () {
        track("share_success", { section: "help", method: "facebook" });
      });
    }
    var mailBtn = $("pp-share-email");
    if (mailBtn) {
      mailBtn.setAttribute(
        "href",
        "mailto:?subject=" + encodeURIComponent(SHARE_TITLE) +
          "&body=" + encodeURIComponent(SHARE_TEXT + "\n\n" + url)
      );
      on(mailBtn, "click", function () {
        track("share_success", { section: "help", method: "email" });
      });
    }
    var copyBtn = $("pp-share-copy");
    if (copyBtn) {
      on(copyBtn, "click", function (e) {
        e.preventDefault();
        track("share_attempt", { section: "help", method: "clipboard", target: url });
        copyText(url).then(function (ok) {
          toast(ok ? "Link copied — thank you for sharing! 🌊"
                   : "Couldn't copy automatically — here's the link: " + url);
          track("share_success", { section: "help", method: ok ? "clipboard" : "fallback" });
        });
      });
    }
  }

  /* ==================================================================== */
  /* R-16  PLEDGE WALL                                                     */
  /* ==================================================================== */
  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function renderWall(recent, count) {
    var wall = $("pp-pledge-wall");
    if (!wall) return;
    var rows = Array.isArray(recent) ? recent.filter(function (r) {
      return r && r.first;
    }) : [];
    if (!rows.length) {
      wall.innerHTML =
        '<p class="pp-wall-empty">Consenting neighbors appear here first-name only. ' +
        "Add yours above to help build the wall.</p>";
      return;
    }
    var html = '<ul class="pp-wall-list">';
    for (var i = 0; i < rows.length; i++) {
      var first = escapeHtml(rows[i].first);
      var hood = rows[i].neighborhood ? escapeHtml(rows[i].neighborhood) : "";
      html += '<li class="pp-wall-item"><span class="pp-wall-name">' + first + "</span>" +
              (hood ? '<span class="pp-wall-hood">' + hood + "</span>" : "") + "</li>";
    }
    html += "</ul>";
    wall.innerHTML = html;
  }
  function renderCount(count) {
    var el = $("pp-pledge-count");
    if (!el) return;
    var n = (typeof count === "number" && isFinite(count) && count > 0) ? count : 0;
    if (n <= 0) {
      el.textContent = "Be the first to pledge.";
    } else {
      el.textContent =
        n.toLocaleString() + (n === 1 ? " neighbor has" : " neighbors have") + " pledged to help.";
    }
  }
  function loadPledgeWall() {
    renderCount(0);            // honest default until the endpoint answers
    fetch("/api/pledge", { credentials: "omit", cache: "no-cache" })
      .then(function (r) { return r && r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data) return;
        renderCount(typeof data.count === "number" ? data.count : 0);
        renderWall(data.recent || [], data.count);
      })
      .catch(function () { /* keep honest 0 / placeholder wall */ });
  }
  function initPledge() {
    var form = $("pp-pledge-form");
    if (!form) return;
    var firstEl = $("pp-pledge-first");
    var hoodEl = $("pp-pledge-hood");
    var publicEl = $("pp-pledge-public");
    var recordsEl = $("pp-pledge-records");
    var statusEl = $("pp-pledge-status");

    renderWall([], 0);
    loadPledgeWall();

    on(form, "submit", function (e) {
      e.preventDefault();
      var first = firstEl ? firstEl.value.trim() : "";
      if (!first) {
        setStatus(statusEl, "Please add your first name.", "err");
        if (firstEl) firstEl.focus();
        return;
      }
      if (recordsEl && !recordsEl.checked) {
        setStatus(statusEl, "Please acknowledge the public-record notice to pledge.", "err");
        if (recordsEl) recordsEl.focus();
        return;
      }
      var payload = {
        first: first,
        neighborhood: hoodEl ? hoodEl.value : "",
        consentPublic: !!(publicEl && publicEl.checked),
        consentRecords: !!(recordsEl && recordsEl.checked)
      };
      setStatus(statusEl, "Sending your pledge…", "");
      var done = false;
      function thankYou() {
        if (done) return; done = true;
        setStatus(statusEl, "Thank you for pledging to help. 🌊", "ok");
        toast("Thank you for pledging! 🌊");
        // No PII: only booleans + neighborhood bucket.
        civic("pledge_submit", {
          pillar: "engagement", section: "help",
          consentPublic: payload.consentPublic,
          neighborhood: payload.neighborhood || "(unspecified)"
        });
        try { form.reset(); } catch (_) {}
        loadPledgeWall();
      }
      submitJson("/api/pledge", payload)
        .then(function () { thankYou(); })
        .catch(function () {
          setStatus(statusEl, "We could not record your pledge right now. Please try again.", "err");
        });
    });
  }

  /* ==================================================================== */
  /* R-19  RSVP ("I'll show up") + .ics                                    */
  /* ==================================================================== */
  var RSVP_MEETINGS = [];   // populated from /content/meetings.json

  function fmtHearingLabel(m) {
    var when = "";
    try {
      // Parse the local (no-offset) ISO string as wall-clock America/Chicago.
      var d = parseLocal(m.start);
      if (d) {
        when = d.toLocaleDateString("en-US", {
          month: "short", day: "numeric", year: "numeric"
        });
        var t = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
        // Only show a clock time if it isn't midnight (all-day / window rows).
        if (!/^12:00\s?AM$/i.test(t)) when += " · " + t + " CT";
      }
    } catch (_) {}
    var label = (m.title || "Meeting");
    if (when) label += " — " + when;
    if (m.status === "projected") label += " (projected)";
    return label;
  }
  // Parse "YYYY-MM-DDTHH:MM:SS" as wall-clock components (no tz math here).
  function parseLocal(s) {
    if (!s || typeof s !== "string") return null;
    var mm = s.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/);
    if (!mm) return null;
    return new Date(
      Number(mm[1]), Number(mm[2]) - 1, Number(mm[3]),
      Number(mm[4]), Number(mm[5]), Number(mm[6] || 0)
    );
  }

  function populateHearings(sel) {
    if (!sel) return;
    // Prefer noticed rows first, then projected; drop anything without a start.
    var rows = RSVP_MEETINGS.filter(function (m) { return m && m.start; });
    rows.sort(function (a, b) {
      var an = a.status === "noticed" ? 0 : 1, bn = b.status === "noticed" ? 0 : 1;
      if (an !== bn) return an - bn;
      return String(a.start).localeCompare(String(b.start));
    });
    // Clear existing options except a leading placeholder we control.
    sel.innerHTML = "";
    var ph = doc.createElement("option");
    ph.value = "";
    ph.textContent = rows.length ? "Choose a meeting…" : "[UNVERIFIED — hearing dates TBA]";
    ph.disabled = false;
    sel.appendChild(ph);
    for (var i = 0; i < rows.length; i++) {
      var m = rows[i];
      var opt = doc.createElement("option");
      opt.value = m.id || String(i);
      opt.textContent = fmtHearingLabel(m);
      sel.appendChild(opt);
    }
  }
  function findMeeting(id) {
    for (var i = 0; i < RSVP_MEETINGS.length; i++) {
      if ((RSVP_MEETINGS[i].id || String(i)) === id) return RSVP_MEETINGS[i];
    }
    return null;
  }

  /* Build a valid VEVENT for America/Chicago. We emit a VTIMEZONE with both
     CDT and CST sub-components and reference TZID=America/Chicago so the
     wall-clock time is interpreted correctly regardless of the row's month. */
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function icsLocalStamp(s) {
    var m = (s || "").match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/);
    if (!m) return null;
    return m[1] + m[2] + m[3] + "T" + m[4] + m[5] + (m[6] || "00");
  }
  function icsUtcNow() {
    var d = new Date();
    return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) +
      "T" + pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + pad(d.getUTCSeconds()) + "Z";
  }
  function icsEscape(t) {
    return String(t == null ? "" : t)
      .replace(/\\/g, "\\\\").replace(/;/g, "\\;")
      .replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
  }
  function buildIcs(m) {
    var dtStart = icsLocalStamp(m.start);
    var dtEnd = icsLocalStamp(m.end) || dtStart;
    if (!dtStart) return null;
    var uid = "p30a-" + (m.id || dtStart) + "@protect30a.org";
    var summary = m.title || "Walton County meeting";
    if (m.status === "projected") summary += " (projected)";
    var desc = (m.why || "") +
      (m.agendaUrl ? "\\n\\nAgenda / verify: " + m.agendaUrl : "") +
      "\\n\\nAdded from protect30a.org — a private, resident-led advocacy resource. Verify date, time, and room against the official agenda before attending.";
    var lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Protect30A//Action Center//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VTIMEZONE",
      "TZID:America/Chicago",
      "BEGIN:DAYLIGHT",
      "TZOFFSETFROM:-0600",
      "TZOFFSETTO:-0500",
      "TZNAME:CDT",
      "DTSTART:19700308T020000",
      "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU",
      "END:DAYLIGHT",
      "BEGIN:STANDARD",
      "TZOFFSETFROM:-0500",
      "TZOFFSETTO:-0600",
      "TZNAME:CST",
      "DTSTART:19701101T020000",
      "RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU",
      "END:STANDARD",
      "END:VTIMEZONE",
      "BEGIN:VEVENT",
      "UID:" + uid,
      "DTSTAMP:" + icsUtcNow(),
      "DTSTART;TZID=America/Chicago:" + dtStart,
      "DTEND;TZID=America/Chicago:" + dtEnd,
      "SUMMARY:" + icsEscape(summary),
      "DESCRIPTION:" + icsEscape(desc),
      m.agendaUrl ? "URL:" + icsEscape(m.agendaUrl) : "",
      "STATUS:CONFIRMED",
      "END:VEVENT",
      "END:VCALENDAR"
    ].filter(Boolean);
    // RFC 5545 line endings.
    return lines.join("\r\n") + "\r\n";
  }
  function downloadIcs(m) {
    var text = buildIcs(m);
    if (!text) return false;
    try {
      var blob = new Blob([text], { type: "text/calendar;charset=utf-8" });
      var url = URL.createObjectURL(blob);
      var a = doc.createElement("a");
      a.href = url;
      a.download = "protect30a-" + (m.id || "meeting") + ".ics";
      doc.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
      return true;
    } catch (_) { return false; }
  }

  function initRsvp() {
    var form = $("pp-rsvp-form");
    var sel = $("pp-rsvp-hearing");
    if (!form && !sel) return;
    var firstEl = $("pp-rsvp-first");
    var emailEl = $("pp-rsvp-email");
    var consentEl = $("pp-rsvp-consent");
    var statusEl = $("pp-rsvp-status");
    var icsBtn = $("pp-rsvp-ics");

    // Load hearings from meetings.json (via content.js) with graceful fallback.
    function useMeetings(list) {
      RSVP_MEETINGS = Array.isArray(list) ? list : [];
      populateHearings(sel);
    }
    if (typeof window.p30aLoadContent === "function") {
      window.p30aLoadContent("meetings").then(
        function (data) { useMeetings(data && data.meetings); },
        function () { useMeetings([]); }
      );
    } else {
      // Fallback direct fetch.
      fetch("/content/meetings.json", { credentials: "omit", cache: "no-cache" })
        .then(function (r) { return r && r.ok ? r.json() : null; })
        .then(function (d) { useMeetings(d && d.meetings); })
        .catch(function () { useMeetings([]); });
    }

    on(icsBtn, "click", function (e) {
      e.preventDefault();
      var m = sel ? findMeeting(sel.value) : null;
      if (!m) {
        setStatus(statusEl, "Choose a meeting first, then add it to your calendar.", "err");
        if (sel) sel.focus();
        return;
      }
      var ok = downloadIcs(m);
      toast(ok ? "Calendar file downloaded — open it to add the meeting."
               : "Couldn't build the calendar file in this browser.");
      civic("ics_download", {
        pillar: "engagement", section: "help",
        meeting: m.id || "(unknown)", status: m.status || ""
      });
    });

    on(form, "submit", function (e) {
      e.preventDefault();
      var meetingId = sel ? sel.value : "";
      var first = firstEl ? firstEl.value.trim() : "";
      if (!meetingId) {
        setStatus(statusEl, "Please choose a meeting.", "err");
        if (sel) sel.focus();
        return;
      }
      if (!first) {
        setStatus(statusEl, "Please add your first name.", "err");
        if (firstEl) firstEl.focus();
        return;
      }
      if (consentEl && !consentEl.checked) {
        setStatus(statusEl, "Please acknowledge the reminder + public-record notice.", "err");
        if (consentEl) consentEl.focus();
        return;
      }
      var m = findMeeting(meetingId);
      // SUNSHINE: this is resident -> event intake ONLY. We send the email to
      // OUR list for a reminder; it is NEVER forwarded to any official and is
      // never rendered anywhere. formType "rsvp" to the validate-only capture fn.
      var fields = {
        hearingId: meetingId,
        hearingTitle: m ? (m.title || "") : "",
        first: first,
        email: emailEl ? emailEl.value.trim() : "",
        consentReminder: !!(consentEl && consentEl.checked)
      };
      setStatus(statusEl, "Locking in your RSVP…", "");
      var done = false;
      function thankYou() {
        if (done) return; done = true;
        setStatus(statusEl, "You're on the list to show up — thank you. 🌊", "ok");
        toast("RSVP received — thank you for showing up! 🌊");
        // No PII, and crucially NO email in the analytics payload.
        civic("hearing_rsvp", {
          pillar: "engagement", section: "help",
          meeting: meetingId, status: m ? (m.status || "") : "",
          wantsReminder: !!(fields.email)
        });
        try { form.reset(); } catch (_) {}
        populateHearings(sel);
      }
      submitJson("/api/capture", { formType: "rsvp", fields: fields })
        .then(function () { thankYou(); })
        .catch(function () {
          setStatus(statusEl, "We could not save your RSVP right now. Please try again.", "err");
        });
    });
  }

  /* ==================================================================== */
  /* R-20  EMAIL-LIST SIGNUP                                               */
  /* ==================================================================== */
  function initSignup() {
    var form = $("pp-signup-form");
    if (!form) return;
    var emailEl = $("pp-signup-email");
    var consentEl = $("pp-signup-consent");
    var statusEl = $("pp-signup-status");

    on(form, "submit", function (e) {
      e.preventDefault();
      var email = emailEl ? emailEl.value.trim() : "";
      // Minimal validity check; the capture fn is authoritative (validate-only).
      if (!email || email.indexOf("@") < 1) {
        setStatus(statusEl, "Please enter a valid email.", "err");
        if (emailEl) emailEl.focus();
        return;
      }
      if (consentEl && !consentEl.checked) {
        setStatus(statusEl, "Please check the consent box to sign up.", "err");
        if (consentEl) consentEl.focus();
        return;
      }
      setStatus(statusEl, "Signing you up…", "");
      var done = false;
      function thankYou() {
        if (done) return; done = true;
        setStatus(statusEl, "You're subscribed to occasional updates. 🌊", "ok");
        toast("Thanks — we'll send occasional updates. 🌊");
        // CRITICAL: the analytics event carries NO email.
        civic("email_signup", { pillar: "engagement", section: "help" });
        try { form.reset(); } catch (_) {}
      }
      submitJson("/api/capture", { formType: "signup", fields: { email: email, consent: !!(consentEl && consentEl.checked) } })
        .then(function () { thankYou(); })
        .catch(function () {
          setStatus(statusEl, "We could not subscribe you right now. Please try again.", "err");
        });
    });
  }

  /* ---------- boot ---------------------------------------------------- */
  function boot() {
    try { initEmail(); } catch (_) {}
    try { initShare(); } catch (_) {}
    try { initPledge(); } catch (_) {}
    try { initRsvp(); } catch (_) {}
    try { initSignup(); } catch (_) {}
    // Belt-and-suspenders: ensure records notices are injected even if
    // records-notice.js loaded before our containers were parsed.
    try { if (typeof window.p30aRecordsNotice === "function") window.p30aRecordsNotice(); } catch (_) {}
  }
  if (doc.readyState === "loading") {
    doc.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
