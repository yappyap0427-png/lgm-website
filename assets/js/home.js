/* 首页：Hero 依 settings.phase 切换（招商期 / 宣传期 / 回顾期） */
(async function () {
  const d = await LGM.load();
  const s = d.settings;
  LGM.layout('home', d);
  let timer = null;

  const TAG_COLOR = { '造势活动': 'var(--pink)', 'Christmas Party': 'var(--pink)', 'Mini Concert': 'var(--blue)', 'Symposium': 'var(--blue)' };
  const repeat = (html, min) => { let out = html, n = 1; while (n < min) { out += html; n++; } return out; };

  function hero() {
    const n = s.current_term || '';
    const phase = s.phase || '招商期';
    const el = document.getElementById('hero-body');
    clearInterval(timer);

    if (phase === '宣传期') {
      const title = LGM.setting(d, 'concert_title') || LGM.f('hero.teaser.title', { n }).replace(/<[^>]+>/g, ' ');
      el.innerHTML = `
        <div class="hero-main">
          <div class="display" style="color:var(--pink);font-size:20px">${LGM.f('hero.promo.kicker', { n })}</div>
          <h1 style="margin-top:10px">${LGM.esc(title)}</h1>
          <div class="countdown" id="cd"></div>
          <div class="facts">
            ${s.concert_datetime ? `<span>${LGM.esc(s.concert_datetime)}</span>` : ''}
            ${LGM.setting(d, 'venue') ? `<span>${LGM.esc(LGM.setting(d, 'venue'))}</span>` : ''}
            ${s.ticket_price ? `<span style="background:var(--yellow)">${LGM.esc(s.ticket_price)}</span>` : ''}
          </div>
          <div class="btns">
            ${s.ticket_url ? `<a class="btn blue" href="${LGM.esc(s.ticket_url)}" target="_blank" rel="noopener">${LGM.t('btn.ticket')}</a>` : ''}
            <a class="btn" href="partners.html">${LGM.t('btn.sponsor')}</a>
          </div>
        </div>
        <div class="hero-side"><div class="pasted">${LGM.imgTag(s.poster, 'Poster', '')}</div><div class="tape"></div></div>`;
      countdown();
    } else if (phase === '回顾期') {
      const src = LGM.ytEmbed(s.recap_youtube);
      el.innerHTML = `
        <div class="hero-main" style="flex-basis:100%">
          <div class="display" style="color:var(--pink);font-size:20px">${LGM.f('hero.recap.kicker', { n })}</div>
          <h1 style="margin:10px 0 28px">${LGM.t('hero.recap.title')}</h1>
          <div class="video">${src ? `<iframe src="${src}" title="Concert recap" allow="encrypted-media; picture-in-picture" allowfullscreen loading="lazy"></iframe>` : ''}</div>
          <div class="btns"><a class="btn pink" href="partners.html">${LGM.t('btn.sponsor')}</a>${s.instagram ? `<a class="btn" href="${LGM.esc(s.instagram)}" target="_blank" rel="noopener">${LGM.t('btn.ig')}</a>` : ''}</div>
        </div>`;
    } else {
      el.innerHTML = `
        <div class="hero-main">
          <h1>${LGM.f('hero.teaser.title', { n: cnNum(n) })}</h1>
          <p>${LGM.f('hero.teaser.body', { month: LGM.month(s.concert_month) })}</p>
          <div class="btns">
            <a class="btn blue" href="partners.html">${LGM.t('btn.sponsor')}</a>
            ${s.instagram ? `<a class="btn" href="${LGM.esc(s.instagram)}" target="_blank" rel="noopener">${LGM.t('btn.ig')}</a>` : ''}
          </div>
        </div>
        <div class="hero-side">
          <div class="pasted">${LGM.imgTag(s.hero_photo, LGM.lang === 'en' ? 'Rehearsal photo' : '乐手排练照', '')}</div>
          <div class="tape"></div>
          <div class="stamp">${LGM.stamp(LGM.t('stamp'), n)}</div>
        </div>`;
    }
  }

  // 27 → 廿七（只在中文招商期标题用，英文直接显示数字）
  function cnNum(n) {
    if (LGM.lang === 'en') return n;
    const x = parseInt(n, 10); if (!x || x > 99) return n;
    const D = '〇一二三四五六七八九', t = Math.floor(x / 10), o = x % 10;
    const tens = t === 0 ? '' : t === 1 ? '十' : t === 2 ? '廿' : t === 3 ? '卅' : D[t] + '十';
    return tens + (o ? D[o] : '');
  }

  function countdown() {
    const box = document.getElementById('cd');
    const target = s.concert_datetime ? new Date(s.concert_datetime.replace(' ', 'T') + ':00+08:00') : null;
    if (!box || !target || isNaN(target)) { if (box) box.remove(); return; }
    const tick = () => {
      let ms = Math.max(0, target - Date.now());
      const parts = [['d', 864e5], ['h', 36e5], ['m', 6e4], ['s', 1e3]].map(([k, u]) => { const v = Math.floor(ms / u); ms -= v * u; return [k, v]; });
      box.innerHTML = parts.map(([k, v]) => `<div><b>${String(v).padStart(2, '0')}</b>${LGM.t('cd.' + k)}</div>`).join('');
    };
    tick(); timer = setInterval(tick, 1000);
  }

  function tapes() {
    const a = `<span>${LGM.t('tape').repeat(2)}</span>`;
    document.getElementById('tape-a').innerHTML = a + a;
    const songs = LGM.live(d.songs).map((r) => (LGM.lang === 'en' && r['拼音']) ? r['拼音'] : r['歌名']).filter(Boolean);
    const b = `<span>${LGM.esc(songs.join(' / '))} / </span>`;
    document.getElementById('tape-b').innerHTML = b + b;
  }

  function stats() {
    const rows = LGM.live(d.stats).filter((r) => r['数字'] !== '').sort((x, y) => (+x['顺序'] || 0) - (+y['顺序'] || 0));
    document.getElementById('stats').innerHTML = rows.map((r, i) => `
      <div class="stat"><b class="${i % 2 ? 'blue' : ''}" data-count="${LGM.esc(r['数字'])}" data-suffix="${LGM.esc(r['后缀'])}">${LGM.esc(r['数字'])}${LGM.esc(r['后缀'])}</b>
      <span>${LGM.esc(LGM.pick(r, '名称'))}</span></div>`).join('');
    LGM.countUp(document.getElementById('stats'));
  }

  function events() {
    const rows = LGM.live(d.events).filter((r) => r['类型'] !== '年度音乐会')
      .sort((x, y) => String(y['日期'] || '').localeCompare(String(x['日期'] || ''))).slice(0, 3);
    const box = document.getElementById('events');
    if (!rows.length) { box.innerHTML = `<p class="empty">${LGM.t('sec.events.empty')}</p>`; return; }
    box.innerHTML = rows.map((r) => {
      const name = LGM.pick(r, '名称'), href = r['连结'] || 'events.html', ext = /^https?:/.test(href);
      return `<a class="card event" href="${LGM.esc(href)}" ${ext ? 'target="_blank" rel="noopener"' : ''}>
        ${LGM.imgTag(r['封面'], name, 'cover')}
        <div class="tag" style="color:${TAG_COLOR[r['类型']] || 'var(--ink)'}">${LGM.esc(r['类型'])}</div>
        <h3>${LGM.esc(name)}</h3>
        ${r['日期'] ? `<div class="muted" style="font-size:14px">${LGM.esc(r['日期'])}</div>` : ''}
      </a>`;
    }).join('');
  }

  function logos() {
    const rows = LGM.live(d.sponsors);
    const block = document.getElementById('partners-block');
    if (!rows.length) { block.classList.add('hidden'); return; }
    block.classList.remove('hidden');
    const one = rows.map((r) => {
      const inner = r['logo'] ? LGM.imgTag(r['logo'], r['商家名'], '') : LGM.esc(r['商家名']);
      return r['网址'] ? `<a class="logo-item" href="${LGM.esc(r['网址'])}" target="_blank" rel="noopener">${inner}</a>` : `<div class="logo-item">${inner}</div>`;
    }).join('');
    const half = repeat(one, Math.ceil(8 / rows.length));
    document.getElementById('logos').innerHTML = half + half;
  }

  function render() { hero(); tapes(); stats(); events(); logos(); }
  render();
  LGM.onLang(render);
})();
