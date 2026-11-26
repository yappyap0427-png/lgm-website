/* 赞助合作页：全部内容来自 Sheet（settings / stats / audience / media / packages / package_benefits / ads / other_packages / terms_conditions / sponsors） */
(async function () {
  const d = await LGM.load();
  const s = d.settings;
  LGM.layout('partners', d);
  const $ = (id) => document.getElementById(id);
  const hide = (id, empty) => $(id).classList.toggle('hidden', empty);

  function render() {
    const n = s.current_term || '';
    const wa = LGM.wa(s.sponsor_whatsapp);
    const mail = s.sponsor_email || s.email;
    const contactHref = wa || (mail ? `mailto:${mail}` : '');
    const title = LGM.setting(d, 'concert_title');

    // Hero
    $('p-facts').innerHTML = [
      LGM.f('hero.promo.kicker', { n }) + (title ? ` 《${LGM.esc(title)}》` : ''),
      s.concert_datetime ? LGM.dateLong(s.concert_datetime) + (s.concert_end ? ` – ${LGM.esc(s.concert_end)}` : '') : LGM.month(s.concert_month),
      LGM.setting(d, 'venue')
    ].filter(Boolean).map((x) => `<span>${x}</span>`).join('');
    const pdf = LGM.file(s.sponsor_pdf_url), pdf2 = LGM.file(s.sponsor_package_pdf_url);
    $('p-btns').innerHTML = `
      ${pdf ? `<a class="btn blue" href="${LGM.esc(pdf)}" target="_blank" rel="noopener">${LGM.t('p.pdf')}</a>` : `<span class="btn" style="opacity:.6;box-shadow:none">${LGM.t('p.pdf.soon')}</span>`}
      ${pdf2 ? `<a class="btn yellow" href="${LGM.esc(pdf2)}" target="_blank" rel="noopener">${LGM.t('p.pdf2')}</a>` : ''}
      ${contactHref ? `<a class="btn" style="--r:-1deg" href="${LGM.esc(contactHref)}" target="_blank" rel="noopener">${LGM.t('p.wa')}</a>` : ''}`;
    $('p-stamp').innerHTML = LGM.stamp(LGM.t('stamp'), n, '#FFE14D');

    // 主题
    const desc = LGM.split(LGM.setting(d, 'theme_desc'));
    hide('theme-block', !title);
    $('theme-title').innerHTML = `<span class="brush" style="font-size:clamp(44px,7vw,72px)">《${LGM.esc(s.concert_title_zh || title)}》</span>
      ${s.concert_title_en ? `<span class="display" style="font-size:clamp(28px,4vw,44px);color:var(--blue);margin-left:12px">${LGM.esc(s.concert_title_en)}</span>` : ''}`;
    $('theme-desc').innerHTML = desc.map((p) => `<p style="margin:0 0 12px">${LGM.esc(p)}</p>`).join('');

    // 数据 + 观众 + 媒体
    $('stats').innerHTML = LGM.statHTML(LGM.stats(d, '赞助'));
    LGM.countUp($('stats'));
    $('target').textContent = LGM.t('p.target').replace('{n}', s.audience_target || '');
    $('audience').innerHTML = (d.audience || []).sort(LGM.byOrder).map((r) => `<li>${LGM.esc(LGM.pick(r, '群体'))}</li>`).join('');
    $('media').innerHTML = LGM.live(d.media).sort(LGM.byOrder).map((r) => `<span>${LGM.esc(r['名称'])}</span>`).join('');

    // 配套卡
    const packs = LGM.live(d.packages).sort(LGM.byOrder);
    const ben = (d.package_benefits || []).sort(LGM.byOrder);
    const tickets = ben.find((b) => /门票|ticket/i.test(b['权益_zh'] + b['权益_en']));
    hide('packs-block', !packs.length);
    $('packs').innerHTML = packs.map((p) => {
      const rec = LGM.on(p['推荐']);
      const t = tickets ? tickets[p.code] : '';
      const count = ben.filter((b) => b !== tickets && String(b[p.code] || '').trim()).length;
      return `<div class="pack ${rec ? 'rec' : ''}">
        ${rec ? `<div class="badge">${LGM.t('p.rec')}</div>` : ''}
        <div class="display" style="font-size:15px">${LGM.esc(LGM.pick(p, '等级'))}</div>
        <div class="price">${LGM.esc(p['价格'])}</div>
        ${t ? `<div style="font-weight:900;margin-top:8px">${LGM.esc(t)} ${LGM.t('p.tickets')}</div>` : ''}
        <div class="muted" style="margin-top:4px;font-weight:700">+ ${count} ${LGM.lang === 'en' ? 'benefits' : '项权益'}</div>
      </div>`;
    }).join('');

    // 比较表
    $('compare').innerHTML = `
      <thead><tr><th>${LGM.t('p.benefit')}</th>${packs.map((p) => `<th class="${LGM.on(p['推荐']) ? 'rec' : ''}">${LGM.esc(LGM.pick(p, '等级'))}<br><small>${LGM.esc(p['价格'])}</small></th>`).join('')}</tr></thead>
      <tbody>${ben.map((b) => `<tr><td>${LGM.esc(LGM.pick(b, '权益'))}</td>${packs.map((p) => {
        const v = String(b[p.code] || '').trim();
        const yes = v === '✔' || LGM.on(v);
        return `<td>${yes ? '<span class="yes" aria-label="yes">✔</span>' : v ? `<b>${LGM.esc(v)}</b>` : '<span class="muted" aria-label="no">—</span>'}</td>`;
      }).join('')}</tr>`).join('')}</tbody>`;

    // 广告
    const ads = (d.ads || []).sort(LGM.byOrder);
    hide('ads-block', !ads.length);
    $('ads').innerHTML = ads.map((r) => `<tr><td>${LGM.esc(LGM.pick(r, '颜色'))}</td><td>${LGM.esc(LGM.pick(r, '规格'))}</td><td style="font-weight:900">${LGM.esc(r['价格'])}</td></tr>`).join('');

    // 实物 / 服务
    const other = (d.other_packages || []).sort(LGM.byOrder);
    hide('other-block', !other.length);
    $('other').innerHTML = other.map((r) => `<div class="card">
      <div class="tag" style="margin:0;color:var(--pink)">${LGM.esc(LGM.pick(r, '组别'))}</div>
      <div style="font-weight:900;font-size:20px">${LGM.esc(LGM.pick(r, '名称'))}</div>
      <div class="muted" style="font-size:14px;margin-top:4px">${LGM.esc(LGM.pick(r, '条件'))}</div>
      <ul style="margin:12px 0 0;padding-left:18px;line-height:1.8">${LGM.split(LGM.pick(r, '权益')).map((x) => `<li>${LGM.esc(x)}</li>`).join('')}</ul>
    </div>`).join('');

    // 往届伙伴
    const seen = new Set();
    const past = LGM.live(d.sponsors).filter((r) => r['商家名'] && !seen.has(r['商家名']) && seen.add(r['商家名']));
    $('past').innerHTML = past.length
      ? past.map((r) => `<div>${r['logo'] ? LGM.imgTag(r['logo'], r['商家名'], '') : LGM.esc(r['商家名'])}</div>`).join('')
      : `<p class="empty" style="grid-column:1/-1">${LGM.t('p.past.empty')}</p>`;

    // 条款
    const tc = (d.terms_conditions || []).sort(LGM.byOrder);
    hide('tc-block', !tc.length);
    $('tc').innerHTML = tc.map((r, i) => `<details class="tc"><summary>${i + 1}. ${LGM.esc(LGM.pick(r, '标题'))}</summary><div>${LGM.esc(LGM.pick(r, '内容'))}</div></details>`).join('');

    // 联系
    const name = LGM.setting(d, 'sponsor_contact_name');
    const phone = s.sponsor_whatsapp ? '+' + String(s.sponsor_whatsapp).replace(/\D/g, '') : '';
    $('p-contact').innerHTML = [name, phone, mail].filter(Boolean).map(LGM.esc).join('<br>');
    $('p-wa2').innerHTML = contactHref ? `<a class="btn ink" style="--r:-3deg" href="${LGM.esc(contactHref)}" target="_blank" rel="noopener">${LGM.t('p.wa2')}</a>` : '';
  }
  render();
  LGM.onLang(render);
})();
