---
updateTime: '2026-03-07 23:11'
tags: AI
---
# Agent
+ **主流技术范式**：行业路线正从"单次模型调用"转向更工程化的 **Agent Loop**（计划 → 执行 → 观察 → 修正），并进一步演进为 **多 Agent 协作（Multi-Agent Systems）** 与 **上下文工程（Context Engineering）**。其核心目标是把文件系统、日志、检索结果等作为"**外部记忆**/外部状态"，弥补 LLM 长时记忆与全局一致性不足的问题。

## Agent 架构
### MainAgent + SubAgent
在流程上，形成了这样的循环

1. MainAgent 理解上下文，生成 Todo（此 Todo 很固定，调用工具 --> 理解当前上下文 --> 调用 SubAgent）
2. MainAgent 根据 Todo，生成简洁任务描述，交给 SubAgent
3. SubAgent 干活，返回结果
4. MainAgent 理解 SubAgent 的返回结果，并且返回到 1 直到结束

为了维持 SubAgent 的效果，我们将每个 SubAgent 处理的数据做了限制，确保其上下文不会变得太大。但是这样会导致 SubAgent 的调用变多，其每一次调用都有一次 Task Tool 和返回结果的开销，导致 MainAgent 的上下文变大，对于长时间运行的任务会导致 MainAgent 上下文爆掉，从而导致偷懒、降智、耗时长、直接退出等严重问题。

### Harness+ Agent
既然流程固定、状态流转也可以工具化，那么继续让 MainAgent 承担“编排 + 记忆 + 解释一切”的职责并不划算。为进一步提升稳定性，我们将架构演进为：**由代码（Harness）负责流程编排与状态机，Agent 负责阶段性任务执行**。

:::info
好像是自主型Agent 和 工作流Agent的结合体

:::

<!-- 这是一张图片，ocr 内容为：COORDINATOR TASK MANAGER AGENT WORKFLOW COORDINATION [CHECK STAGE STATUS] LOOP STAGE-STATUS RETURN CURRENT STAGE / COMPLETION STATUS [WHEN TASKS AVAILABLE] OPT TASK INITIALIZATION INIT (REQUEST TASK ASSIGNMENT) RETURN TASK ID & CONFIG CONTEXT GATHERING FETCH (GET DATA RECORDS) RETURN RECORDS TO ANALYZE EXECUTION SPAWN AGENT WITH DATA PERFORMANALYSIS SUBMIT (SEND RESULTS) ACKNOWLEDGE SUCCESS REPORT COMPLETION CLEANUP RELEASE(UNLOCK/FINISH TASK) SUCCESS COORDINATOR TASK MANAGER AGENT -->
![](/minio/weblog/image_agent.png)

引入 Harness 后带来的直接好处：

1. **任务分发更细**：可以把工作拆成更小粒度的任务单元，然后支持并行调用 Agent 以提高处理速度。
2. **Hook 更自然**：在每个阶段前后插入 PreHook/PostHook（例如初始化、清理、校验等），充当 Verifier。
3. **可停止与可恢复**：可以在任意阶段停机，并从指定阶段恢复，适合长任务与失败重试。

## 上下文处理方法
+ **Offload context（外置记忆/外部状态）**：把大块材料与过程产物（计划、笔记、网页原文、工具输出、代码片段、状态快照等）写到文件系统或其他存储；在上下文里只保留**指针型信息**（路径、索引、摘要、版本/时间戳），需要时再按需读取。
+ **Reduce context（减少体积）**：对历史内容做压缩（compaction）与摘要（summarization），把冗长历史折叠为更短表达。Coding 场景下，这种方式会导致工具调用信息缺失，基本不可用。
+ **Isolate context（隔离上下文）**：通过 SubAgent/子任务把工作切片，让每次执行只携带与该切片相关的最小上下文。

工具调用的descroption占用大量上下文：只提供大模型一些原子不可分割的工具，比如bash(他可以使用bash去执行任意脚本)

还可以对旧的工具结果进行压缩

