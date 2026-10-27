var SITE = "https://taboohome.net";

function unescape(s) {
  return util.unescape(s || "").replace(/\s+/g, " ").trim();
}

function search(query, next) {
  var page = next ? parseInt(next, 10) : 1;
  var slug = encodeURIComponent(query.trim()).replace(/%20/g, "-");
  var html = http.get(SITE + "/search/" + slug + "/" + (page > 1 ? "page/" + page : ""));
  var items = [];
  var seen = {};
  var cards = html.split('class="thumb-block');
  for (var i = 1; i < cards.length; i++) {
    var c = cards[i];
    var href = /href="(https:\/\/taboohome\.net\/video\/id=th_\d+_[^"]+)"/.exec(c);
    if (!href || seen[href[1]]) continue;
    seen[href[1]] = true;
    var title = /title="([^"]+)"/.exec(c);
    var thumb = /src="(https:\/\/[^"]+\.jpg)"/.exec(c);
    var dur = /class="duration">([0-9:]+)</.exec(c);
    items.push({
      url: href[1],
      title: title ? unescape(title[1]) : "",
      thumb: thumb ? thumb[1] : null,
      duration: dur ? util.duration(dur[1]) : -1
    });
  }
  var more = html.indexOf("/search/" + slug + "/page/" + (page + 1)) >= 0;
  return { items: items, next: items.length && more ? String(page + 1) : null };
}

function resolve(url) {
  var html = http.get(url);
  var q = /player-x\.php\?q=([A-Za-z0-9+\/=]+)/.exec(html);
  if (!q) throw new Error("no player");
  var tag = decodeURIComponent(util.base64(q[1]));
  var src = /<source src="([^"]+)"/.exec(tag);
  if (!src) throw new Error("no stream");
  var title = /<title>([^<]*)<\/title>/.exec(html);
  return { url: src[1], hls: src[1].indexOf(".m3u8") >= 0, title: title ? unescape(title[1]) : "" };
}
