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
    // 支援 drive.google.com/file/d/ID、open?id=ID、uc?id=ID，以及表单上传的连结；=w1600 让大图自动缩小
    const m = path.match(/drive\.google\.com\/(?:file\/d\/|(?:open|uc|thumbnail)\?(?:[^#]*&)?id=)([\w-]{20,})/);
    if (m) return `https://lh3.googleusercontent.com/d/${m[1]}=w1600`;
    return /^https?:\/\//.test(path) ? path : 'assets/img/' + path.replace(/^\/+/, '');
  };
  LGM.imgTag = (path, alt, cls, eager) => path
    ? `<img class="${cls || ''}" src="${LGM.esc(LGM.img(path))}" alt="${LGM.esc(alt)}" loading="${eager ? 'eager' : 'lazy'}" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'ph ${cls || ''}',textContent:'${LGM.esc(alt)}'}))">`
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
    if (LGM.onLangStop) LGM.onLangStop();
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
      const dec = (String(el.dataset.count).split('.')[1] || '').length;
      const t0 = performance.now(), dur = 1400, suf = el.dataset.suffix || '';
      const step = (t) => {
        const p = Math.min(1, (t - t0) / dur), v = end * (1 - Math.pow(1 - p, 3));
        el.textContent = v.toLocaleString('en', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suf;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } }), { threshold: .4 });
    els.forEach((el) => io.observe(el));
  };


  /* ---------- 6. 共用小元件 ---------- */
  // 档案、PDF 等：http 连结直接用，否则当作网站里的相对路径
  LGM.file = (p) => !p ? '' : /^https?:\/\//.test(p) ? p : p.replace(/^\/+/, '');
  LGM.split = (v) => String(v || '').split('|').map((x) => x.trim()).filter(Boolean);
  LGM.byOrder = (a, b) => (+a['顺序'] || 0) - (+b['顺序'] || 0);
  // stats 分页：「显示在」栏写了 首页 / 赞助
  LGM.stats = (d, where) => LGM.live(d.stats)
    .filter((r) => r['数字'] !== '' && (!r['显示在'] || r['显示在'].includes(where))).sort(LGM.byOrder);
  LGM.statHTML = (rows) => rows.map((r, i) => `
    <div class="stat"><b class="${i % 2 ? 'blue' : ''}" data-count="${LGM.esc(r['数字'])}" data-suffix="${LGM.esc(r['后缀'])}">${LGM.esc(r['数字'])}${LGM.esc(r['后缀'])}</b>
    <span>${LGM.esc(LGM.pick(r, '名称'))}</span></div>`).join('');
  LGM.TYPES = {
    '年度音乐会': ['Annual Concert', 'var(--blue)'], '造势活动': ['Hype-up Event', 'var(--pink)'], '迎新夜': ['Welcome Night', 'var(--blue)'],
    'Bonding Day': ['Bonding Day', 'var(--ink)'], '座谈会': ['Talk', 'var(--blue)'], 'Symposium': ['Symposium', 'var(--blue)'],
    'Mini Concert': ['Mini Concert', 'var(--blue)'], '歌唱比赛': ['Singing Competition', 'var(--pink)'],
    'Christmas Party': ['Christmas Party', 'var(--pink)'], '外校演出': ['External Show', 'var(--ink)'], '其他': ['Other', 'var(--ink)']
  };
  LGM.typeLabel = (t) => (LGM.lang === 'en' && LGM.TYPES[t]) ? LGM.TYPES[t][0] : t;
  LGM.typeColor = (t) => (LGM.TYPES[t] || [0, 'var(--ink)'])[1];
  LGM.termName = (n, yr) => LGM.lang === 'en' ? `No.${n}${yr ? ` (${yr})` : ''}` : `第 ${n} 届${yr ? `（${yr}）` : ''}`;
  // 活动排序：届数新的在前；同一届有日期的照日期新到旧，没日期的照 Sheet 顺序
  LGM.sortEvents = (rows) => rows.map((r, i) => [r, i]).sort(([a, i], [b, j]) =>
    (+b['届数'] || 0) - (+a['届数'] || 0) || String(b['日期'] || '').localeCompare(String(a['日期'] || '')) || i - j).map(([r]) => r);
  LGM.eventCard = (r, opts) => {
    const name = LGM.pick(r, '名称'), href = r['连结'], ext = /^https?:/.test(href || '');
    const tag = href ? 'a' : 'div', attrs = href ? `href="${LGM.esc(href)}" ${ext ? 'target="_blank" rel="noopener"' : ''}` : '';
    const desc = (opts && opts.desc) ? LGM.pick(r, '简介') : '';
    const meta = [r['日期'], r['地点']].filter(Boolean).map(LGM.esc).join(' · ');
    return `<${tag} class="card event" ${attrs}>
      ${LGM.imgTag(r['封面'], name, 'cover')}
      <div class="tag" style="color:${LGM.typeColor(r['类型'])}">${LGM.esc(LGM.typeLabel(r['类型']))}</div>
      <h3>${LGM.esc(name)}</h3>
      ${desc ? `<p class="ev-desc">${LGM.esc(desc)}</p>` : ''}
      ${meta ? `<div class="muted" style="font-size:14px">${meta}</div>` : ''}
      ${href ? `<div style="font-weight:900;margin-top:6px;color:var(--blue)">${LGM.t('ev.more')}</div>` : ''}
    </${tag}>`;
  };
  LGM.yt = (url) => {
    const src = LGM.ytEmbed(url);
    return src ? `<div class="video"><iframe src="${src}" title="YouTube" allow="encrypted-media; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>` : '';
  };
  // 日期显示：2027-05-02 19:30 → 2027 年 5 月 2 日（日）19:30 / Sun, 2 May 2027, 7:30 PM
  LGM.dateLong = (s) => {
    const m = String(s || '').match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2}))?/); if (!m) return LGM.month(s);
    const dt = new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0));
    if (LGM.lang === 'en') return dt.toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric', ...(m[4] ? { hour: 'numeric', minute: '2-digit', hour12: true } : {}) });
    return `${m[1]} 年 ${+m[2]} 月 ${+m[3]} 日（${'日一二三四五六'[dt.getDay()]}）${m[4] ? ` ${m[4]}:${m[5]}` : ''}`;
  };


  // 倒数计时：回传 interval，换语言重画时先 clearInterval
  LGM.countdown = (box, when) => {
    const target = when ? new Date(String(when).replace(' ', 'T') + (String(when).length <= 10 ? 'T00:00' : '') + ':00+08:00') : null;
    if (!box) return null;
    if (!target || isNaN(target) || target < Date.now()) { box.remove(); return null; }
    const tick = () => {
      let ms = Math.max(0, target - Date.now());
      box.innerHTML = [['d', 864e5], ['h', 36e5], ['m', 6e4], ['s', 1e3]].map(([k, u]) => {
        const v = Math.floor(ms / u); ms -= v * u;
        return `<div><b>${String(v).padStart(2, '0')}</b>${LGM.t('cd.' + k)}</div>`;
      }).join('');
    };
    tick(); return setInterval(tick, 1000);
  };


  // 歌曲唱片封套卡：颜色轮流，得奖盖印章，词曲有填才显示
  // 歌曲唱片封套卡：颜色轮流，得奖盖印章，词曲有填才显示
  // 有 YouTube 的歌：按「试听」在封套里直接播一小段（Sheet：试听开始 = 从第几秒开始，试听秒数 = 播多久）
  LGM.ytId = (url) => (String(url || '').match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/) || [])[1] || '';
  LGM.songCard = (r, i) => {
    const P = [['var(--blue)', '#fff'], ['#fff', 'var(--ink)'], ['var(--pink)', 'var(--ink)'], ['var(--ink)', 'var(--paper)']][i % 4];
    const award = LGM.pick(r, '获奖');
    const credits = [['mu.lyric', '作词'], ['mu.comp', '作曲'], ['mu.arr', '编曲']].filter(([, k]) => r[k]).map(([t, k]) => `${LGM.t(t)} ${LGM.esc(r[k])}`).join(' · ');
    const sub = [LGM.lang === 'en' ? (r['英文名'] || r['拼音']) : r['拼音'], r['年份']].filter(Boolean).map(LGM.esc).join(' · ');
    const id = LGM.ytId(r['youtube']);
    const from = Math.max(0, parseInt(r['试听开始'], 10) || 60);
    const len = Math.min(90, parseInt(r['试听秒数'], 10) || 30);
    return `<div class="sleeve" style="--bg:${P[0]};--fg:${P[1]}">
      <div class="cover"><div class="t brush${String(r['歌名']).length > 10 ? ' long' : ''}">${LGM.esc(r['歌名'])}</div><div class="s">${sub}</div>
        ${id ? `<button type="button" class="listen" data-id="${id}" data-from="${from}" data-len="${len}" aria-label="${LGM.t('mu.listen')}：${LGM.esc(r['歌名'])}">
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>${LGM.f('mu.listenSec', { n: len })}</button>` : ''}</div>
      ${award ? `<div class="award">${LGM.esc(award)}</div>` : ''}
      ${id ? `<a class="full" href="https://www.youtube.com/watch?v=${id}" target="_blank" rel="noopener">${LGM.t('mu.full')}</a>` : ''}
      ${credits ? `<div class="credits">${credits}</div>` : ''}
    </div>`;
  };
  // 同一时间只播一首：按下另一首，前一首自动停
  let playing = null;
  function stopClip() {
    if (!playing) return;
    playing.cover.innerHTML = playing.html; playing.card.classList.remove('is-playing'); playing = null;
  }
  document.addEventListener('click', (e) => {
    const stop = e.target.closest('.clip-stop');
    if (stop) { stopClip(); return; }
    const b = e.target.closest('.listen'); if (!b) return;
    stopClip();
    const card = b.closest('.sleeve'), cover = card.querySelector('.cover');
    const from = +b.dataset.from, to = from + (+b.dataset.len);
    playing = { card, cover, html: cover.innerHTML };
    card.classList.add('is-playing');
    cover.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${b.dataset.id}?start=${from}&end=${to}&autoplay=1&rel=0&modestbranding=1&playsinline=1"
        title="${LGM.esc(b.getAttribute('aria-label'))}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>
      <div class="clip-bar" style="animation-duration:${to - from}s;animation-delay:1.5s"></div>
      <button type="button" class="clip-stop" aria-label="${LGM.t('mu.stop')}">■ ${LGM.t('mu.stop')}</button>`;
  });
  LGM.onLangStop = stopClip;

  LGM.stamp = (text, center, fill) => `
    <svg viewBox="0 0 200 200" role="img" aria-label="${LGM.esc(text)}">
      <circle cx="100" cy="100" r="96" fill="${fill || '#FF4D8D'}" stroke="#111" stroke-width="4"/>
      <defs><path id="ring" d="M100,100 m-70,0 a70,70 0 1,1 140,0 a70,70 0 1,1 -140,0"/></defs>
      <text font-family="Archivo Black" font-size="19" fill="#111" ><textPath href="#ring" textLength="436" lengthAdjust="spacingAndGlyphs">${LGM.esc(text)}</textPath></text>
      <text x="100" y="114" text-anchor="middle" font-family="Archivo Black" font-size="40" fill="#111">${LGM.esc(center)}</text>
    </svg>`;
})();
