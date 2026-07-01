(function () {
  var host = window.location.hostname.toLowerCase();
  if (host === 'protect30a.com' || host === 'www.protect30a.com' || host === 'www.protect30a.org') {
    window.location.replace('https://protect30a.org' + window.location.pathname + window.location.search + window.location.hash);
  }
}());
