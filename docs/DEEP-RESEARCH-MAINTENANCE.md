---
name: deep-research-site-maintenance
description: 安全维护 afliek.github.io/deep-research 网站（GitHub Pages）。适用于新增/修改研究页面、更新首页卡片、推送部署。核心是防止覆盖另一台电脑（另一 agent）的远程更新、以及完整的提交前校验。触发词：更新网站、上传页面、加板块、deep-research、推送到 GitHub、改首页卡片。
agent_created: true
---

# deep-research 网站维护流程

维护 https://afliek.github.io/deep-research/（仓库 afliek/deep-research，本地克隆在 `C:\Users\afliek\WorkBuddy\2026-08-05-22-03-16\deep-research\`）。

## ⚠️ 铁律（违反会覆盖用户另一台电脑的内容）

1. **推送前必须先核对远程最新状态**——本机 `github.com:443` 常不通，长期用 Git Data API 推送，本地 git 的 remote-tracking 引用**不会更新**，本地文件可能严重落后于远程。**用户另一台电脑（另一 agent）也在推送这个仓库。**
2. **改 index.html 前**：先 `GET https://api.github.com/repos/afliek/deep-research/contents/index.html` 拿远程最新版，对比本地，确认没有远程有而本地不知道的新卡片/新板块。有差异时以远程为基底合并，不要直接用本地版覆盖。
3. **推送时永远 `force: False`**；远程出现未知新 commit 时停下来先问用户。
4. 用户旧 token（"deep-research"，2026-11-01 过期）是另一台电脑在用的，**禁止删除/重新生成**。本机用用户每次提供的临时 fine-grained token。

## 完整流程

### 第 1 步：核对远程（每次必做）
```python
# GET /repos/afliek/deep-research/contents/  → 对比本地 ls *.html
# GET /repos/afliek/deep-research/contents/index.html → 对比首页卡片
# GET /repos/afliek/deep-research/commits?per_page=5 → 看最近有没有另一台电脑的新提交
```
发现本地没有的远程文件/卡片 = 另一台电脑在更新，先停手问用户。

### 第 2 步：编辑文件
- 大文件（>30 行）分段写，每段 20~30 行；长命令用 heredoc `python - <<'PYEOF'`（内容避免裸单引号干扰）。
- 中文 URL 用 `urllib.parse.quote(url, safe=":/?&=%")` 编码后再请求。
- 给 index.html 加卡片时，Edit 的 `old_string` 只写最小锚点（如 `</a>\n  </div>`），**不要带后面的 `<!-- About -->` 等结构**（犯过 3 次误吞事故）；编辑后检查后续 10 行。
- ECharts 双轴用 `yAxis: [{...},{...}]` 数组 + `yAxisIndex`，不能写 `yAxis1`。
- 新环境先配 git 身份：`git config user.name "afliek" && git config user.email "afliek@users.noreply.github.com"`（commit 报错先查身份）。

### 第 3 步：提交前自检（必做）
```bash
# ① HTML 标签配对 + 乱码检查（用 heredoc 跑 Python HTMLParser，见 memory/ERRORS-LESSONS.md）
# ② 内联 JS: python 提取 <script> 到 _check.js，node --check _check.js
# ③ git status --short：确认无多余中间文件进暂存
# ④ 若改了 index.html：再次 GET 远程对比确认合并正确
# ⑤ 涉及中文的解析/验证一律用 Python（urllib + utf-8），不要依赖终端管道输出（Windows 终端中文乱码）
```

### 第 4 步：提交 + 推送
```bash
git add <files> && git commit -m "说明"
# 先试 git push（URL 内嵌 token），失败（non-fast-forward 或网络不通）则用 Git Data API：
# GET ref → POST blobs → POST trees(base_tree=远程当前tree, 只列本次文件) → POST commits(parent=远程当前) → PATCH refs/heads/main(force:False)
# ⚠️ 不能直接 PATCH 到本地 commit（422：远程无该对象），必须先传完对象链
```

### 第 5 步：验证线上
- 等 45~60 秒部署，用 `urllib.request` 抓 `https://afliek.github.io/deep-research/<page>.html?nc=<n>`（**必须带 ?nc= 防缓存**，不要用 WebFetch——有缓存会返回旧内容）验证关键数据点存在。

## 现状备忘
- 首页：7 分组 16 专题 tile 网格（金棕主题 + bg-hero.jpg 背景图）：健康/跳绳/宏观经济/行业研究/上市公司研究/全球股市研究/临时研究。
- 远程恢复点：commit `9782e55fed`（08-13 另一台电脑版，含 gold-research.html 等）。
- 本地待上传：nasdaq-pe.html、dow-jones-pe.html、nikkei-pe.html（全球股市市盈率板块目前只有 korea-pe.html）。
- 完整错误清单：`C:\Users\afliek\WorkBuddy\2026-08-05-22-03-16\.workbuddy\memory\ERRORS-LESSONS.md`

