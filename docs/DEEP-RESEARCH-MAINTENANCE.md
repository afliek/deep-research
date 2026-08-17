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
