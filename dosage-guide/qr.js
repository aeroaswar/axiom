/* ------------------------------------------------------------------ *
 * AXIOM — minimal QR Code encoder (byte mode, versions 1–10, ECC L/M/Q/H)
 * Self-contained: no network, no CDN. Returns a boolean matrix.
 *
 *   QR.encode("https://…", "H")  ->  { size, modules, version, ecl }
 *   QR.svg("https://…", { ecl:"H", quiet:2 })  ->  SVG string
 *
 * Implements ISO/IEC 18004 byte-mode encoding: RS error correction over
 * GF(256), block interleaving, function-pattern placement, all eight data
 * masks scored by the standard penalty rules.
 * ------------------------------------------------------------------ */
(function (root) {
  "use strict";

  /* Total codewords by version (1-indexed) */
  var TOTAL_CW = [0, 26, 44, 70, 100, 134, 172, 196, 242, 292, 346];

  /* [ecPerBlock, g1Blocks, g1DataCw, g2Blocks, g2DataCw] keyed by version then ECL */
  var RS = {
    L: [0, [7,1,19,0,0], [10,1,34,0,0], [15,1,55,0,0], [20,1,80,0,0], [26,1,108,0,0],
           [18,2,68,0,0], [20,2,78,0,0], [24,2,97,0,0], [30,2,116,0,0], [18,2,68,2,69]],
    M: [0, [10,1,16,0,0], [16,1,28,0,0], [26,1,44,0,0], [18,2,32,0,0], [24,2,43,0,0],
           [16,4,27,0,0], [18,4,31,0,0], [22,2,38,2,39], [22,3,36,2,37], [26,4,43,1,44]],
    Q: [0, [13,1,13,0,0], [22,1,22,0,0], [18,2,17,0,0], [26,2,24,0,0], [18,2,15,2,16],
           [24,4,19,0,0], [18,2,14,4,15], [22,4,18,2,19], [20,4,16,4,17], [24,6,19,2,20]],
    H: [0, [17,1,9,0,0], [28,1,16,0,0], [22,2,13,0,0], [16,4,9,0,0], [22,2,11,2,12],
           [28,4,15,0,0], [26,4,13,1,14], [26,4,14,2,15], [24,4,12,4,13], [28,6,15,2,16]]
  };

  var ALIGN = [null, [], [6,18], [6,22], [6,26], [6,30], [6,34],
               [6,22,38], [6,24,42], [6,26,46], [6,28,50]];

  var ECL_BITS = { L: 1, M: 0, Q: 3, H: 2 };

  /* ---------- GF(256) arithmetic, primitive polynomial 0x11D ---------- */
  var EXP = new Uint8Array(512), LOG = new Uint8Array(256);
  (function () {
    var x = 1;
    for (var i = 0; i < 255; i++) {
      EXP[i] = x; LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11D;
    }
    for (var j = 255; j < 512; j++) EXP[j] = EXP[j - 255];
  })();

  function gfMul(a, b) {
    if (a === 0 || b === 0) return 0;
    return EXP[LOG[a] + LOG[b]];
  }

  /* Generator polynomial of degree `deg` */
  function rsGenerator(deg) {
    var poly = [1];
    for (var i = 0; i < deg; i++) {
      var next = new Array(poly.length + 1).fill(0);
      for (var j = 0; j < poly.length; j++) {
        next[j] ^= poly[j];
        next[j + 1] ^= gfMul(poly[j], EXP[i]);
      }
      poly = next;
    }
    return poly;
  }

  function rsRemainder(data, deg) {
    var gen = rsGenerator(deg);
    var rem = new Array(deg).fill(0);
    for (var i = 0; i < data.length; i++) {
      var factor = data[i] ^ rem[0];
      rem.shift();
      rem.push(0);
      for (var j = 0; j < deg; j++) rem[j] ^= gfMul(gen[j + 1], factor);
    }
    return rem;
  }

  /* ---------- Bit buffer ---------- */
  function BitBuf() { this.bits = []; }
  BitBuf.prototype.put = function (val, len) {
    for (var i = len - 1; i >= 0; i--) this.bits.push((val >>> i) & 1);
  };

  /* ---------- Encoding ---------- */
  function utf8Bytes(str) {
    var out = [], enc = encodeURIComponent(str);
    for (var i = 0; i < enc.length; i++) {
      if (enc[i] === "%") { out.push(parseInt(enc.substr(i + 1, 2), 16)); i += 2; }
      else out.push(enc.charCodeAt(i));
    }
    return out;
  }

  function dataCapacity(version, ecl) {
    var r = RS[ecl][version];
    return r[1] * r[2] + r[3] * r[4];
  }

  function pickVersion(byteLen, ecl) {
    for (var v = 1; v <= 10; v++) {
      var countBits = v < 10 ? 8 : 16;
      var needed = Math.ceil((4 + countBits + byteLen * 8) / 8);
      if (needed <= dataCapacity(v, ecl)) return v;
    }
    throw new Error("QR: payload too long for versions 1–10 at ECC " + ecl);
  }

  function buildCodewords(bytes, version, ecl) {
    var cap = dataCapacity(version, ecl);
    var bb = new BitBuf();
    bb.put(0x4, 4);                                   /* byte mode */
    bb.put(bytes.length, version < 10 ? 8 : 16);      /* char count */
    for (var i = 0; i < bytes.length; i++) bb.put(bytes[i], 8);

    var terminator = Math.min(4, cap * 8 - bb.bits.length);
    bb.put(0, terminator);
    while (bb.bits.length % 8 !== 0) bb.bits.push(0);

    var data = [];
    for (var b = 0; b < bb.bits.length; b += 8) {
      var byte = 0;
      for (var k = 0; k < 8; k++) byte = (byte << 1) | bb.bits[b + k];
      data.push(byte);
    }
    var pad = [0xEC, 0x11], p = 0;
    while (data.length < cap) data.push(pad[p++ % 2]);

    /* Split into blocks, compute EC, interleave */
    var r = RS[ecl][version], ecLen = r[0];
    var blocks = [], ecBlocks = [], offset = 0, g;
    for (g = 0; g < r[1]; g++) { blocks.push(data.slice(offset, offset + r[2])); offset += r[2]; }
    for (g = 0; g < r[3]; g++) { blocks.push(data.slice(offset, offset + r[4])); offset += r[4]; }
    for (g = 0; g < blocks.length; g++) ecBlocks.push(rsRemainder(blocks[g], ecLen));

    var out = [], maxData = Math.max(r[2], r[4]), i2, j2;
    for (i2 = 0; i2 < maxData; i2++)
      for (j2 = 0; j2 < blocks.length; j2++)
        if (i2 < blocks[j2].length) out.push(blocks[j2][i2]);
    for (i2 = 0; i2 < ecLen; i2++)
      for (j2 = 0; j2 < ecBlocks.length; j2++) out.push(ecBlocks[j2][i2]);
    return out;
  }

  /* ---------- Matrix ---------- */
  function newMatrix(size) {
    var m = [], f = [], i, j;
    for (i = 0; i < size; i++) {
      m.push(new Array(size).fill(false));
      f.push(new Array(size).fill(false));   /* function-module map */
    }
    return { m: m, f: f };
  }

  function setFn(g, x, y, v) {
    if (x < 0 || y < 0 || y >= g.m.length || x >= g.m.length) return;
    g.m[y][x] = v; g.f[y][x] = true;
  }

  function placeFinder(g, cx, cy) {
    for (var dy = -4; dy <= 4; dy++)
      for (var dx = -4; dx <= 4; dx++) {
        var x = cx + dx, y = cy + dy, d = Math.max(Math.abs(dx), Math.abs(dy));
        if (x < 0 || y < 0 || x >= g.m.length || y >= g.m.length) continue;
        setFn(g, x, y, d !== 2 && d !== 4);
      }
  }

  function placeFunctionPatterns(g, version) {
    var size = g.m.length, i, j;
    placeFinder(g, 3, 3);
    placeFinder(g, size - 4, 3);
    placeFinder(g, 3, size - 4);

    for (i = 8; i < size - 8; i++) {      /* timing patterns */
      setFn(g, i, 6, i % 2 === 0);
      setFn(g, 6, i, i % 2 === 0);
    }

    var centers = ALIGN[version];
    for (i = 0; i < centers.length; i++)
      for (j = 0; j < centers.length; j++) {
        var cx = centers[i], cy = centers[j];
        if ((cx === 6 && cy === 6) || (cx === 6 && cy === size - 7) || (cx === size - 7 && cy === 6)) continue;
        for (var dy = -2; dy <= 2; dy++)
          for (var dx = -2; dx <= 2; dx++)
            setFn(g, cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }

    setFn(g, 8, size - 8, true);          /* dark module */

    /* Reserve format areas */
    for (i = 0; i <= 8; i++) { if (i !== 6) { setFn(g, i, 8, false); setFn(g, 8, i, false); } }
    for (i = 0; i < 8; i++) { setFn(g, size - 1 - i, 8, false); setFn(g, 8, size - 1 - i, false); }

    if (version >= 7) {                   /* version information */
      var rem = version, k;
      for (k = 0; k < 12; k++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1F25);
      var bits = (version << 12) | rem;
      for (k = 0; k < 18; k++) {
        var bit = ((bits >>> k) & 1) === 1, a = size - 11 + (k % 3), b = Math.floor(k / 3);
        setFn(g, a, b, bit);
        setFn(g, b, a, bit);
      }
    }
  }

  function placeFormat(g, ecl, mask) {
    var size = g.m.length;
    var data = (ECL_BITS[ecl] << 3) | mask, rem = data, i;
    for (i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    var bits = ((data << 10) | rem) ^ 0x5412;

    for (i = 0; i <= 5; i++) setFn(g, 8, i, ((bits >>> i) & 1) === 1);
    setFn(g, 8, 7, ((bits >>> 6) & 1) === 1);
    setFn(g, 8, 8, ((bits >>> 7) & 1) === 1);
    setFn(g, 7, 8, ((bits >>> 8) & 1) === 1);
    for (i = 9; i < 15; i++) setFn(g, 14 - i, 8, ((bits >>> i) & 1) === 1);

    for (i = 0; i < 8; i++) setFn(g, size - 1 - i, 8, ((bits >>> i) & 1) === 1);
    for (i = 8; i < 15; i++) setFn(g, 8, size - 15 + i, ((bits >>> i) & 1) === 1);
    setFn(g, 8, size - 8, true);
  }

  function placeData(g, codewords) {
    var size = g.m.length, bitIdx = 0, upward = true;
    for (var right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;             /* skip vertical timing column */
      for (var v = 0; v < size; v++) {
        var y = upward ? size - 1 - v : v;
        for (var c = 0; c < 2; c++) {
          var x = right - c;
          if (g.f[y][x]) continue;
          var bit = false;
          if (bitIdx >>> 3 < codewords.length)
            bit = ((codewords[bitIdx >>> 3] >>> (7 - (bitIdx & 7))) & 1) === 1;
          g.m[y][x] = bit;
          bitIdx++;
        }
      }
      upward = !upward;
    }
  }

  function maskFn(mask, x, y) {
    switch (mask) {
      case 0: return (x + y) % 2 === 0;
      case 1: return y % 2 === 0;
      case 2: return x % 3 === 0;
      case 3: return (x + y) % 3 === 0;
      case 4: return (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0;
      case 5: return ((x * y) % 2 + (x * y) % 3) === 0;
      case 6: return (((x * y) % 2 + (x * y) % 3) % 2) === 0;
      case 7: return (((x + y) % 2 + (x * y) % 3) % 2) === 0;
    }
  }

  function applyMask(g, mask) {
    var size = g.m.length;
    for (var y = 0; y < size; y++)
      for (var x = 0; x < size; x++)
        if (!g.f[y][x] && maskFn(mask, x, y)) g.m[y][x] = !g.m[y][x];
  }

  /* Penalty rules 1–4 (ISO/IEC 18004 §8.8.2) */
  function penalty(g) {
    var size = g.m.length, score = 0, x, y, i;

    function runScore(run) { return run >= 5 ? 3 + (run - 5) : 0; }

    for (y = 0; y < size; y++) {                    /* rule 1: rows & columns */
      var runR = 1, runC = 1;
      for (x = 1; x < size; x++) {
        if (g.m[y][x] === g.m[y][x - 1]) runR++; else { score += runScore(runR); runR = 1; }
        if (g.m[x][y] === g.m[x - 1][y]) runC++; else { score += runScore(runC); runC = 1; }
      }
      score += runScore(runR) + runScore(runC);
    }

    for (y = 0; y < size - 1; y++)                  /* rule 2: 2×2 blocks */
      for (x = 0; x < size - 1; x++) {
        var v = g.m[y][x];
        if (v === g.m[y][x + 1] && v === g.m[y + 1][x] && v === g.m[y + 1][x + 1]) score += 3;
      }

    var patA = [true,false,true,true,true,false,true,false,false,false,false];
    var patB = [false,false,false,false,true,false,true,true,true,false,true];
    function matches(get, start) {
      for (var k = 0; k < 11; k++) if (get(start + k) !== patA[k]) break;
      if (k === 11) return true;
      for (k = 0; k < 11; k++) if (get(start + k) !== patB[k]) return false;
      return true;
    }
    for (y = 0; y < size; y++)                      /* rule 3: finder-like patterns */
      for (x = 0; x <= size - 11; x++) {
        if (matches(function (k) { return g.m[y][k]; }, x)) score += 40;
        if (matches(function (k) { return g.m[k][y]; }, x)) score += 40;
      }

    var dark = 0;                                   /* rule 4: dark/light balance */
    for (y = 0; y < size; y++) for (x = 0; x < size; x++) if (g.m[y][x]) dark++;
    var pct = dark * 100 / (size * size);
    score += Math.floor(Math.abs(pct - 50) / 5) * 10;
    return score;
  }

  function encode(text, ecl, minVersion, forceMask) {
    ecl = ecl || "M";
    if (!RS[ecl]) throw new Error("QR: unknown ECC level " + ecl);
    var bytes = utf8Bytes(String(text));
    var version = pickVersion(bytes.length, ecl);
    if (minVersion && minVersion > version) {
      if (minVersion > 10) throw new Error("QR: minVersion above supported range");
      version = minVersion;
    }
    var codewords = buildCodewords(bytes, version, ecl);
    var size = version * 4 + 17;

    var best = null;
    var lo = forceMask == null ? 0 : forceMask, hi = forceMask == null ? 7 : forceMask;
    for (var mask = lo; mask <= hi; mask++) {
      var g = newMatrix(size);
      placeFunctionPatterns(g, version);
      placeData(g, codewords);
      applyMask(g, mask);
      placeFormat(g, ecl, mask);
      var s = penalty(g);
      if (!best || s < best.score) best = { score: s, grid: g, mask: mask };
    }
    return { size: size, version: version, ecl: ecl, mask: best.mask, modules: best.grid.m };
  }

  /* ---------- SVG rendering ---------- */
  function svg(text, opts) {
    opts = opts || {};
    var q = opts.quiet == null ? 2 : opts.quiet;
    var qr = encode(text, opts.ecl || "M", opts.minVersion);
    var dim = qr.size + q * 2;
    var dark = opts.dark || "#000", light = opts.light || "none";
    var path = [];
    for (var y = 0; y < qr.size; y++) {
      var x = 0;
      while (x < qr.size) {
        if (!qr.modules[y][x]) { x++; continue; }
        var run = 0;
        while (x + run < qr.size && qr.modules[y][x + run]) run++;
        path.push("M" + (x + q) + " " + (y + q) + "h" + run + "v1h-" + run + "z");
        x += run;
      }
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + dim + ' ' + dim +
      '" shape-rendering="crispEdges" role="img" aria-label="QR code">' +
      (light === "none" ? "" : '<rect width="' + dim + '" height="' + dim + '" fill="' + light + '"/>') +
      '<path fill="' + dark + '" d="' + path.join("") + '"/></svg>';
  }

  root.QR = { encode: encode, svg: svg };
})(typeof window !== "undefined" ? window : globalThis);
