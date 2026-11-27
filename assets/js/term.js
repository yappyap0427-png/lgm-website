/* 每届档案页：term.html?t=26 */
(async function () {
  const d = await LGM.load();
  const s = d.settings;
  LGM.layout('events', d);
  const $ = (id) => document.getElementById(id);
  const terms = (d.terms || []).filter((t) => t['届数']).sort((a, b) => (+b['届数']) - (+a['届数']));
  const want = new URLSearchParams(location.search).get('t') || s.current_term;
  const t = terms.find((x) => x['届数'] === want) || terms[0];
  if (!t) return;
  const n = t['届数'];
  const i = terms.indexOf(t);
  const newer = terms[i - 1], older = terms[i + 1];

  function render() {
    document.title = `${LGM.termName(n)}${t['主题_zh'] ? ` 《${t['主题_zh']}》` : ''} · 小草颂 LGM`;
    $('tabs').innerHTML = terms.map((x) => `<a href="term.html?t=${encodeURIComponent(x['届数'])}" class="${x === t ? 'on' : ''}" ${x === t ? 'aria-current="page"' : ''}>${LGM.esc(x['届数'])}</a>`).join('');

    const isCurrent = n === s.current_term;
    const date = isCurrent && s.concert_datetime ? s.concert_datetime : t['日期'];
    const venue = isCurrent ? (LGM.setting(d, 'venue') || t['地点']) : t['地点'];
    const poster = t['海报'] || (isCurrent ? s.poster : '');
    const events = LGM.sortEvents(LGM.live(d.events).filter((r) => r['届数'] === n && r['类型'] !== '年度音乐会'));
    const songs = LGM.live(d.songs).filter((r) => r['届数'] === n);
    const team = (d.committee || []).filter((r) => r['届数'] === n && r['成员']).sort(LGM.byOrder);
    const spons = LGM.live(d.sponsors).filter((r) => r['届数'] === n);
    const video = LGM.yt(t['影片_youtube']);
    const desc = LGM.split(LGM.pick(t, '简介'));
    const photo = t['团照'], merch = LGM.split(t['周边图']), post = t['官方贴文'];
    const empty = !video && !events.length && !songs.length && !team.length && !spons.length && !photo && !merch.length;

    $('term').innerHTML = `
      <section class="wrap hero" style="padding-top:40px;padding-bottom:64px">
        <div class="hero-grid" style="align-items:center;margin-top:0">
          <div class="hero-main">
            <div style="display:flex;align-items:flex-end;gap:18px;flex-wrap:wrap">
              <span class="big-n">${LGM.esc(n)}</span>
              <span class="display" style="font-size:22px;padding-bottom:10px">${LGM.esc(LGM.termName(n))}<br>${LGM.esc(t['学年'] || '')}</span>
            </div>
            ${t['主题_zh'] ? `<h1 style="margin-top:28px">${LGM.esc(t['主题_zh'])}</h1>` : ''}
            ${t['主题_en'] ? `<div class="display sub-en">${LGM.esc(t['主题_en'].toUpperCase())}</div>` : ''}
            <div class="facts">${[date ? LGM.dateLong(date) : '', venue].filter(Boolean).map((x) => `<span>${LGM.esc(x)}</span>`).join('')}</div>
            ${desc.map((p) => `<p>${LGM.esc(p)}</p>`).join('')}
            ${post ? `<p><a class="btn" style="--r:-1deg;margin-top:10px" href="${LGM.esc(post)}" target="_blank" rel="noopener">${LGM.t('ar.post')}</a></p>` : ''}
          </div>
          <div class="hero-side" style="min-height:420px"><div class="pasted">${LGM.imgTag(poster, LGM.lang === 'en' ? 'Poster' : '海报', '')}</div><div class="tape" style="background:rgba(255,77,141,.8)"></div></div>
        </div>
      </section>

      ${video ? `<section class="wrap" style="padding-bottom:40px">
        <div class="sec-title"><h2 class="display" style="font-size:clamp(26px,4vw,40px)">${LGM.t('ar.video')}</h2>
        ${t['播放清单'] ? `<a href="${LGM.esc(t['播放清单'])}" target="_blank" rel="noopener" style="font-weight:900">${LGM.t('ar.playlist')}</a>` : ''}</div>
        ${video}</section>` : ''}

      ${events.length ? `<section class="wrap block"><div class="sec-title"><h2>${LGM.t('ar.events')}</h2></div>
        <div class="grid tilt fill" style="--min:250px;gap:28px">${events.map((r) => LGM.eventCard(r, { desc: true })).join('')}</div></section>` : ''}

      ${songs.length ? `<section class="wrap block"><div class="sec-title"><h2 class="display">NEW SONGS<span style="color:var(--pink)">.</span> <span style="font-family:var(--body);font-size:22px">${LGM.t('ar.songs')}</span></h2></div>
        <div class="sleeves">${songs.map(LGM.songCard).join('')}</div></section>` : ''}

      ${merch.length ? `<section class="wrap block"><div class="sec-title"><h2 class="display">MERCH<span style="color:var(--blue)">.</span> <span style="font-family:var(--body);font-size:22px">${LGM.t('ar.merch')}</span></h2></div>
        ${LGM.pick(t, '周边说明') ? `<p class="muted" style="margin:-10px 0 24px;font-size:17px;line-height:1.7">${LGM.esc(LGM.pick(t, '周边说明'))}</p>` : ''}
        <div class="proof-grid">${merch.map((m) => `<figure>${LGM.imgTag(m, 'Merch', '')}</figure>`).join('')}</div></section>` : ''}

      ${team.length || photo ? `<section class="wrap block"><div class="sec-title"><h2>${LGM.t('ar.team')}</h2></div>
        ${photo ? `<div class="team-photo">${LGM.imgTag(photo, LGM.t('ar.team'), '')}</div>` : ''}
        <div class="team">${team.map((r) => `<div><b>${LGM.esc(LGM.pick(r, '职位'))}</b><span>${LGM.esc(r['成员'])}</span></div>`).join('')}</div></section>` : ''}

      ${spons.length ? `<section class="block"><div class="wrap display" style="font-size:18px">${LGM.t('ar.sponsors')}</div>
        <div style="margin-top:16px;background:var(--ink);overflow:hidden;padding:18px 0;transform:rotate(-1.5deg)"><div class="track" style="color:var(--yellow);font-family:var(--display);font-size:22px">${
          (() => { const one = `<span>${spons.map((r) => LGM.esc(r['商家名'])).join(' ★ ')} ★ </span>`; return one + one; })()}</div></div></section>` : ''}

      ${empty ? `<section class="wrap block"><p class="empty">${LGM.t('ar.nodata')}</p></section>` : ''}

      <section class="wrap block" style="padding-bottom:90px;display:flex;flex-wrap:wrap;gap:16px;justify-content:space-between;align-items:center">
        ${older ? `<a class="btn" href="term.html?t=${encodeURIComponent(older['届数'])}">${LGM.t('ar.prev')} ${LGM.esc(older['届数'])}</a>` : '<span></span>'}
        <div class="brush" style="font-size:clamp(24px,3.5vw,34px);text-align:center;flex:1 1 300px">${LGM.t('ar.thanks')}</div>
        ${newer ? `<a class="btn blue" style="--r:2deg" href="term.html?t=${encodeURIComponent(newer['届数'])}">${LGM.esc(newer['届数'])} ${LGM.t('ar.next')}</a>` : '<span></span>'}
      </section>`;
  }
  render();
  LGM.onLang(render);
})();
