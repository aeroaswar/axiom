/* Styled QR renderer: draws the encoder's module grid with shaped modules and eyes. */
window.QRStyle = (function () {
  function isFinder(x, y, n) {
    return (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7);
  }
  function eyes(n, s) {
    var out = "", pos = [[0, 0], [n - 7, 0], [0, n - 7]];
    pos.forEach(function (p) {
      var x = p[0], y = p[1], c = s.eyeColor || s.color, ci = s.pupilColor || c;
      if (s.eye === "round") {
        out += '<rect x="' + (x + .5) + '" y="' + (y + .5) + '" width="6" height="6" rx="2" fill="none" stroke="' + c + '" stroke-width="1"/>';
        out += '<rect x="' + (x + 2) + '" y="' + (y + 2) + '" width="3" height="3" rx="1" fill="' + ci + '"/>';
      } else if (s.eye === "circle") {
        out += '<circle cx="' + (x + 3.5) + '" cy="' + (y + 3.5) + '" r="3" fill="none" stroke="' + c + '" stroke-width="1"/>';
        out += '<circle cx="' + (x + 3.5) + '" cy="' + (y + 3.5) + '" r="1.5" fill="' + ci + '"/>';
      } else if (s.eye === "leaf") {
        out += '<path d="M' + (x + .5) + ' ' + (y + 3.5) + 'a3 3 0 0 1 3 -3h3v3a3 3 0 0 1 -3 3h-3z" fill="none" stroke="' + c + '" stroke-width="1"/>';
        out += '<path d="M' + (x + 2) + ' ' + (y + 3.5) + 'a1.5 1.5 0 0 1 1.5 -1.5h1.5v1.5a1.5 1.5 0 0 1 -1.5 1.5h-1.5z" fill="' + ci + '"/>';
      } else { /* square */
        out += '<rect x="' + (x + .5) + '" y="' + (y + .5) + '" width="6" height="6" fill="none" stroke="' + c + '" stroke-width="1"/>';
        out += '<rect x="' + (x + 2) + '" y="' + (y + 2) + '" width="3" height="3" fill="' + ci + '"/>';
      }
    });
    return out;
  }
  function svg(text, s) {
    var q = QR.encode(text, s.ecl || "H"), m = q.modules, n = q.size, qz = s.quiet == null ? 3 : s.quiet;
    var on = function (x, y) { return x >= 0 && y >= 0 && x < n && y < n && m[y][x] && !isFinder(x, y, n); };
    var d = "", c = s.color;
    for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) {
      if (!on(x, y)) continue;
      if (s.mod === "dot") d += '<circle cx="' + (x + .5) + '" cy="' + (y + .5) + '" r="' + (s.r || .42) + '"/>';
      else if (s.mod === "round") d += '<rect x="' + (x + .08) + '" y="' + (y + .08) + '" width=".84" height=".84" rx=".3"/>';
      else if (s.mod === "small") d += '<rect x="' + (x + .12) + '" y="' + (y + .12) + '" width=".76" height=".76"/>';
      else if (s.mod === "diamond") d += '<path d="M' + (x + .5) + ' ' + (y + .04) + 'l.46 .46 -.46 .46 -.46 -.46z"/>';
      else if (s.mod === "liquid") {
        var w = .78, o = (1 - w) / 2;
        d += '<rect x="' + (x + o) + '" y="' + (y + o) + '" width="' + w + '" height="' + w + '" rx="' + (w / 2) + '"/>';
        if (on(x + 1, y)) d += '<rect x="' + (x + .5) + '" y="' + (y + o) + '" width="1" height="' + w + '"/>';
        if (on(x, y + 1)) d += '<rect x="' + (x + o) + '" y="' + (y + .5) + '" width="' + w + '" height="1"/>';
      } else if (s.mod === "vbar") {
        var w2 = .72, o2 = (1 - w2) / 2;
        d += '<rect x="' + (x + o2) + '" y="' + (y + o2) + '" width="' + w2 + '" height="' + w2 + '" rx="' + (w2 / 2) + '"/>';
        if (on(x, y + 1)) d += '<rect x="' + (x + o2) + '" y="' + (y + .5) + '" width="' + w2 + '" height="1"/>';
      }
    }
    var vb = (-qz) + " " + (-qz) + " " + (n + 2 * qz) + " " + (n + 2 * qz);
    return { svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vb + '"><g fill="' + c + '">' + d + '</g>' + eyes(n, s) + '</svg>', version: q.version, size: n };
  }
  return { svg: svg };
})();
