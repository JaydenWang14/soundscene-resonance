/* Re:Sonance preview: a scene of five separate sounds. For each one the visitor picks Sound / Music / Mute and the instrument.
   Audio and envelopes are pre-rendered (assets/scene.js, built by _tools/build_re_demo2.py); nothing is computed live. */
(function () {
  var S = window.RE_SCENE, A = window.RE_SCENE_AUDIO;
  if (!S || !A) return;
  var PURPLE = "#5b3fd6";
  var $ = function (s) { return document.querySelector(s); };
  var rowsEl = $("#rows"), btnPlay = $("#btnPlay"), timeEl = $("#time");
  var dpr = Math.min(window.devicePixelRatio || 1, 2), T = S.dur;
  var st = { ctx: null, playing: false, pos: 0, startedAt: 0, nodes: [], buf: {}, raf: 0 };
  var rows = S.stems.map(function (s) { return { s: s, mode: "orig", inst: s.inst[0].key }; });

  function fmt(x) { x = Math.max(0, x); return Math.floor(x / 60) + ":" + ("0" + Math.floor(x % 60)).slice(-2); }
  function nowT() { return st.playing ? Math.min(st.ctx.currentTime - st.startedAt, T) : st.pos; }

  // ---------- build rows
  rows.forEach(function (r, i) {
    var el = document.createElement("div"); el.className = "row";
    var inst = r.s.inst.length > 1
      ? '<span class="chiplabel">Instrument</span>' + r.s.inst.map(function (n, j) { return '<button class="chip sm" data-i="' + n.key + '" aria-pressed="' + (j === 0) + '">' + n.name + '</button>'; }).join("")
      : '<span class="chiplabel">Instrument</span><span class="instname">' + r.s.inst[0].name + '</span>';
    el.innerHTML = '<div class="rh"><div><b>' + r.s.title + '</b><span class="pl">' + r.s.place + '</span></div>' +
      '<div class="seg" role="group" aria-label="' + r.s.title + '"><button data-m="orig" aria-pressed="true">Sound</button><button data-m="music" aria-pressed="false">Music</button><button data-m="off" aria-pressed="false">Mute</button></div></div>' +
      '<canvas aria-hidden="true"></canvas><div class="ri">' + inst + '</div>';
    rowsEl.appendChild(el); r.el = el; r.cv = el.querySelector("canvas");
    el.querySelectorAll(".seg button").forEach(function (b) { b.addEventListener("click", function () { setMode(r, b.getAttribute("data-m")); }); });
    el.querySelectorAll(".chip.sm").forEach(function (b) {
      b.addEventListener("click", function () {
        r.inst = b.getAttribute("data-i");
        el.querySelectorAll(".chip.sm").forEach(function (o) { o.setAttribute("aria-pressed", o === b ? "true" : "false"); });
        if (r.mode !== "music") setMode(r, "music"); else restartIfPlaying();
        draw();
      });
    });
    r.cv.addEventListener("click", function (e) { var c = r.cv.getBoundingClientRect(); seek((e.clientX - c.left) / c.width); });
  });

  // ---------- drawing
  function drawRow(r, t) {
    var c = r.cv, rc = c.getBoundingClientRect();
    var w = Math.max(2, Math.round(rc.width * dpr)), h = Math.max(2, Math.round(rc.height * dpr));
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    var g = c.getContext("2d"), n = r.s.env.length, bw = w / n, mid = h / 2;
    var dark = r.mode === "orig";
    g.fillStyle = r.mode === "off" ? "#efeff2" : dark ? "#121212" : "#faf9ff"; g.fillRect(0, 0, w, h);
    var env = r.mode === "music" ? r.s.envM[r.inst] : r.s.env, px = t / T * w;
    for (var i = 0; i < n; i++) {
      var v = Math.max(0.02, env[i] / 255), hh = v * (h * 0.86), x = i * bw, past = x < px;
      if (r.mode === "off") g.fillStyle = "#c9c9d0";
      else if (dark) g.fillStyle = past ? "rgba(236,236,240,.95)" : "rgba(236,236,240,.35)";
      else g.fillStyle = past ? PURPLE : "rgba(91,63,214,.30)";
      g.fillRect(x, mid - hh / 2, Math.max(bw - 1 * dpr, 1), hh);
    }
    g.fillStyle = r.mode === "music" ? PURPLE : r.mode === "off" ? "#8a8a93" : "#fff"; g.fillRect(px - dpr * 0.75, 0, dpr * 1.5, h);
    if (r.mode === "off") { g.fillStyle = "#6a6a70"; g.font = "700 " + 12 * dpr + "px Arial"; g.textAlign = "center"; g.fillText("muted", w / 2, mid + 4 * dpr); }
  }
  function draw() { var t = nowT(); rows.forEach(function (r) { drawRow(r, t); }); timeEl.textContent = fmt(t) + " / " + fmt(T); }
  function loop() { draw(); if (st.playing) { if (nowT() >= T) { endPlayback(); return; } st.raf = requestAnimationFrame(loop); } }

  // ---------- audio
  function ensureCtx() {
    if (!st.ctx) st.ctx = new (window.AudioContext || window.webkitAudioContext)();
    return st.ctx.state === "suspended" ? st.ctx.resume() : Promise.resolve();
  }
  function getBuf(id) {
    if (st.buf[id]) return Promise.resolve(st.buf[id]);
    var bin = atob(A[id]), u8 = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return new Promise(function (res, rej) { st.ctx.decodeAudioData(u8.buffer, function (b) { st.buf[id] = b; res(b); }, rej); });
  }
  function stopNodes() { st.nodes.forEach(function (n) { try { n.src.stop(); } catch (e) {} }); st.nodes = []; cancelAnimationFrame(st.raf); }
  function gainFor(r, kind) { return (r.mode === "orig" && kind === "o") || (r.mode === "music" && kind === "m") ? 1 : 0; }
  function setPlayLabel() { btnPlay.textContent = st.playing ? "Pause" : (st.pos > 0.05 ? "Resume" : "Play"); }
  function play() {
    return ensureCtx().then(function () {
      var ids = []; rows.forEach(function (r) { ids.push(r.s.key + "_orig"); ids.push(r.s.key + "_" + r.inst); });
      return Promise.all(ids.map(getBuf));
    }).then(function (bs) {
      stopNodes();
      var ctx = st.ctx, when = ctx.currentTime + 0.06, off = Math.min(st.pos, T - 0.05);
      rows.forEach(function (r, i) {
        [["o", bs[i * 2]], ["m", bs[i * 2 + 1]]].forEach(function (p) {
          var src = ctx.createBufferSource(), gn = ctx.createGain();
          src.buffer = p[1]; gn.gain.value = gainFor(r, p[0]); src.connect(gn); gn.connect(ctx.destination);
          if (off < p[1].duration) src.start(when, off);
          st.nodes.push({ src: src, gn: gn, r: r, k: p[0] });
        });
      });
      st.startedAt = when - off; st.playing = true; setPlayLabel(); loop();
    });
  }
  function pause() { st.pos = nowT(); st.playing = false; stopNodes(); setPlayLabel(); draw(); }
  function endPlayback() { st.playing = false; st.pos = 0; stopNodes(); setPlayLabel(); btnPlay.textContent = "Play again"; draw(); }
  function restartIfPlaying() { if (st.playing) { st.pos = nowT(); play(); } }
  function seek(f) { st.pos = Math.max(0, Math.min(f, 1)) * T; if (st.playing) play(); else { setPlayLabel(); draw(); } }
  function setMode(r, m) {
    r.mode = m;
    r.el.querySelectorAll(".seg button").forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-m") === m ? "true" : "false"); });
    st.nodes.forEach(function (n) { if (n.r === r) n.gn.gain.setTargetAtTime(gainFor(r, n.k), st.ctx.currentTime, 0.03); });
    draw();
  }

  // ---------- controls
  btnPlay.addEventListener("click", function () { if (st.playing) pause(); else play(); });
  document.querySelectorAll("[data-preset]").forEach(function (b) {
    b.addEventListener("click", function () {
      var p = b.getAttribute("data-preset");
      rows.forEach(function (r) { setMode(r, p === "all" || (p === "siren" && r.s.key === "siren") ? "music" : "orig"); });
      if (!st.playing) { st.pos = 0; play(); }
    });
  });
  function renderCredit() {
    $("#credit").innerHTML = "Recordings: " + S.stems.map(function (s) { return s.title + ", " + s.place + " · " + s.credit + " · " + s.license + " · <a href=\"" + s.url + "\" target=\"_blank\" rel=\"noopener\">source</a>"; }).join(" &nbsp;|&nbsp; ") +
      ". Each excerpt is a 24-second part of a longer recording, shortened and levelled for this preview.";
  }
  var rz; window.addEventListener("resize", function () { clearTimeout(rz); rz = setTimeout(draw, 80); });
  var qt = /[?&]t=([\d.]+)/.exec(location.search); if (qt) st.pos = parseFloat(qt[1]);
  var qm = /[?&]m=([a-z,]+)/.exec(location.search); if (qm) qm[1].split(",").forEach(function (k) { rows.forEach(function (r) { if (r.s.key === k) setMode(r, "music"); }); });   // ?m=siren,footsteps shows those sounds as music (for screenshots)
  renderCredit(); setPlayLabel(); draw(); setTimeout(draw, 250);
})();
