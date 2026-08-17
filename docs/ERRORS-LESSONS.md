# deep-research 网站维护 · 错误教训清单（LESSONS LEARNED）

> 本文件记录本项目维护过程中真实犯过的错误，按严重程度分级。
> **每次动手前先读一遍 P0/P1，改完文件后按 P2 的"提交前自检清单"逐项检查。**

---

## P0 · 数据安全（最严重，务必遵守）

### 1. 用本地旧文件覆盖远程新内容（2026-08-16 真实事故）
- **现象**：用户另一台电脑（另一 agent 用旧 token）在 08-13 推了大量新内容（gold-research.html 黄金研究、bg-hero.jpg 背景图、zijin-mining 紫金矿业、cambricon 寒武纪等 11 个新页面 + 首页重构为 15 专题网格）。我在 08-15 用**本地旧版 index.html** 推送，把用户的新首页整体覆盖，丢失黄金研究卡片入口、背景图引用等。幸好文件本身还在远程，靠 git 历史（commit `9782e55fed`）恢复。
- **根因**：本机 `github.com:443` 不通，长期用 Git Data API 推送；API 推送**不更新本地 remote-tracking 引用**，本地 git 一直以为远程是旧状态。改文件基于本地旧快照，推送时"技术无冲突、内容却覆盖"。
- **预防（硬性）**：
  1. **推送 index.html 前必须先 GET 远程最新版对比**（`GET /repos/afliek/deep-research/contents/index.html`），确认远程有没有本地不知道的新卡片/新板块。
  2. 定期用 API 拉取远程文件清单（`GET /contents/`）与本地 `ls *.html` 对比，发现本地没有的远程文件 = 另一台电脑在更新。
  3. 永远 `force: False` 推送；远程有未知新提交时停下来先问。
  4. 本机 `git push` 因历史分叉失败（non-fast-forward）时，**不要 force push**，改用 Git Data API 基于远程最新 ref 建 commit。

### 2. 用户旧 token 不可动
- 用户另一个 agent 用名为 "deep-research" 的旧 token（2026-11-01 过期）在另一台电脑推送。
- **禁止删除/重新生成该 token**；本机用自己新建的临时 fine-grained token，用完提醒用户删除本机的即可。

---


### 3. 仓库损坏恢复时 force push 覆盖远程新内容（2026-08-17 二次事故）
- **现象**：本机 .git 损坏，用 tarball 恢复 + 重建仓库后 force push（e3afa4a），覆盖了另一台电脑 08-16 推送的 10 个页面 + 首页 4 个卡片（远程 HEAD 5aacc56 被抹掉）。
- **根因**：tarball 恢复"补齐缺失文件"只补本地缺失的文件，**不比对已有文件内容**；本地 index.html 是旧版却没被 tarball 覆盖，force push 后远程变旧版。
- **恢复**：Events API 找 force push 事件的 before SHA（5aacc56）→ trees/contents/blob API 下载缺失文件 → 对比旧 index.html 合并恢复（commit 76dff40，全部 HTTP 200 验证）。
- **预防（硬性）**：
  1. 恢复/重建仓库后，**必须比对核心文件（index.html 等）内容与远程 head**，不能只看文件是否存在；
  2. force push 前记录 Events API 的 before 字段（被覆盖的远程 HEAD），出问题可找回；
  3. 合并脚本插入卡片前断言"目标不在当前文件"、插入后断言数量，防止重复。

## P1 · 编辑质量（反复出错的点）

### 3. 编辑 index.html 误吞相邻结构（犯过 3 次）
- **现象**：用 Edit 替换卡片区块时，old_string 锚点太长，把后面的 `<!-- About -->` 注释块甚至 `<div class="section-header">` 一起吞掉。
- **预防**：给 index.html 加卡片时，`old_string` 只写最小锚点（如 `</a>\n  </div>`），**不要带后面的注释/结构内容**；每次编辑后立即检查后续 10 行结构是否完好。

### 4. ECharts 双轴写法错误
- **现象**：写了 `yAxis1: {...}` —— 不是合法配置，图不渲染。
- **预防**：ECharts 双轴用 `yAxis: [{...}, {...}]` 数组 + 系列里 `yAxisIndex: 1`。

### 5. 中文 URL 直接 curl 返回 400
- **现象**：`curl "http://127.0.0.1:.../A股....html"` 报 400。
- **预防**：中文/非 ASCII URL 用 Python `urllib.parse.quote(url, safe=":/?&=%")` 编码后请求。

---

## P2 · 流程与工具（提交前自检）

### 6. 长内容输出被截断
- **现象**：写大 HTML 页面或长 Bash 命令时，单次输出/命令参数被截断（约 32 行以上危险），页面写一半就断。
- **预防**：
  - 大文件分段写：每段 20~30 行以内，或先写一个小 Python 生成器脚本再执行。
  - 长命令改用 heredoc（`python - <<'PYEOF' ... PYEOF`），避免引号转义地狱。
  - 写完后必须验证文件大小/结尾（`wc -l`、`tail`）。

