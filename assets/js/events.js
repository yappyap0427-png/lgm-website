/* 活动页：本届音乐会大卡 + 依类型筛选、依届分组的常年活动 */
(async function () {
  const d = await LGM.load();
  const s = d.settings;
  LGM.layout('events', d);
  const $ = (id) => document.getElementById(id);
  let filter = 'all', timer = null;

  const terms = {};
  (d.terms || []).forEach((t) => { terms[t['届数']] = t; });

  function concert() {
    const n = s.current_term, t = terms[n] || {};
    const title = LGM.setting(d, 'concert_title') || LGM.pick(t, '主题');
    const when = s.concert_datetime ? LGM.dateLong(s.concert_datetime) : LGM.month(s.concert_month || t['日期']);
    clearInterval(timer);
    $('concert').innerHTML = `
      <div style="flex:0 0 190px;aspect-ratio:3/4;border:3px dashed var(--paper);transform:rotate(-3deg);overflow:hidden">
        ${s.poster ? LGM.imgTag(s.poster, 'Poster', '') : `<div style="height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px"><span class="display" style="font-size:64px;color:var(--yellow)">${LGM.esc(n)}</span></div>`}
      </div>
      <div style="flex:1 1 380px;min-width:0">
        <span class="display" style="font-size:13px;background:var(--yellow);color:var(--ink);padding:5px 12px">${LGM.t('ev.concert')} · ${LGM.esc(LGM.termName(n, t['学年']))}</span>
        <div class="brush" style="font-size:clamp(40px,6vw,64px);line-height:1.1;margin-top:14px">${title ? `《${LGM.esc(title)}》` : LGM.f('hero.teaser.kicker', { n })}</div>
        ${s.concert_title_en && LGM.lang === 'zh' ? `<div class="display" style="font-size:28px;color:var(--pink)">${LGM.esc(s.concert_title_en)}</div>` : ''}
        <div style="margin-top:10px;font-weight:700;font-size:17px;color:#CFCBC2">${[when, LGM.setting(d, 'venue')].filter(Boolean).map(LGM.esc).join(' · ')}</div>
        <div class="countdown" id="cd" style="color:var(--ink)"></div>
        <div class="btns">
          ${s.phase === '宣传期' && s.ticket_url ? `<a class="btn pink" href="${LGM.esc(s.ticket_url)}" target="_blank" rel="noopener">${LGM.t('btn.ticket')}</a>` : `<a class="btn pink" href="partners.html">${LGM.t('btn.sponsor')}</a>`}
          <a class="btn" href="term.html?t=${encodeURIComponent(n)}">${LGM.t('ev.archive')}</a>
        </div>
      </div>`;
    timer = LGM.countdown($('cd'), s.concert_datetime);
  }

  function chips() {
    const types = [...new Set(LGM.live(d.events).map((r) => r['类型']).filter((t) => t && t !== '年度音乐会'))];
    $('chips').innerHTML = [['all', LGM.t('ev.all')], ...types.map((t) => [t, LGM.typeLabel(t)])]
      .map(([k, label]) => `<button type="button" class="chip" data-k="${LGM.esc(k)}" aria-pressed="${k === filter}">${LGM.esc(label)}</button>`).join('');
  }

  function groups() {
    const rows = LGM.sortEvents(LGM.live(d.events).filter((r) => r['类型'] !== '年度音乐会'));
    const nums = [...new Set(rows.map((r) => r['届数']))];
    $('groups').innerHTML = nums.map((n) => {
      const items = rows.filter((r) => r['届数'] === n && (filter === 'all' || r['类型'] === filter));
      const t = terms[n] || {};
      return `<div class="term-head">
          <div style="display:flex;align-items:center"><span class="n">${LGM.esc(n)}</span><span class="l">${LGM.esc(LGM.termName(n, t['学年']))}${t['主题_zh'] ? ` · 《${LGM.esc(LGM.pick(t, '主题'))}》` : ''}</span></div>
          <a href="term.html?t=${encodeURIComponent(n)}" style="font-weight:900">${LGM.t('ev.archive')}</a>
        </div>
        ${items.length ? `<div class="grid tilt fill" style="--min:250px;gap:28px">${items.map((r) => LGM.eventCard(r, { desc: true })).join('')}</div>` : `<p class="empty">${LGM.t('ev.empty')}</p>`}`;
    }).join('');
  }

  $('chips').addEventListener('click', (e) => {
    const b = e.target.closest('.chip'); if (!b) return;
    filter = b.dataset.k; chips(); groups();
  });

  function render() { concert(); chips(); groups(); }
  render();
  LGM.onLang(render);
})();
