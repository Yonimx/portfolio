/* =========================================================
   hexsss — portfolio
   Plain JavaScript, no libraries
   ========================================================= */

(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Mobile menu ---------- */

  const nav = document.querySelector(".nav");
  const menuBtn = document.querySelector(".menu-btn");

  menuBtn.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", String(open));
  });

  nav.querySelectorAll(".links a").forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("open");
      menuBtn.setAttribute("aria-expanded", "false");
    });
  });

  /* ---------- Honeycomb background ---------- */

  const canvas = document.getElementById("hexfield");
  const ctx = canvas.getContext("2d");
  const grid = document.createElement("canvas"); // static grid, drawn once
  const gctx = grid.getContext("2d");

  const R = 28;                    // hexagon radius
  const COL = Math.sqrt(3) * R;    // horizontal spacing
  const ROW = 1.5 * R;             // vertical spacing
  const REACH = 190;               // cursor light radius
  const RED = "255, 61, 79";
  const WARM = "255, 138, 91";

  let cells = [];
  let vw = 0;
  let vh = 0;
  let maxDist = 1;

  const pointer = { x: 0, y: 0, tx: 0, ty: 0, on: false };
  const waves = [];

  function hexPath(c, x, y, r) {
    c.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 180) * (60 * i - 90);
      const px = x + r * Math.cos(a);
      const py = y + r * Math.sin(a);
      if (i === 0) c.moveTo(px, py);
      else c.lineTo(px, py);
    }
    c.closePath();
  }

  function build() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    vw = window.innerWidth;
    vh = window.innerHeight;
    maxDist = Math.hypot(vw, vh);

    for (const c of [canvas, grid]) {
      c.width = Math.round(vw * dpr);
      c.height = Math.round(vh * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    gctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    cells = [];
    const rows = Math.ceil(vh / ROW) + 2;
    const cols = Math.ceil(vw / COL) + 2;
    for (let r = -1; r < rows; r++) {
      for (let c = -1; c < cols; c++) {
        cells.push({
          x: c * COL + (r & 1 ? COL / 2 : 0),
          y: r * ROW,
          glow: 0,
          warm: false,
        });
      }
    }

    gctx.clearRect(0, 0, vw, vh);
    gctx.strokeStyle = "rgba(255, 255, 255, 0.045)";
    gctx.lineWidth = 1;
    for (const cell of cells) {
      hexPath(gctx, cell.x, cell.y, R);
      gctx.stroke();
    }

    if (reduceMotion) {
      ctx.clearRect(0, 0, vw, vh);
      ctx.drawImage(grid, 0, 0, vw, vh);
    }
  }

  function addWave(x, y) {
    waves.push({ x, y, start: performance.now(), r: 0 });
  }

  /* ---------- Parallax ---------- */

  const layers = Array.from(document.querySelectorAll("[data-depth]"));
  let px = 0;
  let py = 0;
  let sx = 0;
  let sy = 0;

  function parallax() {
    sx += (px - sx) * 0.07;
    sy += (py - sy) * 0.07;
    for (const el of layers) {
      const d = parseFloat(el.dataset.depth);
      el.style.transform = `translate3d(${(sx * d).toFixed(2)}px, ${(sy * d).toFixed(2)}px, 0)`;
    }
  }

  /* ---------- Main loop ---------- */

  function frame(now) {
    pointer.x += (pointer.tx - pointer.x) * 0.15;
    pointer.y += (pointer.ty - pointer.y) * 0.15;

    ctx.clearRect(0, 0, vw, vh);
    ctx.drawImage(grid, 0, 0, vw, vh);

    // random cells that light up and fade
    if (Math.random() < 0.08 && cells.length) {
      const c = cells[(Math.random() * cells.length) | 0];
      c.glow = 0.5 + Math.random() * 0.4;
      c.warm = Math.random() < 0.3;
    }

    // expanding ripples
    for (let i = waves.length - 1; i >= 0; i--) {
      waves[i].r = (now - waves[i].start) * 0.9;
      if (waves[i].r > maxDist) waves.splice(i, 1);
    }

    ctx.lineWidth = 1.2;

    for (const c of cells) {
      for (const w of waves) {
        const d = Math.hypot(c.x - w.x, c.y - w.y);
        if (Math.abs(d - w.r) < R) {
          c.glow = Math.max(c.glow, 0.65 * (1 - w.r / maxDist));
        }
      }

      let a = c.glow;
      if (pointer.on) {
        const d = Math.hypot(c.x - pointer.x, c.y - pointer.y);
        if (d < REACH) a = Math.max(a, Math.pow(1 - d / REACH, 1.5) * 0.8);
      }

      c.glow *= 0.965;
      if (a < 0.03) continue;

      const rgb = c.warm ? WARM : RED;
      hexPath(ctx, c.x, c.y, R - 2.5);
      ctx.fillStyle = `rgba(${rgb}, ${(a * 0.1).toFixed(3)})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(${rgb}, ${a.toFixed(3)})`;
      ctx.stroke();
    }

    parallax();
    requestAnimationFrame(frame);
  }

  /* ---------- Events ---------- */

  window.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    if (!pointer.on) {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
    }
    pointer.on = true;
    pointer.tx = e.clientX;
    pointer.ty = e.clientY;
    px = e.clientX / vw - 0.5;
    py = e.clientY / vh - 0.5;
  });

  document.addEventListener("mouseout", (e) => {
    if (!e.relatedTarget) {
      pointer.on = false;
      px = 0;
      py = 0;
    }
  });

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(build, 150);
  });

  /* ---------- Start ---------- */

  build();

  if (reduceMotion) {
    document.querySelectorAll("svg").forEach((s) => {
      if (typeof s.pauseAnimations === "function") s.pauseAnimations();
    });
    return;
  }

  window.addEventListener("pointerdown", (e) => addWave(e.clientX, e.clientY));

  // intro ripple from behind the photo
  window.addEventListener("load", () => {
    const s = document.querySelector(".stage").getBoundingClientRect();
    addWave(s.left + s.width / 2, s.top + s.height * 0.45);
  });

  requestAnimationFrame(frame);
})();
