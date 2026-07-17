# StateBreaker 阶段汇报报告（诚实版）

## 1. 项目目标

StateBreaker 希望研究普通漏洞扫描器不容易发现的业务状态问题。例如，一张优惠券按规则
只能使用一次，但是两个请求同时到达时，可能都在状态更新前通过检查，最终产生重复优惠。

我们的长期设想是把测试过程拆成以下阶段：

```text
Capture → Learn → Generate → Execute → Verify → Report
```

各阶段通过统一的数据模型连接，并由独立 Python 插件实现。这样不同成员可以分别开发流量
采集、状态学习、攻击计划生成、请求执行、结果验证和报告模块。

## 2. 当前真正完成到什么程度

目前项目仍处于早期原型阶段，不能称为完整的通用业务逻辑漏洞扫描器。

已经完成的内容包括：

- 一套初步的 Pydantic 数据模型和插件 Entry Point 约定；
- 一个可以重置和观察状态的“老王奶茶券”本地 Docker 靶场；
- 第一版 HAR 文件导入模块；
- 第一版状态差分 Learner；
- 针对奶茶券竞态的 Generator 和 Executor 原型；
- 基础 Verifier、Reporter 和 CLI 外壳；
- 中英文靶场页面和交互菜单原型。

目前没有完成的内容包括：

- 从浏览器实时代理和拦截流量；
- 自动识别 Token、订单 ID 等动态依赖；
- 对任意网站自动推断可靠的业务规则；
- 通用于提款、邀请码、密码重置和流程跳步的攻击算法；
- Last-Byte Gate、HTTP/2 同步和稳定的竞态窗口搜索；
- 自动最小化、成功率统计和完整 HTML 报告；
- 在多个不同靶场上的正式实验和对比结果。

## 3. 当前 CLI 的真实状态

当前 CLI 是半成品，主要作用是展示预期的数据流和插件接入方式。

它的帮助命令、模型校验、部分分阶段命令和交互菜单可以启动；但是它还不能作为一个完整、
通用、开箱即用的工具运行。全新克隆仓库后，使用者仍需要单独安装各插件、启动 Docker
靶场并准备指定格式的 Workflow 和 Invariant。当前能够连接起来的具体算法主要针对奶茶券
竞态，不能直接更换成任意系统后自动完成检测。

因此，课堂上运行 `statebreaker interactive` 所展示的是 CLI 和插件协议的原型，以及奶茶券
场景的阶段性接线结果，不代表 StateBreaker 已经实现完整的自动漏洞利用流水线。

更准确的表述是：

> 我们已经搭建了通用接口的外形，并用一个奶茶券场景验证部分接口可以连接；核心算法、
> 自动化能力和跨场景能力仍需要各成员继续开发。

## 4. GitHub PR 与成员贡献记录

以下内容以 GitHub 当前可见记录为准。PR 作者、提交作者和最终整合者并不总是一致，因此
分别说明。

### `RainyMarks`（项目维护者）

