// ===== 网站设定：一般只需要改这里 =====
// Google Sheet 的 ID（网址 /d/ 和 /edit 之间那串）
// Sheet 需要设成「知道连结的任何人 → 检视者」
window.LGM_CONFIG = {
  sheetId: '1HCBrgqiVdYRIAUuGrorVsrKZhZACNSw5PaZr7Mnw3Gw',
  tabs: ['settings', 'stats', 'terms', 'events', 'songs', 'awards_other', 'sponsors', 'packages', 'committee'],
  // 读 Google Sheet 超过这个时间（毫秒）就改用 data/data.json 备份
  timeoutMs: 4000
};
