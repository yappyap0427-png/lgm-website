> **2026-11 改版：** 网站现在用「门票印刷」风格（照 Google Stitch 设计），页面在根目录（index / events / music / history / partners / about / term.html），
> 版面程式在 `assets/js/v3.js`、样式在 `assets/css/stitch.css`。旧的 Zine 版本留在 `classic/`（例：/classic/index.html），资料一样从同一份 Google Sheet 读，随时可以切回去。

# 小草颂 LGM 官网

理大工程系分院原创音乐团体「小草颂 LitleGras Music Club」的官网。
纯 HTML / CSS / JS，放在 GitHub Pages，**内容全部在 Google Sheet 里改**，不用碰程式码。

---

## 给每届宣传组 / 赞助组：只需要改 Google Sheet

后台：**小草颂 LGM 网站后台 v2**（Google Sheet，第一页「说明」有详细规则）

| 想做什么 | 去哪个分页 | 怎么改 |
|---|---|---|
| 首页切换「敬请期待 / 宣传期 / 回顾期」 | `settings` → `phase` | 下拉选单选一个 |
| 公布本届主题、日期、地点、票价、购票连结 | `settings` | 填 value 栏 |
| 改首页 / 赞助页的数字 | `stats` | 改「数字」；空白的那一行不会显示 |
| 新增活动 | `events` | 加一行，「上架」选 TRUE |
| 新增歌曲 | `songs` | 加一行，想上首页就把「精选」改 TRUE |
| 新增赞助商 logo（首页会滚动） | `sponsors` | 加一行，logo 档名见下面「图片」 |
| 改赞助配套价格 | `packages` | 一行一个等级；`推荐` 打勾会显示「推荐」标签 |
| 改配套权益（比较表） | `package_benefits` | 每个等级一栏，有就填 ✔，数量直接填数字 |
| 节目册广告价格 | `ads` | |
| 实物 / 服务赞助 | `other_packages` | 权益用 `\|` 分隔 |
| 条款与细则 | `terms_conditions` | |
| 目标观众、媒体伙伴 | `audience`、`media` | |
| 赞助计划书 PDF | 把 PDF 放进 `assets/docs/`，`settings` 的 `sponsor_pdf_url` 填路径 | |
| 本届筹委名单 | `committee` | 成员空白的职位不会显示 |
| 新一届开始 | `settings` 的 `current_term` +1；`terms` 加一行 | |

改完**大约 1–5 分钟**网站就会更新（Google 有快取）。

### 图片
- **重要图片（logo、海报、赞助商 logo）**：上传到 GitHub 的 `assets/img/` 资料夹
  （GitHub 网页 → 进入资料夹 → Add file → Upload files），Sheet 里只填路径，例如 `posters/27.jpg`、`sponsors/abc.png`。
- 活动封面这类小图：可以直接贴 Google Drive 连结（档案要设成「知道连结的任何人」），网站会自动转换。
- 图片载不到时会显示灰色占位框，不会破图。
- 首页招商期右边那张照片：在 `settings` 加一行 `hero_photo`，填档名。

### 注意
- Sheet 必须设成 **「知道连结的任何人 → 检视者」**，网站才读得到。
- 所以 **Sheet 里的东西等于公开**：不要放私人电话、预算、银行资料。`上架 = FALSE` 只是不显示，不是保密。
- 栏位名称（第一行）不要改，网站靠它认资料。

---

### 新增活动表单（最简单）

办完活动，任何人用手机填「小草颂 LGM · 新增活动」表单就好（网址在 Sheet 第一个分页「怎么更新」）：
填名称、日期、类型、地点、简介，上传 1 张照片 → 自动在 events 分页加一行，届数自动用 settings 的 current_term，照片自动设成公开可看。
表单背后的程序在 Sheet → 扩充功能 → Apps Script（原始码备份：`scripts/apps-script-form.gs`）。

### 照片用 Google Drive

图片栏位可以直接贴 Drive 分享连结（先设成「知道连结的任何人可检视」），网站会自动转换并缩小。
海报、首页照这种常用大图仍建议放 `assets/img/`，载入比较稳。

## 给负责网站的人（技术交接）

```
index.html          首页
partners.html       赞助合作
events.html         活动（依届分组、可按类型筛选）
music.html          自创歌曲 + 历届音乐会录影
about.html          关于、使命愿景、时间轴、本届筹委
term.html?t=26      每届档案页（届数换掉就是另一届）
assets/css/style.css          所有样式；颜色在最上面 :root 改
assets/js/config.js           Google Sheet ID（换 Sheet 时改这里）
assets/js/lgm.js              核心：读资料、双语、页首页尾、数字滚动
assets/js/strings.js          固定文字的中 / 英版本
assets/js/home.js / partners.js / events.js / music.js / about.js / term.js   各页逻辑
assets/docs/        赞助计划书等 PDF
data/data.json                Sheet 备份（自动产生，不要手改）
scripts/sync-sheet.mjs        把 Sheet 抓成 data.json
.github/workflows/sync-sheet.yml  每天自动跑一次同步
```

**资料怎么来：** 网页打开时直接读 Google Sheet（4 秒内没回应就改读 `data/data.json` 备份）。
GitHub Actions 每天凌晨把 Sheet 同步成备份，所以就算 Google 挂了网站也不会空白。
想马上更新备份：GitHub → Actions → 「同步 Google Sheet 备份」→ Run workflow。

**本机预览：** 在资料夹里跑 `python3 -m http.server`，打开 http://localhost:8000
（直接双击 html 档会读不到资料）。

### 第一次上线
1. 用**社团的 GitHub 帐号**（不要用个人帐号，毕业了才不会断）建一个 repo，例如 `lgm-website`。
2. 把这个资料夹全部上传（包括 `.github` 资料夹）。
3. Settings → Pages → Source 选 `main` 分支、`/ (root)` → Save。
4. 网址会是 `https://<帐号>.github.io/lgm-website/`。
5. Settings → Actions → General → Workflow permissions 选 **Read and write**（自动同步需要）。
6. 把 Google Sheet 设成「知道连结的任何人可检视」。

### Google Sheet 的小陷阱
同一栏里**不要混着放数字和文字**（例如「届数」栏全部填数字）。Google 的 CSV 输出遇到混合栏位，会把少数那种型态变成空白。
所以 `package_benefits` 里打勾用 ✔（文字），门票数量也当文字。

### 以后想加的
- 自订网域（约 RM50 / 年），在 Settings → Pages → Custom domain 设定

### 歌曲试听
音乐页和首页的歌曲卡有「试听 30 秒」按钮，会在卡片里直接播放 YouTube 的一小段。
在 `songs` 分页：`试听开始` 填从第几秒开始（空白 = 第 60 秒），`试听秒数` 填播多久（空白 = 30 秒，最多 90）。
建议把开始秒数设在副歌，每首歌各自调整。

### 改了 CSS / JS 之后
HTML 里引用 css/js 的地方都带着 `?v=日期`。改完 CSS 或 JS，记得把所有 HTML 里的这个数字改大，
不然访客的浏览器可能会继续用旧的档案（GitHub Pages 会让浏览器暂存约 10 分钟）。
