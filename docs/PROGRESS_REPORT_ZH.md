# StateBreaker 进度报告（中文版）

**仓库：** [RainyMarks/StateBreaker](https://github.com/RainyMarks/StateBreaker)  
**基线：** v0.1 接口骨架（`main` 初始化）  
**报告日期：** 2026-07-17  
**当前主干：** 已集成 learner / generator / executor / verifier / reporter 最小可用链

---

## 1. 最初骨架有什么

StateBreaker v0.1 **不是**自动漏洞扫描器，而是：

> **统一契约 + 共享 HTTP 管道 + 插件总线 + CLI + 演示靶场**

| 组成部分 | 初始状态 |
|----------|----------|
| `src/statebreaker` 核心 | 有：模型、runtime、插件发现、CLI |
| 六阶段流水线 | **只定义了插座**，无业务算法 |
| `plugin-template` | 有：dry-run executor（不发请求） |
| `labs/coupon-race` | 有：老王奶茶 BUG50 竞态靶场 |
| `examples/coupon-race` | 有：手写 Workflow / Invariant / AttackPlan |
| 正式插件 | **无** capture / learner / generator / executor / verifier / reporter |

初始数据流（文档目标）：

```text
capture → learner → generator → executor → verifier → reporter
  ❌        ❌         ❌          ❌         ❌         ❌
```

当时能做的事：

1. `statebreaker doctor` / `workflow validate`
2. Docker 起靶场，**浏览器手工**点「老实兑换 / 双倍手速」
3. 安装 template，证明 entry point 能发现插件  

**不能**自动学规则、生成攻击计划、并发打洞、出正式 Finding、出 PDF 报告。

---

## 2. 相对骨架的进展总览

```text
capture → learner → generator → executor → verifier → reporter
  ❌        ✅         ✅          ✅         ✅         ✅
           差分学习    竞态计划     有界执行    状态判定    PDF报告
```

| 阶段 | 插件包 | plugin_id | 状态 |
|------|--------|-----------|------|
| capture | — | — | **未做** |
| learner | `statebreaker-learner-delta` | `team.delta-learner` | 已完成（基线差分） |
| generator | `race-generator` | `team.race-generator` | 已完成（coupon 竞态） |
| executor | `race-executor` | `team.race-executor` | 已完成（coupon 竞态） |
| verifier | `statebreaker-verifier-basic` | `team.basic-verifier` | 已完成（最小版） |
| reporter | `statebreaker-reporter-pdf` | `team.pdf-reporter` | 已完成（PDF） |

另保留：`plugin-template` → `template.dry-run`（教学用）。

---

## 3. 各模块做了什么

### 3.1 learner（`team.delta-learner`）

- 正常 Workflow **多轮重放**，比较 `state_probe_steps` 前后状态  
- 提出候选 Invariant：`max-delta` / `min-value` / `state-transition`  
- 明确标注为**观测候选**（`bound_source: observed_maximum`），不是已证明业务真理  
- 适合：从「老实兑一次」学出「优惠最多 +50」

### 3.2 generator（`team.race-generator`）

- 输入 Workflow + Invariant → 确定性 `AttackPlan[]`（计划数有上限）  
- 覆盖并发、突发、时间偏移、幂等键复用、中间态、run 池挤出等  
- 在 plan 中嵌入 invariant 快照，供下游评估  
- **领域：** 当前面向优惠券/竞态 lab 关键字与场景  

### 3.3 executor（`team.race-executor`）

- 真正发 HTTP（或 ASGI 测靶场），采集 before/after 状态与 lab 事件  
- 支持有界并发与多种 schedule strategy  
- `plugin_data.vulnerability_observed` 为**启发式**，非正式 Finding  
- 提供批量 CLI：`statebreaker-coupon-audit`

### 3.4 verifier（`team.basic-verifier`）

- 用 before/after + 响应对照 Invariant  
- 输出正式 `Finding`：`confirmed` / `probable` / `rejected`  
- 支持 max-delta 等常见 kind  

### 3.5 reporter（`team.pdf-reporter`）

- 输入完整 `RunBundle`  
- 输出 `statebreaker-report.pdf`（+ `report-summary.json`）  

### 3.6 工程与质量

- CI：安装并测试各插件包  
- 插件错误走 `PluginError` / 稳定 CLI 退出码  
- 审查加固：规则评估、options 语义、观测上界诚实标注等  

---

## 4. 仍未完成 / 边界

| 项 | 说明 |
|----|------|
| **capture** | 仍无 HAR/抓包 → Workflow 插件 |
| 领域耦合 | generator/executor 仍偏 coupon lab，非通用业务逻辑引擎 |
| 一键编排 | 无单一命令跑通 learn→…→report，需按阶段 CLI |
| 中文 PDF 字体 | 报告用 Latin 内置字体，避免系统字体依赖 |
| 授权/主机白名单 | 核心仍声明「未启用」目标限制 |

---

## 5. 进度结论（一句话）

**从「只有插座和靶场」推进到「可在老王奶茶店上自动：学规则草案 → 生成攻击 → 执行 → 正式判定 → PDF 报告」的最小闭环；仅缺 capture 与通用化/编排打磨。**

---

## 6. 如何用老王奶茶店做实际演示

下面分三条路径：**A 浏览器肉眼演示**、**B CLI 最小闭环（推荐答辩）**、**C 带 learner 的完整链**。

### 6.0 环境准备（一次即可）

**依赖：** Python 3.11+、Docker Desktop、Git。

```powershell
cd "你的\StateBreaker路径"
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -e ".[dev]"
python -m pip install -e .\plugin-template
python -m pip install -e .\race-generator
python -m pip install -e .\race-executor
python -m pip install -e .\statebreaker-learner-delta
python -m pip install -e .\statebreaker-verifier-basic
python -m pip install -e .\statebreaker-reporter-pdf

statebreaker doctor
statebreaker plugins list
```

期望插件列表中出现：

- `team.delta-learner`
- `team.race-generator`
- `team.race-executor`
- `team.basic-verifier`
- `team.pdf-reporter`

### 6.1 启动靶场

```powershell
docker compose up --build
```

浏览器打开：<http://127.0.0.1:8080/>

端口占用时：

```powershell
$env:STATEBREAKER_LAB_PORT = "18080"
docker compose up --build
# 浏览器改开 http://127.0.0.1:18080/
# 同时把 examples/coupon-race/workflow.yaml 里 base_url 改成对应端口
```

健康检查：<http://127.0.0.1:8080/healthz>

---

### 路径 A：浏览器「肉眼」演示（1～2 分钟）

**目的：** 证明漏洞真实存在，不依赖框架。

| 步骤 | 操作 | 预期 |
|------|------|------|
| 1 | 点「开一张新桌」 | 优惠 0，券未用 |
| 2 | 点「老实兑换一次」 | 优惠 **50** |
| 3 | 再点兑换 | **拒绝**，优惠仍 50 |
| 4 | 再开新桌 | 状态重置 |
| 5 | 点「发动双倍手速」 | 两请求并发 |
| 6 | 看结果 | 优惠 **100**，成功兑换 2 次 |
| 7 | 看下方时间线 | 两个检查通过都在首次提交写入之前 |

**讲解词建议：**  
服务端是 TOCTOU：先检查未使用 → 故意 sleep 150ms → 再加钱并标记。双请求都挤进检查窗口，就会各加 50。

结束后靶场可保持运行，供路径 B 使用。

---

### 路径 B：CLI 最小闭环演示（推荐）

**目的：** 展示框架如何从「正常流程模型 + 规则」走到「攻击执行 + 正式 Finding + PDF」。

#### B1. 校验正常业务流

```powershell
statebreaker workflow validate .\examples\coupon-race\workflow.yaml
```

#### B2. 生成攻击计划

```powershell
New-Item -ItemType Directory -Force -Path .\.statebreaker\demo | Out-Null

statebreaker generate `
  .\examples\coupon-race\workflow.yaml `
  .\examples\coupon-race\invariants.yaml `
  --plugin team.race-generator `
  --output .\.statebreaker\demo\plans.json
```

打开 `plans.json`，应看到约 10 个计划（并发、突发、offset 等）。

#### B3. 取出「最小双请求竞态」计划并执行

```powershell
python -c "import json; from pathlib import Path; plans=json.loads(Path('.statebreaker/demo/plans.json').read_text(encoding='utf-8')); p=next(x for x in plans if x['attack_type']=='concurrent-replay'); Path('.statebreaker/demo/one-plan.json').write_text(json.dumps(p,ensure_ascii=False,indent=2),encoding='utf-8'); print(p['id'])"

statebreaker attack .\.statebreaker\demo\one-plan.json `
  --workflow .\examples\coupon-race\workflow.yaml `
  --plugin team.race-executor `
  --output .\.statebreaker\demo\raw-result.json
```

**看结果：** `raw-result.json` 中  

- `after_state.discount_yuan` 应为 **100**  
- `plugin_data.vulnerability_observed` 多为 **true**  
- `plugin_data.checked_events` / `committed_events` 常为 2  

#### B4. 正式验证（Finding）

```powershell
statebreaker verify .\.statebreaker\demo\raw-result.json `
  .\examples\coupon-race\invariants.yaml `
  --plugin team.basic-verifier `
  --output .\.statebreaker\demo\findings.json
```

**看结果：** 应有 `verdict: confirmed`（`coupon-max-delta`，观测 delta 100 > 50）。

#### B5. 组装 RunBundle 并出 PDF

```powershell
python -c @"
import json
from pathlib import Path
from pydantic import TypeAdapter
from statebreaker.documents import load_model, write_json
from statebreaker.models import AttackPlan, Finding, RawAttackResult, RunBundle, Workflow

root = Path('.statebreaker/demo')
findings = TypeAdapter(list[Finding]).validate_python(
    json.loads((root / 'findings.json').read_text(encoding='utf-8'))
)
bundle = RunBundle(
    workflow=load_model(Path('examples/coupon-race/workflow.yaml'), Workflow),
    attack_plan=load_model(root / 'one-plan.json', AttackPlan),
    result=load_model(root / 'raw-result.json', RawAttackResult),
    findings=findings,
)
write_json(root / 'run-bundle.json', bundle)
print('wrote', root / 'run-bundle.json')
"@

statebreaker report .\.statebreaker\demo\run-bundle.json `
  --plugin team.pdf-reporter `
  --output-dir .\.statebreaker\demo\report
```

打开：

```text
.statebreaker\demo\report\statebreaker-report.pdf
```

#### B6. 可选：批量扫全部计划

```powershell
statebreaker-coupon-audit `
  .\examples\coupon-race\workflow.yaml `
  .\.statebreaker\demo\plans.json `
  --output-dir .\.statebreaker\demo\audit
```

查看 `summary.json` 中哪些 plan 的 `vulnerability_observed` 为 true（阴性对照如 precondition-bypass 应为 false）。

---

### 路径 C：加上 learner（完整故事线）

**前提：** 靶场已启动，workflow 的 `base_url` 端口正确。

```powershell
# 可选：加快采样
$env:STATEBREAKER_LEARNER_SAMPLES = "5"

statebreaker learn .\examples\coupon-race\workflow.yaml `
  --plugin team.delta-learner `
  --output .\.statebreaker\demo\learning-result.json
```

从 `learning-result.json` 中取出 `invariants` 数组，存成：

```powershell
python -c "
import json
from pathlib import Path
data=json.loads(Path('.statebreaker/demo/learning-result.json').read_text(encoding='utf-8'))
Path('.statebreaker/demo/learned-invariants.json').write_text(
    json.dumps(data['invariants'], ensure_ascii=False, indent=2), encoding='utf-8')
print(len(data['invariants']), 'invariants')
"
```

再用学到的规则生成计划：

```powershell
statebreaker generate `
  .\examples\coupon-race\workflow.yaml `
  .\.statebreaker\demo\learned-invariants.json `
  --plugin team.race-generator `
  --output .\.statebreaker\demo\plans-from-learn.json
```

后续 attack → verify → report 同路径 B。

**讲解点：** learner 学的是「正常最多 +50」；race 把优惠打到 100；verifier 给出 `confirmed`。

---

## 7. 演示话术（约 3 分钟）

1. **问题：** 业务逻辑洞看状态，不看单纯 200。  
2. **靶场：** 老王奶茶 BUG50，故意 150ms 窗口（路径 A）。  
3. **骨架：** 六阶段插件，核心不塞算法。  
4. **进展：** 已接 learner→generator→executor→verifier→PDF。  
5. **闭环：** CLI 跑并发攻击，discount 0→100，Finding confirmed，PDF 落盘（路径 B）。  
6. **边界：** 无 capture；竞态插件偏 coupon lab；下一步通用化 / 编排。  

---

## 8. 收尾

```powershell
docker compose down
```

产物目录可保留作截图：

```text
.statebreaker/demo/
  plans.json
  one-plan.json
  raw-result.json
  findings.json
  run-bundle.json
  report/statebreaker-report.pdf
```

---

## 9. 相关文档

- [架构](architecture.md)  
- [契约](contracts.md)  
- [插件开发](plugin-development.md)  
- 英文版： [PROGRESS_REPORT_EN.md](PROGRESS_REPORT_EN.md)  
