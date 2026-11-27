/* 关于页：介绍、使命愿景、常年活动、时间轴（音乐会 + 得奖）、本届筹委、加入 */
(async function () {
  const d = await LGM.load();
  const s = d.settings;
  LGM.layout('about', d);
  const $ = (id) => document.getElementById(id);

  function render() {
    $('about').textContent = LGM.setting(d, 'about');
    $('mission').textContent = LGM.setting(d, 'mission');
    $('vision').innerHTML = LGM.split(LGM.setting(d, 'vision')).map((x) => `<li>${LGM.esc(x)}</li>`).join('');
    $('acts').innerHTML = LGM.split(LGM.setting(d, 'annual_activities')).map((x, i) =>
      `<div class="card"><div class="display" style="color:${['var(--pink)', 'var(--blue)', 'var(--ink)'][i % 3]}">${String(i + 1).padStart(2, '0')}</div><div style="font-weight:900;font-size:18px;margin-top:4px">${LGM.esc(x)}</div></div>`).join('');

    // 时间轴：每年 = 那年办的音乐会 + 得奖歌曲 + 其他成就
    const years = {};
    const add = (y, html) => { if (!y) return; (years[y] = years[y] || []).push(html); };
    (d.terms || []).forEach((t) => {
      const y = (String(t['日期']).match(/^\d{4}/) || [])[0] || (t['学年'] && /\/(\d{2})/.test(t['学年']) ? '20' + t['学年'].split('/')[1].slice(0, 2) : '');
      if (!t['主题_zh'] || !y || +y > new Date().getFullYear()) return;
      add(y, `<b><a href="term.html?t=${encodeURIComponent(t['届数'])}">${LGM.esc(LGM.termName(t['届数']))}《${LGM.esc(LGM.pick(t, '主题'))}》</a></b>`);
    });
    LGM.live(d.songs).filter((r) => r['获奖_zh']).forEach((r) => add(r['年份'], `《${LGM.esc(r['歌名'])}》— ${LGM.esc(LGM.pick(r, '获奖'))}`));
    LGM.live(d.awards_other).forEach((r) => add(r['年份'], LGM.esc(LGM.pick(r, '内容'))));
    add('2000', LGM.lang === 'en' ? 'LitleGras Music Club is founded at the USM Engineering Campus.' : '小草颂在理大工程系分院成立。');
    $('history').innerHTML = Object.keys(years).sort((a, b) => b - a)
      .map((y) => `<div><div class="yr">${y}</div><ul>${years[y].map((x) => `<li>${x}</li>`).join('')}</ul></div>`).join('');

    // 本届筹委（有名字的才显示）
    const n = s.current_term;
    const team = (d.committee || []).filter((r) => r['届数'] === n && r['成员']).sort(LGM.byOrder);
    const tm = (d.terms || []).find((r) => r['届数'] === n) || {};
    $('team-block').classList.toggle('hidden', !team.length && !tm['团照']);
    $('team-photo').innerHTML = tm['团照'] ? LGM.imgTag(tm['团照'], LGM.t('ab.team'), '') : '';
    $('team-photo').classList.toggle('hidden', !tm['团照']);
    $('team').innerHTML = team.map((r) => `<div><b>${LGM.esc(LGM.pick(r, '职位'))}</b><span>${LGM.esc(r['成员'])}</span></div>`).join('');
    $('team-link').href = `term.html?t=${encodeURIComponent(n)}`;
    $('team-link').textContent = LGM.t('ev.archive');

    renderNames();
    renderDonors();

    const join = s.join_form_url || s.instagram;
    $('join').innerHTML = join ? `<a class="btn yellow" style="--r:-3deg" href="${LGM.esc(join)}" target="_blank" rel="noopener">${LGM.t(s.join_form_url ? 'ab.joinBtn' : 'ab.joinIG')}</a>` : '';
  }
  /* ---------- 梦开始的地方：所有小草的名字拼成 LGM ---------- */
  const people = LGM.live(d.members).filter((r) => String(r['名字'] || '').trim())
    .map((r) => {
      const name = String(r['名字']).trim(), cjk = name.match(/[\u3400-\u9fff]+/g);
      // 字形里只放中文名（短、填得密）；完整名字在滑过和搜寻时出现
      return { name, short: cjk ? cjk.join('') : name, term: String(r['届数'] || '').trim() };
    });
  const art = LGM.nameArt($('name-art'), { people, shape: LGM.shapeText('LGM'), mode: 'fly', spot: true });
  $('name-search').addEventListener('input', (e) => art.search(e.target.value));

  function renderNames() {
    $('dream-block').classList.toggle('hidden', !people.length);
    if (!people.length) return;
    const terms = [...new Set(people.map((p) => p.term).filter(Boolean))].sort((a, b) => b - a);
    $('dream-sub').textContent = LGM.f('ab.dreamSub', { n: people.length, t: terms.length });
    $('name-search').placeholder = LGM.t('ab.find');
    $('name-art').setAttribute('aria-label', LGM.t('ab.dream'));
    $('name-list').innerHTML = terms.map((t) => `<p><b>${LGM.esc(LGM.termName(t))}</b>　${people.filter((p) => p.term === t).map((p) => LGM.esc(p.name)).join('、')}</p>`).join('');
    art.draw(true);
  }

  /* ---------- 乐捐：名字跌进「∞」，筹到多少填多少 ---------- */
  const anon = (n) => !n || /^(匿名|anonymous)$/i.test(String(n).trim());
  const donorRows = LGM.live(d.donors).filter((r) => r['名字'] || r['届数']);
  const donors = () => donorRows.map((r) => {
    const name = anon(r['名字']) ? LGM.t('ab.anon') : String(r['名字']).trim();
    return { name, short: name, term: '' };
  });
  let donorArt;

  function renderDonors() {
    const n = s.current_term;
    const title = LGM.setting(d, 'concert_title');
    const raw = String(s.donation_progress || '').replace('%', '').trim();
    const pct = raw === '' ? 1 : Math.max(0, Math.min(100, parseFloat(raw) || 0)) / 100;
    $('donor-kicker').textContent = LGM.f('ab.donorKicker', { n }) + (title ? ` · ${title}` : '');
    $('donor-sub').textContent = LGM.t(pct < 1 ? 'ab.donorsSubOpen' : 'ab.donorsSub');
    $('donor-pct').classList.toggle('hidden', raw === '');
    $('donor-pct').innerHTML = `<b>${Math.round(pct * 100)}%</b><span>${LGM.t(pct < 1 ? 'ab.raised' : 'ab.raisedDone')}</span>`;
    const list = donors();
    $('donor-art').classList.toggle('hidden', !list.length);
    $('donor-list-wrap').classList.toggle('hidden', !list.length);
    $('donor-list').innerHTML = `<p>${list.map((p) => LGM.esc(p.name)).join('、')}</p>`;
    $('donor-empty').innerHTML = list.length ? '' : `<a class="btn pink" href="partners.html#donate">${LGM.t('ab.firstDonor')}</a>`;
    $('donor-art').setAttribute('aria-label', LGM.t('ab.donors'));
    if (!list.length) return;
    donorArt = donorArt || LGM.nameArt($('donor-art'), { people: list, shape: LGM.shapeInfinity, pct, mode: 'fall', minW: 760 });
    donorArt.draw(true);
  }

  render();
  LGM.onLang(render);
})();
