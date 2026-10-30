"use client";
import { useEffect, useRef } from "react";

// The home page hero: a walk down an endless library aisle, with one book in front of the
// reader that opens and turns its pages. Three.js loads only in the browser, after the page.
const C = { deep: 0x1a120e, forest: 0x173b2d, gold: 0xc5a15b, burgundy: 0x8b302d, ivory: 0xf5efe4 };
const hex = (n: number) => `#${n.toString(16).padStart(6, "0")}`;
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function HeroScene({ coverTitle, coverLine, chapter }: { coverTitle: string; coverLine: string; chapter: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const host = canvas.parentElement!;
    let stop = false;
    let cleanup = () => {};

    (async () => {
      const THREE = await import("three");
      await document.fonts.ready;
      if (stop) return;
      const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

      let renderer: import("three").WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
      } catch {
        return; // No WebGL: the CSS background stays.
      }
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(C.deep);
      scene.fog = new THREE.Fog(C.deep, 4, 34);
      const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 80);
      scene.add(camera);

      // ---- the aisle: one period of shelves per wall, repeated so the walk loops seamlessly
      const PERIOD = 24, COPIES = 3, ROWS = 6, HALF = 2.6;
      const palette = [C.burgundy, C.forest, 0x3d2a20, 0x6b4a2f, C.gold, 0xd9cdb6, 0x23453a, 0x5c1f1d];
      let seed = 7;
      const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      const spines: { side: number; row: number; z: number; w: number; h: number; d: number; color: number; lean: number }[] = [];
      for (const side of [-1, 1])
        for (let row = 0; row < ROWS; row++) {
          let z = 0;
          while (z < PERIOD) {
            const w = 0.12 + rnd() * 0.16, h = 0.55 + rnd() * 0.3, d = 0.45 + rnd() * 0.15;
            if (rnd() < 0.05) {
              z += 0.4; // a book out on loan
              continue;
            }
            spines.push({ side, row, z: z + w / 2, w, h, d, color: palette[Math.floor(rnd() * palette.length)], lean: rnd() < 0.04 ? (rnd() - 0.5) * 0.5 : 0 });
            z += w + 0.01;
          }
        }
      const books = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.75, metalness: 0.05 }), spines.length * COPIES);
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), col = new THREE.Color(), v = new THREE.Vector3(), s = new THREE.Vector3();
      let k = 0;
      for (let c = 0; c < COPIES; c++)
        for (const b of spines) {
          q.setFromEuler(e.set(b.lean, 0, 0));
          m4.compose(v.set(b.side * (HALF + 0.55 - b.d / 2), -2.2 + b.row * 0.95 + b.h / 2, -(b.z + c * PERIOD)), q, s.set(b.d, b.h, b.w));
          books.setMatrixAt(k, m4);
          books.setColorAt(k++, col.setHex(b.color));
        }
      scene.add(books);
      const wood = new THREE.MeshStandardMaterial({ color: 0x3a281d, roughness: 0.85 });
      const length = PERIOD * COPIES;
      for (const side of [-1, 1]) {
        for (let row = 0; row <= ROWS; row++) {
          const board = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.06, length), wood);
          board.position.set(side * (HALF + 0.35), -2.23 + row * 0.95, -length / 2 + 1);
          scene.add(board);
        }
        const panel = new THREE.Mesh(new THREE.BoxGeometry(0.05, ROWS * 0.95, length), new THREE.MeshStandardMaterial({ color: 0x20160f, roughness: 1 }));
        panel.position.set(side * (HALF + 0.78), -2.2 + (ROWS * 0.95) / 2, -length / 2 + 1);
        scene.add(panel);
      }
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, length), new THREE.MeshStandardMaterial({ color: 0x2c1e16, roughness: 0.6, metalness: 0.1 }));
      floor.rotation.x = -Math.PI / 2;
      floor.position.set(0, -2.3, -length / 2 + 1);
      scene.add(floor);
      // Reading lamps every 6 units; they ride along with the walk, so the light never runs out.
      const lamps = new THREE.Group();
      for (let i = 0; i < 6; i++) {
        const l = new THREE.PointLight(0xffc77a, 9, 9, 1.6);
        l.position.set(0, 2.4, -i * 6);
        l.add(new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 12), new THREE.MeshBasicMaterial({ color: 0xffd9a0 })));
        lamps.add(l);
      }
      scene.add(lamps);
      scene.add(new THREE.AmbientLight(0xffffff, 0.35));
      const dustN = 500, dpos = new Float32Array(dustN * 3);
      for (let i = 0; i < dustN; i++) {
        dpos[i * 3] = (Math.random() - 0.5) * 4.4;
        dpos[i * 3 + 1] = (Math.random() - 0.3) * 5;
        dpos[i * 3 + 2] = -Math.random() * PERIOD * 2;
      }
      const dustGeo = new THREE.BufferGeometry();
      dustGeo.setAttribute("position", new THREE.BufferAttribute(dpos, 3));
      const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: C.gold, size: 0.03, transparent: true, opacity: 0.8 }));
      scene.add(dust);

      // ---- the book in front of the reader, carried with the camera and kept out of the fog
      const art = (draw: (g: CanvasRenderingContext2D) => void) => {
        const cv = document.createElement("canvas");
        cv.width = 600;
        cv.height = 840;
        draw(cv.getContext("2d")!);
        const t = new THREE.CanvasTexture(cv);
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 8;
        return t;
      };
      const serif = getComputedStyle(document.body).getPropertyValue("--font-serif") || "Georgia, serif";
      const coverTex = art((g) => {
        g.fillStyle = hex(C.forest);
        g.fillRect(0, 0, 600, 840);
        g.strokeStyle = hex(C.gold);
        g.lineWidth = 6;
        g.strokeRect(36, 36, 528, 768);
        g.lineWidth = 2;
        g.strokeRect(52, 52, 496, 736);
        g.textAlign = "center";
        g.fillStyle = hex(C.gold);
        g.font = `800 84px ${serif}`;
        g.fillText(coverTitle, 300, 330, 480);
        g.fillStyle = hex(C.ivory);
        g.font = `400 34px ${serif}`;
        g.fillText(coverLine, 300, 400, 480);
        g.beginPath();
        g.arc(300, 560, 70, 0, Math.PI * 2);
        g.lineWidth = 3;
        g.stroke();
        g.fillStyle = hex(C.gold);
        g.font = `800 64px ${serif}`;
        g.fillText("Β", 300, 582);
        g.fillStyle = hex(C.ivory);
        g.font = "600 26px system-ui, sans-serif";
        g.fillText("VIVLIOTHIKI BOOKS", 300, 740);
      });
      const pageTex = art((g) => {
        g.fillStyle = hex(C.ivory);
        g.fillRect(0, 0, 600, 840);
        g.fillStyle = "rgba(40,28,22,.55)";
        for (let y = 120; y < 760; y += 26) if ((y / 26) % 7 !== 3) g.fillRect(70, y, 460 - ((y * 37) % 90), 7);
        g.fillStyle = hex(C.burgundy);
        g.font = `800 40px ${serif}`;
        g.fillText(chapter, 70, 90);
      });
      const W = 3, H = 4.2, D = 0.55, T = 0.06;
      const noFog = (m: import("three").MeshStandardMaterial) => ((m.fog = false), m);
      const coverMat = noFog(new THREE.MeshStandardMaterial({ color: C.forest, roughness: 0.55, metalness: 0.05 }));
      const book = new THREE.Group();
      const back = new THREE.Mesh(new THREE.BoxGeometry(W, H, T), coverMat);
      back.position.z = -D / 2;
      const spine = new THREE.Mesh(new THREE.BoxGeometry(T, H, D + T), coverMat);
      spine.position.x = -W / 2;
      const block = new THREE.Mesh(new THREE.BoxGeometry(W - 0.12, H - 0.14, D - 0.05), noFog(new THREE.MeshStandardMaterial({ color: 0xece3d2, roughness: 0.9 })));
      block.position.x = 0.03;
      const hinge = new THREE.Group();
      hinge.position.set(-W / 2, 0, D / 2);
      const front = new THREE.Mesh(new THREE.BoxGeometry(W, H, T), [
        coverMat, coverMat, coverMat, coverMat,
        noFog(new THREE.MeshStandardMaterial({ map: coverTex, roughness: 0.5 })),
        noFog(new THREE.MeshStandardMaterial({ color: C.ivory, roughness: 0.9 })),
      ]);
      front.position.x = W / 2;
      hinge.add(front);
      book.add(back, spine, block, hinge);
      const pageMat = noFog(new THREE.MeshStandardMaterial({ map: pageTex, side: THREE.DoubleSide, roughness: 0.95 }));
      const pages = Array.from({ length: 7 }, (_, i) => {
        const pivot = new THREE.Group();
        pivot.position.set(-W / 2 + 0.03, 0, D / 2 - 0.04 - i * 0.012);
        const geo = new THREE.PlaneGeometry(W - 0.14, H - 0.16, 12, 1);
        geo.translate((W - 0.14) / 2, 0, 0);
        pivot.add(new THREE.Mesh(geo, pageMat));
        book.add(pivot);
        return { pivot, geo, base: Float32Array.from(geo.attributes.position.array) };
      });
      // The book stands in the middle of the aisle and walks along with the reader.
      const rig = new THREE.Group();
      rig.scale.setScalar(0.7);
      rig.add(book);
      scene.add(rig);
      const key = new THREE.DirectionalLight(0xffe9c9, 2.2);
      key.position.set(4, 5, 6);
      const rim = new THREE.PointLight(C.gold, 30, 20, 1.6);
      rim.position.set(-4, 2, 3);
      const fill = new THREE.PointLight(C.burgundy, 18, 20, 1.6);
      fill.position.set(3, -3, 2);
      rig.add(key, rim, fill);

      // ---- pointer, size and the loop
      const ptr = { x: 0, y: 0, tx: 0, ty: 0 };
      const onMove = (ev: PointerEvent) => {
        const r = host.getBoundingClientRect();
        ptr.tx = ((ev.clientX - r.left) / r.width) * 2 - 1;
        ptr.ty = ((ev.clientY - r.top) / r.height) * 2 - 1;
      };
      const onLeave = () => {
        ptr.tx = 0;
        ptr.ty = 0;
      };
      host.addEventListener("pointermove", onMove);
      host.addEventListener("pointerleave", onLeave);

      const fit = () => {
        const w = canvas.clientWidth, h = canvas.clientHeight;
        if (!w || !h) return false;
        if (canvas.width !== Math.floor(w * renderer.getPixelRatio())) {
          renderer.setSize(w, h, false);
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
        }
        return true;
      };

      const CYCLE = 11;
      const frame = (time: number) => {
        if (!fit()) return;
        ptr.x += (ptr.tx - ptr.x) * 0.06;
        ptr.y += (ptr.ty - ptr.y) * 0.06;
        const travel = reduced ? 4 : ((time / 1000) * 0.9) % PERIOD;
        camera.position.set(ptr.x * 0.4, 0.2 - ptr.y * 0.2, 2 - travel);
        camera.lookAt(ptr.x * 1.2, 0.1 - ptr.y * 0.5, -8 - travel);
        lamps.position.z = -Math.floor(travel / 6) * 6 + 6;
        dust.position.y = reduced ? 0 : Math.sin(time / 3000) * 0.15;

        // Wide screens: the book stands down the aisle, between the headline and the cards.
        // Narrow: in the empty band above the text, about 180px tall and 170px from the top.
        const wide = camera.aspect > 1.1;
        if (wide) rig.position.set(0, 0, camera.position.z - 9);
        else {
          const h = canvas.clientHeight, tan = Math.tan((camera.fov * Math.PI) / 360);
          const dist = (H * 0.7 * h) / 180 / (2 * tan);
          rig.position.set(0, camera.position.y + dist * tan * (1 - (2 * 170) / h), camera.position.z - dist);
        }
        const t = reduced ? 3.2 : (time / 1000) % CYCLE;
        const open = t < 1.2 ? 0 : t < 3 ? ease((t - 1.2) / 1.8) : t < 8.6 ? 1 : t < 10.4 ? 1 - ease((t - 8.6) / 1.8) : 0;
        hinge.rotation.y = -open * Math.PI * 0.82;
        // An open book spreads to the left of its spine, so slide it right to keep the spread centered.
        rig.position.x += open * (W / 2) * 0.7;
        pages.forEach((p, i) => {
          const start = 2.2 + i * 0.32, end = 8.4 - i * 0.12;
          const f = reduced
            ? Math.max(0, 0.9 - i * 0.12)
            : t < start ? 0 : t < start + 1.1 ? ease((t - start) / 1.1) : t < end ? 1 : t < end + 0.7 ? 1 - ease((t - end) / 0.7) : 0;
          p.pivot.rotation.y = -f * Math.PI * (0.78 - i * 0.075);
          // Bend the page while it turns.
          const arr = p.geo.attributes.position.array as Float32Array, bend = Math.sin(f * Math.PI) * 0.35;
          for (let j = 0; j < arr.length; j += 3) arr[j + 2] = p.base[j + 2] + bend * Math.pow(p.base[j] / (W - 0.14), 2);
          p.geo.attributes.position.needsUpdate = true;
        });
        book.rotation.y = -0.45 + open * 0.38 + (reduced ? 0 : Math.sin(time / 2600) * 0.12) + ptr.x * 0.25;
        book.rotation.x = 0.12 + ptr.y * 0.15;
        book.position.y = reduced ? 0 : Math.sin(time / 1400) * 0.08;
        renderer.render(scene, camera);
      };

      // Draw only while the hero is on screen and the tab is visible.
      let raf = 0, visible = true;
      const loop = (time: number) => {
        frame(time);
        raf = reduced ? 0 : requestAnimationFrame(loop);
      };
      const resume = () => {
        if (!raf && visible && !document.hidden) raf = requestAnimationFrame(loop);
      };
      const io = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (!visible) {
          cancelAnimationFrame(raf);
          raf = 0;
        } else resume();
      });
      io.observe(host);
      const onVis = () => (document.hidden ? (cancelAnimationFrame(raf), (raf = 0)) : resume());
      document.addEventListener("visibilitychange", onVis);
      const onResize = () => reduced && frame(performance.now());
      addEventListener("resize", onResize);
      canvas.dataset.ready = "true";
      resume();

      cleanup = () => {
        cancelAnimationFrame(raf);
        io.disconnect();
        document.removeEventListener("visibilitychange", onVis);
        removeEventListener("resize", onResize);
        host.removeEventListener("pointermove", onMove);
        host.removeEventListener("pointerleave", onLeave);
        renderer.dispose();
      };
    })();

    return () => {
      stop = true;
      cleanup();
    };
  }, [coverTitle, coverLine, chapter]);

  return <canvas ref={ref} className="hero3d-canvas" aria-hidden />;
}
