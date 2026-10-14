/* Protect30A traffic: page views and allowlisted civic actions only. */
(function () {
  'use strict';
  if (window.p30aTrafficInstalled) return;
  window.p30aTrafficInstalled = true;
  // Keep preview deployments and local development out of production reporting.
  if (!/^(www\.)?protect30a\.(org|com)$/.test(window.location.hostname)) return;
  window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
  window.va('beforeSend', function (event) {
    try {
      var url = new URL(event.url, window.location.href);
      if (/^\/(admin|api|auth|account)(\/|$)/.test(url.pathname)) return null;
      url.search = ''; url.hash = '';
      return Object.assign({}, event, { url: url.toString() });
    } catch (_) { return null; }
  });
  if (!document.querySelector('script[src="/_vercel/insights/script.js"]')) {
    var script = document.createElement('script');
    script.defer = true;
    script.src = '/_vercel/insights/script.js';
    document.head.appendChild(script);
  }
  document.addEventListener('click', function (event) {
    var target = event.target && event.target.closest && event.target.closest('a, button');
    if (!target) return;
    var park = window.location.pathname.replace(/\/$/, '') === '/advocacy/helen-mccall-park';
    if (!park) return;
    var name = '';
    var data = { campaign: 'helen-mccall-park' };
    if (target.id === 'email-all' || (target.hasAttribute && target.hasAttribute('data-commissioner'))) {
      name = 'commissioner_email_draft_opened';
      data.audience = target.id === 'email-all' ? 'all' : 'individual';
    } else if (target.id === 'copy-letter') {
      name = 'letter_copy_clicked';
    } else {
      var href = target.getAttribute('href') || '';
      if (/records-request\.md(?:$|[?#])/.test(href)) name = 'records_request_download_clicked';
      if (/review-packet\.md(?:$|[?#])/.test(href)) name = 'review_packet_download_clicked';
    }
    if (name) window.va('event', { name: name, data: data });
  });
})();
