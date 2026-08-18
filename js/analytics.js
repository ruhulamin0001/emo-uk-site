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


/* ===== v2 ARTICLE ENHANCER =====
   Adds share buttons, table of contents and an author box to any article
   that does not already have them hard-coded. One file, every page. */
(function(){
  function ready(fn){ if(document.readyState!=='loading'){fn();} else {document.addEventListener('DOMContentLoaded',fn);} }
  ready(function(){
    if(location.pathname.indexOf('/articles/')===-1) return;
    var body = document.querySelector('.article-body');
    if(!body) return;
    if(body.querySelector('.toc') || body.querySelector('.share')) return; /* already v2 */

    var url = location.origin + location.pathname;
    var eu  = encodeURIComponent(url);
    var h1  = document.querySelector('.article-head h1');
    var ttl = encodeURIComponent(h1 ? h1.textContent.trim() : document.title);
    var AV  = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%230fae7e'/%3E%3Ctext x='50' y='63' font-family='Segoe UI,Arial' font-size='38' font-weight='700' fill='%23ffffff' text-anchor='middle'%3ERA%3C/text%3E%3C/svg%3E";

    /* 1. byline under the title */
    var head = document.querySelector('.article-head .wrap');
    if(head && !head.querySelector('.byline')){
      var meta = head.querySelector('.meta');
      var when = meta ? meta.textContent.trim() : '';
      var by = document.createElement('div');
      by.className='byline';
      by.innerHTML = '<img src="'+AV+'" alt="Ruhul Amin"><div class="who"><b>Ruhul Amin</b><span>'+when+'</span></div>';
      head.appendChild(by);
      if(meta) meta.style.display='none';
    }

    /* 2. share bar at the top of the body */
    var share = document.createElement('div');
    share.className='share';
    share.innerHTML = '<b>Share</b>'+
      '<a target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u='+eu+'">Facebook</a>'+
      '<a target="_blank" rel="noopener" href="https://twitter.com/intent/tweet?url='+eu+'&text='+ttl+'">X</a>'+
      '<a target="_blank" rel="noopener" href="https://api.whatsapp.com/send?text='+ttl+'%20'+eu+'">WhatsApp</a>'+
      '<a target="_blank" rel="noopener" href="https://www.pinterest.com/pin/create/button/?url='+eu+'&description='+ttl+'">Pinterest</a>'+
      '<a target="_blank" rel="noopener" href="https://www.linkedin.com/sharing/share-offsite/?url='+eu+'">LinkedIn</a>';
    body.insertBefore(share, body.firstChild);

    /* 3. table of contents from the h2 headings */
    var hs = body.querySelectorAll('h2');
    var real = [];
    for(var i=0;i<hs.length;i++){
      if(hs[i].closest('.resources')||hs[i].closest('.takeaways')||hs[i].closest('.toc')) continue;
      real.push(hs[i]);
    }
    if(real.length>=3){
      var toc = document.createElement('div');
      toc.className='toc';
      var items='';
      for(var j=0;j<real.length;j++){
        var id = real[j].id || ('s'+(j+1));
        real[j].id = id;
        items += '<li><a href="#'+id+'">'+real[j].textContent.trim()+'</a></li>';
      }
      toc.innerHTML='<h2>What this guide covers</h2><ol>'+items+'</ol>';
      var cover = body.querySelector('img.cover');
      if(cover && cover.nextSibling){ body.insertBefore(toc, cover.nextSibling); }
      else { body.insertBefore(toc, share.nextSibling); }
    }

    /* 4. author box at the end */
    var ab = document.createElement('div');
    ab.className='authorbox';
    ab.innerHTML = '<img src="'+AV+'" alt="Ruhul Amin"><div><h3>Ruhul Amin</h3>'+
      '<p>Founder of EarningMoneyOnline.co.uk. Based in Hertfordshire, he writes UK money guides the way he wishes someone had explained them to him: with the actual numbers, the rules that apply, and the parts the adverts leave out. Every guide on this site is written and checked by hand.</p></div>';
    body.appendChild(ab);
  });
})();


/* ===== STRUCTURED DATA (JSON-LD) =====
   Adds Article, Breadcrumb and Organization schema so Google can understand
   what each page is. Google renders JavaScript, so this is read. */
(function(){
  function ready(fn){ if(document.readyState!=='loading'){fn();} else {document.addEventListener('DOMContentLoaded',fn);} }
  ready(function(){
    if(document.querySelector('script[type="application/ld+json"]')) return;
    var SITE='https://earningmoneyonline.co.uk';
    var url=SITE+location.pathname;
    var isArticle=location.pathname.indexOf('/articles/')>-1;
    var h1=document.querySelector('h1');
    var title=h1?h1.textContent.trim():document.title;
    var descEl=document.querySelector('meta[name="description"]');
    var desc=descEl?descEl.getAttribute('content'):'';
    var img=document.querySelector('img.cover');
    var imgSrc=img?img.getAttribute('src'):SITE+'/images/cover.jpg';
    var tagEl=document.querySelector('.article-head .tag');
    var section=tagEl?tagEl.textContent.trim():'';

    /* try to read the date from the byline or meta line */
    var dateTxt=(document.querySelector('.byline .who span')||document.querySelector('.article-head .meta')||{}).textContent||'';
    var m=dateTxt.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
    var iso='';
    if(m){
      var months={January:'01',February:'02',March:'03',April:'04',May:'05',June:'06',July:'07',August:'08',September:'09',October:'10',November:'11',December:'12'};
      var mm=months[m[2]];
      if(mm){ iso=m[3]+'-'+mm+'-'+(m[1].length===1?'0'+m[1]:m[1]); }
    }

    var publisher={
      "@type":"Organization",
      "name":"EarningMoneyOnline.co.uk",
      "url":SITE
    };

    var blocks=[];

    if(isArticle){
      var art={
        "@context":"https://schema.org",
        "@type":"Article",
        "headline":title.slice(0,110),
        "description":desc,
        "image":[imgSrc],
        "author":{"@type":"Person","name":"Ruhul Amin","url":SITE},
        "publisher":publisher,
        "mainEntityOfPage":{"@type":"WebPage","@id":url}
      };
      if(section) art.articleSection=section;
      if(iso){ art.datePublished=iso; art.dateModified=iso; }
      blocks.push(art);

      var crumbs=[{"@type":"ListItem","position":1,"name":"Home","item":SITE+"/"}];
      if(section){
        var slugMap={"Make Money":"make-money","Side Hustles":"side-hustles","Save Money":"save-money","Work & Career":"work-career","Tools & Reviews":"tools-reviews"};
        var s=slugMap[section];
        if(s) crumbs.push({"@type":"ListItem","position":2,"name":section,"item":SITE+"/categories/"+s+".html"});
      }
      crumbs.push({"@type":"ListItem","position":crumbs.length+1,"name":title.slice(0,110),"item":url});
      blocks.push({"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":crumbs});
    } else {
      blocks.push({
        "@context":"https://schema.org",
        "@type":"WebSite",
        "name":"EarningMoneyOnline.co.uk",
        "url":SITE,
        "description":desc,
        "publisher":publisher
      });
    }

    for(var i=0;i<blocks.length;i++){
      var s=document.createElement('script');
      s.type='application/ld+json';
      s.textContent=JSON.stringify(blocks[i]);
      document.head.appendChild(s);
    }
  });
})();
