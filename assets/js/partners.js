/* 赞助合作页
   资料：settings / stats（显示在 = 赞助主 → 大数字；赞助 → 更多数据）/ audience / media / packages（亮点、推荐）/
        package_benefits / ads（推荐）/ other_packages / terms_conditions / sponsors */
(async function () {
  const d = await LGM.load();
  const s = d.settings;
  LGM.layout('partners', d);
  const $ = (id) => document.getElementById(id);
  const hide = (id, empty) => $(id).classList.toggle('hidden', empty);
  const num = (v) => parseFloat(String(v).replace(/[^\d.]/g, '')) || 0;

  // WhatsApp：带预设讯息
  const waNum = String(s.sponsor_whatsapp || '').replace(/\D/g, '');
  const mail = s.sponsor_email || s.email || '';
  const wa = (msg) => waNum ? `https://wa.me/${waNum}?text=${encodeURIComponent(msg)}` : (mail ? `mailto:${mail}` : '');
  const ask = (extra) => LGM.setting(d, 'wa_message') + (extra ? ` (${extra})` : '');

  function render() {
    const n = s.current_term || '';
    const title = LGM.setting(d, 'concert_title');
    const packs = LGM.live(d.packages).sort(LGM.byOrder);
    const ads = (d.ads || []).slice().sort(LGM.byOrder);
    const minOf = (rows) => rows.length ? rows.reduce((m, p) => Math.min(m, num(p['价格'])), Infinity) : 0;
    const minPack = minOf(packs), minAd = minOf(ads);
    const shown = LGM.live(d.stats).filter((r) => r['数字'] !== '');
    const main = shown.filter((r) => String(r['显示在']).includes('赞助主')).sort(LGM.byOrder);
    const more = shown.filter((r) => String(r['显示在']).includes('赞助') && !String(r['显示在']).includes('赞助主')).sort(LGM.byOrder);
    const rm = (v) => 'RM' + Number(v).toLocaleString('en');

    /* 1. 首屏 */
    const keys = [];
    if (s.audience_target) keys.push([s.audience_target, LGM.t('p.k.audience')]);
    const reach = main.find((r) => /IG|触及|reach/i.test(r['名称_zh'] + r['名称_en']));
    if (reach) keys.push([reach['数字'] + reach['后缀'], LGM.pick(reach, '名称')]);
    if (minAd) keys.push([rm(minAd), LGM.t('p.k.from')]);
    $('p-keys').innerHTML = keys.map(([b, l]) => `<div><b>${LGM.esc(b)}</b><span>${LGM.esc(l)}</span></div>`).join('');
    $('p-facts').innerHTML = [
      LGM.f('hero.promo.kicker', { n }) + (title ? ` 《${LGM.esc(title)}》` : ''),
      s.concert_datetime ? LGM.esc(LGM.dateLong(s.concert_datetime)) : LGM.month(s.concert_month),
      LGM.esc(LGM.setting(d, 'venue'))
    ].filter(Boolean).map((x) => `<span>${x}</span>`).join('');
    const pdf = LGM.file(s.sponsor_pdf_url), pdf2 = LGM.file(s.sponsor_package_pdf_url);
    $('p-btns').innerHTML = `
      ${waNum || mail ? `<a class="btn pink" href="${LGM.esc(wa(ask()))}" target="_blank" rel="noopener">${LGM.t('p.wa')}</a>` : ''}
      ${pdf ? `<a class="btn blue" style="--r:2deg" href="${LGM.esc(pdf)}" target="_blank" rel="noopener">${LGM.t('p.pdf')}</a>` : ''}
      ${pdf2 ? `<a class="btn" style="--r:-1deg" href="${LGM.esc(pdf2)}" target="_blank" rel="noopener">${LGM.t('p.pdf2')}</a>` : ''}`;
    $('p-stamp').innerHTML = LGM.stamp(LGM.t('stamp'), n, '#FFE14D');

    /* 2. 往届伙伴：两排反向滚动 */
    const seen = new Set();
    const past = LGM.live(d.sponsors).filter((r) => r['商家名'] && !seen.has(r['商家名']) && seen.add(r['商家名']));
    hide('past-block', !past.length);
    const item = (r) => {
      const inner = r['logo'] ? LGM.imgTag(r['logo'], r['商家名'], '', true) : `<span>${LGM.esc(r['商家名'])}</span>`;
      return r['网址'] ? `<a class="logo-item" href="${LGM.esc(r['网址'])}" target="_blank" rel="noopener" title="${LGM.esc(r['商家名'])}">${inner}</a>`
                      : `<div class="logo-item" title="${LGM.esc(r['商家名'])}">${inner}</div>`;
    };
    const strip = (rows, cls) => {
      let one = rows.map(item).join('');
      for (let k = rows.length; k < 8; k += rows.length) one += rows.map(item).join('');
      return `<div class="logos ${cls}"><div class="track ${cls === 'b' ? 'rev' : ''}">${one}${one}</div></div>`;
    };
    const half = Math.ceil(past.length / 2);
    $('past').innerHTML = !past.length ? '' : past.length < 8 ? strip(past, 'a') : strip(past.slice(0, half), 'a') + strip(past.slice(half), 'b');

    /* 3. 观众 */
    $('stats').innerHTML = LGM.statHTML(main);
    LGM.countUp($('stats'));
    hide('more-stats-wrap', !more.length);
    $('more-stats').innerHTML = more.map((r) => `<div class="mini-stat"><b>${LGM.esc(r['数字'])}${LGM.esc(r['后缀'])}</b><span>${LGM.esc(LGM.pick(r, '名称'))}</span></div>`).join('');
    $('target').textContent = LGM.t('p.target').replace('{n}', s.audience_target || '');
    $('audience').innerHTML = (d.audience || []).slice().sort(LGM.byOrder).map((r) => `<li>${LGM.esc(LGM.pick(r, '群体'))}</li>`).join('');
    $('media').innerHTML = LGM.live(d.media).sort(LGM.byOrder).map((r) => `<span>${LGM.esc(r['名称'])}</span>`).join('');

    /* 4. 证据 */
    const proof = LGM.split(s.sponsor_proof);
    hide('proof-block', !proof.length);
    $('proof').innerHTML = proof.map((p) => `<figure>${LGM.imgTag(p, LGM.t('p.proofAlt'), '')}</figure>`).join('');

    /* 5. 配套卡 */
    const ben = (d.package_benefits || []).slice().sort(LGM.byOrder);
    const isTicket = (b) => /门票|ticket/i.test(b['权益_zh'] + b['权益_en']);
    hide('packs-block', !packs.length);
    $('packs').innerHTML = packs.map((p) => {
      const rec = LGM.on(p['推荐']);
      const hi = LGM.split(LGM.pick(p, '亮点'));
      const count = ben.filter((b) => !isTicket(b) && String(b[p.code] || '').trim()).length;
      const tier = LGM.pick(p, '等级');
      return `<div class="pack ${rec ? 'rec' : ''}">
        ${rec ? `<div class="badge">${LGM.t('p.rec')}</div>` : ''}
        <div class="display" style="font-size:15px">${LGM.esc(tier)}</div>
        <div class="price">${LGM.esc(p['价格'])}</div>
        <ul>${hi.map((x) => `<li>${LGM.esc(x)}</li>`).join('')}</ul>
        <div class="muted" style="font-weight:700;font-size:14px;margin-top:auto;padding-top:10px">${LGM.f('p.total', { n: count })}</div>
        ${waNum || mail ? `<a class="pick" href="${LGM.esc(wa(ask(tier + ' ' + p['价格'])))}" target="_blank" rel="noopener">${LGM.t('p.pick')}</a>` : ''}
      </div>`;
    }).join('');

    // 比较表（桌面）+ 逐级清单（手机）
    const cell = (b, p) => { const v = String(b[p.code] || '').trim(); return v === '✔' || LGM.on(v) ? '✔' : v; };
    $('compare').innerHTML = `
      <thead><tr><th>${LGM.t('p.benefit')}</th>${packs.map((p) => `<th class="${LGM.on(p['推荐']) ? 'rec' : ''}">${LGM.esc(LGM.pick(p, '等级'))}<br><small>${LGM.esc(p['价格'])}</small></th>`).join('')}</tr></thead>
      <tbody>${ben.map((b) => `<tr><td>${LGM.esc(LGM.pick(b, '权益'))}</td>${packs.map((p) => {
        const v = cell(b, p);
        return `<td class="${LGM.on(p['推荐']) ? 'rec' : ''}">${v === '✔' ? '<span class="yes" aria-label="yes">✔</span>' : v ? `<b>${LGM.esc(v)}</b>` : '<span class="muted" aria-label="no">—</span>'}</td>`;
      }).join('')}</tr>`).join('')}</tbody>`;
    $('compare-list').innerHTML = packs.map((p) => `
      <details class="tier"><summary>${LGM.esc(LGM.pick(p, '等级'))} · ${LGM.esc(p['价格'])}</summary>
        <ul>${ben.filter((b) => cell(b, p)).map((b) => `<li>${cell(b, p) === '✔' ? '' : `<b>${LGM.esc(cell(b, p))}</b> `}${LGM.esc(LGM.pick(b, '权益'))}</li>`).join('')}</ul>
      </details>`).join('');

    /* 6. 预算有限 */
    hide('ads-block', !ads.length);
    $('ads').innerHTML = ads.map((r) => `<tr class="${LGM.on(r['推荐']) ? 'rec-row' : ''}"><td>${LGM.esc(LGM.pick(r, '颜色'))}</td><td>${LGM.esc(LGM.pick(r, '规格'))}${LGM.on(r['推荐']) ? ` <span class="mini-badge">${LGM.t('p.rec')}</span>` : ''}</td><td style="font-weight:900">${LGM.esc(r['价格'])}</td></tr>`).join('');
    const other = (d.other_packages || []).slice().sort(LGM.byOrder);
    hide('other-block', !other.length);
    $('other').innerHTML = other.map((r) => `<div class="card">
      <div class="tag" style="margin:0;color:var(--pink)">${LGM.esc(LGM.pick(r, '组别'))}</div>
      <div style="font-weight:900;font-size:19px">${LGM.esc(LGM.pick(r, '名称'))}</div>
      <div class="muted" style="font-size:14px;margin-top:4px">${LGM.esc(LGM.pick(r, '条件'))}</div>
      <ul style="margin:10px 0 0;padding-left:18px;line-height:1.75;font-size:15px">${LGM.split(LGM.pick(r, '权益')).map((x) => `<li>${LGM.esc(x)}</li>`).join('')}</ul>
    </div>`).join('');
    const donation = LGM.setting(d, 'donation');
    hide('donate', !donation);
    $('donate').innerHTML = !donation ? '' : `
      <div class="donate-text">
        <div class="brush">${LGM.t('p.donate')}</div>
        <p>${LGM.esc(donation)}</p>
      </div>
      ${s.donation_qr ? `<div class="qr">${LGM.imgTag(s.donation_qr, 'QR', '')}</div>` : ''}
      ${waNum || mail ? `<a class="btn" href="${LGM.esc(wa(LGM.setting(d, 'donation_wa_message')))}" target="_blank" rel="noopener">${LGM.t('p.donateBtn')}</a>` : ''}`;

    /* 7. 截止 */
    hide('deadline', !s.sponsor_deadline);
    $('deadline').textContent = s.sponsor_deadline ? LGM.t('p.deadline') + LGM.dateLong(s.sponsor_deadline) : '';

    /* 8. 常见问题 + 条款 */
    const when = [s.concert_datetime ? LGM.dateLong(s.concert_datetime) : '', LGM.setting(d, 'venue')].filter(Boolean).join(' · ');
    const qa = [
      ['p.q1', LGM.f('p.a1', { pack: rm(minPack), ad: rm(minAd) })],
      ['p.q2', LGM.t('p.a2')],
      ['p.q3', LGM.t('p.a3')],
      ['p.q4', LGM.t('p.a4')],
      ['p.q5', LGM.esc(when)]
    ];
    const tc = (d.terms_conditions || []).slice().sort(LGM.byOrder);
    $('faq').innerHTML = qa.map(([q, a]) => `<details class="tc"><summary>${LGM.t(q)}</summary><div>${a}</div></details>`).join('')
      + (tc.length ? `<details class="tc"><summary>${LGM.t('p.tc')}</summary><div><ol style="margin:0;padding-left:20px;line-height:1.8">${tc.map((r) => `<li><b>${LGM.esc(LGM.pick(r, '标题'))}</b>：${LGM.esc(LGM.pick(r, '内容'))}</li>`).join('')}</ol></div></details>` : '');

    /* 9. 联系 */
    const name = LGM.setting(d, 'sponsor_contact_name');
    $('p-contact').innerHTML = [name, waNum ? '+' + waNum : '', mail].filter(Boolean).map(LGM.esc).join('<br>');
    $('p-wa2').innerHTML = waNum || mail ? `<a class="btn ink" style="--r:-3deg" href="${LGM.esc(wa(ask()))}" target="_blank" rel="noopener">${LGM.t('p.wa2')}</a>` : '';
    const fl = $('wa-float');
    fl.href = wa(ask()); fl.textContent = LGM.t('p.wa');
    fl.classList.toggle('hidden', !(waNum || mail));
  }

  // 手机：滑过首屏才出现底部按钮，到联系区就收起
  const fl = $('wa-float');
  const onScroll = () => fl.classList.toggle('show', scrollY > 500 && $('contact').getBoundingClientRect().top > innerHeight);
  addEventListener('scroll', onScroll, { passive: true });

  render();
  LGM.onLang(render);
})();
