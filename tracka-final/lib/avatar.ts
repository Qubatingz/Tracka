// @ts-nocheck
// Avatar engine (same as the approved demo). Pure functions that return SVG text.
  /* ============ avatars (soft 3D, flexible, grows with you) ============ */
  var avN = 0;
  function shade(hex, amt) {
    var n = parseInt(String(hex).slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    var f = function (c) { return Math.max(0, Math.min(255, Math.round(amt >= 0 ? c + (255 - c) * amt : c * (1 + amt)))); };
    return "#" + ((1 << 24) + (f(r) << 16) + (f(g) << 8) + f(b)).toString(16).slice(1);
  }
  var AVC = {
    skin: [["#4A2A17", "Deep"], ["#6B3F1F", "Dark brown"], ["#8D5524", "Brown"], ["#A9714B", "Warm brown"], ["#C68642", "Tan"], ["#E0AC69", "Light"]],
    hairColor: [["#1A1A1A", "Black"], ["#3B2314", "Dark brown"], ["#6B4423", "Brown"], ["#F4E58C", "Yellow"], ["#7FD0F2", "Blue"], ["#F2A3A3", "Pink"]],
    shirt: [["#1F4D3A", "Green"], ["#C99A3B", "Gold"], ["#B5482F", "Rust"], ["#FFFBF4", "Cream"], ["#14281F", "Black"], ["#6E7F75", "Grey"]],
    accent: [["#1F4D3A", "Green"], ["#C99A3B", "Gold"], ["#B5482F", "Rust"], ["#D7263D", "Red"], ["#14281F", "Black"]],
    bg: [["#9CC3A8", "Sage"], ["#E2B957", "Gold"], ["#F2C6A0", "Peach"], ["#E1ECE5", "Mint"], ["#F6E7C4", "Cream"], ["#ECE3D2", "Sand"]]
  };
  // [value, label, level needed]
  var AVOPT = {
    hair: [["none", "Bald", 1], ["short", "Short", 1], ["waves", "Waves", 1], ["afro", "Afro", 1], ["puff", "Puff", 1], ["locs", "Locs", 1], ["long", "Long", 1]],
    eyes: [["awake", "Awake", 1], ["sleepy", "Sleepy", 1], ["happy", "Happy", 1], ["wink", "Wink", 1]],
    brows: [["none", "None", 1], ["thin", "Thin", 1], ["thick", "Thick", 1]],
    nose: [["small", "Small", 1], ["round", "Round", 1], ["big", "Big", 1]],
    mouth: [["smile", "Smile", 1], ["calm", "Calm", 1], ["smirk", "Smirk", 1], ["grin", "Grin", 1], ["pout", "Pout", 1]],
    facial: [["none", "None", 1], ["mustache", "Mustache", 1], ["goatee", "Goatee", 1], ["both", "Mustache + goatee", 1], ["beard", "Beard", 4]],
    headwear: [["none", "None", 1], ["phones", "Headphones", 1], ["beanie", "Beanie", 2], ["cap", "Cap", 2], ["bandana", "Bandana", 3]],
    wear: [["none", "None", 1], ["glasses", "Glasses", 1], ["shades", "Shades", 4]],
    earrings: [["none", "None", 1], ["stud", "Studs", 2], ["hoop", "Hoops", 3]],
    chain: [["none", "None", 1], ["silver", "Silver chain", 3], ["gold", "Gold chain", 4]],
    top: [["tee", "Tee", 1], ["hoodie", "Hoodie", 3], ["jacket", "Jacket", 4]],
    frame: [["none", "No frame", 1], ["gold", "Gold frame", 5]]
  };
  var LEVELS = [
    { n: 1, name: "Kid", pts: 0 }, { n: 2, name: "Teen", pts: 4 }, { n: 3, name: "Young", pts: 10 },
    { n: 4, name: "Grown", pts: 18 }, { n: 5, name: "OG", pts: 30 }
  ];
  // how the face changes with age (your sliders describe the "Young" you)
  var AGES = {
    1: { hs: 1.2, fl: 0.12, flAdd: 0, nl: 0.15, es: 1.32, nose: 0.62, body: 0.76, facial: false, grey: 0, lines: 0, blush: 0.26, recede: 0 },
    2: { hs: 1.09, fl: 0.55, flAdd: 0, nl: 0.6, es: 1.15, nose: 0.84, body: 0.88, facial: false, grey: 0, lines: 0, blush: 0.18, recede: 0 },
    3: { hs: 1, fl: 1, flAdd: 0, nl: 1, es: 1, nose: 1, body: 1, facial: true, grey: 0, lines: 0, blush: 0.14, recede: 0 },
    4: { hs: 1, fl: 1, flAdd: 0.1, nl: 1, es: 0.96, nose: 1.06, body: 1.08, facial: true, grey: 0.18, lines: 1, blush: 0.12, recede: 0.05 },
    5: { hs: 0.98, fl: 1, flAdd: 0.16, nl: 0.95, es: 0.92, nose: 1.12, body: 1.08, facial: true, grey: 0.7, lines: 2, blush: 0.1, recede: 0.16 }
  };
  function mix(a, b, t) {
    var x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16);
    var ch = function (s) { return Math.round(((x >> s) & 255) * (1 - t) + ((y >> s) & 255) * t); };
    return "#" + ((1 << 24) + (ch(16) << 16) + (ch(8) << 8) + ch(0)).toString(16).slice(1);
  }
  var SLIDERS = [["hs", "Head size", 0.85, 1.2, 0.01], ["fl", "Face length", 0, 1, 0.01], ["nl", "Neck length", 0, 1, 0.01], ["es", "Eye size", 0.8, 1.3, 0.01]];
  var AV_DEFAULT = { skin: "#8D5524", hair: "short", hairColor: "#1A1A1A", eyes: "awake", brows: "thick", nose: "round", mouth: "smile", facial: "none", headwear: "none", wear: "none", earrings: "none", chain: "none", top: "tee", shirt: "#1F4D3A", accent: "#1F4D3A", bg: "#E1ECE5", frame: "none", hs: 1, fl: 0.3, nl: 0.3, es: 1 };
  var KEZA = { skin: "#6B3F1F", hair: "puff", hairColor: "#1A1A1A", eyes: "happy", brows: "thin", nose: "small", mouth: "smile", facial: "none", headwear: "phones", wear: "none", earrings: "stud", chain: "none", top: "tee", shirt: "#0D3B2A", accent: "#F4E58C", bg: "#7FD0F2", frame: "none", hs: 1, fl: 0.15, nl: 0.25, es: 1 };
  function normAv(c) {
    c = Object.assign({}, c || {});
    if (c.extra) {
      if (c.extra === "glasses" || c.extra === "shades") c.wear = c.extra;
      else if (c.extra === "phones" || c.extra === "cap") c.headwear = c.extra;
      else if (c.extra === "earrings") c.earrings = "stud";
      delete c.extra;
    }
    if (c.eyes === "dots") c.eyes = "awake";
    if (c.mouth === "open") c.mouth = "grin";
    if (c.mouth === "flat") c.mouth = "calm";
    return Object.assign({}, AV_DEFAULT, c);
  }
  var optLevel = function (k, v) { var o = (AVOPT[k] || []).find(function (x) { return x[0] === v; }); return o ? o[2] : 1; };
  var pickOf = function (a) { return a[Math.floor(Math.random() * a.length)]; };
  function randomAv(lvl) {
    lvl = 5;
    var o = {};
    Object.keys(AVOPT).forEach(function (k) { if (k === "frame") return; o[k] = pickOf(AVOPT[k].filter(function (x) { return x[2] <= lvl; }))[0]; });
    Object.keys(AVC).forEach(function (k) { o[k] = pickOf(AVC[k])[0]; });
    o.hs = +(0.9 + Math.random() * 0.25).toFixed(2); o.fl = +(Math.random()).toFixed(2); o.nl = +(Math.random() * 0.8).toFixed(2); o.es = +(0.9 + Math.random() * 0.3).toFixed(2);
    o.frame = "none";
    return normAv(o);
  }
  function avSVG(c0, talk, zoom, age) {
    var c = normAv(c0), id = "av" + (++avN), f2 = function (n) { return Math.round(n * 100) / 100; };
    var A = AGES[3];
    var hs = +c.hs * A.hs, fl = Math.min(1.15, +c.fl * A.fl + A.flAdd), nl = +c.nl * A.nl, es = +c.es * A.es, e = es * hs;
    if (!A.facial) c.facial = "none";
    var rx = 19 * hs, ry = (21 + fl * 7) * hs, cx = 50, cy = 42 - fl * 2 * hs;
    var jawY = cy + ry * 0.42, jrx = rx * (0.8 - fl * 0.14), jry = ry * (0.5 + fl * 0.16);
    var headBottom = jawY + jry, neckW = (7.5 - nl * 2.2) * hs, neckTop = headBottom - 6;
    var shoulderY = Math.min(97, headBottom + 6 + nl * 16);
    var sk = c.skin, skD = shade(sk, -0.3), lip = shade(sk, -0.22), ink = "#1B1310", hc = c.hairColor;
    var natural = ["#1A1A1A", "#3B2314", "#6B4423"].indexOf(hc) >= 0, darkHair = natural ? shade(hc, -0.2) : "#2A1A12";
    if (A.grey) { hc = mix(hc, "#C9C9C9", A.grey); darkHair = mix(darkHair, "#ABABAB", A.grey); }
    var exo = rx * 0.42, ey = cy - ry * 0.06, by = ey - 7 * hs, ny = cy + ry * 0.24, my = cy + ry * 0.52;
    var vb = zoom ? f2(cx - 26) + " " + f2(cy - 24) + " 52 52" : "0 0 100 100";
    var S = "url(#" + id + "s)", H = "url(#" + id + "h)", TT = "url(#" + id + "t)", AC = "url(#" + id + "a)";
    var o = '<svg viewBox="' + vb + '" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><defs>' +
      '<radialGradient id="' + id + 's" gradientUnits="userSpaceOnUse" cx="' + f2(cx - rx * 0.35) + '" cy="' + f2(cy - ry * 0.45) + '" r="' + f2(ry * 1.7) + '"><stop offset="0" stop-color="' + shade(sk, 0.24) + '"/><stop offset=".5" stop-color="' + sk + '"/><stop offset="1" stop-color="' + skD + '"/></radialGradient>' +
      '<radialGradient id="' + id + 'h" gradientUnits="userSpaceOnUse" cx="' + f2(cx - rx * 0.3) + '" cy="' + f2(cy - ry * 1.1) + '" r="' + f2(ry * 1.6) + '"><stop offset="0" stop-color="' + shade(hc, 0.28) + '"/><stop offset="1" stop-color="' + shade(hc, -0.35) + '"/></radialGradient>' +
      '<radialGradient id="' + id + 'a" gradientUnits="userSpaceOnUse" cx="' + f2(cx - rx * 0.3) + '" cy="' + f2(cy - ry * 1.1) + '" r="' + f2(ry * 1.6) + '"><stop offset="0" stop-color="' + shade(c.accent, 0.25) + '"/><stop offset="1" stop-color="' + shade(c.accent, -0.3) + '"/></radialGradient>' +
      '<linearGradient id="' + id + 't" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + shade(c.shirt, 0.15) + '"/><stop offset="1" stop-color="' + shade(c.shirt, -0.28) + '"/></linearGradient>' +
      '<radialGradient id="' + id + 'b" cx="50%" cy="38%" r="75%"><stop offset="0" stop-color="' + shade(c.bg, 0.2) + '"/><stop offset="1" stop-color="' + shade(c.bg, -0.15) + '"/></radialGradient>' +
      '<radialGradient id="' + id + 'n" cx="40%" cy="30%" r="75%"><stop offset="0" stop-color="' + shade(sk, 0.2) + '"/><stop offset="1" stop-color="' + shade(sk, -0.22) + '"/></radialGradient>' +
      '</defs><rect x="-50" y="-50" width="200" height="200" fill="url(#' + id + 'b)"/>';
    var P = function (d, fill, extra) { return '<path d="' + d + '" fill="' + fill + '"' + (extra || "") + "/>"; };
    var E = function (x, y, a, b, fill, extra) { return '<ellipse cx="' + f2(x) + '" cy="' + f2(y) + '" rx="' + f2(a) + '" ry="' + f2(b) + '" fill="' + fill + '"' + (extra || "") + "/>"; };
    // hair behind the head
    if (c.hair === "afro") o += E(cx, cy - ry * 0.25, rx * 1.45, ry * 1.12, H);
    if (c.hair === "long") o += P("M" + f2(cx - rx * 1.12) + " " + f2(cy) + " Q" + f2(cx - rx * 1.2) + " " + f2(cy - ry * 1.3) + " 50 " + f2(cy - ry * 1.22) + " Q" + f2(cx + rx * 1.2) + " " + f2(cy - ry * 1.3) + " " + f2(cx + rx * 1.12) + " " + f2(cy) + " L" + f2(cx + rx * 1.25) + " " + f2(headBottom + 10) + " Q50 " + f2(headBottom + 16) + " " + f2(cx - rx * 1.25) + " " + f2(headBottom + 10) + "Z", H);
    if (c.hair === "locs") [-1.12, -0.86, 0.86, 1.12].forEach(function (k) { o += '<rect x="' + f2(cx + k * rx - 3 * hs) + '" y="' + f2(cy - ry * 0.4) + '" width="' + f2(6 * hs) + '" height="' + f2(ry * 1.5) + '" rx="' + f2(3 * hs) + '" fill="' + H + '"/>'; });
    if (c.hair === "puff") o += '<circle cx="50" cy="' + f2(cy - ry * 1.12) + '" r="' + f2(rx * 0.62) + '" fill="' + H + '"/>';
    // hood behind neck
    if (c.top === "hoodie") o += E(cx, shoulderY + 1, neckW + 11, 7, shade(c.shirt, -0.2));
    // neck
    o += '<rect x="' + f2(cx - neckW) + '" y="' + f2(neckTop) + '" width="' + f2(neckW * 2) + '" height="' + f2(shoulderY - neckTop + 6) + '" rx="' + f2(neckW * 0.8) + '" fill="' + S + '"/>';
    o += '<rect x="' + f2(cx - neckW) + '" y="' + f2(headBottom - 3) + '" width="' + f2(neckW * 2) + '" height="7" fill="#000" opacity=".16"/>';
    // body
    var bw = 42 * A.body;
    o += P("M" + f2(50 - bw) + " 104 Q" + f2(50 - bw) + " " + f2(shoulderY + 3) + " 50 " + f2(shoulderY - 1) + " Q" + f2(50 + bw) + " " + f2(shoulderY + 3) + " " + f2(50 + bw) + " 104Z", TT);
    if (c.top === "tee") o += '<path d="M' + f2(cx - neckW - 3) + " " + f2(shoulderY) + " Q50 " + f2(shoulderY + 7) + " " + f2(cx + neckW + 3) + " " + f2(shoulderY) + '" stroke="' + shade(c.shirt, -0.4) + '" stroke-width="1.6" fill="none"/>';
    if (c.top === "jacket") {
      o += P("M" + f2(cx - neckW - 5) + " " + f2(shoulderY) + " Q50 " + f2(shoulderY + 10) + " " + f2(cx + neckW + 5) + " " + f2(shoulderY) + " L" + f2(cx + neckW + 9) + " 104 L" + f2(cx - neckW - 9) + " 104Z", "#F2F2EE");
      o += '<path d="M' + f2(cx - neckW - 5) + " " + f2(shoulderY) + " L" + f2(cx - neckW - 9) + ' 104 M' + f2(cx + neckW + 5) + " " + f2(shoulderY) + " L" + f2(cx + neckW + 9) + ' 104" stroke="' + shade(c.shirt, -0.45) + '" stroke-width="2" fill="none"/>';
    }
    if (c.top === "hoodie") o += '<path d="M' + f2(cx - 4) + " " + f2(shoulderY + 4) + " v9 M" + f2(cx + 4) + " " + f2(shoulderY + 4) + ' v9" stroke="#F2F2EE" stroke-width="1.4" stroke-linecap="round"/>';
    if (c.chain !== "none") {
      var chc = c.chain === "gold" ? "#E2B33C" : "#D5DADF";
      o += '<path d="M' + f2(cx - neckW - 3) + " " + f2(shoulderY + 0.5) + " Q50 " + f2(shoulderY + 14) + " " + f2(cx + neckW + 3) + " " + f2(shoulderY + 0.5) + '" fill="none" stroke="' + shade(chc, -0.35) + '" stroke-width="2.8" stroke-linecap="round"/>';
      o += '<path d="M' + f2(cx - neckW - 3) + " " + f2(shoulderY + 0.5) + " Q50 " + f2(shoulderY + 14) + " " + f2(cx + neckW + 3) + " " + f2(shoulderY + 0.5) + '" fill="none" stroke="' + chc + '" stroke-width="2" stroke-dasharray="1.6 1.1" stroke-linecap="round"/>';
    }
    // ears
    [-1, 1].forEach(function (s) { o += E(cx + s * rx * 0.97, cy + 2 * hs, 4 * hs, 6 * hs, S) + E(cx + s * rx * 1.0, cy + 2 * hs, 2 * hs, 3.5 * hs, skD, ' opacity=".45"'); });
    // head + jaw (one light source, so no seam)
    o += E(cx, jawY, jrx, jry, S) + E(cx, cy, rx, ry, S);
    // earrings
    if (c.earrings !== "none") [-1, 1].forEach(function (s) {
      var ex = cx + s * rx * 0.99;
      o += c.earrings === "stud" ? '<circle cx="' + f2(ex) + '" cy="' + f2(cy + 7.5 * hs) + '" r="' + f2(1.3 * hs) + '" fill="#E2B33C"/>' : '<circle cx="' + f2(ex) + '" cy="' + f2(cy + 9 * hs) + '" r="' + f2(2.2 * hs) + '" fill="none" stroke="#E2B33C" stroke-width="1.1"/>';
    });
    // hair on top
    var cap = function (dip) {
      dip += A.recede;
      return P("M" + f2(cx - rx * 1.02) + " " + f2(cy - ry * 0.05) + " Q" + f2(cx - rx * 1.06) + " " + f2(cy - ry * 1.14) + " 50 " + f2(cy - ry * 1.1) + " Q" + f2(cx + rx * 1.06) + " " + f2(cy - ry * 1.14) + " " + f2(cx + rx * 1.02) + " " + f2(cy - ry * 0.05) +
        " Q" + f2(cx + rx * 0.8) + " " + f2(cy - ry * dip) + " 50 " + f2(cy - ry * (dip + 0.06)) + " Q" + f2(cx - rx * 0.8) + " " + f2(cy - ry * dip) + " " + f2(cx - rx * 1.02) + " " + f2(cy - ry * 0.05) + "Z", H);
    };
    if (c.headwear !== "bandana" && c.headwear !== "beanie") {
      if (["short", "puff", "locs", "waves"].indexOf(c.hair) >= 0) o += cap(0.62);
      if (c.hair === "afro") o += cap(0.5);
      if (c.hair === "long") o += cap(0.48);
      if (c.hair === "waves") o += '<path d="M' + f2(cx - rx * 0.6) + " " + f2(cy - ry * 0.85) + " q" + f2(rx * 0.3) + " -3 " + f2(rx * 0.6) + " 0 t" + f2(rx * 0.6) + " 0" + '" stroke="' + shade(hc, 0.35) + '" stroke-width="1" fill="none" opacity=".7"/>';
      if (c.hair === "none") o += E(cx - rx * 0.3, cy - ry * 0.65, rx * 0.35, ry * 0.18, "#FFFFFF", ' opacity=".18"');
    }
    // brows
    if (c.brows !== "none") [-1, 1].forEach(function (s) {
      var x0 = cx + s * (exo - 5 * hs), x1 = cx + s * (exo + 5 * hs), lift = c.eyes === "sleepy" ? 1.6 : 0;
      o += '<path d="M' + f2(x0) + " " + f2(by + 1 - lift) + " Q" + f2(cx + s * exo) + " " + f2(by - 2.4 * hs) + " " + f2(x1) + " " + f2(by + 1.2) + '" stroke="' + darkHair + '" stroke-width="' + f2((c.brows === "thick" ? 3 : 1.5) * hs) + '" fill="none" stroke-linecap="round"/>';
    });
    // eyes
    var eyeOpen = function (x, sleepy) {
      var s = E(x, ey, 4.4 * e, 4.2 * e, "#FBF7F0") + '<circle cx="' + f2(x + 0.5 * e) + '" cy="' + f2(ey + (sleepy ? 1 : 0.3) * e) + '" r="' + f2(2.3 * e) + '" fill="#2A1A12"/>' + '<circle cx="' + f2(x + 1.1 * e) + '" cy="' + f2(ey - 0.4 * e) + '" r="' + f2(0.7 * e) + '" fill="#FFFFFF"/>';
      if (sleepy) s += P("M" + f2(x - 4.7 * e) + " " + f2(ey + 0.4 * e) + " Q" + f2(x) + " " + f2(ey - 6.2 * e) + " " + f2(x + 4.7 * e) + " " + f2(ey + 0.4 * e) + " Q" + f2(x) + " " + f2(ey - 0.6 * e) + " " + f2(x - 4.7 * e) + " " + f2(ey + 0.4 * e) + "Z", S) +
        '<path d="M' + f2(x - 4.6 * e) + " " + f2(ey + 0.3 * e) + " Q" + f2(x) + " " + f2(ey - 0.7 * e) + " " + f2(x + 4.6 * e) + " " + f2(ey + 0.3 * e) + '" stroke="' + shade(sk, -0.45) + '" stroke-width="1" fill="none"/>';
      return s;
    };
    var arc = function (x) { return '<path d="M' + f2(x - 4 * e) + " " + f2(ey + 1) + " Q" + f2(x) + " " + f2(ey - 4 * e) + " " + f2(x + 4 * e) + " " + f2(ey + 1) + '" stroke="' + ink + '" stroke-width="' + f2(1.8 * hs) + '" fill="none" stroke-linecap="round"/>'; };
    if (c.eyes === "happy") o += arc(cx - exo) + arc(cx + exo);
    else if (c.eyes === "wink") o += eyeOpen(cx - exo, false) + arc(cx + exo);
    else o += eyeOpen(cx - exo, c.eyes === "sleepy") + eyeOpen(cx + exo, c.eyes === "sleepy");
    // eyewear
    if (c.wear === "glasses") o += '<g fill="none" stroke="' + ink + '" stroke-width="' + f2(1.2 * hs) + '"><circle cx="' + f2(cx - exo) + '" cy="' + f2(ey) + '" r="' + f2(5.8 * e) + '"/><circle cx="' + f2(cx + exo) + '" cy="' + f2(ey) + '" r="' + f2(5.8 * e) + '"/><path d="M' + f2(cx - exo + 5.8 * e) + " " + f2(ey) + " H" + f2(cx + exo - 5.8 * e) + '"/></g>';
    if (c.wear === "shades") [-1, 1].forEach(function (s) { o += '<rect x="' + f2(cx + s * exo - 6 * e) + '" y="' + f2(ey - 4 * e) + '" width="' + f2(12 * e) + '" height="' + f2(8 * e) + '" rx="' + f2(3.5 * e) + '" fill="' + ink + '"/><rect x="' + f2(cx + s * exo - 4.2 * e) + '" y="' + f2(ey - 2.8 * e) + '" width="' + f2(4 * e) + '" height="' + f2(1.6 * e) + '" rx=".8" fill="#FFFFFF" opacity=".35"/>'; });
    if (c.wear === "shades") o += '<path d="M' + f2(cx - exo + 6 * e) + " " + f2(ey - 1.5 * e) + " H" + f2(cx + exo - 6 * e) + '" stroke="' + ink + '" stroke-width="1.4"/>';
    // nose
    var nz = { small: [3, 2.3], round: [5, 4], big: [7.6, 5.8] }[c.nose] || [5, 4];
    nz = [nz[0] * A.nose, nz[1] * A.nose];
    o += E(cx, ny, nz[0] * hs, nz[1] * hs, "url(#" + id + "n)") + E(cx - nz[0] * 0.45 * hs, ny + nz[1] * 0.45 * hs, nz[0] * 0.22 * hs, nz[1] * 0.2 * hs, shade(sk, -0.55), ' opacity=".6"') + E(cx + nz[0] * 0.45 * hs, ny + nz[1] * 0.45 * hs, nz[0] * 0.22 * hs, nz[1] * 0.2 * hs, shade(sk, -0.55), ' opacity=".6"') + E(cx - nz[0] * 0.3 * hs, ny - nz[1] * 0.35 * hs, nz[0] * 0.22 * hs, nz[1] * 0.2 * hs, "#FFFFFF", ' opacity=".25"');
    // cheeks
    o += E(cx - rx * 0.55, cy + ry * 0.28, 3.6 * hs, 2.2 * hs, "#FF6F6F", ' opacity="' + A.blush + '"') + E(cx + rx * 0.55, cy + ry * 0.28, 3.6 * hs, 2.2 * hs, "#FF6F6F", ' opacity="' + A.blush + '"');
    // mouth
    var mc = shade(sk, -0.55), w = 6 * hs;
    var M = {
      smile: '<path d="M' + f2(cx - w) + " " + f2(my) + " Q" + f2(cx) + " " + f2(my + 5 * hs) + " " + f2(cx + w) + " " + f2(my) + '" stroke="' + mc + '" stroke-width="' + f2(1.8 * hs) + '" fill="none" stroke-linecap="round"/>',
      calm: '<path d="M' + f2(cx - w * 0.75) + " " + f2(my + 1) + " H" + f2(cx + w * 0.75) + '" stroke="' + mc + '" stroke-width="' + f2(1.8 * hs) + '" stroke-linecap="round"/>',
      smirk: '<path d="M' + f2(cx - w * 0.8) + " " + f2(my + 1.2) + " Q" + f2(cx + w * 0.2) + " " + f2(my + 2.6 * hs) + " " + f2(cx + w) + " " + f2(my - 1.4 * hs) + '" stroke="' + mc + '" stroke-width="' + f2(1.8 * hs) + '" fill="none" stroke-linecap="round"/>',
      grin: P("M" + f2(cx - w) + " " + f2(my - 0.5) + " Q" + f2(cx) + " " + f2(my + 8 * hs) + " " + f2(cx + w) + " " + f2(my - 0.5) + "Z", "#FFFFFF", ' stroke="' + mc + '" stroke-width="' + f2(1.4 * hs) + '" stroke-linejoin="round"'),
      pout: E(cx, my - 0.6 * hs, w * 0.95, 2.2 * hs, lip) + E(cx, my + 2.2 * hs, w * 0.85, 2.8 * hs, shade(lip, 0.08)) + '<path d="M' + f2(cx - w * 0.9) + " " + f2(my + 0.6 * hs) + " Q" + f2(cx) + " " + f2(my + 1.4 * hs) + " " + f2(cx + w * 0.9) + " " + f2(my + 0.6 * hs) + '" stroke="' + shade(lip, -0.4) + '" stroke-width="1" fill="none"/>' + E(cx - w * 0.2, my + 1.6 * hs, w * 0.3, 0.7 * hs, "#FFFFFF", ' opacity=".2"')
    };
    var openM = E(cx, my + 1.5 * hs, 3.6 * hs, 3.8 * hs, "#3A1712");
    o += talk ? '<g class="m-c">' + M[c.mouth] + '</g><g class="m-o">' + openM + "</g>" : M[c.mouth];
    // facial hair
    if (A.lines) [-1, 1].forEach(function (s) {
      o += '<path d="M' + f2(cx + s * (w + 1.5 * hs)) + " " + f2(my - 5 * hs) + " Q" + f2(cx + s * (w + 3.4 * hs)) + " " + f2(my - 0.5 * hs) + " " + f2(cx + s * (w + 2 * hs)) + " " + f2(my + 3 * hs) + '" stroke="' + shade(sk, -0.45) + '" stroke-width=".9" fill="none" opacity=".55" stroke-linecap="round"/>';
    });
    if (A.lines > 1) o += '<path d="M' + f2(cx - 6 * hs) + " " + f2(by - 4.5 * hs) + " Q" + f2(cx) + " " + f2(by - 6 * hs) + " " + f2(cx + 6 * hs) + " " + f2(by - 4.5 * hs) + '" stroke="' + shade(sk, -0.4) + '" stroke-width=".8" fill="none" opacity=".5" stroke-linecap="round"/>';
    var fhc = darkHair;
    if (c.facial === "mustache" || c.facial === "both" || c.facial === "beard") o += P("M" + f2(cx - 7 * hs) + " " + f2(my - 1.5 * hs) + " Q" + f2(cx) + " " + f2(my - 6 * hs) + " " + f2(cx + 7 * hs) + " " + f2(my - 1.5 * hs) + " Q" + f2(cx) + " " + f2(my - 3.6 * hs) + " " + f2(cx - 7 * hs) + " " + f2(my - 1.5 * hs) + "Z", fhc);
    if (c.facial === "goatee" || c.facial === "both") { var gy = Math.max(my + 5 * hs, jawY + jry * 0.62); o += P("M" + f2(cx - 4.6 * hs) + " " + f2(gy - 1.5 * hs) + " Q" + f2(cx) + " " + f2(gy - 3 * hs) + " " + f2(cx + 4.6 * hs) + " " + f2(gy - 1.5 * hs) + " Q" + f2(cx + 4.2 * hs) + " " + f2(gy + 4.5 * hs) + " " + f2(cx) + " " + f2(gy + 5 * hs) + " Q" + f2(cx - 4.2 * hs) + " " + f2(gy + 4.5 * hs) + " " + f2(cx - 4.6 * hs) + " " + f2(gy - 1.5 * hs) + "Z", fhc); }
    if (c.facial === "beard") o += P("M" + f2(cx - jrx * 1.02) + " " + f2(jawY - jry * 0.2) + " Q" + f2(cx - jrx) + " " + f2(jawY + jry * 1.08) + " " + f2(cx) + " " + f2(jawY + jry * 1.08) + " Q" + f2(cx + jrx) + " " + f2(jawY + jry * 1.08) + " " + f2(cx + jrx * 1.02) + " " + f2(jawY - jry * 0.2) + " Q" + f2(cx + jrx * 0.6) + " " + f2(jawY + jry * 0.55) + " " + f2(cx) + " " + f2(jawY + jry * 0.5) + " Q" + f2(cx - jrx * 0.6) + " " + f2(jawY + jry * 0.55) + " " + f2(cx - jrx * 1.02) + " " + f2(jawY - jry * 0.2) + "Z", fhc);
    // headwear
    var dome = function (low) { return P("M" + f2(cx - rx * 1.04) + " " + f2(cy - ry * low) + " Q" + f2(cx - rx * 1.08) + " " + f2(cy - ry * 1.2) + " 50 " + f2(cy - ry * 1.15) + " Q" + f2(cx + rx * 1.08) + " " + f2(cy - ry * 1.2) + " " + f2(cx + rx * 1.04) + " " + f2(cy - ry * low) + " Q50 " + f2(cy - ry * (low + 0.12)) + " " + f2(cx - rx * 1.04) + " " + f2(cy - ry * low) + "Z", AC); };
    if (c.headwear === "phones") o += '<path d="M' + f2(cx - rx * 1.02) + " " + f2(cy) + " Q" + f2(cx - rx * 1.05) + " " + f2(cy - ry * 1.38) + " 50 " + f2(cy - ry * 1.32) + " Q" + f2(cx + rx * 1.05) + " " + f2(cy - ry * 1.38) + " " + f2(cx + rx * 1.02) + " " + f2(cy) + '" fill="none" stroke="' + ink + '" stroke-width="' + f2(3 * hs) + '" stroke-linecap="round"/>' +
      '<rect x="' + f2(cx - rx * 1.02 - 4.5 * hs) + '" y="' + f2(cy - 6 * hs) + '" width="' + f2(9 * hs) + '" height="' + f2(14 * hs) + '" rx="' + f2(4 * hs) + '" fill="' + AC + '" stroke="' + ink + '" stroke-width="1.2"/>' +
      '<rect x="' + f2(cx + rx * 1.02 - 4.5 * hs) + '" y="' + f2(cy - 6 * hs) + '" width="' + f2(9 * hs) + '" height="' + f2(14 * hs) + '" rx="' + f2(4 * hs) + '" fill="' + AC + '" stroke="' + ink + '" stroke-width="1.2"/>';
    if (c.headwear === "beanie") o += dome(0.42) + P("M" + f2(cx - rx * 1.06) + " " + f2(cy - ry * 0.32) + " Q50 " + f2(cy - ry * 0.48) + " " + f2(cx + rx * 1.06) + " " + f2(cy - ry * 0.32) + " L" + f2(cx + rx * 1.04) + " " + f2(cy - ry * 0.55) + " Q50 " + f2(cy - ry * 0.7) + " " + f2(cx - rx * 1.04) + " " + f2(cy - ry * 0.55) + "Z", shade(c.accent, -0.25));
    if (c.headwear === "cap") o += dome(0.5) + E(cx + rx * 0.35, cy - ry * 0.55, rx * 0.95, 3 * hs, shade(c.accent, -0.3)) + '<circle cx="50" cy="' + f2(cy - ry * 1.15) + '" r="' + f2(1.6 * hs) + '" fill="' + shade(c.accent, -0.35) + '"/>';
    if (c.headwear === "bandana") {
      o += dome(0.48) + P("M" + f2(cx - rx * 1.05) + " " + f2(cy - ry * 0.4) + " Q50 " + f2(cy - ry * 0.56) + " " + f2(cx + rx * 1.05) + " " + f2(cy - ry * 0.4) + " L" + f2(cx + rx * 1.03) + " " + f2(cy - ry * 0.62) + " Q50 " + f2(cy - ry * 0.8) + " " + f2(cx - rx * 1.03) + " " + f2(cy - ry * 0.62) + "Z", shade(c.accent, -0.12));
      [[-0.5, 0.95], [0.1, 1.0], [0.55, 0.9], [-0.15, 0.75], [0.35, 0.7]].forEach(function (d) { o += '<circle cx="' + f2(cx + d[0] * rx) + '" cy="' + f2(cy - d[1] * ry) + '" r="' + f2(1.1 * hs) + '" fill="none" stroke="#FFFFFF" stroke-width=".6" opacity=".55"/>'; });
      var kx = cx + rx * 0.92, ky = cy - ry * 0.5;
      o += P("M" + f2(kx) + " " + f2(ky) + " L" + f2(kx + 10 * hs) + " " + f2(ky + 9 * hs) + " L" + f2(kx + 4 * hs) + " " + f2(ky + 11 * hs) + "Z", shade(c.accent, -0.2)) + P("M" + f2(kx) + " " + f2(ky) + " L" + f2(kx + 3 * hs) + " " + f2(ky + 14 * hs) + " L" + f2(kx - 3 * hs) + " " + f2(ky + 12 * hs) + "Z", shade(c.accent, -0.05)) + '<circle cx="' + f2(kx) + '" cy="' + f2(ky) + '" r="' + f2(2.6 * hs) + '" fill="' + shade(c.accent, -0.3) + '"/>';
    }
    return o + "</svg>";
  }


const _AVC: any = AVC, _AVOPT: any = AVOPT, _SLIDERS: any = SLIDERS, _AV_DEFAULT: any = AV_DEFAULT;
const _normAv: (o: any) => any = normAv;
const _randomAv: (lvl?: number) => any = randomAv;
const _avSVG: (o: any, flat?: boolean, zoom?: boolean, age?: number) => string = avSVG;
export { _AVC as AVC, _AVOPT as AVOPT, _SLIDERS as SLIDERS, _AV_DEFAULT as AV_DEFAULT, _normAv as normAv, _randomAv as randomAv, _avSVG as avSVG };
