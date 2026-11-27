/**
 * 小草颂网站 · 「新增活动」表单
 * 放在 Google Sheet → 扩充功能 → Apps Script。第一次执行 setupForm()，之后不用再碰。
 * 表单送出后：自动在 events 分页新增一行（届数自动用 settings 的 current_term），照片自动设成「知道连结的人可检视」。
 */
const TYPES = ['迎新夜', 'Bonding Day', 'Mini Concert', 'Christmas Party', '座谈会', '歌唱比赛', '造势活动', '外校演出', '年度音乐会', '其他'];

function setupForm() {
  const ss = SpreadsheetApp.getActive();
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty('FORM_ID')) {
    const old = FormApp.openById(props.getProperty('FORM_ID'));
    Logger.log('表单已存在：' + old.getPublishedUrl());
    return;
  }
  const form = FormApp.create('小草颂 LGM · 新增活动');
  form.setDescription('办完活动填这个，网站「活动」页和当届归档页会自动出现。照片请选 1 张横的、清楚的。')
      .setConfirmationMessage('收到！大约 1 分钟后网站就会更新。')
      .setCollectEmail(false);

  form.addTextItem().setTitle('活动名称（中文）').setRequired(true);
  form.addTextItem().setTitle('活动名称（英文）').setHelpText('可留空');
  form.addDateItem().setTitle('日期').setRequired(true);
  form.addListItem().setTitle('类型').setChoiceValues(TYPES).setRequired(true);
  form.addTextItem().setTitle('地点').setHelpText('例：Puma Hall, USM Engineering Campus');
  form.addParagraphTextItem().setTitle('简介（中文）').setHelpText('一两句就好');
  form.addParagraphTextItem().setTitle('简介（英文）').setHelpText('可留空');
  form.addTextItem().setTitle('贴文连结').setHelpText('IG / FB 贴文网址，可留空');
  // 档案上传题目 Apps Script 不能直接建立：执行后到表单编辑页手动加一题「照片」（档案上传）。见 Sheet 的「怎么更新」分页。

  props.setProperty('FORM_ID', form.getId());
  props.setProperty('SHEET_ID', ss.getId());
  ScriptApp.newTrigger('onEventSubmit').forForm(form).onFormSubmit().create();

  const guide = ss.getSheetByName('怎么更新');
  if (guide) guide.getRange('B3').setValue(form.getPublishedUrl()), guide.getRange('B4').setValue(form.getEditUrl());
  Logger.log('填写网址：' + form.getPublishedUrl());
  Logger.log('编辑网址：' + form.getEditUrl());
}

function onEventSubmit(e) {
  const ss = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SHEET_ID') || SpreadsheetApp.getActive().getId());
  const a = {};
  e.response.getItemResponses().forEach((r) => { a[r.getItem().getTitle()] = r.getResponse(); });

  // 届数 = settings 里的 current_term
  const settings = ss.getSheetByName('settings').getDataRange().getValues();
  const termRow = settings.find((r) => r[0] === 'current_term');
  const term = termRow ? String(termRow[1]).trim() : '';

  // 照片：设成公开检视，存成 Drive 连结
  let cover = '';
  const photoKey = Object.keys(a).find((k) => /照片|photo/i.test(k));
  const ids = photoKey ? [].concat(a[photoKey] || []) : [];
  if (ids.length) {
    try { DriveApp.getFileById(ids[0]).setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (err) { console.warn(err); }
    cover = 'https://drive.google.com/file/d/' + ids[0] + '/view';
  }

  const ev = ss.getSheetByName('events');
  ev.appendRow([Number(term) || term, "'" + (a['日期'] || ''), a['类型'] || '', a['活动名称（中文）'] || '', a['活动名称（英文）'] || '',
    a['简介（中文）'] || '', a['简介（英文）'] || '', a['地点'] || '', cover, a['贴文连结'] || '', true]);
  ev.getRange(ev.getLastRow(), 11).insertCheckboxes().check();
}
