/* Shared header for the two concept pages (Invisible Neighbors was merged into Echoes Across the Thaw on 2026-11-21). Set PUBLISHED to true before deploying: the draft ribbon disappears. */
(function () {
  var PUBLISHED = false;
  // The two pages live in two separate repositories. Put the other page's public URL here once it is deployed; while empty, the link is hidden.
  var OTHER_URL = "";
  var PAGES = [
    { key: "re", title: "Re:Sonance", href: "index.html" },
    { key: "other", title: "Echoes Across the Thaw", href: OTHER_URL }
  ];
  var cur = document.documentElement.getAttribute("data-page");
  var html = "";
  if (!PUBLISHED) {
    html += '<div class="ribbon"><b>Draft preview</b> &middot; not published &middot; the text follows the proposal submitted to Sound Scene 2027</div>';
  }
  html += '<nav class="nav"><div class="wrap"><a class="brand" href="https://dreamalitylab.cc/">Dreamality Lab</a><div class="links">';
  PAGES.forEach(function (p) {
    if (!p.href) return;
    html += '<a href="' + p.href + '"' + (p.key === cur ? ' aria-current="page"' : "") + ">" + p.title.replace(":", '<span class="colon">:</span>') + "</a>";
  });
  html += "</div></div></nav>";
  var host = document.getElementById("site-header");
  if (host) host.innerHTML = html;
})();