---

## 多机协作规范（2026-08-17 补充 · 本次事故复盘）

### 事故复盘（08-17）
- 本机 deploy/.git 的 `refs/`+`objects/` 意外丢失（疑为多端并发操作 + 清理干扰），git 报 not a git repository。
- 恢复方式：下载远程 tarball（codeload.github.com，https 通）→ 补齐缺失文件 → 重建 .git → 单 commit（149 文件）→ **force push**（SSH，耗时 13 分钟）。
- ⚠️ **force push 已把远程历史替换为本地单 commit（e3afa4a）**：内容零丢失（补齐了远程全部文件），但**另一台电脑基于旧历史（9782e55 之前）的 API 推送（force:False）现在会被拒**——如遇 422/被拒，另一台电脑需按本规范第 1 步核对远程、基于最新远程内容重推。
- 现状：远程 = 本地 = e3afa4a，含全部 149 文件（7 分组 16 专题，含临时研究/SAR_ADC_Report_Review.pdf）。

### 多机协作铁律（三台电脑都遵守）
1. **改动前必拉最新**：`git pull origin main`（本机 https 443 不通时改用 SSH `git@github.com` 或 API 拿远程 index.html 对比）。
2. **push 前必核对**：`git status` + 确认远程没有未知新提交（另一台电脑在推）。
3. **绝不 `git push --force`**（除非仓库损坏且已确认远程内容全部纳入）。
4. **push 被拒 = 远程有新提交**：先 pull 合并再 push，不要硬推。
5. **不要在 GitHub 网页直接改文件**（会产生远程分叉）。
6. **每周健康检查**（任意一台）：`git status && git fsck`，提前发现 refs/objects 异常。
7. **.git 损坏不要修**：`rm -rf .git` → `git init -b main` → `git remote add origin git@github.com:afliek/deep-research.git` → `git fetch origin main` → `git reset --mixed origin/main`（本地文件保留、与远程对齐）→ 若 fetch 卡（https 443 不通），用 codeload tarball 恢复。

### 待办：files/ 大文件迁移
- deploy 446MB（files/ 跳绳成绩册 PDF 占 ~400MB），全量 push 需 10+ 分钟、放大损坏影响。
- 计划：上传到 GitHub Releases（需本机 GitHub token/gh 认证，当前 gh 不可用、github connector 未连接）→ 页面内 files/ 链接替换为 Release URL → `git rm -r files/` → push。
- 迁移前确认：跳绳相关页面引用 files/*.pdf 的链接清单，替换后逐个验证。

### 第二次事故复盘（08-17 下午 · force push 覆盖远程内容）
- **现象**：用户发现线上"全球市盈率研究 7 国""临时研究几个板块"等消失。原因：08-17 上午的 force push（e3afa4a）覆盖了**另一台电脑 08-16 推送的内容**（被覆盖前远程 HEAD = `5aacc56ea07c`），丢失 10 个页面（global-pe/hk-pe/india-pe/nasdaq-pe/nikkei-pe/taiwan-pe/sp500-earnings-vs-price/us-bank-profit/a-share-industry/china-us-total-return）+ 首页 4 个卡片。
- **根因**：.git 损坏后恢复时，tarball"补齐缺失文件"**只补本地缺失的文件、不比对已有文件内容**——本地 index.html 是旧版（缺另一台电脑的新卡片）却没被 tarball 覆盖，force push 后远程首页变旧版。
- **恢复方法（GitHub 对象未 GC，可从旧 commit 找回）**：
  1. `GET /repos/{owner}/{repo}/events` 查 PushEvent，找 force push 事件的 `before` 字段 = 被覆盖前远程 HEAD（本例 5aacc56ea07c）
  2. `GET /git/trees/{sha}?recursive=1` 拿文件树 → `GET /contents/{path}?ref={sha}` 下载缺失文件（>1MB 用 `GET /git/blobs/{sha}`）
  3. 拿旧 index.html 对比当前，合并恢复丢失卡片/分区（插入前断言"目标不在当前文件"、插入后断言数量，防止重复）
  4. 校验全部恢复页面 HTTP 200 → 提交推送
- **新教训（追加到铁律）**：
  - **8. 恢复/重建仓库时，不能只看"文件是否存在"，必须比对核心文件（index.html 等）内容与远程 head 是否一致**；force push 前确认远程最新提交的全部内容已纳入。
  - **9. force push 前用 Events API 的 `before` 字段记录被覆盖的远程 HEAD**，一旦出问题可按此 SHA 从 GitHub 对象库找回（对象保留期内）。
