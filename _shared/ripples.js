/* Interfering water ripples on a canvas (used as a hero background / interactive surface).
   Ripples.attach(canvas, { sources: [{x,y,f}], palette: "graphite" | "paper" | "gold", interactive: true })
   Each source emits circular waves; where they overlap the surface interferes. Click or tap adds a short-lived source. */
(function () {
  function attach(canvas, opts) {
    opts = opts || {};
    var W = opts.w || 300, H = opts.h || 170;
    var ctx = canvas.getContext("2d");
    var off = document.createElement("canvas"); off.width = W; off.height = H;
    var octx = off.getContext("2d");
    var img = octx.createImageData(W, H);
    var field = new Float32Array(W * H);
    var base = (opts.sources || []).map(function (s) { return { x: s.x, y: s.y, f: s.f || 1, amp: s.amp || 1, g: s.g || 0, born: -1e9, life: 1e9 }; });
    var temp = [];
    var fmul = 1, amul = 1, gF = {}, gA = {};
    var palette = opts.palette || "graphite";
    var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    var running = true, t0 = performance.now();
    function resize() {
      var r = canvas.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(2, Math.round(r.width * dpr));
      canvas.height = Math.max(2, Math.round(r.height * dpr));
    }
    function colour(v, light) {
      // v: shading 0..1
      if (palette === "paper") {
        var g = 255 - Math.round(v * 70);
        return [g - 4, g - 6, 255 - Math.round(v * 28)];
      }
      if (palette === "gold") {
        // light museum water: warm gold in the troughs, pale white on the crests
        var q = Math.min(1, v * 1.15);
        return [214 + q * 41, 160 + q * 92, 72 + q * 160];
      }
      var a = 16 + v * 232;
      return [a * 1.0 + light * 14, a * 0.96 + light * 8, a * 0.9];
    }
    function frame(now) {
      var t = (now - t0) / 1000;
      var srcs = base.concat(temp.filter(function (s) { return now - s.born < s.life; }));
      temp = temp.filter(function (s) { return now - s.born < s.life; });
      var i = 0, x, y, k = opts.k || 0.95, w = opts.w2 || 3.2;
      for (y = 0; y < H; y++) {
        for (x = 0; x < W; x++, i++) {
          var h = 0;
          for (var s = 0; s < srcs.length; s++) {
            var S = srcs[s];
            var dx = x / W - S.x, dy = (y / H - S.y) * (H / W);
            var d = Math.sqrt(dx * dx + dy * dy) * 100;
            var env = S.born > -1e8 ? Math.max(0, 1 - (now - S.born) / S.life) : 1;
            var ff = S.f * (S.g ? (gF[S.g] || 1) : fmul), aa = S.amp * (S.g ? (gA[S.g] || 1) : amul);
            h += aa * env * Math.cos(d * k * ff - t * w * ff) / (1 + d * 0.06);
          }
          field[i] = h;
        }
      }
      var data = img.data;
      for (y = 1; y < H - 1; y++) {
        for (x = 1; x < W - 1; x++) {
          var j = y * W + x;
          var gx = field[j + 1] - field[j - 1], gy = field[j + W] - field[j - W];
          var shade = 0.3 + (-gx * 0.8 - gy * 0.55) * (opts.gain || 1.15) + field[j] * 0.05;
          if (shade < 0) shade = 0; if (shade > 0.8) shade = 0.8 + (shade - 0.8) * 1.6; if (shade > 1) shade = 1;
          var c = colour(shade * shade, shade > 0.82 ? 1 : 0);
          var p = j * 4;
          data[p] = c[0]; data[p + 1] = c[1]; data[p + 2] = c[2]; data[p + 3] = 255;
        }
      }
      octx.putImageData(img, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(off, 0, 0, canvas.width, canvas.height);
    }
    var last = 0;
    function loop(now) { if (!running) return; if (now - last > 30) { last = now; frame(now); } if (!reduce) requestAnimationFrame(loop); }
    function drop(ev) {
      var r = canvas.getBoundingClientRect();
      var px = (ev.clientX - r.left) / r.width, py = (ev.clientY - r.top) / r.height;
      temp.push({ x: px, y: py, f: 0.8 + Math.random() * 0.8, amp: 1.5, born: performance.now(), life: 6000 });
      if (temp.length > 8) temp.shift();
      if (reduce) frame(performance.now());
    }
    resize();
    window.addEventListener("resize", resize);
    if (opts.interactive) canvas.addEventListener("pointerdown", drop);
    document.addEventListener("visibilitychange", function () { running = !document.hidden; if (running) requestAnimationFrame(loop); });
    requestAnimationFrame(loop);
    return { drop: drop, setFreq: function (v, g) { if (g) gF[g] = v; else fmul = v; if (reduce) frame(performance.now()); }, setAmp: function (v, g) { if (g) gA[g] = v; else amul = v; if (reduce) frame(performance.now()); } };
  }
  window.Ripples = { attach: attach };
})();
