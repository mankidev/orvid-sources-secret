var SITE = "https://hentaigasm.com";
var BAN = /\b(loli\w*|shota\w*|yaoi|yuri|futa\w*|traps?|gay|trans\w*|femboy\w*)\b/i;

function search(query, next) {
  var page = next ? parseInt(next, 10) : 1;
  var q = encodeURIComponent(query);
  var html = http.get(page > 1 ? SITE + "/page/" + page + "/?s=" + q : SITE + "/?s=" + q);
  var blocks = html.split(/<div id="post-\d+" class="item /).slice(1), items = [], seen = {};
  blocks.forEach(function (b) {
    var head = b.substring(0, b.indexOf(">"));
    var link = /class="clip-link"[^>]*title="([^"]+)"\s+href="([^"]+)"/.exec(b);
    if (!link || seen[link[2]]) return;
    seen[link[2]] = true;
    var title = util.unescape(link[1]);
    if (BAN.test(head.replace(/-/g, " ")) || BAN.test(title)) return;
    var thumb = /<img src="([^"]+)"/.exec(b);
    items.push({ url: link[2], title: title, author: "", duration: -1, thumb: thumb ? encodeURI(util.unescape(thumb[1])) : null });
  });
  return { items: items, next: items.length && html.indexOf("/page/" + (page + 1) + "/?s=") >= 0 ? String(page + 1) : null };
}

function resolve(url) {
  var html = http.get(url);
  var src = /<source[^>]+src="(https:\/\/[^"]+\.mp4)"/.exec(html) || /file:\s*"(https:\/\/[^"]+\.mp4)"/.exec(html)
      || /href="(https:\/\/[^"]+\.mp4)"/.exec(html);
  if (!src) throw new Error("no stream");
  var title = /property="og:title"\s+content="([^"]*)"/.exec(html);
  return { url: encodeURI(util.unescape(src[1])), hls: false, referer: SITE + "/", title: title ? util.unescape(title[1]) : "" };
}
