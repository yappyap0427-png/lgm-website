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
    $('team-block').classList.toggle('hidden', !team.length);
    $('team').innerHTML = team.map((r) => `<div><b>${LGM.esc(LGM.pick(r, '职位'))}</b><span>${LGM.esc(r['成员'])}</span></div>`).join('');
    $('team-link').href = `term.html?t=${encodeURIComponent(n)}`;
    $('team-link').textContent = LGM.t('ev.archive');

    const join = s.join_form_url || s.instagram;
    $('join').innerHTML = join ? `<a class="btn yellow" style="--r:-3deg" href="${LGM.esc(join)}" target="_blank" rel="noopener">${LGM.t(s.join_form_url ? 'ab.joinBtn' : 'ab.joinIG')}</a>` : '';
  }
  render();
  LGM.onLang(render);
})();
