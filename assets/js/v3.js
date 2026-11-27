/* 小草颂 LGM — v3 预览（照 Google Stitch 的设计）
   资料一样来自 Google Sheet（LGM.load），版面在这里。每一页用 <body data-page="..."> 决定画什么。 */
(async function () {
  const d = await LGM.load();
  const s = d.settings;
  const page = document.body.dataset.page;
  const L = (zh, en) => (LGM.lang === 'en' && en ? en : zh);
  const E = LGM.esc;
  const app = document.getElementById('app');
  const cur = String(s.current_term || '');
  const num = (v) => parseFloat(String(v).replace(/[^\d.]/g, '')) || 0;
  const waNum = String(s.sponsor_whatsapp || '').replace(/\D/g, '');
  const wa = (msg) => (waNum ? `https://wa.me/${waNum}?text=${encodeURIComponent(msg)}` : (s.sponsor_email ? `mailto:${s.sponsor_email}` : '#'));
  const pad = (x) => String(x).padStart(2, '0');
  let timers = [];

  /* ---------- 小工具 ---------- */
  // 条码：用编号算出固定的粗细
  const barcode = (serial, cls) => {
    let h = 7, bars = '', x = 0;
    for (let i = 0; i < 38; i++) {
      h = (h * 31 + String(serial).charCodeAt(i % String(serial).length) + i) % 997;
      const w = 1 + (h % 3), gap = 1 + ((h >> 2) % 2);
      bars += `<rect x="${x}" y="0" width="${w}" height="60"/>`; x += w + gap;
    }
    return `<svg class="bar ${cls || ''}" viewBox="0 0 ${x} 60" preserveAspectRatio="none" aria-hidden="true">${bars}</svg>`;
  };
  const parseDT = (v) => { let x = String(v || '').trim().replace(' ', 'T'); if (/^\d{4}-\d{2}-\d{2}$/.test(x)) x += 'T00:00'; const t = new Date(x); return isNaN(t) ? null : t; };
  const ymd = (t) => t ? `${t.getFullYear()}.${pad(t.getMonth() + 1)}.${pad(t.getDate())}` : '';
  const wk = (t) => t ? L('（' + '日一二三四五六'[t.getDay()] + '）', ' ' + ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][t.getDay()]) : '';
  const hm = (t) => t && (t.getHours() || t.getMinutes()) ? `${pad(t.getHours())}:${pad(t.getMinutes())}` : '';
  const ticker = (items, cls) => {
    const one = items.map((x) => `<span>${E(x)}</span>`).join('<span>★</span>');
    return `<div class="ticker ${cls}" aria-hidden="true"><div class="run">${one}<span>★</span>${one}<span>★</span>${one}<span>★</span>${one}<span>★</span></div></div>`;
  };
  const stat = (key) => LGM.live(d.stats).filter((r) => r['数字'] !== '' && String(r['显示在']).includes(key)).sort(LGM.byOrder);
  const statCells = (rows) => `<div class="cells">${rows.slice(0, 4).map((r, i) => `<div>
      <div class="k">${['TRACK RECORD', 'REACH', 'AUDIENCE', 'SIGNAL'][i]} // ${pad(i + 1)}</div>
      <b>${E(r['数字'])}<sup>${E(r['后缀'] || '')}</sup></b><span>${E(LGM.pick(r, '名称'))}</span></div>`).join('')}</div>`;
  const head = ({ issue, tag, title, zh, intro, side }) => `
    <div class="issue"><span>${E(issue)}</span><span>${E(L('马来西亚理科大学工程分院 · 槟城', 'USM ENGINEERING CAMPUS · PENANG'))}</span></div>
    <div class="head">
      <div>${tag ? `<span class="tag y">${E(tag)}</span>` : ''}<h1>${title}${zh ? `<span class="zh">${E(zh)}</span>` : ''}</h1></div>
      <div class="head-side">${intro ? `<p>${intro}</p>` : ''}${side || ''}</div>
    </div>`;

  /* ---------- 共用：跑马灯、顶栏、页尾、手机导览 ---------- */
  const NAV = [
    ['about', 'about.html', '关于我们', 'ABOUT'],
    ['events', 'events.html', '年度活动', 'EVENTS'],
    ['music', 'music.html', '音乐作品', 'MUSIC'],
    ['history', 'history.html', '历届筹委', 'HISTORY'],
    ['partners', 'partners.html', '赞助支持', 'SUPPORT']
  ];
  const ICON = {
    about: '<path d="M12 21V9M12 9c-3-4-7-3-8-1 3 0 6 1 8 1zM12 13c3-4 7-3 8-1-3 0-6 1-8 1z"/>',
    events: '<path d="M4 6h16v14H4zM4 10h16M9 3v5M15 3v5"/>',
    music: '<rect x="3" y="6" width="18" height="12" rx="1"/><circle cx="8" cy="12" r="2"/><circle cx="16" cy="12" r="2"/>',
    history: '<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>',
    partners: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>'
  };
  function chrome() {
    const title = LGM.setting(d, 'concert_title');
    document.getElementById('top').innerHTML =
      ticker(['LITTLEGRAS MUSIC CLUB INDIE ZINE', 'USM ENGINEERING CAMPUS', 'EST. 2000 原创音乐社团', 'NO MUSIC, NO LIFE!', '力量虽小，也朝音乐梦生长'], 'y')
      + `<header class="hdr"><div class="wrap">
          <a class="brand" href="index.html"><img src="${(window.LGM_BASE || '')}assets/img/logo.png" alt="小草颂 LGM logo">
            <span><b>LITTLEGRAS</b><small>小草颂 LGM ·<br>EST. 2000</small></span><span class="vinyl">VINYL<br>CLUB</span></a>
          <nav class="nav" aria-label="${E(L('主选单', 'Main menu'))}">${NAV.map(([k, h, zh, en]) => `<a href="${h}" class="${page === k ? 'on' : ''}" ${page === k ? 'aria-current="page"' : ''}>${LGM.lang === 'en' ? `${en[0] + en.slice(1).toLowerCase()}<small>${zh}</small>` : `${zh}<small>(${en})</small>`}</a>`).join('')}</nav>
          <button class="lang" type="button" aria-label="切换语言 / Switch language">${LGM.lang === 'en' ? '中文<br>/EN' : 'EN<br>/中文'}</button>
          <a class="join" href="${E(s.join_form_url || s.instagram || 'about.html')}" ${s.join_form_url || s.instagram ? 'target="_blank" rel="noopener"' : ''}>${LGM.lang === 'en' ? 'Join us<small>加入我们 [VIP]</small>' : '加入我们<small>JOIN US [VIP]</small>'}</a>
        </div></header>`
      + ticker([`${cur}TH ANNUAL CONCERT${title ? ' 《' + title + '》' : ''}`, L('招商进行中', 'SPONSORS WANTED'), 'USM ENGINEERING CAMPUS NIBONG TEBAL', `${s.audience_target || '500+'} LIVE CAPACITY`, L('原创音乐 · 自创歌曲', 'ORIGINAL MUSIC ONLY')], 'r');
    document.querySelector('.lang').addEventListener('click', () => LGM.toggleLang());
    document.getElementById('foot').innerHTML = `<footer class="ftr">
        <div class="ftr-strip"><span>PUNCH CARD / PASS CODE: #LGM-USM-2000-${new Date().getFullYear() + 1} / STATUS: INDIE UNDERGROUND LIVE</span><span>MADE WITH PASSION & NOISE ♥</span></div>
        <div class="wrap">
          <div class="ftr-main">
            <div><p><span class="chip">小草颂 LGM</span><b class="mono">EST. 2000 // USMKK</b></p>
              <p>${E(LGM.setting(d, 'about') || '').slice(0, 220)}</p>
              ${s.email ? `<p class="mono" style="font-size:12px">✉ <a href="mailto:${E(s.email)}" style="color:#eee">${E(s.email)}</a></p>` : ''}</div>
            <div><h4>ARCHIVES & PASSES</h4><nav>${NAV.map(([, h, zh, en]) => `<a href="${h}">${zh} (${en[0] + en.slice(1).toLowerCase()})</a>`).join('')}</nav></div>
            <div><h4>COMMUNITY FREQUENCIES</h4><p>${E(L('关注我们的社群，演出、招新和新歌都会第一时间公布。', 'Follow us for gigs, recruitment and new releases.'))}</p>
              <div class="soc">${[['Instagram', s.instagram], ['Facebook', s.facebook], ['YouTube', s.youtube]].filter(([, u]) => u).map(([n, u]) => `<a href="${E(u)}" target="_blank" rel="noopener">${n}</a>`).join('')}</div></div>
          </div>
          <div class="ftr-bot"><span>© 2000–${new Date().getFullYear() + 1} LITTLEGRAS MUSIC CLUB (小草颂). ALL RIGHTS RESERVED.</span><span>USM ENGINEERING CAMPUS · DIY PRINT MEDIA DIVISION</span></div>
        </div></footer>`;
    let tb = document.getElementById('tabbar');
    if (!tb) { tb = document.createElement('nav'); tb.id = 'tabbar'; tb.className = 'tabbar'; tb.setAttribute('aria-label', 'Tab'); document.body.appendChild(tb); }
    tb.innerHTML = NAV.map(([k, h, zh, en]) => `<a href="${h}" class="${page === k ? 'on' : ''}"><svg viewBox="0 0 24 24" aria-hidden="true">${ICON[k]}</svg>${L(zh.slice(0, 2), en[0] + en.slice(1).toLowerCase())}</a>`).join('');
    document.querySelectorAll('.ticker .run').forEach((r) => LGM.marquee(r, 45));
  }
  const runAllies = () => app.querySelectorAll('.ally-run').forEach((r) => LGM.marquee(r, 38));

  /* ---------- 大门票：本届音乐会 ---------- */
  function gigTicket() {
    const title = LGM.setting(d, 'concert_title');
    const en = s.concert_title_en || '';
    const t = parseDT(s.concert_datetime);
    const venue = LGM.setting(d, 'venue');
    const phase = s.phase || '招商期';
    const serial = `#${cur}-${t ? t.getFullYear() : 'TBA'}`;
    const status = phase === '宣传期' ? L('售票中', 'ON SALE') : phase === '回顾期' ? L('已落幕', 'WRAPPED') : L('招商中', 'SPONSORS WANTED');
    const rows = [['DATE // 日期', t ? ymd(t) + wk(t) : LGM.month(s.concert_month)], ['DOORS // 时间', hm(t)], ['VENUE // 地点', venue], ['CAPACITY // 席次', s.audience_target ? s.audience_target + ' LIVE' : ''], ['PRICE // 票价', s.ticket_price]].filter(([, v]) => v);
    return `<div class="label">UPCOMING FLAGSHIP SHOWCASE // ${E(L('主秀预约票根', 'MAIN SHOW PASS'))}</div>
      <div class="gig">
        <div class="gig-side"><span class="v">LITTLEGRAS ${E(cur)}TH</span><span class="n">${E(cur)}<br>ANNIV</span><span class="mono" style="font-size:10px;writing-mode:vertical-rl;transform:rotate(180deg)">EST. 2000 USM</span></div>
        <div class="gig-body">
          <div class="tags"><span class="tag r">● ${E(status)}</span><span class="tag c">PASS: ALL ACCESS</span><span class="tag">${E(L('理大工程系分院', 'USM ENGINEERING'))}</span></div>
          <div class="gig-k">★ ${E(cur)}TH ANNUAL ORIGINAL MUSIC SHOWCASE</div>
          <div class="gig-t">${E(LGM.f('hero.promo.kicker', { n: cur }).split('·')[0].trim())}</div>
          ${title ? `<div class="gig-theme">《${E(title)}》${en ? `<small>${E(en)}</small>` : ''}</div>` : `<div class="gig-theme">${E(L('主题即将公布', 'THEME COMING SOON'))}</div>`}
          <dl class="gig-rows">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${E(v)}</dd></div>`).join('')}</dl>
          <div class="cd" id="cd"></div>
          <div class="btns">
            ${s.ticket_url && phase === '宣传期' ? `<a class="btn y" href="${E(s.ticket_url)}" target="_blank" rel="noopener">▣ ${E(L('立即索取票根', 'GET YOUR PASS'))}</a>` : `<a class="btn y" href="partners.html">▣ ${E(L('成为赞助伙伴', 'BECOME A PATRON'))}</a>`}
            ${t ? `<a class="btn sm" href="${icsHref(t, title, venue)}" download="LGM-${E(cur)}.ics">🗓 ${E(L('加入行事历', 'ADD TO CAL'))}</a>` : ''}
          </div>
        </div>
        <div class="gig-stub">
          <div class="mono" style="display:flex;justify-content:space-between"><span>TEAR-OFF STUB</span><span>SERIAL: ${E(serial)}</span></div>
          <div class="ttl">${title ? '《' + E(title) + '》' : 'LGM ' + E(cur)}<div class="mono" style="color:var(--coral);margin-top:4px">${t ? ymd(t) : ''}</div></div>
          ${barcode('LGM-USM-' + cur)}
          <div class="mono" style="text-align:center">*LGM-USM-TICKET-${E(cur)}*</div>
          <div class="foot mono">PUNCH REQUIRED AT MAIN ENTRY</div>
        </div>
      </div>`;
  }
  function icsHref(t, title, venue) {
    const z = (x) => x.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const end = new Date(t.getTime() + 3.5 * 3600e3);
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//LGM//v3//EN', 'BEGIN:VEVENT', `UID:lgm-${cur}@lgm`, `DTSTART:${z(t)}`, `DTEND:${z(end)}`,
      `SUMMARY:小草颂第${cur}届音乐创作演绎会${title ? '《' + title + '》' : ''}`, `LOCATION:${venue || ''}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    return 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics);
  }
  function startCountdown() {
    const box = document.getElementById('cd');
    if (box) timers.push(LGM.countdown(box, s.concert_datetime));
  }

  /* ---------- 季程：常年活动 ---------- */
  function season() {
    const acts = LGM.split(LGM.setting(d, 'annual_activities'));
    const tagOf = (x) => /音乐会|Concert/i.test(x) ? ['FLAGSHIP', 'r'] : /金锋|Golden/i.test(x) ? ['NATIONAL', 'y'] : /比赛|Competition/i.test(x) ? ['CONTEST', 'c'] : /迎新|Welcom/i.test(x) ? ['ICE-BREAK', 'm'] : /课|class/i.test(x) ? ['ROUTINE', ''] : ['LIVE GIG', ''];
    return `<div class="sec"><div class="label y">FULL YEAR PROGRAMME INDEX</div>
      <div class="sec-h"><h2>SEASON TIMELINE <em>// ${E(L('一年做的事', 'WHAT WE DO'))}</em></h2><span class="tag">${acts.length} CYCLES · 365 DAYS ACTIVE</span></div>
      <div class="grid">${acts.map((a, i) => { const [tg, c] = tagOf(a); return `<div class="stub">
        <div class="stub-top"><span class="tag y">${pad(i + 1)}</span><span class="tag ${c}">${tg}</span></div>
        <h3>${E(a)}</h3><div class="stub-foot"><span>LGM // ${pad(i + 1)}</span><span>${E(L('常年', 'ANNUAL'))}</span></div></div>`; }).join('')}</div></div>`;
  }

  /* ---------- 底片：活动照片 ---------- */
  function film(rows, title) {
    const ev = rows.filter((r) => r['封面']).slice(0, 10);
    if (!ev.length) return '';
    return `<div class="sec film"><div class="label">35MM ANALOG ARCHIVE // ${E(L('现场底片', 'STAGE MOMENTS'))}</div>
      <div class="sec-h"><h2>${title || 'LIVEHOUSE MEMORIES & STAGE MOMENTS'}</h2><span class="mono" style="font-size:10px;color:var(--yellow)">KODAK 400 · ISO PRINT NOISE</span></div>
      <div class="frames">${ev.map((r, i) => `<a class="frame" href="${r['连结'] ? E(r['连结']) : 'events.html'}" ${r['连结'] ? 'target="_blank" rel="noopener"' : ''} style="text-decoration:none;color:#fff">
        <span class="fno">FRAME #${pad(i + 1)}</span>${LGM.imgTag(r['封面'], LGM.pick(r, '名称'), '')}
        <div class="cap"><span>${E(LGM.pick(r, '名称'))}</span><span>${E(String(r['日期'] || '').slice(0, 7))}</span></div></a>`).join('')}</div>
      <div class="film-foot"><span>ARCHIVED UNDER: LGM-PHOTO-ROLL</span><span>"${E(L('力量虽小，也朝音乐梦生长。', 'Small but growing towards the dream.'))}"</span></div></div>`;
  }

  /* ---------- 活动票根卡 ---------- */
  const evCard = (r) => {
    const tg = LGM.typeLabel(r['类型']);
    return `<div class="stub" data-type="${E(r['类型'])}">
      ${r['封面'] ? LGM.imgTag(r['封面'], LGM.pick(r, '名称'), 'cover') : ''}
      <div class="stub-top"><span class="tag y">${E(String(r['日期'] || 'TBA').replace(/-/g, '.'))}</span><span class="tag" style="background:${LGM.typeColor(r['类型'])};color:#fff;border-color:var(--ink)">${E(tg)}</span></div>
      <h3>${E(LGM.pick(r, '名称'))}</h3>
      ${LGM.lang === 'zh' && r['名称_en'] && r['名称_en'] !== r['名称_zh'] ? `<div class="en">${E(r['名称_en'])}</div>` : '<div class="en"></div>'}
      ${LGM.pick(r, '简介') ? `<p>${E(LGM.pick(r, '简介'))}</p>` : ''}
      <div class="stub-foot"><span>VENUE: ${E(r['地点'] || 'TBA')}</span>${r['连结'] ? `<a href="${E(r['连结'])}" target="_blank" rel="noopener">${E(L('贴文 →', 'POST →'))}</a>` : `<span>${E(LGM.termName(r['届数']))}</span>`}</div>
    </div>`;
  };

  /* ---------- 歌曲 ---------- */
  const songs = LGM.live(d.songs).filter((r) => r['歌名']);
  const songStub = (r, i) => {
    const id = LGM.ytId(r['youtube']);
    const from = Math.max(0, parseInt(r['试听开始'], 10) || 60), len = Math.min(90, parseInt(r['试听秒数'], 10) || 30);
    const award = LGM.pick(r, '获奖');
    const credits = [['作词', 'LYRICS'], ['作曲', 'MELODY'], ['编曲', 'ARR.']].filter(([k]) => r[k]).map(([k, en]) => `<div><dt>${L(k, en)}</dt><dd>${E(r[k])}</dd></div>`).join('');
    return `<div class="stub trk sleeve" data-term="${E(r['届数'])}" data-award="${award ? 1 : 0}">
      <div class="cover"></div>
      <div class="stub-top"><span class="tag ${award ? 'r' : 'k'}">${award ? E(L('金锋奖', 'AWARD')) : E(r['年份'] || 'LGM')}</span><span class="mono" style="font-size:10px;font-weight:700">STUB #${pad(i + 1)}</span></div>
      <h3>《${E(r['歌名'])}》</h3>
      <div class="en">${E([r['拼音'] || r['英文名'], r['年份'], r['届数'] ? LGM.termName(r['届数']) : ''].filter(Boolean).join(' · '))}</div>
      ${award ? `<p><b>${E(L('荣誉', 'HONOUR'))}:</b> ${E(award)}</p>` : ''}
      ${credits ? `<dl class="credits" style="margin-bottom:10px">${credits}</dl>` : ''}
      <div class="stub-foot"><span>SERIAL: LGM-${E(r['年份'] || '0000')}-${pad(i + 1)}</span>
        <span class="acts">${id ? `<button type="button" class="btn y sm listen" data-id="${id}" data-from="${from}" data-len="${len}" aria-label="${E(L('试听', 'Play'))}：${E(r['歌名'])}">▶ ${E(L('试听', 'PLAY'))}</button><a class="btn sm" href="https://www.youtube.com/watch?v=${id}" target="_blank" rel="noopener">${E(L('完整', 'FULL'))}</a>` : ''}</span></div>
    </div>`;
  };
  function featured(r) {
    if (!r) return '';
    const id = LGM.ytId(r['youtube']);
    const from = Math.max(0, parseInt(r['试听开始'], 10) || 60), len = Math.min(90, parseInt(r['试听秒数'], 10) || 30);
    const award = LGM.pick(r, '获奖');
    const credits = [['作词', 'LYRICS'], ['作曲', 'MELODY'], ['编曲', 'ARRANGEMENT']].filter(([k]) => r[k]).map(([k, en]) => `<div><dt>${k} ${en}:</dt><dd>${E(r[k])}</dd></div>`).join('');
    const eq = Array.from({ length: 14 }, (_, i) => `<i style="--h:${20 + ((i * 37) % 80)}%"></i>`).join('');
    return `<div class="feat">
      <div class="feat-top"><span><span class="tag y">CURRENT FEATURED A-SIDE</span> ${E(r['年份'] || '')} ${E(L('精选作品', 'FEATURED TRACK'))}</span><span>TYPE IV METAL TAPE · STAMP: USMKK-${E(r['年份'] || '')}-A01</span></div>
      <div class="deckbox sleeve"><div class="cover">
        <div class="side"><b>SIDE A · 45 RPM</b><span>LGM-REEL-${E(r['届数'] || '')}</span></div>
        <div class="deck-label"><span class="reel"></span><div class="t">${E(r['歌名'])}<small>${E(r['拼音'] || r['英文名'] || '')}</small></div><span class="reel"></span></div>
        <div><div class="eq">${eq}</div><div class="eq-t"><span>00:00 / ${pad(Math.floor(len / 60))}:${pad(len % 60)}</span><span style="color:var(--coral)">● ${id ? 'READY' : 'NO TAPE'}</span></div></div>
        ${id ? `<button type="button" class="hidden listen" data-id="${id}" data-from="${from}" data-len="${len}" id="feat-play" aria-label="${E(r['歌名'])}"></button>` : ''}
      </div></div>
      <div class="feat-info">
        <div class="tags">${award ? `<span class="tag r">${E(award)}</span>` : ''}<span class="tag">${E(LGM.termName(r['届数'] || ''))}</span></div>
        <h2>《${E(r['歌名'])}》</h2>
        <div class="en">${E([r['拼音'], r['英文名']].filter(Boolean).join(' · '))}</div>
        ${credits ? `<dl class="credits">${credits}</dl>` : ''}
        <div class="btns">${id ? `<button type="button" class="btn y" onclick="document.getElementById('feat-play').click()">▶ ${E(L('立即试听', 'PLAY MASTER'))} (${len}s)</button>
          <a class="btn" href="https://www.youtube.com/watch?v=${id}" target="_blank" rel="noopener">${E(L('完整版 YouTube', 'FULL ON YOUTUBE'))} ↗</a>` : ''}</div>
      </div></div>`;
  }

  /* ---------- 赞助商 logo 墙 ---------- */
  // 两排反方向滚动；滑鼠移上去会停
  function allies() {
    const seen = new Set();
    const rows = LGM.live(d.sponsors).filter((r) => r['商家名'] && !seen.has(r['商家名']) && seen.add(r['商家名']));
    const card = (r) => {
      const tag = r['网址'] ? 'a' : 'div';
      return `<${tag} class="ally" ${r['网址'] ? `href="${E(r['网址'])}" target="_blank" rel="noopener"` : ''}>${r['logo'] ? LGM.imgTag(r['logo'], r['商家名'], '', true) : ''}<b>${E(r['商家名'])}</b><small>${E(r['等级'] || '')}${r['届数'] ? ' · ' + E(LGM.termName(r['届数'])) : ''}</small></${tag}>`;
    };
    const you = `<a class="ally you" href="partners.html#tiers"><span>+</span>${E(L('虚位以待', 'YOUR BRAND HERE'))}<small>SEASON ${E(cur)}</small></a>`;
    const half = Math.ceil(rows.length / 2);
    const lane = (list, rev) => {
      let one = list.map(card).join('') + you;
      for (let k = list.length + 1; k < 8 && list.length; k += list.length + 1) one += list.map(card).join('') + you;
      return `<div class="ally-lane"><div class="ally-run${rev ? ' rev' : ''}">${one}${one}</div></div>`;
    };
    return rows.length < 6 ? lane(rows) : lane(rows.slice(0, half)) + lane(rows.slice(half), true);
  }

  /* ---------- 招新黄块 ---------- */
  const recruit = () => `<div class="sec recruit">
      <span class="tag k">RECRUITMENT ONGOING</span>
      <h2>${E(L('接棒小草火种！', 'JOIN THE CREW!'))}<br>${E(L('不会乐器也能加入。', 'No instrument needed.'))}</h2>
      <p>${E(L('创作、表演、宣传、设计、舞台——总有一个位置是你的。', 'Songwriting, performing, publicity, design, stage — there is a place for you.'))}</p>
      <div class="btns">${s.join_form_url ? `<a class="btn k" href="${E(s.join_form_url)}" target="_blank" rel="noopener">${E(L('填写招新表', 'RECRUIT FORM'))} →</a>` : ''}
        ${s.instagram ? `<a class="btn" href="${E(s.instagram)}" target="_blank" rel="noopener">${E(L('私讯 IG', 'DM ON IG'))} →</a>` : ''}</div></div>`;

  /* ================= 各页 ================= */
  const P = {};

  P.index = () => {
    const ev = LGM.sortEvents(LGM.live(d.events)).reverse();
    const feat = songs.filter((r) => LGM.on(r['精选']));
    const raw = String(s.donation_progress || '').replace('%', '').trim();
    return `<div class="wrap">
      ${head({ issue: `ISSUE #${cur} · LGM INDIE ZINE // ${L('原创音乐社团', 'ORIGINAL MUSIC CLUB')}`, tag: L('理大工程分院原创音乐社 · SINCE 2000', 'USM ENGINEERING ORIGINAL MUSIC CLUB · SINCE 2000'),
        title: 'LITTLEGRAS<br><span class="hl" style="white-space:nowrap">MUSIC CLUB.</span>', zh: '小草颂 · 力量虽小，也朝音乐梦生长。',
        intro: E(LGM.setting(d, 'about') || '').slice(0, 200) + '…', side: `<div class="btns"><a class="btn r" href="partners.html">${E(L('成为赞助伙伴', 'BECOME A PATRON'))} →</a><a class="btn" href="music.html">${E(L('听我们的歌', 'HEAR OUR MUSIC'))}</a></div>` })}
      ${gigTicket()}
      ${raw !== '' && num(raw) < 100 ? `<div class="sec"><a class="slip" href="partners.html#donate" style="display:block;text-decoration:none">
        <div class="slip-top"><span>DONATION DISPATCH // ${E(L('乐捐进度', 'FUNDRAISING'))}</span><span>STATUS: OPEN</span></div>
        <div style="display:flex;align-items:center;gap:18px;flex-wrap:wrap;padding:14px 18px"><span style="font-size:42px;line-height:1">∞</span>
          <div style="flex:1 1 280px"><b>${E(L(`第 ${cur} 届乐捐已筹 ${Math.round(num(raw))}%`, `${cur}th concert donations: ${Math.round(num(raw))}%`))}</b><div style="border:2px solid var(--ink);height:14px;margin-top:8px;background:#fff"><div style="height:100%;width:${num(raw)}%;background:var(--yellow);border-right:2px solid var(--ink)"></div></div></div>
          <span class="btn sm y">${E(L('一起填满 ∞', 'HELP FILL ∞'))} →</span></div></a></div>` : ''}
      <div class="sec"><div class="label">CLUB TELEMETRY // ${E(L('社团关键数据', 'KEY NUMBERS'))}</div>${statCells(stat('首页'))}</div>
      ${film(ev)}
      ${feat.length ? `<div class="sec"><div class="sec-h"><h2>A-SIDE <em>// ${E(L('自创精选', 'ORIGINALS'))}</em></h2><a class="btn sm" href="music.html">${E(L('全部作品', 'ALL TRACKS'))} →</a></div>${featured(feat[0])}
        ${feat.length > 1 ? `<div class="grid" style="margin-top:20px">${feat.slice(1, 4).map(songStub).join('')}</div>` : ''}</div>` : ''}
      <div class="sec"><div class="sec-h"><h2>PATRONS & BRAND ALLIES <em>// ${E(L('历届支持伙伴', 'PAST PARTNERS'))}</em></h2></div>${allies()}</div>
      ${recruit()}
    </div>`;
  };

  P.events = () => {
    const ev = LGM.sortEvents(LGM.live(d.events)).reverse();
    const types = [...new Set(ev.map((r) => r['类型']).filter(Boolean))];
    const terms = [...new Set(ev.map((r) => String(r['届数'])))].sort((a, b) => b - a);
    return `<div class="wrap">
      ${head({ issue: `ISSUE #${cur} · USM GIG PASS ALL ACCESS // 365 DAYS OF LIVE NOISE`, tag: L('年度指标活动总览 · TOUR CALENDAR', 'TOUR CALENDAR'),
        title: 'GIG SCHEDULE <span class="hl">& EVENTS.</span>', intro: E(L('四季轮转，每一场 Live 都是理大工程岛屿上的燃点。珍藏每一张现场票根，感受青年创作者的原创跃动。', 'Every gig is a spark on campus. Keep every stub.')) })}
      ${gigTicket()}
      ${season()}
      ${film(ev)}
      <div class="sec"><div class="label">GIG STUB ARCHIVE // ${E(L('所有活动', 'ALL EVENTS'))}</div>
        <div class="filters" role="group"><span class="mono">FILTER:</span><button type="button" aria-pressed="true" data-f="">${E(L('全部', 'ALL'))} (${ev.length})</button>${types.map((t) => `<button type="button" aria-pressed="false" data-f="${E(t)}">${E(LGM.typeLabel(t))}</button>`).join('')}</div>
        ${terms.map((t) => `<div class="term-block" data-term="${E(t)}"><div class="term-h"><b>${E(LGM.termName(t))}</b><a href="term.html?t=${encodeURIComponent(t)}">${E(L('这一届的档案', 'ARCHIVE'))} →</a></div>
          <div class="grid">${ev.filter((r) => String(r['届数']) === t).map(evCard).join('')}</div></div>`).join('')}</div>
      ${s.venue_zh ? `<div class="sec"><div class="label">VENUE NAVIGATION // ${E(L('场地导航', 'HOW TO GET THERE'))}</div>
        <div class="box" style="padding:8px"><iframe title="map" style="width:100%;height:300px;border:0" loading="lazy" src="https://maps.google.com/maps?q=${encodeURIComponent('Dewan Utama, USM Engineering Campus, Nibong Tebal')}&output=embed"></iframe>
        <div class="mono" style="font-size:11px;font-weight:700;padding:8px 4px 2px">📍 ${E(LGM.setting(d, 'venue'))} · USM ENGINEERING CAMPUS, NIBONG TEBAL</div></div></div>` : ''}
    </div>`;
  };

  P.music = () => {
    const feat = songs.filter((r) => LGM.on(r['精选']));
    const years = [...new Set(songs.map((r) => r['年份']).filter(Boolean))].sort((a, b) => b - a);
    const terms = (d.terms || []).filter((t) => t['播放清单']);
    return `<div class="wrap">
      ${head({ issue: `ISSUE #${cur} · USM 机电原创典藏 // TAPE & VINYL VAULT`, tag: `${songs.length}+ ${L('原创作品', 'ORIGINAL TRACKS')}`,
        title: 'MUSIC <span class="hl">ARCHIVE.</span>', intro: E(L('二十余年，数百首工科原创。收录历届原创作品、年度演出现场与金锋奖得奖作品。', 'Two decades of originals written by engineering students.')),
        side: `<div class="mono" style="border:2px solid var(--ink);padding:6px 10px;font-size:11px;font-weight:700">TAPE REEL COUNTER <span style="color:var(--coral)">${pad(songs.length)}:${pad(years.length)}</span> · ● REC READY</div>` })}
      ${featured(feat[0] || songs[0])}
      <div class="sec">
        <input class="input" id="song-q" type="search" placeholder="${E(L('搜寻歌名 / 作词 / 作曲…', 'Search title / lyricist / composer…'))}" aria-label="${E(L('搜寻歌曲', 'Search songs'))}" style="margin-bottom:10px;width:100%">
        <div class="filters" role="group"><span class="mono">FILTER DISCOGRAPHY:</span>
          <button type="button" aria-pressed="true" data-y="">${E(L('全部作品', 'ALL'))} (${songs.length})</button>
          <button type="button" aria-pressed="false" data-y="award">${E(L('金锋奖得奖', 'AWARDS'))}</button>
          ${years.slice(0, 8).map((y) => `<button type="button" aria-pressed="false" data-y="${E(y)}">${E(y)}</button>`).join('')}</div>
        <div class="grid" id="tracks">${songs.map((r, i) => songStub(r, i).replace('class="stub trk sleeve"', `class="stub trk sleeve${i >= 24 ? ' extra hidden' : ''}" data-year="${E(r['年份'] || '')}"`)).join('')}</div>
        ${songs.length > 24 ? `<div class="more"><button type="button" class="btn y" id="more">${E(L(`显示全部 ${songs.length} 首`, `Show all ${songs.length}`))} ↓</button></div>` : ''}
      </div>
      ${terms.length ? `<div class="sec"><div class="sec-h"><h2>LIVE TAPES <em>// ${E(L('历届演出现场', 'CONCERT PLAYLISTS'))}</em></h2></div>
        <div class="grid">${terms.map((t) => `<a class="stub" href="${E(t['播放清单'])}" target="_blank" rel="noopener" style="text-decoration:none">
          <div class="stub-top"><span class="tag k">${E(LGM.termName(t['届数']))}</span><span class="tag c">PLAYLIST</span></div>
          <h3>《${E(LGM.pick(t, '主题'))}》</h3><div class="en">${E(t['学年'] || '')} LIVE RECORDINGS</div>
          <div class="stub-foot"><span>YOUTUBE</span><span>${E(L('播放', 'PLAY'))} ↗</span></div></a>`).join('')}</div></div>` : ''}
      ${s.youtube ? `<div class="sec slip"><div class="slip-top"><span>AVAILABLE EVERYWHERE</span><span>STREAMING</span></div>
        <div style="display:flex;justify-content:space-between;gap:14px;flex-wrap:wrap;align-items:center;padding:16px 18px"><b style="font-size:20px">${E(L('在 YouTube 听小草颂全部原创作品', 'Hear every LGM original on YouTube'))}</b>
        <a class="btn r" href="${E(s.youtube)}" target="_blank" rel="noopener">▶ YOUTUBE</a></div></div>` : ''}
    </div>`;
  };

  P.history = () => {
    const t = (d.terms || []).find((r) => String(r['届数']) === cur) || {};
    const crew = (d.committee || []).filter((r) => String(r['届数']) === cur && r['成员']).sort(LGM.byOrder);
    const roles = (d.committee || []).filter((r) => String(r['届数']) === cur).sort(LGM.byOrder);
    const people = LGM.live(d.members).filter((r) => String(r['名字'] || '').trim());
    const termsAll = [...new Set(people.map((p) => String(p['届数'])))].sort((a, b) => b - a);
    // 大事记：年份 → 音乐会 + 得奖
    const yearOf = (x) => (String(x['日期']).match(/^\d{4}/) || [])[0] || (x['学年'] && /\/(\d{2})/.test(x['学年']) ? '20' + x['学年'].split('/')[1].slice(0, 2) : '');
    const rows = {};
    const row = (y) => (rows[y] = rows[y] || []);
    (d.terms || []).forEach((x) => { const y = yearOf(x); if (x['主题_zh'] && y && +y <= new Date().getFullYear()) row(y).push(`<a class="it" href="term.html?t=${encodeURIComponent(x['届数'])}">${x['海报'] ? LGM.imgTag(x['海报'], '', '') : ''}<span><span class="mono" style="font-size:10px;font-weight:700">${E(LGM.termName(x['届数']))}</span><br><b>《${E(LGM.pick(x, '主题'))}》</b></span><span class="tag y">CONCERT</span></a>`); });
    songs.filter((r) => r['获奖_zh'] && r['年份']).forEach((r) => row(r['年份']).push(`<div class="it"><b>《${E(r['歌名'])}》</b><span>${E(LGM.pick(r, '获奖'))}</span><span class="tag r">AWARD</span></div>`));
    LGM.live(d.awards_other).filter((r) => r['年份']).forEach((r) => row(r['年份']).push(`<div class="it"><span>${E(LGM.pick(r, '内容'))}</span><span class="tag c">MILESTONE</span></div>`));
    return `<div class="wrap">
      ${head({ issue: `ISSUE #${cur} · ARCHIVE VAULT // COMMITTEE POSTER`, tag: L('历届筹委与草印编年史', 'COMMITTEE & CHRONICLE'),
        title: 'HISTORY <span class="hl">& CREW.</span>', zh: L('历届筹委与草印编年史', ''), intro: E(L('二十多年来，一届接一届的小草把原创音乐唱下去。每一个名字，都是这棵草的一片叶子。', 'Generation after generation keeping original music alive.')),
        side: `<div class="cells" style="grid-template-columns:1fr 1fr;width:100%"><div><div class="k">GENERATIONS</div><b>${E(cur)}</b></div><div><div class="k">NAMES ARCHIVED</div><b>${people.length}</b></div></div>` })}
      ${t['团照'] || crew.length ? `<div class="sec"><div class="label">${E(L(`第 ${cur} 届执委会`, `${cur}TH COMMITTEE`))} // ${E(t['学年'] || '')} CREW PASSES</div>
        <div class="crew-top">${t['团照'] ? `<div class="crew-photo">${LGM.imgTag(t['团照'], 'Committee', '')}<span class="cap">${E(t['学年'] || '')} LITTLEGRAS COMMITTEE</span></div>` : '<div></div>'}
          <div class="crew-note"><span class="tag y" style="align-self:flex-start">CURRENT ASSIGNMENT</span>
            <blockquote>「${E(LGM.setting(d, 'concert_title') ? L(`以《${LGM.setting(d, 'concert_title')}》之名，延续二十七年草根之火。`, `Carrying the flame as 《${LGM.setting(d, 'concert_title')}》.`) : L('力量虽小，也朝音乐梦生长。', 'Small but growing.'))}」</blockquote>
            <dl><div><span>CREW DIVISIONS</span><span>${roles.length}</span></div><div><span>TOURING TARGET</span><span>${E(LGM.setting(d, 'venue') || '')}</span></div><div><span>SHOW DATE</span><span>${E(ymd(parseDT(s.concert_datetime)))}</span></div></dl></div></div>
        ${crew.length ? `<div class="grid" style="margin-top:20px">${crew.map((r, i) => `<div class="pass"><span class="no">${pad(i + 1)}</span>
          <span class="tag ${i === 0 ? 'r' : 'y'}">${E(LGM.pick(r, '职位'))}</span><h3>${E(String(r['成员']).split(/\s(?=[A-Za-z])/)[0])}</h3>
          <div class="en">${E((String(r['成员']).match(/[A-Za-z][A-Za-z\s]+$/) || [''])[0])}</div>${barcode('PASS-' + cur + '-' + i)}
          <div class="foot"><span>PASS ID: LGM-${E(cur)}-${pad(i + 1)}</span><span>ALL ACCESS</span></div></div>`).join('')}</div>` : ''}
        ${roles.length > crew.length ? `<div class="label y" style="margin-top:26px">${E(L('部门分配', 'DIVISION DISPATCH'))}</div>
          <div class="grid">${roles.map((r, i) => `<div class="stub"><div class="stub-top"><span class="tag ${['y', 'c', 'm', 'r'][i % 4]}">DEPT-${pad(i + 1)}</span><span class="mono" style="font-size:10px">STATUS: ${r['成员'] ? 'ASSIGNED' : 'RECRUITING'}</span></div>
            <h3>${E(LGM.pick(r, '职位'))}</h3><div class="en">${E(r['职位_en'] || '')}</div><div class="stub-foot"><span>${E(r['成员'] || L('招募中', 'OPEN'))}</span><span>#${pad(i + 1)}</span></div></div>`).join('')}</div>` : ''}
      </div>` : ''}
      <div class="sec"><div class="label">CHRONICLE // ${E(L('大事记与里程碑', 'MILESTONES'))}</div>
        <div class="sec-h"><h2>${E(L('小草颂大事记', 'LGM TIMELINE'))} <em>// SINCE 2000</em></h2></div>
        <div class="miles">${Object.keys(rows).sort((a, b) => b - a).map((y) => `<div class="mile"><div class="yr">${y}<small>${rows[y].length} ENTRIES</small></div><div class="items">${rows[y].join('')}</div></div>`).join('')}
          <div class="mile"><div class="yr">2000<small>GENESIS</small></div><div class="items"><div class="it"><b>${E(L('小草颂在理大工程系分院成立', 'LGM founded at USM Engineering Campus'))}</b><span class="tag k">FOUNDED</span></div></div></div></div></div>
      ${people.length ? `<div class="sec"><div class="label">HALL OF NAMES // ${E(L('历届名册检索库', 'MEMBER ROSTER'))}</div>
        <div class="roster-tools"><input class="input" id="q" type="search" placeholder="${E(L('搜寻名字…', 'Search a name…'))}" aria-label="${E(L('搜寻名字', 'Search a name'))}">
          <div class="filters" role="group" style="margin:0"><button type="button" aria-pressed="true" data-t="">${E(L('全部', 'ALL'))}</button>${termsAll.map((x) => `<button type="button" aria-pressed="false" data-t="${E(x)}">${E(x)}</button>`).join('')}</div></div>
        <div class="roster-wrap"><table class="roster"><thead><tr><th>${E(L('届数', 'GEN'))}</th><th>${E(L('名字', 'NAME'))}</th><th>ID</th></tr></thead>
          <tbody id="roster">${people.sort((a, b) => (+b['届数'] || 0) - (+a['届数'] || 0)).map((p, i) => `<tr data-t="${E(p['届数'])}"><td class="n">#${E(p['届数'])}</td><td>${E(p['名字'])}</td><td class="mono" style="font-size:11px">LGM-${E(p['届数'])}-${pad(i + 1)}</td></tr>`).join('')}</tbody></table></div>
        <div class="roster-foot"><span id="roster-n">${people.length} RECORDS</span><span>ARCHIVE AUTHORIZATION · LGM</span></div></div>` : ''}
      ${recruit()}
    </div>`;
  };

  P.partners = () => {
    const packs = LGM.live(d.packages).sort(LGM.byOrder);
    const ben = (d.package_benefits || []).slice().sort(LGM.byOrder);
    const ads = (d.ads || []).filter((r) => num(r['价格'])).sort(LGM.byOrder);
    const other = (d.other_packages || []).slice().sort(LGM.byOrder);
    const ask = (x) => LGM.setting(d, 'wa_message') + (x ? ` (${x})` : '');
    const main = stat('赞助主');
    const tc = (d.terms_conditions || []).slice().sort(LGM.byOrder);
    return `<div class="wrap">
      ${head({ issue: `ISSUE #${cur} · SPONSORSHIP DISPATCH & INDIE PATRONAGE`, tag: L('赞助征集中 · CALL FOR PATRONS', 'CALL FOR PATRONS'),
        title: 'BECOME A <span class="hl">PATRON.</span>', zh: L('成为小草音乐赞助伙伴', ''),
        intro: E(L(`小草颂自 2000 年创立，第 ${cur} 届音乐会正在寻找愿意一起把原创音乐带上舞台的伙伴。`, `Since 2000. Our ${cur}th concert is looking for partners.`)),
        side: `<div class="btns"><a class="btn y" href="${E(wa(ask()))}" target="_blank" rel="noopener">✎ ${E(L('立即洽谈赞助', 'PLEDGE NOW'))}</a>${s.sponsor_pdf_url ? `<a class="btn" href="${E(LGM.file(s.sponsor_pdf_url))}" target="_blank" rel="noopener">${E(L('下载计划书', 'PROPOSAL PDF'))}</a>` : ''}</div>` })}
      ${statCells(main)}
      <div class="sec" id="tiers"><div class="label">TIERED PASS CATALOG // ${E(L('赞助配套', 'PACKAGES'))}</div>
        <div class="sec-h"><h2>FLAGSHIP TICKET TIERS</h2><span class="tag">${E(L('点票根洽谈', 'TAP A STUB TO ENQUIRE'))}</span></div>
        <div class="tiers">${packs.map((p, i) => {
          const rec = LGM.on(p['推荐']), tier = LGM.pick(p, '等级');
          const list = ben.filter((b) => String(b[p.code] || '').trim()).map((b) => { const v = String(b[p.code]).trim(); return `<li>${v === '✔' || LGM.on(v) ? '' : `<b>${E(v)}</b> `}${E(LGM.pick(b, '权益'))}</li>`; });
          return `<div class="tier ${rec ? 'rec' : ''} ${i === 0 ? 'dark' : ''}"><div class="tier-b">
            <div class="top"><span class="tag ${rec ? 'r' : 'y'}">${rec ? E(L('推荐', 'RECOMMENDED')) : 'TIER'} ${pad(i + 1)}</span><span>STUB TYPE: ${E(String(p.code || '').toUpperCase())}</span></div>
            <h3>${E(tier)} ${E(L('赞助', 'Partner'))}</h3>
            <ul>${LGM.split(LGM.pick(p, '亮点')).map((x) => `<li><b>${E(x)}</b></li>`).join('')}</ul>
            ${list.length ? `<details class="fq" style="margin:10px 0 0;color:var(--ink)"><summary>${E(L(`全部 ${list.length} 项权益`, `All ${list.length} benefits`))}</summary><div><ul style="border:0;padding-left:18px">${list.join('')}</ul></div></details>` : ''}</div>
            <div class="tier-s"><span class="mono">STUB SERIAL</span><span class="mono">#${E(String(p.code || '').toUpperCase())}-${E(cur)}</span><span class="price">${E(p['价格'])}</span>${barcode('TIER-' + p.code)}
              <a class="btn ${rec ? 'r' : 'y'}" href="${E(wa(ask(tier + ' ' + p['价格'])))}" target="_blank" rel="noopener">${E(L('洽谈这个配套', 'ENQUIRE'))}</a></div></div>`; }).join('')}</div></div>
      ${ads.length || other.length ? `<div class="sec"><div class="label">BUDGET PASSES // ${E(L('预算有限也能支持', 'SMALLER BUDGETS'))}</div>
        <div class="tiers">${ads.length ? `<div><table class="adtab"><thead><tr><th>${E(L('节目册广告', 'BOOKLET AD'))}</th><th>${E(L('规格', 'SIZE'))}</th><th>RM</th></tr></thead><tbody>
          ${ads.map((r) => `<tr class="${LGM.on(r['推荐']) ? 'rec' : ''}"><td>${E(LGM.pick(r, '颜色'))}</td><td>${E(LGM.pick(r, '规格'))}${LGM.on(r['推荐']) ? ' <span class="tag r">' + E(L('推荐', 'REC')) + '</span>' : ''}</td><td>${E(r['价格'])}</td></tr>`).join('')}</tbody></table></div>` : ''}
          <div class="grid" style="grid-template-columns:1fr 1fr">${other.map((r) => `<div class="stub"><div class="stub-top"><span class="tag c">${E(LGM.pick(r, '组别'))}</span><span class="mono" style="font-size:10px">IN-KIND</span></div>
            <h3>${E(LGM.pick(r, '名称'))}</h3><div class="en">${E(LGM.pick(r, '条件'))}</div><ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.7">${LGM.split(LGM.pick(r, '权益')).map((x) => `<li>${E(x)}</li>`).join('')}</ul></div>`).join('')}</div></div></div>` : ''}
      <div class="sec"><div class="label">HALL OF MERIT // ${E(L('历届支持伙伴', 'PAST PATRONS'))}</div><div class="sec-h"><h2>PATRONS & BRAND ALLIES</h2></div>${allies()}</div>
      </div>
      <div class="stage-band hidden" id="donate"></div>
      <div class="wrap">
      <div class="sec slip"><div class="slip-top"><span>DISPATCH TRANSMISSION DOCK // ${E(L('赞助联络单', 'PATRONAGE SLIP'))}</span><span>STATUS: ACTIVE</span></div>
        <div class="slip-body"><div><span class="tag y">FORM SERIAL #LGM-SPON-${E(cur)}</span>
          <h2>PLEDGE YOUR PATRONAGE</h2><p>${E(L('WhatsApp 我们，告诉我们你的品牌和想要的配套，赞助组 24 小时内回复。', 'WhatsApp us with your brand and the package you like; we reply within 24 hours.'))}</p>
          <div class="btns" style="margin-top:14px"><a class="btn r" href="${E(wa(ask()))}" target="_blank" rel="noopener">▶ ${E(L('WhatsApp 赞助组', 'WHATSAPP US'))}</a></div>
          <div class="note">${E(L('确认后请准备：高清 logo（PNG / AI）、品牌简介、想宣传的资讯或影片。', 'After confirming: hi-res logo, brand intro and any promo material.'))}</div></div>
          <dl>${[[L('联络人', 'CONTACT'), LGM.setting(d, 'sponsor_contact_name')], ['WHATSAPP', waNum ? '+' + waNum : ''], ['EMAIL', s.sponsor_email || s.email], [L('音乐会', 'CONCERT'), LGM.setting(d, 'concert_title') ? `《${LGM.setting(d, 'concert_title')}》` : ''], [L('日期', 'DATE'), ymd(parseDT(s.concert_datetime))], [L('地点', 'VENUE'), LGM.setting(d, 'venue')]]
            .filter(([, v]) => v).map(([k, v]) => `<div><dt>${E(k)}</dt><dd>${E(v)}</dd></div>`).join('')}</dl></div></div>
      ${tc.length ? `<div class="sec"><div class="label">FINE PRINT // ${E(L('条款与细则', 'TERMS'))}</div>${tc.map((r) => `<details class="fq"><summary>${E(LGM.pick(r, '标题'))}</summary><div>${E(LGM.pick(r, '内容'))}</div></details>`).join('')}</div>` : ''}
    </div>`;
  };

  P.about = () => {
    const t = (d.terms || []).find((r) => String(r['届数']) === cur) || {};
    const crew = (d.committee || []).filter((r) => String(r['届数']) === cur && r['成员']).sort(LGM.byOrder);
    const origin = LGM.setting(d, 'origin');
    return `<div class="wrap">
      <div class="issue"><span>DISPATCH #LGM-USM-${E(cur)} // ABOUT</span><span>SERIAL: ${E(cur)}-ABOUT</span></div>
      <div class="head"><div><span class="tag y">EST. 2000 · USM ENGINEERING CAMPUS</span>
        <h1 style="font-size:clamp(34px,5.2vw,62px)">${E(L('力量虽小，', 'SMALL BUT'))}<br><span class="hl">${E(L('也朝音乐梦生长。', 'GROWING.'))}</span></h1>
        <p style="margin-top:14px">${E(LGM.setting(d, 'about') || '')}</p></div>
        <div class="stage-pass"><span class="tape"></span>${LGM.imgTag(s.hero_photo || t['团照'] || 'photos/hero-group.jpg', 'LGM', '')}<span class="sp">STAGE PASS</span>
          <div class="cap"><span>LGM ${E(cur)}TH · LIVE TAPE</span><span>REC ●</span></div></div></div>
      <div class="sec"><div class="label">CORE IDEAS // STUB ARCHIVE</div>
        <div class="tiers">
          <div class="idea"><div class="idea-top"><span class="tag r">STUB #01</span><span class="mono" style="font-size:10px;font-weight:700">MISSION</span></div><h3>${E(L('使命', 'Mission'))}</h3><p>${E(LGM.setting(d, 'mission') || '')}</p><div class="idea-foot"><span>AUTH: LGM-${E(cur)}</span><span>ORIGINAL MUSIC FIRST</span></div></div>
          <div class="idea"><div class="idea-top"><span class="tag c">STUB #02</span><span class="mono" style="font-size:10px;font-weight:700">VISION</span></div><h3>${E(L('愿景', 'Vision'))}</h3><ul>${LGM.split(LGM.setting(d, 'vision')).map((x) => `<li>${E(x)}</li>`).join('')}</ul><div class="idea-foot"><span>1-ON-1 GUILD</span><span>MENTOR SYSTEM</span></div></div>
        </div></div>
      ${origin ? `<div class="sec"><div class="label">LINER NOTES // ${E(L('梦开始的地方', 'WHERE IT BEGAN'))}</div>
        <div class="slip"><div class="slip-top"><span>FIELD NOTE NO. 2000-GENESIS</span><span>ISSUE #${E(cur)}</span></div>
          <div style="display:grid;grid-template-columns:auto 1fr;gap:24px;padding:20px;align-items:start"><div style="font-size:clamp(56px,8vw,104px);font-weight:700;letter-spacing:-.05em;line-height:.9;background:var(--yellow);border:var(--line) solid var(--ink);padding:6px 12px">2000</div>
          <div>${LGM.split(origin).map((x) => `<p style="font-size:16.5px;line-height:1.9;margin:0 0 10px">${E(x)}</p>`).join('')}<a class="btn sm" href="history.html">${E(L('看历届的故事', 'SEE OUR HISTORY'))} →</a></div></div></div></div>` : ''}
      <div class="sec"><div class="label">CLUB TELEMETRY // ${E(L('社团关键数据', 'KEY NUMBERS'))}</div>${statCells(stat('首页'))}</div>
      ${season()}
      ${crew.length ? `<div class="sec"><div class="label">${E(L(`第 ${cur} 届核心干部`, `${cur}TH EXEC BOARD`))} // EXEC BOARD</div>
        <div class="grid">${crew.map((r, i) => `<div class="pass"><span class="no">${pad(i + 1)}</span><span class="tag ${i === 0 ? 'r' : 'y'}">${E(LGM.pick(r, '职位'))}</span>
          <h3>${E(String(r['成员']).split(/\s(?=[A-Za-z])/)[0])}</h3><div class="en">${E((String(r['成员']).match(/[A-Za-z][A-Za-z\s]+$/) || [''])[0])}</div>${barcode('EXEC-' + cur + '-' + i)}
          <div class="foot"><span>LGM-EXEC-${E(cur)}-${pad(i + 1)}</span><span>${E(t['学年'] || '')}</span></div></div>`).join('')}</div>
        <p style="margin-top:12px"><a class="btn sm" href="history.html">${E(L('全部筹委与历届名册', 'FULL CREW & ROSTER'))} →</a></p></div>` : ''}
      ${recruit()}
    </div>`;
  };

  P.term = () => {
    const terms = (d.terms || []).filter((x) => x['届数']).sort((a, b) => (+b['届数']) - (+a['届数']));
    const want = new URLSearchParams(location.search).get('t') || cur;
    const t = terms.find((x) => String(x['届数']) === String(want)) || terms[0];
    if (!t) return '<div class="wrap sec">—</div>';
    const n = String(t['届数']), i = terms.indexOf(t), newer = terms[i - 1], older = terms[i + 1];
    const isCur = n === cur;
    const dt = parseDT(isCur && s.concert_datetime ? s.concert_datetime : t['日期']);
    const venue = isCur ? (LGM.setting(d, 'venue') || t['地点']) : t['地点'];
    const poster = t['海报'] || (isCur ? s.poster : '');
    const ev = LGM.sortEvents(LGM.live(d.events).filter((r) => String(r['届数']) === n && r['类型'] !== '年度音乐会'));
    const sg = songs.filter((r) => String(r['届数']) === n);
    const crew = (d.committee || []).filter((r) => String(r['届数']) === n && r['成员']).sort(LGM.byOrder);
    const seen = new Set();
    const spons = LGM.live(d.sponsors).filter((r) => String(r['届数']) === n && r['商家名'] && !seen.has(r['商家名']) && seen.add(r['商家名']));
    const vid = LGM.ytId(t['影片_youtube']);
    const merch = LGM.split(t['周边图']);
    document.title = `${LGM.termName(n)}${t['主题_zh'] ? ` 《${t['主题_zh']}》` : ''} · 小草颂 LGM`;
    return `<div class="wrap">
      <div class="issue"><span>ARCHIVE VAULT // GENERATION #${E(n)}</span><span>${E(t['学年'] || '')}</span></div>
      <div class="filters" role="navigation" aria-label="${E(L('届数', 'Generation'))}"><span class="mono">GEN:</span>${terms.map((x) => `<a href="term.html?t=${encodeURIComponent(x['届数'])}" style="border:1.5px solid var(--ink);padding:4px 10px;font-weight:700;font-size:12.5px;text-decoration:none;${x === t ? 'background:var(--yellow)' : 'background:#fff'}" ${x === t ? 'aria-current="page"' : ''}>${E(x['届数'])}</a>`).join('')}</div>
      <div class="gig ${poster ? 'has-poster' : ''}">
        <div class="gig-side"><span class="v">LITTLEGRAS ${E(n)}TH</span><span class="n">${E(n)}<br>GEN</span><span class="mono" style="font-size:10px;writing-mode:vertical-rl;transform:rotate(180deg)">${E(t['学年'] || '')}</span></div>
        <div class="gig-body">
          <div class="tags"><span class="tag k">${E(LGM.termName(n))}</span>${isCur ? `<span class="tag r">● ${E(L('本届', 'CURRENT'))}</span>` : `<span class="tag y">ARCHIVED</span>`}</div>
          <div class="gig-k">★ ${E(n)}TH ANNUAL ORIGINAL MUSIC SHOWCASE</div>
          <h1 class="gig-t" style="margin:4px 0 10px">${E(LGM.termName(n))} ${E(L('音乐创作演绎会', 'Annual Concert'))}</h1>
          ${t['主题_zh'] ? `<div class="gig-theme">《${E(LGM.pick(t, '主题'))}》${LGM.lang === 'zh' && t['主题_en'] ? `<small>${E(t['主题_en'])}</small>` : ''}</div>` : ''}
          <dl class="gig-rows">${[['DATE // 日期', dt ? ymd(dt) + wk(dt) : t['日期']], ['TIME // 时间', hm(dt)], ['VENUE // 地点', venue]].filter(([, v]) => v).map(([k, v]) => `<div><dt>${k}</dt><dd>${E(v)}</dd></div>`).join('')}</dl>
          ${LGM.split(LGM.pick(t, '简介')).map((x) => `<p style="margin:0 0 10px;line-height:1.75">${E(x)}</p>`).join('')}
          <div class="btns">${t['官方贴文'] ? `<a class="btn y" href="${E(t['官方贴文'])}" target="_blank" rel="noopener">${E(L('官方贴文', 'OFFICIAL POST'))} ↗</a>` : ''}
            ${t['播放清单'] ? `<a class="btn" href="${E(t['播放清单'])}" target="_blank" rel="noopener">▶ ${E(L('演出播放清单', 'LIVE PLAYLIST'))}</a>` : ''}</div>
        </div>
        <div class="gig-stub">${poster ? `<div style="border:2px solid var(--ink);background:#fff;padding:6px">${LGM.imgTag(poster, 'Poster', '')}</div>` : ''}
          ${barcode('LGM-ARCHIVE-' + n)}<div class="foot mono">SERIAL: LGM-${E(n)}-${dt ? dt.getFullYear() : 'TBA'}</div></div>
      </div>
      ${vid ? `<div class="sec"><div class="label">FULL CONCERT TAPE // ${E(L('完整录影', 'FULL RECORDING'))}</div>
        <div class="box" style="padding:8px"><div style="aspect-ratio:16/9"><iframe style="width:100%;height:100%;border:0" src="https://www.youtube-nocookie.com/embed/${vid}?rel=0" title="${E(LGM.termName(n))}" loading="lazy" allow="encrypted-media; picture-in-picture" allowfullscreen></iframe></div></div></div>` : ''}
      ${ev.length ? `<div class="sec"><div class="label">GIG STUBS // ${E(L('这一届的活动', 'EVENTS THIS YEAR'))}</div><div class="grid">${ev.map(evCard).join('')}</div></div>` : ''}
      ${sg.length ? `<div class="sec"><div class="sec-h"><h2>TRACKLIST <em>// ${E(L('这一届的歌', 'SONGS'))}</em></h2><span class="tag">${sg.length} TRACKS</span></div><div class="grid">${sg.map(songStub).join('')}</div></div>` : ''}
      ${merch.length ? `<div class="sec film"><div class="label">MERCH TABLE // ${E(L('本届周边', 'MERCHANDISE'))}</div>
        ${LGM.pick(t, '周边说明') ? `<p style="margin:0 0 6px;color:#ddd">${E(LGM.pick(t, '周边说明'))}</p>` : ''}
        <div class="frames">${merch.map((m, k) => `<div class="frame"><span class="fno">ITEM #${pad(k + 1)}</span>${LGM.imgTag(m, 'Merch', '')}</div>`).join('')}</div></div>` : ''}
      ${t['团照'] || crew.length ? `<div class="sec"><div class="label">CREW // ${E(L('这一届的筹委', 'COMMITTEE'))}</div>
        ${t['团照'] ? `<div class="crew-photo" style="margin-bottom:18px">${LGM.imgTag(t['团照'], 'Committee', '')}<span class="cap">${E(t['学年'] || '')} COMMITTEE</span></div>` : ''}
        ${crew.length ? `<div class="grid">${crew.map((r, k) => `<div class="pass"><span class="no">${pad(k + 1)}</span><span class="tag ${k === 0 ? 'r' : 'y'}">${E(LGM.pick(r, '职位'))}</span><h3>${E(r['成员'])}</h3>${barcode('P-' + n + '-' + k)}<div class="foot"><span>LGM-${E(n)}-${pad(k + 1)}</span><span>ALL ACCESS</span></div></div>`).join('')}</div>` : ''}</div>` : ''}
      ${spons.length ? `<div class="sec"><div class="label">PATRONS // ${E(L('这一届的赞助伙伴', 'SPONSORS'))}</div><div class="allies">${spons.map((r) => `<div class="ally">${r['logo'] ? LGM.imgTag(r['logo'], r['商家名'], '') : ''}<b>${E(r['商家名'])}</b><small>${E(r['等级'] || '')}</small></div>`).join('')}</div></div>` : ''}
      </div>
      <div class="stage-band hidden" id="term-donors"></div>
      <div class="wrap"><div class="sec" style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap">
        ${older ? `<a class="btn" href="term.html?t=${encodeURIComponent(older['届数'])}">← ${E(LGM.termName(older['届数']))}</a>` : '<span></span>'}
        <a class="btn y" href="history.html">${E(L('回到历届', 'BACK TO HISTORY'))}</a>
        ${newer ? `<a class="btn" href="term.html?t=${encodeURIComponent(newer['届数'])}">${E(LGM.termName(newer['届数']))} →</a>` : '<span></span>'}</div></div>`;
  };

  /* ---------- 互动：筛选、搜寻 ---------- */
  function wire() {
    // 活动类型筛选
    app.querySelectorAll('.filters button[data-f]').forEach((b) => b.addEventListener('click', () => {
      app.querySelectorAll('.filters button[data-f]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      const f = b.dataset.f;
      app.querySelectorAll('.term-block').forEach((blk) => {
        let n = 0;
        blk.querySelectorAll('.stub').forEach((c) => { const ok = !f || c.dataset.type === f; c.classList.toggle('hidden', !ok); n += ok; });
        blk.classList.toggle('hidden', !n);
      });
    }));
    // 歌曲筛选
    app.querySelectorAll('.filters button[data-y]').forEach((b) => b.addEventListener('click', () => {
      app.querySelectorAll('.filters button[data-y]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      const y = b.dataset.y;
      document.getElementById('more')?.parentElement.remove();
      app.querySelectorAll('#tracks .trk').forEach((c) => c.classList.toggle('hidden', !!y && (y === 'award' ? c.dataset.award !== '1' : c.dataset.year !== y)));
    }));
    const sq = document.getElementById('song-q');
    if (sq) sq.addEventListener('input', () => {
      const v = sq.value.trim().toLowerCase();
      document.getElementById('more')?.parentElement.remove();
      app.querySelectorAll('.filters button[data-y]').forEach((x) => x.setAttribute('aria-pressed', String(!x.dataset.y)));
      app.querySelectorAll('#tracks .trk').forEach((c) => c.classList.toggle('hidden', !!v && !c.textContent.toLowerCase().includes(v)));
    });
    document.getElementById('more')?.addEventListener('click', (e) => { app.querySelectorAll('#tracks .extra').forEach((x) => x.classList.remove('hidden')); e.target.parentElement.remove(); });
    // 名册搜寻 + 届数筛选
    const q = document.getElementById('q');
    let tf = '';
    const filt = () => {
      const v = (q ? q.value : '').trim().toLowerCase(); let n = 0;
      app.querySelectorAll('#roster tr').forEach((tr) => { const ok = (!tf || tr.dataset.t === tf) && (!v || tr.textContent.toLowerCase().includes(v)); tr.classList.toggle('hidden', !ok); n += ok; });
      const c = document.getElementById('roster-n'); if (c) c.textContent = `${n} RECORDS`;
    };
    if (q) q.addEventListener('input', filt);
    app.querySelectorAll('.filters button[data-t]').forEach((b) => b.addEventListener('click', () => {
      app.querySelectorAll('.filters button[data-t]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      tf = b.dataset.t; filt();
    }));
  }

  function render() {
    timers.forEach(clearInterval); timers = [];
    document.documentElement.lang = LGM.lang === 'en' ? 'en' : 'zh-Hans';
    chrome();
    app.innerHTML = (P[page] || P.index)();
    startCountdown();
    wire();
    runAllies();
    const don = document.getElementById('donate');
    if (don && LGM.donorBlock) LGM.donorBlock(don, d, { cta: !!LGM.setting(d, 'donation') });
    const td = document.getElementById('term-donors');
    if (td && LGM.donorBlock) { const tt = new URLSearchParams(location.search).get('t') || cur; LGM.donorBlock(td, d, { term: String(tt) }); }
  }
  render();
  LGM.onLang(render);
})();
