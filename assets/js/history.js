/* 历届页：大事记（左音乐会、右得奖与成就）+ 历届小草草地（members 分页） */
(async function () {
  const d = await LGM.load();
  LGM.layout('history', d);
  const $ = (id) => document.getElementById(id);

  const yearOf = (t) => (String(t['日期']).match(/^\d{4}/) || [])[0]
    || (t['学年'] && /\/(\d{2})/.test(t['学年']) ? '20' + t['学年'].split('/')[1].slice(0, 2) : '');

  function timeline() {
    const rows = {};
    const row = (y) => (rows[y] = rows[y] || { gigs: [], wins: [] });
    (d.terms || []).forEach((t) => {
      const y = yearOf(t);
      if (!t['主题_zh'] || !y || +y > new Date().getFullYear()) return;
      row(y).gigs.push(`<a class="gig" href="term.html?t=${encodeURIComponent(t['届数'])}">
        ${t['海报'] ? LGM.imgTag(t['海报'], LGM.pick(t, '主题'), '') : ''}
        <span><small>${LGM.esc(LGM.termName(t['届数']))}</small><b>《${LGM.esc(LGM.pick(t, '主题'))}》</b></span></a>`);
    });
    LGM.live(d.songs).filter((r) => r['获奖_zh'] && r['年份']).forEach((r) => row(r['年份']).wins.push(`<li>《${LGM.esc(r['歌名'])}》— ${LGM.esc(LGM.pick(r, '获奖'))}</li>`));
    LGM.live(d.awards_other).filter((r) => r['年份']).forEach((r) => row(r['年份']).wins.push(`<li>${LGM.esc(LGM.pick(r, '内容'))}</li>`));
    $('tl2').innerHTML = Object.keys(rows).sort((a, b) => b - a).map((y) => `
      <div class="tl2-row">
        <div class="tl2-l">${rows[y].gigs.join('')}</div>
        <div class="tl2-yr">${y}</div>
        <div class="tl2-r">${rows[y].wins.length ? `<ul>${rows[y].wins.join('')}</ul>` : ''}</div>
      </div>`).join('')
      + `<div class="tl2-row"><div class="founded">2000 · ${LGM.t('hi.founded')}</div></div>`;
  }

  // 历届小草
  const people = LGM.live(d.members).filter((r) => String(r['名字'] || '').trim()).map((r) => {
    const name = String(r['名字']).trim(), cjk = name.match(/[㐀-鿿]+/g);
    return { name, short: cjk ? cjk.join('') : name, term: String(r['届数'] || '').trim() };
  });
  const field = people.length ? LGM.grassField($('grass'), people, {
    onFocus: (t, c, who) => { $('grass-now').textContent = t ? LGM.f('hi.focus', { who, t: LGM.termName(t), c }) : ''; }
  }) : null;
  $('grass-search').addEventListener('input', (e) => {
    const c = field ? field.search(e.target.value) : 0;
    $('grass-now').textContent = e.target.value.trim() ? (c ? LGM.f('hi.found', { c }) : LGM.t('hi.notFound')) : '';
  });

  function grass() {
    $('grass-block').classList.toggle('hidden', !people.length);
    if (!people.length) return;
    const terms = [...new Set(people.map((p) => p.term).filter(Boolean))].sort((a, b) => b - a);
    $('grass-sub').textContent = LGM.f('hi.grassSub', { n: people.length, t: terms.length });
    $('grass-search').placeholder = LGM.t('ab.find');
    $('grass').setAttribute('aria-label', LGM.t('hi.grass'));
    $('gf-hint').textContent = LGM.t('hi.hint');
    $('grass-list').innerHTML = terms.map((t) => `<p><b>${LGM.esc(LGM.termName(t))}</b>　${people.filter((p) => p.term === t).map((p) => LGM.esc(p.name)).join('、')}</p>`).join('');
    field.draw(true);
  }

  function render() { timeline(); grass(); }
  render();
  LGM.onLang(render);
})();
