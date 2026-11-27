/* 首页：Hero 依 settings.phase 切换（招商期 / 宣传期 / 回顾期） */
(async function () {
  const d = await LGM.load();
  const s = d.settings;
  LGM.layout('home', d);
  let timer = null;
  const repeat = (html, min) => { let out = html, n = 1; while (n < min) { out += html; n++; } return out; };

  // 27 → 廿七（只在中文用）
  function cnNum(n) {
    if (LGM.lang === 'en') return n;
    const x = parseInt(n, 10); if (!x || x > 99) return n;
    const D = '〇一二三四五六七八九', t = Math.floor(x / 10), o = x % 10;
    const tens = t === 0 ? '' : t === 1 ? '十' : t === 2 ? '廿' : t === 3 ? '卅' : D[t] + '十';
    return tens + (o ? D[o] : '');
  }

  function hero() {
    const n = s.current_term || '';
    const phase = s.phase || '招商期';
    const el = document.getElementById('hero-body');
    const title = LGM.setting(d, 'concert_title');
    const titleEn = s.concert_title_en && LGM.lang === 'zh' ? s.concert_title_en : '';
    const when = s.concert_datetime ? LGM.dateLong(s.concert_datetime) : LGM.month(s.concert_month);
    const venue = LGM.setting(d, 'venue');
    clearInterval(timer);

    if (phase === '宣传期') {
      el.innerHTML = `
        <div class="hero-main">
          <div class="kicker">${LGM.f('hero.promo.kicker', { n })}</div>
          <h1 style="margin-top:10px">《${LGM.esc(title || '…')}》${titleEn ? `<div class="display sub-en">${LGM.esc(titleEn)}</div>` : ''}</h1>
          <div class="countdown" id="cd"></div>
          <div class="facts">
            ${when ? `<span>${LGM.esc(when)}</span>` : ''}
            ${venue ? `<span>${LGM.esc(venue)}</span>` : ''}
            ${s.ticket_price ? `<span style="background:var(--yellow)">${LGM.esc(s.ticket_price)}</span>` : ''}
          </div>
          <div class="btns">
            ${s.ticket_url ? `<a class="btn blue" href="${LGM.esc(s.ticket_url)}" target="_blank" rel="noopener">${LGM.t('btn.ticket')}</a>` : ''}
            <a class="btn" href="partners.html">${LGM.t('btn.sponsor')}</a>
          </div>
        </div>
        <div class="hero-side"><div class="pasted">${LGM.imgTag(s.poster, 'Poster', '')}</div><div class="tape"></div></div>`;
      timer = LGM.countdown(document.getElementById('cd'), s.concert_datetime);
    } else if (phase === '回顾期') {
      el.innerHTML = `
        <div class="hero-main" style="flex-basis:100%">
          <div class="kicker">${LGM.f('hero.recap.kicker', { n })}</div>
          <h1 style="margin:10px 0 28px">${LGM.t('hero.recap.title')}</h1>
          ${LGM.yt(s.recap_youtube)}
          <div class="btns"><a class="btn pink" href="partners.html">${LGM.t('btn.sponsor')}</a>${s.instagram ? `<a class="btn" href="${LGM.esc(s.instagram)}" target="_blank" rel="noopener">${LGM.t('btn.ig')}</a>` : ''}</div>
        </div>`;
    } else {
      // 招商期：主题公布了就显示主题 + 日期 + 倒数，没公布就「敬请期待」
      const main = title ? `
          <div class="kicker">${LGM.f('hero.teaser.kicker', { n })}</div>
          <h1 style="margin-top:10px"><span class="hl">《${LGM.esc(title)}》</span>${titleEn ? `<div class="display sub-en">${LGM.esc(titleEn)}</div>` : ''}</h1>
          <div class="facts">${when ? `<span>${LGM.esc(when)}</span>` : ''}${venue ? `<span>${LGM.esc(venue)}</span>` : ''}</div>
          <div class="countdown" id="cd"></div>`
        : `<h1>${LGM.f('hero.teaser.title', { n: cnNum(n) })}</h1>
           <p>${LGM.f('hero.teaser.body', { month: LGM.month(s.concert_month) })}</p>`;
      el.innerHTML = `
        <div class="hero-main">
          ${main}
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
      timer = LGM.countdown(document.getElementById('cd'), s.concert_datetime);
    }
  }

  function tapes() {
    const a = `<span>${LGM.t('tape').repeat(2)}</span>`;
    document.getElementById('tape-a').innerHTML = a + a;
    const songs = LGM.live(d.songs).map((r) => (LGM.lang === 'en' && r['拼音']) ? r['拼音'] : r['歌名']).filter(Boolean);
    const b = `<span>${LGM.esc(songs.join(' / '))} / </span>`;
    document.getElementById('tape-b').innerHTML = b + b;
    LGM.marquee(document.getElementById('tape-a'), 50);
    LGM.marquee(document.getElementById('tape-b'), 40);
  }

  function stats() {
    const box = document.getElementById('stats');
    box.innerHTML = LGM.statHTML(LGM.stats(d, '首页'));
    LGM.countUp(box);
  }

  function events() {
    const rows = LGM.sortEvents(LGM.live(d.events).filter((r) => r['类型'] !== '年度音乐会')).slice(0, 3);
    const box = document.getElementById('events');
    box.innerHTML = rows.length ? rows.map((r) => LGM.eventCard(r, { desc: true })).join('') : `<p class="empty">${LGM.t('sec.events.empty')}</p>`;
  }

  function songs() {
    const rows = LGM.live(d.songs).filter((r) => LGM.on(r['精选'])).slice(0, 4);
    const block = document.getElementById('songs-block');
    block.classList.toggle('hidden', !rows.length);
    document.getElementById('songs').innerHTML = rows.map(LGM.songCard).join('');
  }

  function logos() {
    const rows = LGM.live(d.sponsors);
    const block = document.getElementById('partners-block');
    block.classList.toggle('hidden', !rows.length);
    if (!rows.length) return;
    const one = rows.map((r) => {
      const inner = r['logo'] ? LGM.imgTag(r['logo'], r['商家名'], '', true) : LGM.esc(r['商家名']);
      return r['网址'] ? `<a class="logo-item" href="${LGM.esc(r['网址'])}" target="_blank" rel="noopener">${inner}</a>` : `<div class="logo-item">${inner}</div>`;
    }).join('');
    const half = repeat(one, Math.ceil(8 / rows.length));
    document.getElementById('logos').innerHTML = half + half;
    LGM.marquee(document.getElementById('logos'), 40);
  }

  function render() { hero(); tapes(); LGM.fundBar(document.getElementById('fund-bar'), d); stats(); events(); songs(); logos(); }
  render();
  LGM.onLang(render);
})();
