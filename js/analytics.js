/* EarningMoneyOnline.co.uk — cookie consent + Google Analytics 4
   GDPR / UK PECR compliant: GA loads ONLY after the visitor clicks Accept.
   To activate: replace G-GQ2B6EM9YC below with your real GA4 Measurement ID. */
(function () {
  "use strict";

  var GA_ID = "G-GQ2B6EM9YC"; // <-- PUT YOUR GA4 MEASUREMENT ID HERE
  var KEY = "emo_cookie_consent"; // stored value: "granted" or "denied"

  function get() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function set(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }

  function loadGA() {
    if (!GA_ID || GA_ID.indexOf("XXXX") !== -1) return; // not configured yet
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_ID;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", GA_ID, { anonymize_ip: true });
  }

  function removeBanner() {
    var b = document.getElementById("emo-cc");
    if (b && b.parentNode) b.parentNode.removeChild(b);
  }

  function showBanner() {
    if (document.getElementById("emo-cc")) return;
    var bar = document.createElement("div");
    bar.id = "emo-cc";
    bar.setAttribute("role", "dialog");
    bar.setAttribute("aria-label", "Cookie consent");
    bar.style.cssText =
      "position:fixed;left:16px;right:16px;bottom:16px;z-index:99999;max-width:760px;margin:0 auto;" +
      "background:#0f2e26;color:#eaf3ef;border:1px solid #2c5347;border-radius:12px;" +
      "padding:16px 18px;box-shadow:0 10px 30px rgba(0,0,0,.35);" +
      "font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;" +
      "display:flex;flex-wrap:wrap;align-items:center;gap:12px;justify-content:space-between;";
    bar.innerHTML =
      '<div style="flex:1 1 320px;min-width:240px;">We use cookies to measure how the site is used, ' +
      'via Google Analytics. Nothing loads until you choose. See our ' +
      '<a href="/privacy-policy.html" style="color:#e9c46a;text-decoration:underline;">privacy policy</a>.</div>' +
      '<div style="display:flex;gap:8px;flex:0 0 auto;">' +
      '<button id="emo-cc-no" style="cursor:pointer;border:1px solid #6d8a80;background:transparent;color:#eaf3ef;' +
      'padding:9px 16px;border-radius:8px;font-size:14px;">Reject</button>' +
      '<button id="emo-cc-yes" style="cursor:pointer;border:0;background:#e9c46a;color:#0f2e26;font-weight:600;' +
      'padding:9px 18px;border-radius:8px;font-size:14px;">Accept</button>' +
      '</div>';
    document.body.appendChild(bar);
    document.getElementById("emo-cc-yes").addEventListener("click", function () {
      set("granted"); removeBanner(); loadGA();
    });
    document.getElementById("emo-cc-no").addEventListener("click", function () {
      set("denied"); removeBanner();
    });
  }

  function init() {
    var c = get();
    if (c === "granted") { loadGA(); return; }
    if (c === "denied") { return; }
    showBanner();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
