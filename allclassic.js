var SITE = "https://allclassic.porn";

function unescape(s) {
  return util.unescape(s || "").replace(/\s+/g, " ").trim();
}

function search(query, next) {
  var page = next ? parseInt(next, 10) : 1;
  var slug = encodeURIComponent(query.trim()).replace(/%20/g, "-");
  var html = http.get(SITE + "/search/" + slug + "/" + (page > 1 ? page + "/" : ""));
  var items = [];
  var seen = {};
  var cards = html.split('<a class="th item"');
  for (var i = 1; i < cards.length; i++) {
    var c = cards[i];
    var href = /href="(https:\/\/allclassic\.porn\/videos\/\d+\/[^"]+\/)"/.exec(c);
    if (!href || seen[href[1]]) continue;
    seen[href[1]] = true;
    var title = /alt="([^"]+)"/.exec(c);
    var thumb = /src="(https:\/\/[^"]+\.jpg)"/.exec(c);
    var dur = /la-clock-o"><\/i>([0-9:]+)</.exec(c);
    items.push({
      url: href[1],
      title: title ? unescape(title[1]) : "",
      thumb: thumb ? thumb[1] : null,
      duration: dur ? util.duration(dur[1]) : -1
    });
  }
  return { items: items, next: items.length ? String(page + 1) : null };
}

function resolve(url) {
  var page = http.page(url);
  if (page.status >= 400) throw new Error("video unavailable");
  var html = page.body;
  var src = /videoUrl:\s*'([^']+)'/.exec(html);
  if (!src) throw new Error("no stream");
  var title = /<title>([^<]*)<\/title>/.exec(html);
  return { url: src[1], hls: false, referer: url, cookie: page.cookies, title: title ? unescape(title[1]) : "" };
}
