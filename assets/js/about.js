/* 关于页：介绍、使命愿景、常年活动、梦开始的地方（创社故事）、本届筹委、加入。大事记和历届小草在 history.html */
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

    // 梦开始的地方：创社故事（段落用空行分开）
    const origin = LGM.setting(d, 'origin');
    $('origin-block').classList.toggle('hidden', !origin);
    $('origin').innerHTML = String(origin || '').split(/\n\s*\n|\|/).filter((x) => x.trim()).map((x) => `<p>${LGM.esc(x.trim())}</p>`).join('');

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

    const join = s.join_form_url || s.instagram;
    $('join').innerHTML = join ? `<a class="btn yellow" style="--r:-3deg" href="${LGM.esc(join)}" target="_blank" rel="noopener">${LGM.t(s.join_form_url ? 'ab.joinBtn' : 'ab.joinIG')}</a>` : '';
  }
  render();
  LGM.onLang(render);
})();
