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
    const nav = [['events', 'events.html'], ['music', 'music.html'], ['history', 'history.html'], ['about', 'about.html']];
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
    // 手机底部导览列（像 App 一样，720px 以下才出现）
    const ICON = {
      events: '<path d="M4 6h16v14H4zM4 10h16M9 3v5M15 3v5"/>',
      music: '<circle cx="7" cy="17" r="3"/><circle cx="17" cy="15" r="3"/><path d="M10 17V6l10-2v11"/>',
      history: '<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>',
      about: '<path d="M12 21c0-6 0-9 0-12M12 9c-3-4-7-3-8-1 3 0 6 1 8 1zM12 13c3-4 7-3 8-1-3 0-6 1-8 1z"/>',
      partners: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>'
    };
    const tabs = [...nav, ['partners', 'partners.html']];
    let tb = document.getElementById('tabbar');
    if (!tb) { tb = document.createElement('nav'); tb.id = 'tabbar'; tb.className = 'tabbar'; tb.setAttribute('aria-label', 'Tab'); document.body.appendChild(tb); }
    tb.innerHTML = tabs.map(([k, href]) => `<a href="${href}" class="${active === k ? 'on' : ''}${k === 'partners' ? ' hot' : ''}">
        <svg viewBox="0 0 24 24" aria-hidden="true">${ICON[k]}</svg><span data-i18n="nav.${k}"></span></a>`).join('');
    document.body.classList.add('has-tabbar');

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

  /* 跑马灯固定速度：内容越长跑越久，不会越多越快（px/s） */
  LGM.marquee = function (track, speed) {
    requestAnimationFrame(() => {
      const half = track.scrollWidth / 2;
      if (half) track.style.animationDuration = (half / (speed || 45)).toFixed(1) + 's';
    });
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
    const side = 'AB'[i % 2];
    return `<div class="sleeve cassette" style="--bg:${P[0]};--fg:${P[1]}">
      <div class="cover">
        <div class="cs-label"><span class="cs-side mono">${side}</span>
          <div class="t brush${String(r['歌名']).length > 8 ? ' long' : ''}">${LGM.esc(r['歌名'])}</div><div class="s">${sub}</div></div>
        <div class="cs-window" aria-hidden="true"><span class="reel"></span><span class="cs-tape"></span><span class="reel"></span></div>
        <div class="cs-foot mono"><span>LGM-C60</span>${id ? `<button type="button" class="listen" data-id="${id}" data-from="${from}" data-len="${len}" aria-label="${LGM.t('mu.listen')}：${LGM.esc(r['歌名'])}">
          <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>${LGM.f('mu.listenSec', { n: len })}</button>` : `<span>${LGM.esc(r['年份'] || '')}</span>`}</div>
      </div>
      ${award ? `<div class="award">${LGM.esc(award)}</div>` : ''}
      ${id ? `<a class="full" href="https://www.youtube.com/watch?v=${id}" target="_blank" rel="noopener">${LGM.t('mu.full')}</a>` : ''}
      ${credits ? `<div class="credits">${credits}</div>` : ''}
    </div>`;
  };
  // 同一时间只播一首：按下另一首，前一首自动停
  let playing = null;
  function stopClip() {
    if (!playing) return;
    playing.cover.innerHTML = playing.html; playing.card.classList.remove('is-playing');
    clearInterval(playing.tick); playing.card.querySelector('.deck')?.remove(); playing = null;
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
    // 卡带走带：两个转轮 + 计数器
    const len = to - from, mmss = (t) => String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0');
    cover.insertAdjacentHTML('afterend', `<div class="deck mono" aria-hidden="true"><span class="reel spin"></span><span class="deck-t">00:00 / ${mmss(len)}</span><span class="reel spin"></span></div>`);
    let t = 0;
    const tEl = card.querySelector('.deck-t');
    playing.tick = setInterval(() => { t = Math.min(len, t + 1); tEl.textContent = `${mmss(t)} / ${mmss(len)}`; if (t >= len) clearInterval(playing && playing.tick); }, 1000);
  });
  LGM.onLangStop = stopClip;

  /* 音乐会门票：主体 + 撕线 + 存根（条码）。o = { kicker, title, sub, when(Date字符串), venue, price, status, n } */
  LGM.ticket = (o) => {
    const dt = o.when ? new Date(String(o.when).trim().replace(' ', 'T')) : null;
    const ok = dt && !isNaN(dt);
    const pad = (x) => String(x).padStart(2, '0');
    const date = ok ? `${dt.getFullYear()}.${pad(dt.getMonth() + 1)}.${pad(dt.getDate())}` : '';
    const wk = ok ? (LGM.lang === 'zh' ? '（' + '日一二三四五六'[dt.getDay()] + '）' : ' ' + ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][dt.getDay()]) : '';
    const time = ok && (dt.getHours() || dt.getMinutes()) ? `${pad(dt.getHours())}:${pad(dt.getMinutes())}` : '';
    const serial = `LGM-${o.n || '00'}-${ok ? pad(dt.getMonth() + 1) + pad(dt.getDate()) : 'TBA'}`;
    // 条码：用编号算出固定的粗细，每次都一样
    let h = 7, bars = '', x = 0;
    for (let i = 0; i < 34; i++) {
      h = (h * 31 + serial.charCodeAt(i % serial.length) + i) % 997;
      const w = 1 + (h % 3), gap = 1 + ((h >> 2) % 2);
      bars += `<rect x="${x}" y="0" width="${w}" height="54"/>`; x += w + gap;
    }
    const rows = [['tk.date', date + wk], ['tk.time', time], ['tk.venue', o.venue], ['tk.price', o.price]].filter(([, v]) => v);
    return `<div class="ticket">
      <div class="tk-body">
        <div class="tk-top mono"><span>ADMIT ONE · ${LGM.esc(o.kicker || '')}</span>${o.status ? `<span class="tk-status">${LGM.esc(o.status)}</span>` : ''}</div>
        <h1 class="tk-title"><span class="hl">《${LGM.esc(o.title)}》</span>${o.sub ? `<div class="display sub-en">${LGM.esc(o.sub)}</div>` : ''}</h1>
        <dl class="tk-rows">${rows.map(([k, v]) => `<div><dt class="mono">${LGM.t(k)}</dt><dd>${LGM.esc(v)}</dd></div>`).join('')}</dl>
        <div class="countdown" id="cd"></div>
      </div>
      <div class="tk-stub">
        <div class="mono tk-no">No.</div><div class="tk-n">${LGM.esc(o.n || '')}</div>
        <div class="mono tk-serial">${serial}</div>
        <svg class="tk-bar" viewBox="0 0 ${x} 54" preserveAspectRatio="none" aria-hidden="true">${bars}</svg>
      </div>
    </div>`;
  };

  LGM.stamp = (text, center, fill) => `
    <svg viewBox="0 0 200 200" role="img" aria-label="${LGM.esc(text)}">
      <circle cx="100" cy="100" r="96" fill="${fill || '#FF4D8D'}" stroke="#111" stroke-width="4"/>
      <defs><path id="ring" d="M100,100 m-70,0 a70,70 0 1,1 140,0 a70,70 0 1,1 -140,0"/></defs>
      <text font-family="Archivo Black" font-size="19" fill="#111" ><textPath href="#ring" textLength="436" lengthAdjust="spacingAndGlyphs">${LGM.esc(text)}</textPath></text>
      <text x="100" y="114" text-anchor="middle" font-family="Archivo Black" font-size="40" fill="#111">${LGM.esc(center)}</text>
    </svg>`;
})();