### 7. Write/Bash 写入被沙箱吞掉
- **现象**：Write 工具或 Bash 创建的脚本文件写入后不存在（沙箱隔离）。
- **预防**：关键文件写入后立即 `ls -la` 验证存在与大小；被吞就换一种方式（heredoc、分段）。

### 8. 临时提取文件混入仓库
- **现象**：从 PDF 提取的 txt 放在仓库 files/ 目录，差点进 commit。
- **预防**：中间产物放 `/tmp/` 或仓库外；提交前 `git status --short` 检查。

### 9. 乱码字符混入 HTML
- **现象**：编辑时引入 `\ufffd`、`\u00c2` 等乱码（终端编码不一致时尤其常见）。
- **预防**：提交前用 Python 检查 `re.findall(r'[\ufffd]', html)` 数量为 0；发现乱码按上下文修复（如"政策确定\ufffd\ufffd\ufffd"→"政策确定性"）。

### 10. 提交前自检清单（每次必做）
```bash
# ① HTML 结构校验（标签配对、未闭合、乱码）
python - <<'PYEOF'
from html.parser import HTMLParser
import re
class P(HTMLParser):
    def __init__(self):
        super().__init__(); self.stack=[]; self.errs=[]
        self.voids={'meta','br','img','input','hr','link','source','canvas'}
    def handle_starttag(self, tag, attrs):
        if tag not in self.voids: self.stack.append(tag)
    def handle_endtag(self, tag):
        if tag in self.voids: return
        if self.stack and self.stack[-1]==tag: self.stack.pop()
        else: self.errs.append('mismatch </%s>' % tag)
for f in ['index.html']:
    html=open(f,encoding='utf-8').read(); p=P(); p.feed(html)
    print(f, p.errs[:5] if p.errs else 'OK', '| unclosed:', [t for t in p.stack if t not in ('html','body')], '| garbled:', len(re.findall('\ufffd', html)))
PYEOF

# ② 内联 JS 语法检查（node --check）
python - <<'PYEOF'
import re
html = open('page.html', encoding='utf-8').read()
scripts = [s for s in re.findall(r'<script>(.*?)</script>', html, re.S) if 'new Chart' in s or 'echarts' in s]
open('_check.js','w',encoding='utf-8').write('\n'.join(scripts))
PYEOF
node --check _check.js && rm _check.js

# ③ git 状态检查：确认没有多余文件进暂存区
git status --short

# ④ 推送前：核对远程 index.html 是否与本地一致（防 P0-1）
#    用 API GET /contents/index.html 对比关键卡片
```

### 11. 推送网络故障处理
- 现象：`github.com:443` 不通但 `api.github.com` 通。
- 方案：改用 Git Data API 完整流程：`GET ref` → `POST blobs` → `POST trees`（base_tree 用远程当前 tree，只更新本次文件）→ `POST commits`（parent 用远程当前 commit）→ `PATCH refs/heads/main`（force: False）。
- **坑（8月9日踩过）**：直接 `PATCH ref` 指向本地 commit 会 **422**（远程仓库里没有该 commit 对象），必须先按上面顺序把 blob→tree→commit 对象链上传完才能 PATCH。
- 推送后必须等 45~60 秒部署，再用 `urllib.request` 抓线上页面验证关键数据点。

### 12. git 身份未配置导致 commit 失败（8月9日踩过）
- **现象**：第一次 `git commit` 报错（user.name/user.email 未配置），浪费一轮操作。
- **预防**：clone 后或新环境第一件事：`git config user.name "afliek" && git config user.email "afliek@users.noreply.github.com"`（仓库级）。提交报错先看是不是身份问题。

### 13. WebFetch 缓存陷阱（8月9日踩过）
- **现象**：用 WebFetch 验证线上页面改动，返回的是**缓存旧内容**，误以为没生效；改用 curl/urllib 后确认早已生效。
- **预防**：**验证线上内容一律用 `urllib.request`/curl 直接抓取，并加防缓存参数 `?nc=<递增数字>`**（如 `index.html?nc=3`）；不要用 WebFetch 做线上验证。

### 14. 终端编码/heredoc 引号问题（踩过多次）
- **现象**：Windows 终端下 grep/curl 输出中文乱码；heredoc 内容含单引号导致脚本被截断/干扰。
- **预防**：① 涉及中文内容的解析/验证统一用 Python（`urllib.request` + `open(...,encoding='utf-8')`），不要依赖终端管道输出；② heredoc 用 `<<'PYEOF'`（带引号防变量展开），内容里避免裸单引号，或改用 Python 脚本文件 + 分段写入。

---

## 文件与关键提交备忘
- 远程历史恢复点：`9782e55fed`（08-13 用户另一台电脑版，含黄金研究/背景图/15 专题）
- 首页当前结构：7 分组 16 专题（健康/跳绳/宏观经济/行业研究/上市公司研究/全球股市研究/临时研究），金棕主题，bg-hero.jpg 背景图
- 本地待上传页面：nasdaq-pe.html、dow-jones-pe.html、nikkei-pe.html（"全球股市市盈率"板块目前只有韩国 korea-pe.html）
