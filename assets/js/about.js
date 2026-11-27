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
  /* ---------- 梦开始的地方：名字拼成 LGM ---------- */
  const people = LGM.live(d.members).filter((r) => String(r['名字'] || '').trim())
    .map((r) => ({ name: String(r['名字']).trim(), term: String(r['届数'] || '').trim() }));
  let lastW = 0;

  function renderNames() {
    $('dream-block').classList.toggle('hidden', !people.length);
    if (!people.length) return;
    const terms = [...new Set(people.map((p) => p.term).filter(Boolean))].sort((a, b) => b - a);
    $('dream-sub').textContent = LGM.f('ab.dreamSub', { n: people.length, t: terms.length });
    $('name-search').placeholder = LGM.t('ab.find');
    $('name-art').setAttribute('aria-label', LGM.t('ab.dream'));
    $('name-list').innerHTML = terms.map((t) => `<p style="margin:0 0 10px"><b>${LGM.esc(LGM.termName(t))}</b>　${people.filter((p) => p.term === t).map((p) => LGM.esc(p.name)).join('、')}</p>`).join('');
    lastW = 0; drawArt();
  }

  async function drawArt() {
    const box = $('name-art');
    const BW = box.clientWidth;
    if (!BW || BW === lastW) return;
    lastW = BW;
    try { await document.fonts.load('400 100px "Archivo Black"'); } catch (e) { /* 字体没载到就用后备字体 */ }
    // 手机太窄：先用较宽的版面排好再整体缩小，字形才看得清楚（找名字用上面的搜寻）
    // 名字太多放不下时：先缩小字，再加宽版面，保证每个名字至少出现一次
    let W = Math.max(BW, 720), fs = W < 900 ? 10 : 12, out;
    for (let tries = 0; tries < 12; tries++) {
      out = layout(W, fs);
      if (out.count >= people.length) break;
      if (fs > 7) fs -= 1; else W = Math.round(W * 1.25);
    }
    const scale = BW / W, H = out.H, html = out.html;
    box.style.height = Math.ceil(H * scale) + 'px';
    box.innerHTML = `<div class="name-art-inner" style="width:${W}px;height:${H}px;transform:scale(${scale})">${html}</div>`;
    search();
  }

  // 用画布画出「LGM」，逐行找出字里面的横向区段，再把名字依序填进去
  function layout(W, fs) {
    const font = (px) => `400 ${px}px "Archivo Black", Impact, sans-serif`;
    const c = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    c.font = font(100);
    const m100 = c.measureText('LGM');
    const size = 100 * (W * 0.99) / (m100.actualBoundingBoxRight + m100.actualBoundingBoxLeft);
    c.font = font(size);
    const m = c.measureText('LGM');
    const H = Math.ceil(m.actualBoundingBoxAscent + m.actualBoundingBoxDescent) + 4;
    c.canvas.width = W; c.canvas.height = H;
    c.font = font(size);
    c.fillText('LGM', m.actualBoundingBoxLeft + (W - m.actualBoundingBoxRight - m.actualBoundingBoxLeft) / 2, m.actualBoundingBoxAscent + 2);
    const px = c.getImageData(0, 0, W, H).data;
    const inside = (x, y) => px[(Math.round(y) * W + Math.round(x)) * 4 + 3] > 110;

    const line = Math.round(fs * 1.3);
    const meas = document.createElement('canvas').getContext('2d');
    meas.font = `700 ${fs}px "Noto Sans SC", sans-serif`;
    const sep = ' · ', sepW = meas.measureText(sep).width;
    let k = 0, html = '';
    for (let y = 0; y + line <= H; y += line) {
      const ok = (x) => inside(x, y + line * 0.15) && inside(x, y + line * 0.5) && inside(x, y + line * 0.85);
      let x = 0;
      while (x < W) {
        while (x < W && !ok(x)) x += 1;
        const x0 = x;
        while (x < W && ok(x)) x += 1;
        const w = x - x0;
        if (w < fs * 2) continue;
        let used = 0, spans = '';
        while (used < w) {
          const p = people[k % people.length];
          const nw = meas.measureText(p.name).width + sepW;
          if (used + nw > w + nw * 0.4 && spans) break; // 放不完整就留给下一段，避免名字被切掉太多
          k++;
          spans += `<span class="c${(+p.term || 0) % 3}" title="${LGM.esc(LGM.termName(p.term))}">${LGM.esc(p.name)}</span>${sep}`;
          used += nw;
        }
        html += `<div style="left:${x0}px;top:${y}px;width:${w}px;height:${line}px;font-size:${fs}px;line-height:${line}px">${spans}</div>`;
      }
    }
    return { H, html, count: k };
  }

  function search() {
    const q = $('name-search').value.trim().toLowerCase();
    const box = $('name-art');
    box.classList.toggle('searching', !!q);
    box.querySelectorAll('span').forEach((sp) => sp.classList.toggle('hit', !!q && sp.textContent.toLowerCase().includes(q)));
  }
  $('name-search').addEventListener('input', search);
  let rt;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(drawArt, 200); });

  /* ---------- 乐捐感谢墙 ---------- */
  function renderDonors() {
    const rows = LGM.live(d.donors).filter((r) => r['届数'] || r['名字']);
    const anon = (n) => !n || /^(匿名|anonymous)$/i.test(n.trim());
    $('donor-wall').innerHTML = rows.length
      ? rows.sort((a, b) => (+b['届数'] || 0) - (+a['届数'] || 0)).map((r) =>
          `<span class="${anon(r['名字']) ? 'anon' : ''}">${LGM.esc(anon(r['名字']) ? LGM.t('ab.anon') : r['名字'])}${r['届数'] ? `<small>${LGM.esc(r['届数'])}</small>` : ''}</span>`).join('')
      : `<a class="btn pink" href="partners.html#donate">${LGM.t('ab.firstDonor')}</a>`;
  }

  render();
  LGM.onLang(render);
})();
