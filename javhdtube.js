var SITE = "https://javhdtube.com";

function unescape(s) {
  return util.unescape(s || "").replace(/\s+/g, " ").trim();
}

function search(query, next) {
  var page = next ? parseInt(next, 10) : 1;
  var slug = encodeURIComponent(query.trim()).replace(/%20/g, "-");
  var html = http.get(SITE + "/search/" + slug + "/" + (page > 1 ? "?from_videos=" + page : ""));
  var items = [];
  var cards = html.split('<div class="item th"');
  for (var i = 1; i < cards.length; i++) {
    var c = cards[i];
    var href = /href="(https:\/\/javhdtube\.com\/video\/\d+\/[^"]+\/)"/.exec(c);
    if (!href) continue;
    var title = /title="([^"]+)"/.exec(c);
    var thumb = /data-original="(https:\/\/[^"]+\.jpg)"/.exec(c);
    var dur = /th-duration">\s*([0-9:]+)/.exec(c);
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
  var src = /video_url:\s*'([^']+)'/.exec(html);
  if (!src || src[1].indexOf("function/") == 0) throw new Error("no stream");
  var title = /<title>([^<]*)<\/title>/.exec(html);
  var out = { url: src[1], hls: false, referer: url, cookie: page.cookies, title: title ? unescape(title[1]) : "" };
  var alt = /video_alt_url:\s*'([^']+)'/.exec(html);
  var altText = /video_alt_url_text:\s*'([^']+)'/.exec(html);
  var mainText = /video_url_text:\s*'([^']+)'/.exec(html);
  if (alt && alt[1].indexOf("function/") != 0) {
    out.qualities = [
      { url: src[1], height: parseInt((mainText && mainText[1]) || "480", 10) || 480 },
      { url: alt[1], height: parseInt((altText && altText[1]) || "720", 10) || 720 }
    ];
  }
  return out;
}
