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
      try { await document.fonts.load('700 100px "Space Grotesk"'); } catch (e) { /* 后备字体 */ }
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
  const font = (px) => `700 ${px}px "Space Grotesk", Impact, sans-serif`;
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
      svg: `<svg width="${W}" height="${H}" aria-hidden="true"><text x="${x}" y="${y}" font-family="Space Grotesk, Impact, sans-serif" font-weight="700" font-size="${size}" fill="none" stroke="${LINE}" stroke-width="1.2">${LGM.esc(text)}</text></svg>`
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

/* 乐捐 ∞ 区块：赞助页、届档案页共用
   LGM.donorBlock(el, d, { term, cta }) —— term 默认本届；本届用 settings 的 donation_progress 决定填多少，往届一律填满 */
(function () {
  const anon = (n) => !n || /^(匿名|anonymous)$/i.test(String(n).trim());
  LGM.donorBlock = function (el, d, opt) {
    const s = d.settings, cur = String(s.current_term || '');
    const term = String((opt && opt.term) || cur);
    const rows = LGM.live(d.donors).filter((r) => String(r['届数'] || '') === term && (r['名字'] || r['届数']));
    const isCur = term === cur;
    const raw = isCur ? String(s.donation_progress || '').replace('%', '').trim() : '';
    const pct = raw === '' ? 1 : Math.max(0, Math.min(100, parseFloat(raw) || 0)) / 100;
    const cta = opt && opt.cta;
    if (!rows.length && !cta) { el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    const tRow = (d.terms || []).find((r) => String(r['届数']) === term) || {};
    const title = LGM.pick(tRow, '主题') || (isCur ? LGM.setting(d, 'concert_title') : '');
    const people = rows.map((r) => { const n = anon(r['名字']) ? LGM.t('ab.anon') : String(r['名字']).trim(); return { name: n, short: n, term: '' }; });
    const waNum = String(s.sponsor_whatsapp || '').replace(/\D/g, '');
    const waMsg = LGM.setting(d, 'donation_wa_message');
    const donation = LGM.setting(d, 'donation');
    el.innerHTML = `<div class="wrap">
      <div class="stage-kicker">${LGM.esc(LGM.f('ab.donorKicker', { n: term }) + (title ? ' · ' + title : ''))}</div>
      <h2 class="stage-title">${LGM.t(cta ? 'p.donate' : 'ab.donors')}</h2>
      <div class="donor-head">
        <p class="stage-sub">${LGM.esc(cta && donation ? donation : LGM.t(pct < 1 ? 'ab.donorsSubOpen' : 'ab.donorsSub'))}</p>
        ${raw !== '' ? `<div class="donor-pct"><b>${Math.round(pct * 100)}%</b><span>${LGM.t(pct < 1 ? 'ab.raised' : 'ab.raisedDone')}</span></div>` : ''}
      </div>
      ${cta ? `<div class="donor-cta">
        ${waNum ? `<a class="btn yellow" style="--r:-2deg" href="https://wa.me/${waNum}?text=${encodeURIComponent(waMsg)}" target="_blank" rel="noopener">${LGM.t('p.donateBtn')}</a>` : ''}
        ${s.donation_qr ? `<div class="qr">${LGM.imgTag(s.donation_qr, 'QR', '')}</div>` : ''}</div>` : ''}
      ${people.length ? `<div class="na" role="img" aria-label="${LGM.esc(LGM.t('ab.donors'))}"></div>
        <details class="stage-list"><summary>${LGM.t('ab.allDonors')} (${people.length})</summary><p>${people.map((p) => LGM.esc(p.name)).join('、')}</p></details>` : ''}
    </div>`;
    if (people.length) LGM.nameArt(el.querySelector('.na'), { people, shape: LGM.shapeInfinity, pct, mode: 'fall', minW: 760 }).draw(true);
  };

  /* 首页小横幅：筹款中才出现 */
  LGM.fundBar = function (el, d) {
    const s = d.settings;
    const raw = String(s.donation_progress || '').replace('%', '').trim();
    const pct = Math.max(0, Math.min(100, parseFloat(raw) || 0));
    if (raw === '' || pct >= 100) { el.innerHTML = ''; return; }
    const title = LGM.setting(d, 'concert_title');
    el.innerHTML = `<a class="fund-bar wrap" href="partners.html#donate">
      <span class="fb-inf" aria-hidden="true">∞</span>
      <span class="fb-text"><b>${LGM.esc(LGM.f('fund.title', { n: s.current_term || '' }) + (title ? '《' + title + '》' : ''))}</b>${LGM.esc(LGM.f('fund.body', { p: Math.round(pct) }))}</span>
      <span class="fb-meter" aria-hidden="true"><i style="width:${pct}%"></i></span>
      <span class="fb-go">${LGM.t('fund.go')}</span></a>`;
  };
})();

/* 历届小草：每个名字是一株草，按届数从左（最早）长到右（最新），会随风摇、滑鼠经过会被「吹开」
   LGM.grassField(box, people, { onFocus(term, count) }) → { draw, search } */
(function () {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rnd = (a, b) => a + Math.random() * (b - a);

  LGM.grassField = function (box, people, opt) {
    opt = opt || {};
    let blades = [], lastW = 0;
    const scroller = box.parentElement;
    const list = people.slice().sort((a, b) => (+a.term || 0) - (+b.term || 0));

    function draw(force) {
      const BW = scroller.clientWidth;
      if (!BW || (BW === lastW && !force)) return;
      lastW = BW;
      const n = list.length, mobile = BW < 640;
      const H = mobile ? 300 : 380;
      const step = mobile ? 9 : 8;                         // 每株草平均占的宽度
      const W = Math.max(BW, n * step + 80);
      const span = Math.min(W - 80, Math.max(n * 46, 0));  // 人少时集中在中间，不要散得太开
      const left = (W - span) / 2;
      const fs = mobile ? [9, 11, 13] : [10, 12, 15];
      let html = '', axis = '', lastTerm = null;
      blades = [];
      list.forEach((p, i) => {
        const x = left + (n === 1 ? span / 2 : (i / (n - 1 || 1)) * span) + rnd(-3, 3);
        const L = Math.random() < 0.3 ? 0 : Math.random() < 0.55 ? 1 : 2;   // 0 = 远、1 = 中、2 = 近
        const bottom = [70, 40, 10][L] + rnd(0, 18);
        const stem = rnd(H * 0.08, H * (L === 2 ? 0.5 : L === 1 ? 0.38 : 0.28));
        blades.push(x);
        html += `<span class="blade l${L}" data-t="${LGM.esc(p.term)}" title="${LGM.esc(p.name + (p.term ? ' · ' + LGM.termName(p.term) : ''))}"
          style="left:${x.toFixed(0)}px;bottom:${bottom.toFixed(0)}px;--g:${(rnd(0, 1600) + i * 0.4).toFixed(0)}ms">
          <span class="sway" style="--sw:${rnd(3.2, 6.5).toFixed(2)}s;--sd:-${rnd(0, 6).toFixed(2)}s;--amp:${rnd(2, L === 2 ? 6 : 4).toFixed(1)}deg">
            <em style="font-size:${fs[L]}px">${LGM.esc(p.short)}</em><i style="height:${stem.toFixed(0)}px"></i></span></span>`;
        if (p.term && p.term !== lastTerm) { axis += `<span class="gf-tick" style="left:${x.toFixed(0)}px">${LGM.esc(p.term)}</span>`; lastTerm = p.term; }
      });
      let flies = '';
      for (let i = 0; i < (mobile ? 10 : 18); i++) flies += `<b class="fly" style="left:${rnd(0, W).toFixed(0)}px;bottom:${rnd(40, H - 40).toFixed(0)}px;--fd:${rnd(5, 11).toFixed(1)}s;--fx:${rnd(-60, 60).toFixed(0)}px;--fy:${rnd(-50, 30).toFixed(0)}px;animation-delay:-${rnd(0, 10).toFixed(1)}s"></b>`;
      box.style.width = W + 'px';
      box.style.height = H + 'px';
      box.innerHTML = flies + html + `<div class="gf-axis">${axis}</div>`;
      if (reduce || seen) box.classList.add('in', 'done');
      // 人多到要横向滑：先滑到最右边（最新一届）
      if (W > BW) scroller.scrollLeft = W;
    }

    let seen = false;
    if (!reduce && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver((es) => {
        if (!es.some((e) => e.isIntersecting)) return;
        seen = true; io.disconnect();
        box.classList.add('in');
        setTimeout(() => box.classList.add('done'), 2600);
      }, { threshold: 0.25 });
      io.observe(box);
    } else seen = true;

    // 滑鼠像风：附近的草往反方向倒
    let raf = 0, mx = null;
    box.addEventListener('pointermove', (e) => {
      const r = box.getBoundingClientRect();
      mx = e.clientX - r.left;
      if (!raf) raf = requestAnimationFrame(wind);
    });
    box.addEventListener('pointerleave', () => { mx = null; if (!raf) raf = requestAnimationFrame(wind); });
    function wind() {
      raf = 0;
      box.querySelectorAll('.blade').forEach((el, i) => {
        const dx = mx == null ? 999 : blades[i] - mx;
        const push = Math.abs(dx) < 110 ? Math.sign(dx) * (1 - Math.abs(dx) / 110) * 16 : 0;
        el.style.setProperty('--push', push.toFixed(1) + 'deg');
      });
    }

    // 滑过一株草：同一届一起亮
    box.addEventListener('mouseover', (e) => {
      const b = e.target.closest('.blade');
      box.querySelectorAll('.blade.lit').forEach((x) => x.classList.remove('lit'));
      box.classList.toggle('focus', !!(b && b.dataset.t));
      if (b && b.dataset.t) {
        const same = box.querySelectorAll(`.blade[data-t="${CSS.escape(b.dataset.t)}"]`);
        same.forEach((x) => x.classList.add('lit'));
        opt.onFocus && opt.onFocus(b.dataset.t, same.length, b.title.split(' · ')[0]);
      }
    });
    box.addEventListener('mouseleave', () => { box.classList.remove('focus'); box.querySelectorAll('.blade.lit').forEach((x) => x.classList.remove('lit')); opt.onFocus && opt.onFocus(null); });

    function search(q) {
      q = (q || '').trim().toLowerCase();
      box.classList.toggle('searching', !!q);
      let first = null;
      box.querySelectorAll('.blade').forEach((b) => {
        const hit = !!q && b.title.toLowerCase().includes(q);
        b.classList.toggle('hit', hit);
        if (hit && !first) first = b;
      });
      if (first) scroller.scrollTo({ left: first.offsetLeft - scroller.clientWidth / 2, behavior: 'smooth' });
      return box.querySelectorAll('.blade.hit').length;
    }

    let rt;
    addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => draw(), 200); });
    return { draw, search };
  };
})();
