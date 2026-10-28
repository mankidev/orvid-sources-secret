var SITE = "https://hentaifreak.org";
var BAN = /\b(loli\w*|shota\w*|yaoi|yuri|futa\w*|traps?|gay|trans\w*|femboy\w*)\b/i;

function search(query, next) {
  var html = http.get(SITE + "/?s=" + encodeURIComponent(query));
  var blocks = html.split("<article ").slice(1), items = [], seen = {};
  blocks.forEach(function (b) {
    var head = b.substring(0, b.indexOf(">"));
    var link = /href="(https:\/\/hentaifreak\.org\/(?!tags\/|category\/|page\/)[^"]+\/)"\s+title="([^"]+)"/.exec(b);
    if (!link || seen[link[1]]) return;
    seen[link[1]] = true;
    var title = util.unescape(link[2]);
    if (BAN.test(head.replace(/-/g, " ")) || BAN.test(title)) return;
    var thumb = /url\((https:\/\/[^)]+)\)/.exec(b) || /<img[^>]+src="(https:\/\/[^"]+)"/.exec(b);
    items.push({ url: link[1], title: title, author: "", duration: -1, thumb: thumb ? thumb[1] : null });
  });
  return { items: items, next: null };
}

function resolve(url) {
  var html = http.get(url);
  var src = /src="(https:\/\/media\.hentaifreak\.org\/[^"]+\.mp4)"/.exec(html) || /(https:\/\/[^"' ]+\.mp4)/.exec(html);
  if (!src) throw new Error("no stream");
  var title = /property="og:title"\s+content="([^"]*)"/.exec(html);
  return { url: src[1], hls: false, referer: SITE + "/", title: title ? util.unescape(title[1]).replace(/\s+[-|]\s+Hentai Freak!?$/, "") : "" };
}
