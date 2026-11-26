/* 还没做好的页面：先显示「施工中」 */
(async function () {
  const d = await LGM.load();
  LGM.layout(document.body.dataset.page, d);
})();
