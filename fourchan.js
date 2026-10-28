var BOARDS = ["h", "aco", "gif"];
var MAX_THREADS = 5;
var PER_PAGE = 40;
var VIDEO = /\b(animat\w*|webms?|gifs?|mp4s?|mmd|sfm|hmvs?)\b/i;
var DRAWN = /\b(animat\w*|mmd|sfm|3d|2d|hentai|anime|cartoons?)\b/i;
var BLOCK = /\b(gay|trans|tranny|transgender|traps?|femboy\w*|sissy|lesbians?|yuri|yaoi|futa\w*|dickgirls?|bara|loli\w*|shota\w*|cub|underage|toddler\w*|leak\w*|onlyfans|celeb\w*|deepfakes?|face ?swaps?|ai|gore|scat|guro|bestiality|zoo)\b/i;

function text(html) {
  return util.unescape(String(html || "").replace(/<br\s*\/?>/g, " ").replace(/<[^>]+>/g, " ")).replace(/>>\d+/g, " ").replace(/\s+/g, " ").trim();
}

function catalogs() {
  var bodies = BOARDS.map(function (b) { return cache.get("catalog" + b, true); });
  var missing = [];
  BOARDS.forEach(function (b, i) { if (!bodies[i]) missing.push(i); });
  if (missing.length) {
    var got = http.all(missing.map(function (i) { return "https://a.4cdn.org/" + BOARDS[i] + "/catalog.json"; }));
    missing.forEach(function (i, k) {
      bodies[i] = got[k];
      if (got[k]) cache.put("catalog" + BOARDS[i], got[k], 300000, true);
    });
  }
  return bodies;
}

function threads(re, need) {
  var named = [], rest = [], bodies = catalogs();
  BOARDS.forEach(function (b, i) {
    var pages;
    try { pages = JSON.parse(bodies[i]); } catch (e) { return; }
    pages.forEach(function (page) {
      page.threads.forEach(function (t) {
        if (t.sticky) return;
        var sub = text(t.sub), all = sub + " " + text(t.com);
        if (BLOCK.test(all) || !(b == "gif" ? DRAWN : VIDEO).test(all)) return;
        var item = { board: b, no: t.no, sub: sub || text(t.com).substring(0, 60), files: t.images || 0, clips: VIDEO.test(sub) ? 1 : 0 };
        (hits(re, all.toLowerCase()) >= need ? named : rest).push(item);
      });
    });
  });
  var order = function (a, b) { return b.clips - a.clips || b.files - a.files; };
  named.sort(order);
  rest.sort(order);
  return (named.length ? named : rest).slice(0, MAX_THREADS);
}

function words(query) {
  return query.toLowerCase().split(/\s+/).filter(function (w) { return w.length > 1; }).map(function (w) {
    return new RegExp("(^|[^a-z0-9])" + w.replace(/[^a-z0-9]/g, "\\$&") + "(?:s|es)?(?![a-z0-9])");
  });
}

function hits(re, s) {
  var n = 0;
  re.forEach(function (w) { if (w.test(s)) n++; });
  return n;
}

function label(p) {
  var name = String(p.filename || "");
  if (/[a-z]{3}/i.test(name) && !/^(download|video|image|file|untitled)\b/i.test(name)) return util.unescape(name).replace(/[_.]+/g, " ").trim();
  var com = text(p.com);
  return com ? com.substring(0, 90) : "";
}

function search(query, next) {
  var re = words(query);
  if (!re.length) return { items: [], next: null };
  var need = Math.ceil(re.length / 2);
  var list = threads(re, need);
  var bodies = list.map(function (t) { return cache.get(t.board + t.no, true); });
  var missing = [];
  list.forEach(function (t, i) { if (!bodies[i]) missing.push(i); });
  if (missing.length) {
    var got = http.all(missing.map(function (i) { return "https://a.4cdn.org/" + list[i].board + "/thread/" + list[i].no + ".json"; }));
    missing.forEach(function (i, k) {
      bodies[i] = got[k];
      if (got[k]) cache.put(list[i].board + list[i].no, got[k], 300000, true);
    });
  }
  var strong = [], weak = [];
  list.forEach(function (t, i) {
    var posts;
    try { posts = JSON.parse(bodies[i]).posts; } catch (e) { return; }
    var whole = hits(re, (t.sub + " " + text(posts[0].com)).toLowerCase()) >= need;
    posts.forEach(function (p) {
      if (p.ext != ".webm" && p.ext != ".mp4") return;
      if (p.filedeleted) return;
      var own = String(p.filename || "") + " " + text(p.com);
      if (BLOCK.test(own)) return;
      var match = hits(re, own.toLowerCase()) >= need;
      if (!whole && !match) return;
      var item = {
        url: "https://i.4cdn.org/" + t.board + "/" + p.tim + p.ext,
        title: label(p) || t.sub,
        author: "/" + t.board + "/ " + t.sub,
        duration: -1,
        thumb: "https://i.4cdn.org/" + t.board + "/" + p.tim + "s.jpg",
        date: p.time
      };
      (match ? strong : weak).push(item);
    });
  });
  var all = strong.concat(weak);
  var start = next ? parseInt(next, 10) : 0;
  return { items: all.slice(start, start + PER_PAGE), next: start + PER_PAGE < all.length ? String(start + PER_PAGE) : null };
}

function resolve(url) {
  var m = url.match(/i\.4cdn\.org\/(h|aco|gif)\/(\d+)\.(webm|mp4)/);
  if (!m) throw new Error("not a video link");
  return { url: "https://i.4cdn.org/" + m[1] + "/" + m[2] + "." + m[3], hls: false, referer: "https://boards.4chan.org/" };
}
