"use client";
import { useEffect, useRef } from "react";

const LEATHER = ["#5a1f17", "#6e2a1c", "#3c2a1a", "#2c3a2a", "#23324a", "#5b4120", "#41261e", "#2b2420", "#6a4a2a", "#4a1d2a", "#1f3b3a"];
const ROW = 118;
const TILE = 1400;

// Rows of leather-bound spines drawn once into a seamless strip, then slowly panned:
// the endless library behind the home page hero.
function buildStrip(height: number) {
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const rows = Math.ceil(height / ROW) + 1;
  const strip = document.createElement("canvas");
  strip.width = TILE;
  strip.height = rows * ROW;
  const s = strip.getContext("2d")!;
  s.fillStyle = "#1a120c";
  s.fillRect(0, 0, TILE, strip.height);
  for (let r = 0; r < rows; r++) {
    const base = r * ROW + ROW - 14;
    let x = 0;
    while (x < TILE) {
      if (rnd() < 0.05) {
        x += 14 + rnd() * 30; // a gap where a book is out on loan
        continue;
      }
      const w = 12 + rnd() * 20;
      const h = 62 + rnd() * 40;
      const leaning = rnd() < 0.04;
      s.save();
      s.translate(x, base);
      if (leaning) s.rotate(-0.12);
      s.fillStyle = LEATHER[Math.floor(rnd() * LEATHER.length)];
      s.fillRect(0, -h, w, h);
      s.fillStyle = "rgba(0,0,0,.28)";
      s.fillRect(w - 2, -h, 2, h);
      s.fillStyle = "rgba(255,255,255,.06)";
      s.fillRect(1, -h, 2, h);
      if (rnd() < 0.7) {
        s.fillStyle = "rgba(214,170,96,.75)";
        s.fillRect(1, -h + 9, w - 2, 2);
        s.fillRect(1, -h + 14, w - 2, 1);
        s.fillRect(1, -14, w - 2, 2);
        if (w > 18 && rnd() < 0.6) s.fillRect(w / 2 - 3, -h / 2 - 8, 6, 16);
      }
      s.restore();
      x += w + (leaning ? 6 : 1);
    }
    const g = s.createLinearGradient(0, base, 0, base + 14);
    g.addColorStop(0, "#6b4428");
    g.addColorStop(1, "#2a1a10");
    s.fillStyle = g;
    s.fillRect(0, base, TILE, 14);
    s.fillStyle = "rgba(0,0,0,.45)";
    s.fillRect(0, base + 14, TILE, 6);
  }
  return { strip, rows };
}

export function LibraryShelves() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let built: ReturnType<typeof buildStrip> | null = null;
    let offset = 0;
    let last = 0;
    let raf = 0;
    const frame = (t: number) => {
      const dpr = Math.min(2, devicePixelRatio || 1);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (w && h) {
        if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
          canvas.width = Math.round(w * dpr);
          canvas.height = Math.round(h * dpr);
          if (!built || built.strip.height < h + ROW) built = buildStrip(h);
        }
        if (!still && last) offset = (offset + (t - last) * 0.012) % TILE;
        last = t;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        for (let r = 0; r < built!.rows; r++) {
          // Alternate rows drift in opposite directions, like walking past the stacks.
          const dx = (r % 2 ? offset : -offset) % TILE;
          for (let x = dx - TILE; x < w; x += TILE) ctx.drawImage(built!.strip, 0, r * ROW, TILE, ROW, x, r * ROW - 20, TILE, ROW);
        }
      }
      if (!still) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    const redraw = () => requestAnimationFrame(frame);
    if (still) addEventListener("resize", redraw);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("resize", redraw);
    };
  }, []);
  return <canvas ref={ref} aria-hidden className="library-canvas" />;
}
