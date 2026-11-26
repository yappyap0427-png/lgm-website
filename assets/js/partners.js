/* 赞助合作页 */
(async function () {
  const d = await LGM.load();
  const s = d.settings;
  LGM.layout('partners', d);

  function render() {
    const n = s.current_term || '';
    const wa = LGM.wa(s.sponsor_whatsapp);
    const mail = s.email ? `mailto:${s.email}` : '';
    const contactHref = wa || mail;

    document.getElementById('p-body').innerHTML = LGM.f('p.hero.body', { n, month: LGM.month(s.concert_month) });
    document.getElementById('p-btns').innerHTML = `
      ${s.sponsor_pdf_url
        ? `<a class="btn blue" href="${LGM.esc(s.sponsor_pdf_url)}" target="_blank" rel="noopener">${LGM.t('p.pdf')}</a>`
        : `<span class="btn" style="opacity:.6;box-shadow:none">${LGM.t('p.pdf.soon')}</span>`}
      ${contactHref ? `<a class="btn" href="${LGM.esc(contactHref)}" target="_blank" rel="noopener">${LGM.t('p.wa')}</a>` : ''}`;
    document.getElementById('p-stamp').innerHTML = LGM.stamp(LGM.t('stamp'), n, '#FFE14D');

    // 数据（与首页同一个 stats 分页）
    const st = LGM.live(d.stats).filter((r) => r['数字'] !== '').sort((x, y) => (+x['顺序'] || 0) - (+y['顺序'] || 0));
    document.getElementById('stats').innerHTML = st.map((r) => `
      <div class="stat"><b data-count="${LGM.esc(r['数字'])}" data-suffix="${LGM.esc(r['后缀'])}">${LGM.esc(r['数字'])}${LGM.esc(r['后缀'])}</b><span>${LGM.esc(LGM.pick(r, '名称'))}</span></div>`).join('');
    LGM.countUp(document.getElementById('stats'));

    // 配套
    const packs = LGM.live(d.packages).sort((x, y) => (+x['顺序'] || 0) - (+y['顺序'] || 0));
    document.getElementById('packs-block').classList.toggle('hidden', !packs.length);
    document.getElementById('packs').innerHTML = packs.map((r) => {
      const rec = LGM.on(r['推荐']);
      const items = String(LGM.pick(r, '内容')).split('|').map((x) => x.trim()).filter(Boolean);
      return `<div class="pack ${rec ? 'rec' : ''}">
        ${rec ? `<div class="badge">${LGM.t('p.rec')}</div>` : ''}
        <div class="display" style="font-size:14px">${LGM.esc(LGM.pick(r, '等级'))}</div>
        <div class="price">${LGM.esc(r['价格'])}</div>
        <ul>${items.map((x) => `<li>${LGM.esc(x)}</li>`).join('')}</ul>
      </div>`;
    }).join('');

    // 往届伙伴（同一商家只显示一次）
    const seen = new Set();
    const past = LGM.live(d.sponsors).filter((r) => r['商家名'] && !seen.has(r['商家名']) && seen.add(r['商家名']));
    document.getElementById('past').innerHTML = past.length
      ? past.map((r) => `<div>${r['logo'] ? LGM.imgTag(r['logo'], r['商家名'], '') : LGM.esc(r['商家名'])}</div>`).join('')
      : `<p class="empty" style="grid-column:1/-1">${LGM.t('p.past.empty')}</p>`;

    // 联系
    const who = [s.sponsor_contact_name, s.email].filter(Boolean).map(LGM.esc).join(' · ');
    document.getElementById('p-contact').innerHTML = who ? `${LGM.t('p.contact')} · ${who}` : '';
    document.getElementById('p-wa2').innerHTML = contactHref
      ? `<a class="btn ink" style="--r:-3deg" href="${LGM.esc(contactHref)}" target="_blank" rel="noopener">${LGM.t('p.wa2')}</a>` : '';
  }
  render();
  LGM.onLang(render);
})();
