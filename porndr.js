var SITE = "https://www.porndr.com";

function clean(s) {
  return util.unescape(s || "").replace(/\s+/g, " ").trim();
}

function search(query, next) {
  var page = next ? parseInt(next, 10) : 1;
  var slug = encodeURIComponent(query.trim()).replace(/%20/g, "-");
  var html = http.get(SITE + "/search/" + slug + "/" + (page > 1 ? "?from_videos=" + page : ""));
  var at = html.indexOf("search_result_items");
  if (at < 0) return { items: [], next: null };
  var cards = html.substring(at).split('<a class="intrsttl');
  var items = [];
  for (var i = 1; i < cards.length; i++) {
    var c = cards[i];
    var href = /href="(https:\/\/www\.porndr\.com\/videos\/\d+\/[^"]+\/)"/.exec(c);
    if (!href) continue;
    var title = /title="([^"]+)"/.exec(c);
    var thumb = /data-original="(https:\/\/[^"]+\.jpg)"/.exec(c);
    var dur = /class="duration">([0-9:]+)</.exec(c);
    items.push({
      url: href[1],
      title: title ? clean(title[1]) : "",
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
  var src = /video_url:\s*'([^']+)'/.exec(html);
  if (!src || src[1].indexOf("function/") == 0) throw new Error("no stream");
  var title = /<title>([^<]*)<\/title>/.exec(html);
  return { url: src[1], hls: false, referer: url, cookie: page.cookies, title: title ? clean(title[1]) : "" };
}
