/* 音乐页：精选 + 筛选 + 唱片封套 + 历届音乐会录影 */
(async function () {
  const d = await LGM.load();
  const s = d.settings;
  LGM.layout('music', d);
  const $ = (id) => document.getElementById(id);
  let filter = 'all';
  const songs = LGM.live(d.songs).sort((a, b) => (+b['年份'] || 0) - (+a['年份'] || 0));

  function featured() {
    const f = songs.find((r) => LGM.on(r['精选']) && r['youtube']) || songs.find((r) => LGM.on(r['精选'])) || songs[0];
    $('mu-btns').innerHTML = s.youtube ? `<a class="btn ink" href="${LGM.esc(s.youtube)}" target="_blank" rel="noopener">${LGM.t('mu.yt')}</a>` : '';
    if (!f) { $('featured').innerHTML = ''; return; }
    if (f['youtube'] && LGM.ytEmbed(f['youtube'])) {
      $('featured').innerHTML = `<div style="transform:rotate(-2deg)">${LGM.yt(f['youtube'])}<div class="brush" style="font-size:36px;margin-top:14px">${LGM.esc(f['歌名'])}</div></div>`;
      return;
    }
    $('featured').innerHTML = `
      <div aria-hidden="true" style="position:absolute;right:0;top:20px;width:300px;height:300px;max-width:80%;aspect-ratio:1;border-radius:50%;background:repeating-radial-gradient(circle,#111 0 3px,#2A2A2A 3px 5px);display:flex;align-items:center;justify-content:center;animation:spin 8s linear infinite"><div style="width:34%;height:34%;border-radius:50%;background:var(--pink);border:4px solid var(--ink)"></div></div>
      <div style="position:absolute;left:0;top:60px;width:280px;max-width:78%;aspect-ratio:1;background:var(--yellow);border:3px solid var(--ink);box-shadow:8px 8px 0 var(--ink);transform:rotate(-4deg);padding:22px;display:flex;flex-direction:column;justify-content:space-between">
        <span class="display" style="font-size:13px">${LGM.t('mu.now')}</span>
        <span><span class="brush" style="display:block;font-size:clamp(44px,6vw,64px);line-height:1">${LGM.esc(f['歌名'])}</span><span style="font-weight:700">${LGM.esc([f['拼音'], f['年份']].filter(Boolean).join(' · '))}</span></span>
        <span style="font-weight:900;font-size:14px">${LGM.esc(LGM.pick(f, '获奖'))}</span>
      </div>`;
  }

  function chips() {
    const years = [...new Set(songs.map((r) => r['年份']).filter(Boolean))];
    const opts = [['all', LGM.t('mu.all')], ['feat', LGM.t('mu.feat')], ['award', LGM.t('mu.award')], ...years.map((y) => [y, y])];
    $('chips').innerHTML = opts.map(([k, l]) => `<button type="button" class="chip" data-k="${LGM.esc(k)}" aria-pressed="${k === filter}">${LGM.esc(l)}</button>`).join('');
  }

  function grid() {
    const rows = songs.filter((r) => filter === 'all' || (filter === 'feat' ? LGM.on(r['精选']) : filter === 'award' ? !!r['获奖_zh'] : r['年份'] === filter));
    $('songs').innerHTML = rows.map(LGM.songCard).join('');
  }

  function recordings() {
    const rows = (d.terms || []).filter((t) => t['影片_youtube'] || t['播放清单']).sort((a, b) => (+b['届数'] || 0) - (+a['届数'] || 0));
    $('rec-block').classList.toggle('hidden', !rows.length);
    $('recordings').innerHTML = rows.map((t) => `
      <a class="card" href="${LGM.esc(t['播放清单'] || t['影片_youtube'])}" target="_blank" rel="noopener">
        <div class="display" style="font-size:44px;color:var(--blue);line-height:1">${LGM.esc(t['届数'])}</div>
        <div class="brush" style="font-size:30px;margin-top:6px">《${LGM.esc(t['主题_zh'])}》</div>
        ${t['主题_en'] ? `<div class="display" style="font-size:14px;color:var(--pink)">${LGM.esc(t['主题_en'])}</div>` : ''}
        <div style="margin-top:10px;font-weight:900;display:flex;align-items:center;gap:6px"><svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>YouTube · ${LGM.esc(t['学年'])}</div>
      </a>`).join('');
  }

  $('chips').addEventListener('click', (e) => {
    const b = e.target.closest('.chip'); if (!b) return;
    filter = b.dataset.k; chips(); grid();
  });

  function render() { featured(); chips(); grid(); recordings(); }
  render();
  LGM.onLang(render);
})();
