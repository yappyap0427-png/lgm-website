/* 小草颂 LGM 网站核心：读资料、双语、共用页首页尾。
   各页面自己的逻辑在 home.js / partners.js。 */
(function () {
  const LGM = window.LGM = window.LGM || {};
  const CFG = window.LGM_CONFIG;

  /* ---------- 1. 读资料 ---------- */
  function parseCSV(text) {
    const rows = []; let row = [], cell = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
        else cell += c;
      } else if (c === '"') q = true;
      else if (c === ',') { row.push(cell); cell = ''; }
      else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
      else if (c !== '\r') cell += c;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    return rows;
  }
  // 栏位名去掉括号里的说明：「内容_zh（每项用 | 分隔）」→「内容_zh」
  const cleanKey = (k) => k.split(/[（(]/)[0].trim();
  function toObjects(rows) {
    if (!rows.length) return [];
    const keys = rows[0].map(cleanKey);
    return rows.slice(1)
      .filter((r) => r.some((v) => String(v).trim() !== ''))
      .map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? '').trim()])));
  }
  function withTimeout(p, ms) {
    return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
  }
  async function fromSheet() {
    const url = (tab) => `https://docs.google.com/spreadsheets/d/${CFG.sheetId}/gviz/tq?tqx=out:csv&headers=1&sheet=${encodeURIComponent(tab)}`;
    const texts = await Promise.all(CFG.tabs.map((t) => fetch(url(t)).then((r) => { if (!r.ok) throw new Error(t); return r.text(); })));
    const data = {};
    CFG.tabs.forEach((t, i) => { data[t] = toObjects(parseCSV(texts[i])); });
    return data;
  }
  async function fromBackup() {
    const r = await fetch('data/data.json', { cache: 'no-cache' });
    return r.json();
  }
  function shape(raw) {
    const settings = {};
    (raw.settings || []).forEach((r) => { if (r.key) settings[r.key] = r.value; });
    return { ...raw, settings };
  }
  let cache = null;
  LGM.load = async function () {
    if (cache) return cache;
    let raw, source = 'sheet';
    try { raw = await withTimeout(fromSheet(), CFG.timeoutMs); }
    catch (e) { source = 'backup'; raw = await fromBackup(); }
    cache = shape(raw); cache.source = source;
    document.documentElement.dataset.source = source;
    return cache;
  };

  /* ---------- 2. 小工具 ---------- */
  LGM.on = (v) => String(v).trim().toUpperCase() === 'TRUE';
  LGM.live = (rows) => (rows || []).filter((r) => r['上架'] === undefined || LGM.on(r['上架']));
  LGM.esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // 取双语栏位：pick(row, '名称') → 英文模式且有填 名称_en 就用英文，否则中文
  LGM.pick = (row, base) => (LGM.lang === 'en' && row[base + '_en']) ? row[base + '_en'] : (row[base + '_zh'] ?? row[base] ?? '');
  LGM.setting = (d, base) => (LGM.lang === 'en' && d.settings[base + '_en']) ? d.settings[base + '_en'] : (d.settings[base + '_zh'] ?? d.settings[base] ?? '');
  // 图片：http 连结直接用（Drive 连结自动转换）；否则当成 assets/img/ 下的档名
  LGM.img = function (path) {
    if (!path) return '';
    const m = path.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([\w-]+)/);
    if (m) return `https://lh3.googleusercontent.com/d/${m[1]}`;
    return /^https?:\/\//.test(path) ? path : 'assets/img/' + path.replace(/^\/+/, '');
  };
  LGM.imgTag = (path, alt, cls) => path
    ? `<img class="${cls || ''}" src="${LGM.esc(LGM.img(path))}" alt="${LGM.esc(alt)}" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'ph ${cls || ''}',textContent:'${LGM.esc(alt)}'}))">`
    : `<div class="ph ${cls || ''}">${LGM.esc(alt)}</div>`;
  LGM.ytEmbed = function (url) {
    const m = String(url || '').match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/);
    return m ? `https://www.youtube-nocookie.com/embed/${m[1]}` : '';
  };
  LGM.wa = (num) => num ? `https://wa.me/${String(num).replace(/\D/g, '')}` : '';

  /* ---------- 3. 双语 ---------- */
  LGM.lang = (() => { try { return localStorage.getItem('lgm-lang') || 'zh'; } catch (e) { return 'zh'; } })();
  LGM.t = (key) => (LGM.STR[LGM.lang] && LGM.STR[LGM.lang][key]) ?? (LGM.STR.zh[key] ?? key);
  // 带变数的文字：LGM.f('hero.promo.kicker', {n: 27})
  LGM.f = (key, vars) => LGM.t(key).replace(/\{(\w+)\}/g, (m, k) => LGM.esc((vars || {})[k] ?? ''));
  // "2027-05" → 2027 年 5 月 / May 2027
  LGM.month = function (ym) {
    const m = String(ym || '').match(/^(\d{4})-(\d{1,2})/); if (!m) return ym || '';
    if (LGM.lang === 'en') return new Date(+m[1], +m[2] - 1, 1).toLocaleString('en', { month: 'long', year: 'numeric' });
    return `${m[1]} 年 ${+m[2]} 月`;
  };
  LGM.applyStatic = function (root) {
    (root || document).querySelectorAll('[data-i18n]').forEach((el) => { el.innerHTML = LGM.t(el.dataset.i18n); });
    document.documentElement.lang = LGM.lang === 'en' ? 'en' : 'zh-Hans';
  };
  const listeners = [];
  LGM.onLang = (fn) => listeners.push(fn);
  LGM.toggleLang = function () {
    LGM.lang = LGM.lang === 'zh' ? 'en' : 'zh';
    try { localStorage.setItem('lgm-lang', LGM.lang); } catch (e) {}
    LGM.applyStatic(); listeners.forEach((fn) => fn());
  };

  /* ---------- 4. 共用页首、页尾 ---------- */
  LGM.layout = function (active, d) {
    const nav = [['about', 'about.html'], ['events', 'events.html'], ['music', 'music.html']];
    const s = (d && d.settings) || {};
    document.getElementById('site-header').innerHTML = `
      <div class="wrap">
        <a class="brand" href="index.html"><img src="assets/img/logo.png" alt="小草颂 LGM logo"><span>小草颂</span></a>
        <nav class="nav" aria-label="主选单">
          ${nav.map(([k, href]) => `<a href="${href}" class="${active === k ? 'active' : ''}" data-i18n="nav.${k}"></a>`).join('')}
          <a href="partners.html" class="${active === 'partners' ? 'active' : 'cta'}" data-i18n="nav.partners"></a>
          <button class="lang" type="button" aria-label="切换语言 / Switch language">${LGM.lang === 'zh' ? 'EN' : '中'}</button>
        </nav>
      </div>`;
    document.getElementById('site-footer').innerHTML = `
      <div class="wrap">
        <span>小草颂 LGM · LGM！No Music, No Life!</span>
        <nav>
          ${s.facebook ? `<a href="${LGM.esc(s.facebook)}" target="_blank" rel="noopener">Facebook</a>` : ''}
          ${s.instagram ? `<a href="${LGM.esc(s.instagram)}" target="_blank" rel="noopener">Instagram</a>` : ''}
          ${s.youtube ? `<a href="${LGM.esc(s.youtube)}" target="_blank" rel="noopener">YouTube</a>` : ''}
          ${s.email ? `<a href="mailto:${LGM.esc(s.email)}">${LGM.esc(s.email)}</a>` : ''}
        </nav>
      </div>`;
    const btn = document.querySelector('.lang');
    btn.addEventListener('click', () => { LGM.toggleLang(); btn.textContent = LGM.lang === 'zh' ? 'EN' : '中'; });
    LGM.applyStatic();
  };

  /* ---------- 5. 数字滚动 ---------- */
  LGM.countUp = function (root) {
    const els = (root || document).querySelectorAll('[data-count]');
    const run = (el) => {
      const end = parseFloat(el.dataset.count); if (isNaN(end)) return;
      const t0 = performance.now(), dur = 1400, suf = el.dataset.suffix || '';
      const step = (t) => {
        const p = Math.min(1, (t - t0) / dur), v = Math.round(end * (1 - Math.pow(1 - p, 3)));
        el.textContent = v.toLocaleString() + suf; if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } }), { threshold: .4 });
    els.forEach((el) => io.observe(el));
  };

  LGM.stamp = (text, center, fill) => `
    <svg viewBox="0 0 200 200" role="img" aria-label="${LGM.esc(text)}">
      <circle cx="100" cy="100" r="96" fill="${fill || '#FF4D8D'}" stroke="#111" stroke-width="4"/>
      <defs><path id="ring" d="M100,100 m-70,0 a70,70 0 1,1 140,0 a70,70 0 1,1 -140,0"/></defs>
      <text font-family="Archivo Black" font-size="19" fill="#111" ><textPath href="#ring" textLength="436" lengthAdjust="spacingAndGlyphs">${LGM.esc(text)}</textPath></text>
      <text x="100" y="114" text-anchor="middle" font-family="Archivo Black" font-size="40" fill="#111">${LGM.esc(center)}</text>
    </svg>`;
})();
