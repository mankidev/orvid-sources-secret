var SITE = "https://hstream.moe";
var BAN = /\b(loli\w*|shota\w*|yaoi|yuri|futa\w*|traps?|gay|trans\w*|femboy\w*)\b/i;
var BLACKLIST = ["futanari", "trap", "yuri"];

function search(query, next) {
  var page = next ? parseInt(next, 10) : 1;
  var url = SITE + "/search?search=" + encodeURIComponent(query) + "&page=" + page
      + BLACKLIST.map(function (t) { return "&blacklist[]=" + t; }).join("");
  var html = http.get(url);
  var re = /<a\s+href="(https:\/\/hstream\.moe\/hentai\/[^"]+)"[\s\S]*?<img\s+src="([^"]+)"\s+alt="([^"]+)"/g, m, items = [], seen = {};
  while ((m = re.exec(html))) {
    if (seen[m[1]]) continue;
    seen[m[1]] = true;
    var title = util.unescape(m[3]);
    if (BAN.test(title)) continue;
    items.push({ url: m[1], title: title, author: "", duration: -1, thumb: m[2].indexOf("http") == 0 ? m[2] : SITE + m[2] });
  }
  return { items: items, next: items.length >= 20 ? String(page + 1) : null };
}

function resolve(url) {
  var p = http.page(url);
  var html = p.body;
  var id = /id="e_id" type="hidden" value="(\d+)"/.exec(html);
  if (!id) throw new Error("no episode");
  var xsrf = /XSRF-TOKEN=([^;]+)/.exec(p.cookies);
  if (!xsrf) throw new Error("no token");
  var data = JSON.parse(http.post(SITE + "/player/api", JSON.stringify({ episode_id: id[1] }), "application/json", {
    Cookie: p.cookies,
    "X-XSRF-TOKEN": decodeURIComponent(xsrf[1]),
    "X-Requested-With": "XMLHttpRequest",
    Referer: url
  }));
  var hosts = data.stream_domains || [];
  if (!hosts.length || !data.stream_url) throw new Error("no stream");
  var first = Math.floor(Math.random() * hosts.length);
  var base = hosts[first] + "/" + data.stream_url + "/";
  var out = { url: base + "x264.720p.mp4", hls: false, referer: SITE + "/", title: data.title || "",
    subtitles: [{ url: base + "eng.vtt", lang: "en", label: "English" }] };
  if (hosts.length > 1) out.fallback = { url: hosts[(first + 1) % hosts.length] + "/" + data.stream_url + "/x264.720p.mp4", hls: false };
  return out;
}