- [PR #5](https://github.com/RainyMarks/StateBreaker/pull/5)：分阶段 CLI、交互菜单、奶茶铺
  英文界面和文档整合。
- 该 PR 修改文件较多，其中一部分属于把现有模块连接到统一入口，并不表示所有模块算法都
  由维护者本人完成。

本人在本项目中主要负责：

- 建立最初的项目骨架和公共接口；
- 提供老王奶茶券 Docker 测试用例；
- 做基础 CLI 展示和仓库整合。

这部分工作的重点是给组员提供一个共同起点，不包含复杂的攻击算法研究。

### `Gamballmomo`

- [PR #4](https://github.com/RainyMarks/StateBreaker/pull/4)：第一版 HAR Capture importer。
- 模块负责读取 HAR 1.2 文件，把请求转换成统一 Workflow，并处理 JSON/Form 请求、Header
  和基本认证信息。
- PR 已合并到 `main`。
- 需要注意：GitHub 当前把 PR 内两个 commit 的作者显示为 `ra1nymark4-creator`，而 PR
  创建者是 `Gamballmomo`。如果课程评分依赖贡献图，后续需要由成员确认并修正 Git 作者
  邮箱映射。

### `Nya-Poka`

- [PR #3](https://github.com/RainyMarks/StateBreaker/pull/3)：
  `statebreaker-learner-delta` 状态学习模块。
- 主要内容是多次采样、状态差分、状态画像，以及 max-delta、min-value、状态转换等候选
  Invariant 的提出逻辑。
- PR #3 当前状态是 **Closed，而不是 Merged**。Learner 文件后来由维护者在整合提交中放入
  主分支，因此不能汇报为“PR #3 已合并”。

### `jianghe1821`

- 提交记录：`5e7c330 Add coupon race generator and executor plugins`。
- 负责奶茶券竞态的 AttackPlan Generator 和并发 Executor 原型。
- Generator 根据当前奶茶券 Workflow 和 Invariant 产生候选竞态计划；Executor 使用有限
  并发发送请求并记录前后状态。
- 该工作没有形成 GitHub PR，而是后来通过维护者的整合提交进入仓库。因此 GitHub PR 页面
  和 Contributors 页面不能完整体现这部分贡献。

### `ra1nymark4-creator`

- GitHub Contributors 页面显示该账户存在多次提交，但没有独立 PR。
- 这些提交主要是仓库初始化、模块整合、Capture 修订和 CLI/文档修改。
- 如果该账户与 `RainyMarks` 属于同一位成员，应在汇报中说明是同一人的不同 Git 身份，
  避免被误认为两名成员。

## 5. 当前模块完成度

| 模块 | 当前实现 | 当前局限 |
|---|---|---|
| Core skeleton | 模型、插件发现、HTTP runtime、事件格式 | 接口仍可能调整 |
| Capture | 离线 HAR importer | 不是浏览器实时代理，动态依赖识别不足 |
| Learner | 状态差分和少量候选规则 | 泛化能力未经多场景验证 |
| Generator | 奶茶券竞态计划原型 | 依赖当前场景标签，不是通用生成算法 |
| Executor | 基础 asyncio 并发 | 没有 Last-Byte Gate 和 HTTP/2 同步 |
| Verifier | 根据少量规则比较状态 | 依赖人工提供可查询状态和规则 |
| Reporter | 基础结果文件/PDF 原型 | 不是完整 HTML 可视化报告 |
| CLI | 命令和交互菜单外壳 | 半成品，不能开箱完成通用检测 |
| Docker lab | 奶茶券 TOCTOU 靶场 | 目前只有一个主要实验场景 |

## 6. 如何向老师演示

建议先展示架构，而不是宣称已经完成扫描器：

```text
HAR / Workflow
      ↓
Capture / Learn / Generate / Execute / Verify / Report plugins
      ↓
统一的 Workflow、Invariant、AttackPlan、Result 和 Finding
```

然后启动本地奶茶铺，说明这是当前唯一跑通的参考场景。CLI 菜单用于展示每一阶段未来如何
连接，不应说成已经能对任意目标自动检测。

可以现场这样描述：

> 当前我们的重点是先确定团队共同使用的接口。奶茶券是第一个测试用例，用来检查各模块
> 能否交换数据。Capture、Learner、Generator 和 Executor 已经有第一版原型，但通用算法和
> 完整 CLI 还没有完成。下一阶段每位成员会继续在自己的插件中实现和测试具体能力。

## 7. 下一阶段计划

1. 让每位成员通过自己的 GitHub 分支和 PR 提交模块，保留清晰的作者记录；
2. 修正已有提交的 Git 邮箱和 GitHub 账户映射；
3. 完成一个可实际使用的浏览器代理或 Capture 流程；
4. 减少 Generator 对奶茶券字段和标签的依赖；
5. 加入至少两个不同场景，验证接口是否真的具有复用价值；
6. 在这些场景稳定运行后，再整理正式实验数据和论文结论。

## 8. 阶段结论

StateBreaker 目前最主要的成果不是一个已经完成的漏洞扫描器，而是一个供多人并行开发的
初步插件骨架，以及一个可以观察业务状态变化的奶茶券竞态实验。现有 CLI 和各插件都属于
早期原型。项目已经有了明确方向和部分可展示代码，但距离通用、稳定、开箱即用仍有明显
差距。
