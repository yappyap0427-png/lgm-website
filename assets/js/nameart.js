/* 名字拼字形：把一群名字排进一个形状里（LGM 字样、∞ 符号……）
   LGM.nameArt(box, {
     people: [{ name, short, term }],   // short = 字形里显示的名字；name = 滑过/搜寻用的完整名字
     shape: (W) => ({ H, paint(ctx), svg }),  // 在宽 W 的画布上画出形状（实心），svg = 外框线
     pct: 0–1,         // 只填到形状的多少（从下往上，按面积）；预设 1 = 填满
     mode: 'fly' | 'fall',  // 进场：名字从四面八方飞回来 / 从上面跌进去
     spot: true,       // 聚光灯扫过
   })
   回传 { draw, search(q) }。名字太多放不下时会自动缩小字或加宽版面，保证每个名字至少出现一次。 */
(function () {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  LGM.nameArt = function (box, o) {
    const people = o.people;
    let lastW = 0, seen = false;

    async function draw(force) {
      const BW = box.clientWidth;
      if (!BW || (BW === lastW && !force) || !people.length) return;
      lastW = BW;
      try { await document.fonts.load('400 100px "Archivo Black"'); } catch (e) { /* 后备字体 */ }
      let W = Math.max(BW, o.minW || 720), fs = W < 900 ? 11 : 13, out;
      for (let i = 0; i < 16; i++) {
        out = layout(W, fs);
        if (out.count >= people.length) break;
        if (fs > 7) fs -= 1; else W = Math.round(W * 1.2);
      }
      const scale = BW / W;
      box.style.height = Math.ceil(out.H * scale) + 'px';
      box.innerHTML = `<div class="na-inner" style="width:${W}px;height:${out.H}px;transform:scale(${scale})">
        ${out.svg}<div class="na-names">${out.html}</div>
        ${o.spot ? `<div class="na-names na-spot" aria-hidden="true">${out.html}</div>` : ''}</div>`;
      if (seen || reduce) box.classList.add('in', 'done');
    }

    function layout(W, fs) {
      const shape = o.shape(W);
      const H = shape.H;
      const c = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
      c.canvas.width = W; c.canvas.height = H;
      shape.paint(c);
      const px = c.getImageData(0, 0, W, H).data;
      const inside = (x, y) => px[(Math.round(y) * W + Math.round(x)) * 4 + 3] > 110;
      const line = Math.round(fs * 1.4);

      // 1. 逐行找出形状里面的横向区段
      const rows = [];
      for (let y = 0; y + line <= H; y += line) {
        const ok = (x) => inside(x, y + line * 0.15) && inside(x, y + line * 0.5) && inside(x, y + line * 0.85);
        const runs = [];
        let x = 0;
        while (x < W) {
          while (x < W && !ok(x)) x++;
          const x0 = x;
          while (x < W && ok(x)) x++;
          if (x - x0 >= fs * 2.2) runs.push({ x0, w: x - x0 });
        }
        if (runs.length) rows.push({ y, runs, area: runs.reduce((a, r) => a + r.w, 0) });
      }
      // 2. 只填到 pct：从最下面一行往上算面积
      const pct = o.pct == null ? 1 : Math.max(0, Math.min(1, o.pct));
      const total = rows.reduce((a, r) => a + r.area, 0);
      let acc = 0;
      for (let i = rows.length - 1; i >= 0; i--) { rows[i].on = acc < total * pct - 1; if (rows[i].on) acc += rows[i].area; }

      // 3. 依序放名字；一段放不下下一个名字时，往后找几个短一点的先放
      const meas = document.createElement('canvas').getContext('2d');
      meas.font = `700 ${fs}px "Noto Sans SC", sans-serif`;
      const gap = fs * 0.75;
      const order = people.slice();
      const width = (p) => meas.measureText(p.short).width + gap;
      let k = 0, html = '';
      const onRows = rows.filter((r) => r.on);
      onRows.forEach((row, ri) => {
        const fromBottom = onRows.length - 1 - ri;
        row.runs.forEach((run) => {
          let used = 0, spans = '';
          for (;;) {
            let j = -1;
            for (let t = 0; t < Math.min(10, order.length); t++) {
              const idx = (k + t) % order.length;
              if (used + width(order[idx]) - gap <= run.w) { j = idx; break; }
            }
            if (j < 0) break;
            const cur = k % order.length;
            [order[cur], order[j]] = [order[j], order[cur]];
            const p = order[cur];
            k++;
            used += width(p);
            const delay = o.mode === 'fall'
              ? fromBottom * 70 + Math.random() * 500
              : Math.random() * 1400;
            const from = o.mode === 'fall'
              ? `--x:${(Math.random() - 0.5) * 60}px;--y:${-(row.y + 120 + Math.random() * 200)}px;--r:${(Math.random() - 0.5) * 50}deg`
              : `--x:${(Math.random() - 0.5) * W * 0.9}px;--y:${(Math.random() - 0.5) * H * 1.6}px;--r:${(Math.random() - 0.5) * 30}deg`;
            spans += `<span data-t="${LGM.esc(p.term)}" title="${LGM.esc(p.name + (p.term ? ' · ' + LGM.termName(p.term) : ''))}" style="--d:${Math.round(delay)}ms;${from}">${LGM.esc(p.short)}</span>`;
          }
          if (spans) html += `<div style="left:${run.x0}px;top:${row.y}px;height:${line}px;font-size:${fs}px;line-height:${line}px">${spans}</div>`;
        });
      });
      // 水位线（只填一部分时）
      const firstOn = onRows[0];
      const level = pct < 1 && firstOn ? `<div class="na-level" style="top:${firstOn.y}px"></div>` : '';
      return { H, html: html + level, count: k, svg: shape.svg || '' };
    }

    // 进场：滑到才播一次
    if (!reduce && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver((es) => {
        if (!es.some((e) => e.isIntersecting)) return;
        seen = true; io.disconnect();
        box.classList.add('in');
        setTimeout(() => box.classList.add('done'), o.mode === 'fall' ? 4200 : 2600);
      }, { threshold: 0.3 });
      io.observe(box);
    } else { seen = true; }

    // 滑过一个名字：同一届的人一起亮
    box.addEventListener('mouseover', (e) => {
      const sp = e.target.closest('.na-names:not(.na-spot) span');
      box.querySelectorAll('span.lit').forEach((x) => x.classList.remove('lit'));
      box.classList.toggle('focus', !!sp && !!sp.dataset.t);
      if (sp && sp.dataset.t) box.querySelectorAll(`.na-names:not(.na-spot) span[data-t="${CSS.escape(sp.dataset.t)}"]`).forEach((x) => x.classList.add('lit'));
    });
    box.addEventListener('mouseleave', () => { box.classList.remove('focus'); box.querySelectorAll('span.lit').forEach((x) => x.classList.remove('lit')); });

    function search(q) {
      q = (q || '').trim().toLowerCase();
      box.classList.toggle('searching', !!q);
      box.querySelectorAll('.na-names:not(.na-spot) span').forEach((sp) => sp.classList.toggle('hit', !!q && sp.title.toLowerCase().includes(q)));
    }

    let rt;
    addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => draw(), 200); });
    return { draw, search };
  };

  /* ---------- 形状 ---------- */
  const font = (px) => `400 ${px}px "Archivo Black", Impact, sans-serif`;
  const LINE = 'rgba(244,236,220,.22)';

  // 文字（例：LGM）
  LGM.shapeText = (text) => (W) => {
    const c = document.createElement('canvas').getContext('2d');
    c.font = font(100);
    const m1 = c.measureText(text);
    const size = 100 * (W * 0.98) / (m1.actualBoundingBoxRight + m1.actualBoundingBoxLeft);
    c.font = font(size);
    const m = c.measureText(text);
    const H = Math.ceil(m.actualBoundingBoxAscent + m.actualBoundingBoxDescent) + 6;
    const x = m.actualBoundingBoxLeft + (W - m.actualBoundingBoxRight - m.actualBoundingBoxLeft) / 2, y = m.actualBoundingBoxAscent + 3;
    return {
      H,
      paint: (ctx) => { ctx.font = font(size); ctx.fillText(text, x, y); },
      svg: `<svg width="${W}" height="${H}" aria-hidden="true"><text x="${x}" y="${y}" font-family="Archivo Black, Impact, sans-serif" font-size="${size}" fill="none" stroke="${LINE}" stroke-width="1.2">${LGM.esc(text)}</text></svg>`
    };
  };

  // ∞（双纽线做成粗带子）
  LGM.shapeInfinity = (W) => {
    const T = W * 0.15, a = (W - T) / 2 * 0.985;
    const H = Math.ceil(a * 0.7072 + T + 8), cx = W / 2, cy = H / 2;
    const pts = [];
    for (let i = 0; i <= 240; i++) {
      const t = (i / 240) * Math.PI * 2, s = Math.sin(t), d = 1 + s * s;
      pts.push([cx + a * Math.cos(t) / d, cy + a * s * Math.cos(t) / d]);
    }
    const dpath = 'M' + pts.map((p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L') + 'Z';
    return {
      H,
      paint: (ctx) => { ctx.lineWidth = T; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(new Path2D(dpath)); },
      svg: `<svg width="${W}" height="${H}" aria-hidden="true">
        <path d="${dpath}" fill="none" stroke="${LINE}" stroke-width="${T + 2}" stroke-linejoin="round"/>
        <path d="${dpath}" fill="none" stroke="var(--stage)" stroke-width="${T - 1.5}" stroke-linejoin="round"/></svg>`
    };
  };
})();
