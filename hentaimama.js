var SITE = "https://hentaimama.io";
var BAN = /\b(loli\w*|shota\w*|yaoi|yuri|futa\w*|traps?|gay|trans\w*|femboy\w*)\b/i;

function search(query, next) {
  var page = next ? parseInt(next, 10) : 1;
  var q = encodeURIComponent(query);
  var html = http.get(page > 1 ? SITE + "/page/" + page + "/?s=" + q : SITE + "/?s=" + q);
  var re = /<article\b[^>]*>([\s\S]*?)<\/article>/g, m, items = [], seen = {};
  while ((m = re.exec(html))) {
    var b = m[1];
    var link = /href="(https:\/\/hentaimama\.io\/(?:tvshows|episodes)\/[^"]+)"/.exec(b);
    if (!link || seen[link[1]]) continue;
    seen[link[1]] = true;
    var title = /\balt="([^"]+)"/.exec(b);
    if (!title) continue;
    var genres = (b.match(/rel="tag">[^<]+/g) || []).join(" ");
    if (BAN.test(genres) || BAN.test(title[1])) continue;
    var thumb = /<img src="(https:\/\/[^"]+)"/.exec(b);
    items.push({ url: link[1], title: util.unescape(title[1]), author: "", duration: -1, thumb: thumb ? thumb[1] : null });
  }
  return { items: items, next: items.length && html.indexOf("/page/" + (page + 1) + "/?s=") >= 0 ? String(page + 1) : null };
}

function resolve(url) {
  if (url.indexOf("/tvshows/") >= 0) {
    var show = http.get(url);
    var ep = /href="(https:\/\/hentaimama\.io\/episodes\/[^"]+)"/.exec(show);
    if (!ep) throw new Error("no episode");
    url = ep[1];
  }
  var html = http.get(url);
  var post = /action:\s*'get_player_contents',\s*a:\s*'(\d+)'/.exec(html);
  if (!post) throw new Error("no player");
  var frames = JSON.parse(http.post(SITE + "/wp-admin/admin-ajax.php", "action=get_player_contents&a=" + post[1],
      "application/x-www-form-urlencoded", { Referer: url }));
  var title = /property="og:title"\s+content="([^"]*)"/.exec(html);
  for (var i = 0; i < frames.length; i++) {
    var src = /src="([^"]+)"/.exec(frames[i]);
    if (!src) continue;
    var player = http.get(util.unescape(src[1]).replace(/&#038;/g, "&"), { Referer: url });
    var file = /"file":"(https:[^"]+\.mp4)"/.exec(player) || /file:\s*"(https:[^"]+\.mp4)"/.exec(player);
    if (file) return { url: file[1].replace(/\\\//g, "/"), hls: false, referer: SITE + "/",
      title: title ? util.unescape(title[1]).replace(/\s+[-|]\s+Hentaimama$/, "") : "" };
  }
  throw new Error("no stream");
}
