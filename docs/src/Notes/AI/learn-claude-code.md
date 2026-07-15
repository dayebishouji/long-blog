---
updateTime: '2026-04-12 01:36'
tags: AI
---
# learn-claude-code：Harness 工程学习笔记

> 仓库地址：[shareAI-lab/learn-claude-code](https://github.com/shareAI-lab/learn-claude-code)
> 
> [推荐可视化学习网站](https://learn.shareai.run/zh/) 

## 一、核心观点：模型即 Agent

在讨论如何构建 Agent 之前，需要先厘清一个根本性的概念：

**Agent 是一个模型，不是框架，不是 Prompt Chain，也不是拖拽式工作流。**

Agent 本质上是一个神经网络——经过数十亿次梯度更新在行动序列数据上训练过的 Transformer，它能感知环境、推理目标、并采取行动。这个定义从 AI 领域诞生之初就没有变过：

- 2013 年 DeepMind DQN 打 Atari 游戏，**那个模型就是 Agent**
- 2019 年 OpenAI Five 击败 Dota 2 世界冠军，**那五个神经网络就是 Agent**
- 2024-2025 年 Claude/GPT 作为 Coding Agent，读代码库、写实现、Debug，**那个大模型就是 Agent**

所有里程碑都有同一个真相：**"Agent" 从来不是周围的代码，Agent 永远是那个模型。**

### 伪 Agent 的问题

市面上充斥着"AI Agent 平台"——拖拽工作流、Prompt 链编排、节点图。这些东西本质上是 Rube Goldberg 机器：用 if-else 分支和硬编码路由逻辑把 LLM API 拼凑在一起，LLM 只是一个美化了的文本补全节点。

这不是 Agent，这是"带妄想的 Shell 脚本"。**你无法靠堆积过程逻辑来工程化出智能，智能是学出来的，不是编程编出来的。**

---

## 二、从"开发 Agent"到"开发 Harness"

既然智能已经在模型里，那工程师的工作是什么？

答案是：**构建 Harness（载具）**。

```
Harness = 工具 + 知识 + 观察接口 + 行动接口 + 权限边界

    工具：文件 I/O、Shell、网络、数据库、浏览器
    知识：产品文档、领域参考、API 规范、风格指南
    观察：git diff、错误日志、浏览器状态、传感器数据
    行动：CLI 命令、API 调用、UI 交互
    权限：沙箱、审批工作流、信任边界
```

**模型做决策，Harness 执行；模型推理，Harness 提供上下文。模型是驾驶员，Harness 是车。**

这个模式是通用的：
- Coding Agent = 模型 + IDE/终端/文件系统
- 农业 Agent = 模型 + 土壤/天气传感器 + 灌溉控制
- 酒店 Agent = 模型 + 预订系统 + 宾客沟通渠道

Harness 因领域而变，Agent（模型）跨领域泛化。

---

## 三、为什么以 Claude Code 为研究对象

Claude Code 是目前最优雅、最完整的 Agent Harness 实现，因为它**不尝试替代 Agent**：
- 不强加僵硬的工作流
- 不用复杂决策树代替模型推理
- 给模型工具、知识、上下文管理和权限边界，然后退后一步

Claude Code 的本质：

```
Claude Code = 一个 Agent Loop
            + 工具（bash、read、write、edit、glob、grep、browser...）
            + 按需技能加载
            + 上下文压缩
            + 子 Agent 派生
            + 带依赖图的任务系统
            + 带异步邮箱的团队协作
            + 并行执行的 Worktree 隔离
            + 权限治理
```

这就是全部架构。每一个组件都是 Harness 机制，而不是智能本身。

---

## 四、核心 Agent Loop

最小化的 Agent Loop 只需要这几行 Python：

```python
def agent_loop(messages):
    while True:
        response = client.messages.create(
            model=MODEL, system=SYSTEM,
            messages=messages, tools=TOOLS,
        )
        messages.append({"role": "assistant",
                         "content": response.content})

        if response.stop_reason != "tool_use":
            return   # 模型决定停止，返回文本

        results = []
        for block in response.content:
            if block.type == "tool_use":
                output = TOOL_HANDLERS[block.name](**block.input)
                results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": output,
                })
        messages.append({"role": "user", "content": results})
```

**模型决定何时调用工具、何时停止；代码只负责执行模型的请求。**

这个 Loop 本身不变，12 个 Session 都是在它之上叠加一层 Harness 机制。

---

## 五、12 个渐进式 Session

| Session | 主题 | 口诀 |
|---------|------|------|
| s01 | Agent Loop | *一个循环 + Bash 就够了* |
| s02 | 工具使用 | *添加工具只需添加一个 Handler* |
| s03 | TodoWrite 计划 | *没有计划的 Agent 会漂移* |
| s04 | 子 Agent | *拆分大任务；每个子任务有干净的上下文* |
| s05 | 技能加载 | *按需加载知识，而不是预先加载* |
| s06 | 上下文压缩 | *上下文会填满；你需要腾出空间* |
| s07 | 任务系统 | *把大目标拆成小任务，排序，持久化到磁盘* |
| s08 | 后台任务 | *后台运行慢操作；Agent 继续思考* |
| s09 | Agent 团队 | *任务太大时，委托给队友* |
| s10 | 团队协议 | *队友需要共享的沟通规则* |
| s11 | 自主 Agent | *队友自己扫描任务板并认领任务* |
| s12 | Worktree 隔离 | *每个人在自己的目录工作，互不干扰* |

学习路径分四个阶段：
- **Phase 1（THE LOOP）**：s01 → s02，掌握基础循环
- **Phase 2（PLANNING & KNOWLEDGE）**：s03 → s06，计划与知识管理
- **Phase 3（PERSISTENCE）**：s07 → s08，持久化与后台任务
- **Phase 4（TEAMS）**：s09 → s12，多 Agent 协作

---

## 六、几个核心 Harness 机制

### 1. 子 Agent（s04）
主 Agent 上下文会随时间膨胀。通过将子任务委托给拥有**独立 messages[] 的子 Agent**，可以保持主对话干净，防止上下文爆炸。

### 2. 技能按需加载（s05）
不要在 System Prompt 里一次性注入所有领域知识。通过 `tool_result` 按需注入，Agent 知道有哪些技能可用，需要时再拉取。

### 3. 上下文压缩（s06）
三层压缩策略：
- **Offload**：把大块内容写入文件系统，上下文只保留指针
- **Reduce**：对历史内容摘要压缩
- **Isolate**：通过子 Agent 切片，每次只携带最小上下文

### 4. 任务系统（s07）
基于文件的 CRUD 任务图，支持依赖关系。这是多 Agent 协作的基础：任务持久化到磁盘，多个 Agent 可以协调认领和完成任务。

### 5. 权限治理
沙箱文件访问、破坏性操作需要审批、在 Agent 和外部系统之间强制信任边界。

---

## 七、个人思考

这个仓库最有价值的地方不在于代码，而在于**思维方式的转变**：

工程师的职责是**构建模型能有效运转的环境**，而不是试图把智能编程进去。上下文越清晰、工具越原子、知识越精准，模型的智能表达就越充分。

对比自己之前写的 [Agent 架构笔记](./Agent.md)，这个仓库提供了一个非常系统的工程化视角：
- 用 `Harness = 工具 + 知识 + 观察 + 行动 + 权限` 这个公式统一了所有 Agent 场景
- 每个 Session 只增加一个机制，保持 Loop 不变，这种设计思路很值得借鉴
- Task 系统 + Worktree 隔离解决了长任务和并行执行的核心问题

> 相关项目：
> - [Kode Agent CLI](https://github.com/shareAI-lab/Kode-cli) — 开源 Coding Agent，支持 GLM/MiniMax/DeepSeek
> - [claw0](https://github.com/shareAI-lab/claw0) — 常驻 Agent Harness，支持心跳、Cron、IM 多渠道

---

## 八、`agents/` 目录逐文件源码解析

> 以下是对仓库 `agents/` 目录中每个文件的代码级详细分析。

---

### s01 — `s01_agent_loop.py`：最小 Agent Loop

**工具**：1 个（`bash`）

**核心结构**：
```python
def agent_loop(messages):
    while True:
        response = client.messages.create(model=..., messages=messages, tools=TOOLS)
        messages.append({"role": "assistant", "content": response.content})
        if response.stop_reason != "tool_use":
            return  # 模型决定停止
        results = []
        for block in response.content:
            if block.type == "tool_use":
                output = run_bash(block.input["command"])
                results.append({"type": "tool_result", "tool_use_id": block.id, "content": output})
        messages.append({"role": "user", "content": results})
```

**关键细节**：
- 危险命令黑名单：`rm -rf /`、`sudo`、`shutdown`、`reboot`、`> /dev/`
- 子进程超时 120s，输出截断至 50000 字符
- Loop 只有一个退出条件：`stop_reason != "tool_use"`，完全由模型决定

---

### s02 — `s02_tool_use.py`：工具派发表

**新增工具**：`read_file`、`write_file`、`edit_file`（共 4 个）

**核心模式** — 分发表 `{tool_name: handler}`：

```python
TOOL_HANDLERS = {
    "bash":       lambda **kw: run_bash(kw["command"]),
    "read_file":  lambda **kw: run_read(kw["path"], kw.get("limit")),
    "write_file": lambda **kw: run_write(kw["path"], kw["content"]),
    "edit_file":  lambda **kw: run_edit(kw["path"], kw["old_text"], kw["new_text"]),
}
```

**关键细节**：
- `safe_path()` 使用 `Path.resolve()` + `is_relative_to()` 强制路径不能逃出 WORKDIR（防路径遍历）
- `edit_file` 执行精确字符串替换（首次出现），找不到目标文本时返回 Error，不静默失败
- **Loop 本身零变化**，只是工具数组变大了，印证核心口诀："添加工具只需添加一个 Handler"

---

### s03 — `s03_todo_write.py`：计划跟踪（TodoWrite + Nag）

**新增工具**：`todo`（共 5 个）

**TodoManager 约束**：
- 最多 20 条任务
- 同时只能有 1 个 `in_progress` 状态
- 状态枚举：`pending / in_progress / completed`

**Nag Reminder 机制**：

```python
rounds_since_todo = 0 if used_todo else rounds_since_todo + 1
if rounds_since_todo >= 3:
    results.insert(0, {"type": "text", "text": "<reminder>Update your todos.</reminder>"})
```

连续 3 轮没有调用 `todo` 工具，就在下一轮 tool_result 前注入提醒，迫使模型更新进度。

**价值**：人类可以实时观察 Agent 的规划进度，知道它卡在哪个步骤。

---

### s04 — `s04_subagent.py`：子 Agent（上下文隔离）

**新增工具**：父 Agent 专属 `task`（子 Agent 无此工具，防止递归嵌套）

**核心机制**：

```python
def run_subagent(prompt: str) -> str:
    sub_messages = [{"role": "user", "content": prompt}]  # 全新上下文
    for _ in range(30):  # 安全上限
        response = client.messages.create(model=MODEL, system=SUBAGENT_SYSTEM,
                                          messages=sub_messages, tools=CHILD_TOOLS)
        ...loop...
    # 只返回最后一条文本，子 Agent 上下文被丢弃
    return "".join(b.text for b in response.content if hasattr(b, "text"))
```

| 维度 | 父 Agent | 子 Agent |
|------|----------|----------|
| 上下文 | 全量历史 | 全新 `messages=[]` |
| 文件系统 | 共享 | 共享 |
| 返回值 | 完整状态 | 只有文本摘要 |
| 工具 | 含 `task` | 不含 `task` |

---

### s05 — `s05_skill_loading.py`：技能按需加载

**新增工具**：`load_skill`

**两层注入策略**：

| 层 | 位置 | 内容 | Token 代价 |
|----|------|------|------------|
| Layer 1 | System Prompt | 技能名 + 简短描述 | ~100 tokens/skill |
| Layer 2 | `tool_result` | 完整 `SKILL.md` 内容 | 按需 |

```
skills/pdf/SKILL.md          <- YAML frontmatter + body
skills/code-review/SKILL.md

System Prompt:
  Skills available:
    - pdf: Process PDF files...      <- 只注入元数据
    - code-review: Review code...

模型调用 load_skill("pdf") ->
  tool_result: <skill name="pdf">完整步骤...</skill>  <- 按需注入全文
```

**核心原则**：**不要把所有知识塞进 System Prompt，按需拉取**。

---

### s06 — `s06_context_compact.py`：三层上下文压缩

**新增工具**：`compact`（手动触发）

**三层流水线**：

**Layer 1 — `micro_compact`（静默，每轮 Loop 前执行）**
- 扫描全部 `tool_result`，保留最近 3 个，旧的替换为 `[Previous: used {tool_name}]`
- 不调用 LLM，零开销

**Layer 2 — `auto_compact`（token 估算 > 50000 时自动触发）**
- 把完整对话保存到 `.transcripts/transcript_{timestamp}.jsonl`
- 调用 LLM 生成摘要（完成内容 / 当前状态 / 关键决策）
- 压缩为 2 条消息：`[summary + transcript_path]` + `"Understood."`

**Layer 3 — `compact` 工具（模型主动触发）**
- 与 auto_compact 逻辑相同，模型可主动决定压缩时机

```python
def agent_loop(messages):
    while True:
        micro_compact(messages)                           # Layer 1
        if estimate_tokens(messages) > THRESHOLD:
            messages[:] = auto_compact(messages)          # Layer 2
        response = client.messages.create(...)
        ...
        if manual_compact:
            messages[:] = auto_compact(messages)          # Layer 3
```

token 估算：`len(str(messages)) // 4`（粗估，约 4 字符/token）。

---

### s07 — `s07_task_system.py`：持久化任务系统（带依赖图）

**新增工具**：`task_create`、`task_update`、`task_list`、`task_get`（共 8 个）

**任务图结构**：
```
.tasks/
  task_1.json  {"id":1, "status":"completed", "blockedBy":[], "blocks":[2]}
  task_2.json  {"id":2, "status":"pending",   "blockedBy":[1], "blocks":[3]}
  task_3.json  {"id":3, "status":"pending",   "blockedBy":[2], "blocks":[]}
```

**依赖关系自动维护**：

```python
def update(self, task_id, status=None, add_blocked_by=None, add_blocks=None):
    if status == "completed":
        self._clear_dependency(task_id)  # 从所有任务的 blockedBy 中移除
    if add_blocks:
        # 双向绑定：A blocks B => B.blockedBy 也自动加入 A
        for blocked_id in add_blocks:
            blocked["blockedBy"].append(task_id)
```

**关键价值**：任务以 JSON 文件形式存在磁盘，独立于对话上下文，**压缩后目标不丢失**。

---

### s08 — `s08_background_tasks.py`：后台任务（非阻塞执行）

**新增工具**：`background_run`、`check_background`（共 6 个）

**核心机制** — 守护线程 + 通知队列：

```python
class BackgroundManager:
    def run(self, command: str) -> str:
        task_id = str(uuid.uuid4())[:8]
        thread = threading.Thread(target=self._execute, args=(task_id, command), daemon=True)
        thread.start()
        return f"Background task {task_id} started"  # 立即返回，不阻塞

    def _execute(self, task_id, command):
        ...subprocess.run(...)...
        self._notification_queue.append({...})  # 完成后推入队列

    def drain_notifications(self) -> list:
        # 每次 LLM 调用前清空，把结果注入 messages
```

后台任务完成通知在**下一个 LLM 调用前**注入，模型在等待期间可以继续做其他工作。后台超时 300s（比前台 bash 的 120s 更宽松）。

---

### s09 — `s09_agent_teams.py`：持久化 Agent 团队

**新增工具**：`spawn_teammate`、`list_teammates`、`send_message`、`read_inbox`、`broadcast`（共 9 个）

**与 s04 子 Agent 的本质区别**：

| | 子 Agent（s04） | 队友（s09） |
|-|-----------------|-------------|
| 生命周期 | spawn → 完成 → 销毁 | spawn → 工作 → 空闲 → 工作 → ... |
| 通信 | 只返回摘要 | JSONL 邮箱双向通信 |
| 上下文 | 一次性 | 持久保留 |

**文件结构**：
```
.team/config.json          <- 成员注册表（name/role/status）
.team/inbox/
  alice.jsonl              <- 追加写入，读取时清空（drain 语义）
  bob.jsonl
  lead.jsonl
```

**5 种消息类型**：`message / broadcast / shutdown_request / shutdown_response / plan_approval_response`

每个队友在独立线程中运行自己的 agent_loop，收件箱消息在每轮循环开头注入 messages。

---

### s10 — `s10_team_protocols.py`：团队协议（FSM 握手）

**新增工具**：`shutdown_request`、`shutdown_response`、`plan_approval`（共 12 个）

**两个协议，同一个 `request_id` 关联模式**：

**Shutdown 协议（状态机：pending → approved / rejected）**：

```
Lead                           Teammate
  shutdown_request(req_id) ──→  收到 shutdown_request
                                 shutdown_response(req_id, approve=True)
                           ←──
  shutdown_requests[req_id] = "approved"
  → 队友线程退出
```

**Plan Approval 协议**：

```
Teammate                       Lead
  plan_approval(plan="...")  ──→  收到计划
                                   plan_approval_response(req_id, approve, feedback)
                           ←──
  根据 approve 决定是否继续执行
```

`_tracker_lock` 线程锁保证并发安全，两个协议复用同一套 request_id 关联机制，可扩展到任意需要握手确认的场景。

---

### s11 — `s11_autonomous_agents.py`：自主 Agent（主动认领任务）

**新增工具**：`idle`、`claim_task`（共 14 个）

**工作 / 空闲双阶段循环**：

```
WORK 阶段（标准 agent_loop）
    │
    │  stop_reason != "tool_use" 或 模型调用 idle 工具
    ↓
IDLE 阶段（每 5s 轮询，最多 60s）
    │
    ├─ 收件箱有消息？→ 注入 messages → 恢复 WORK
    │
    ├─ .tasks/ 有无主未阻塞的 pending 任务？
    │     → claim_task（加 _claim_lock 防竞争）
    │     → 注入 <auto-claimed>Task #N: ...</auto-claimed>
    │     → 恢复 WORK
    │
    └─ 超时（60s）→ status = "shutdown" → 线程退出
```

**身份再注入**（防压缩后失忆）：

```python
def make_identity_block(name, role, team_name) -> dict:
    return {
        "role": "user",
        "content": f"<identity>You are '{name}', role: {role}, team: {team_name}. Continue your work.</identity>",
    }
```

当 `messages` 长度 ≤ 3（被压缩过）时，自动在开头插入身份块，让 Agent 知道自己是谁。

---

### s12 — `s12_worktree_task_isolation.py`：Worktree + 任务隔离

**新增工具**：`worktree_create/list/status/run/keep/remove`、`worktree_events`（共 16 个）

**控制面（Task）与执行面（Worktree）绑定**：

```
.tasks/task_12.json
  { "id": 12, "subject": "Implement auth refactor",
    "status": "in_progress", "worktree": "auth-refactor" }

.worktrees/index.json
  { "name": "auth-refactor",
    "path": ".../.worktrees/auth-refactor",  <- 独立目录
    "branch": "wt/auth-refactor",            <- 独立 git 分支
    "task_id": 12, "status": "active" }
```

**三个核心类**：
- **`TaskManager`**：CRUD 任务，支持 `bind_worktree` / `unbind_worktree`
- **`WorktreeManager`**：封装 `git worktree add/remove`，维护 index.json，提供 `run(name, command)` 在指定目录执行命令
- **`EventBus`**：追加式 JSONL 事件日志，记录 `worktree.create.before/after/failed`、`worktree.remove.before/after`、`task.completed` 等生命周期事件

**Worktree 生命周期**：

```
worktree_create  →  worktree_run（在隔离目录执行工作）
               →  worktree_keep（保留分支，待后续合并）
               或  worktree_remove(complete_task=True)（删除目录 + 标记任务完成）
```

分支命名规范 `wt/{name}` 由代码强制，名称校验正则：`[A-Za-z0-9._-]{1,40}`。

---

### s_full — `s_full.py`：终章，全机制整合

Capstone 文件，将 s01–s11 所有机制合并为一个完整 Agent（s12 worktree 机制独立教学，未合入）。

**每个 LLM 调用前的 4 步前置检查**：

```python
def agent_loop(messages):
    while True:
        micro_compact(messages)                           # 1. Layer 1 压缩
        if estimate_tokens(messages) > 100000:
            messages[:] = auto_compact(messages)          # 2. Layer 2 压缩（阈值翻倍至 100k）
        notifs = BG.drain_notifications()                 # 3. 注入后台任务结果
        if notifs: messages.append(...)
        inbox = BUS.read_inbox("lead")                    # 4. 注入收件箱消息
        if inbox: messages.append(...)
        response = client.messages.create(...)
```

**完整工具集（25+ 个）**：

| 类别 | 工具 |
|------|------|
| 基础 I/O | `bash / read_file / write_file / edit_file` |
| 计划 | `todo`（含 Nag Reminder） |
| 子 Agent | `task`（Explore/Write 两种类型） |
| 知识 | `load_skill` |
| 压缩 | `compact` |
| 持久任务 | `task_create / task_update / task_list / task_get` |
| 后台执行 | `background_run / check_background` |
| 团队 | `spawn_teammate / list_teammates / send_message / read_inbox / broadcast` |
| 协议 | `shutdown_request / shutdown_response / plan_approval` |
| 自主 | `idle / claim_task` |

**REPL 快捷命令**：`/compact`、`/tasks`、`/team`、`/inbox`

---

### 各 Session 工具数量汇总

| Session | 新增机制 | 新增工具 | 累计工具 |
|---------|----------|----------|----------|
| s01 | 最小 Loop | 1 | 1 |
| s02 | 工具派发表 | 3 | 4 |
| s03 | TodoWrite + Nag | 1 | 5 |
| s04 | 子 Agent（上下文隔离） | 1（父）| 5+1 |
| s05 | 技能按需加载 | 1 | 5 |
| s06 | 三层压缩 | 1 | 5 |
| s07 | 持久化任务图 | 4 | 8 |
| s08 | 后台线程 + 通知队列 | 2 | 6 |
| s09 | 团队邮箱 | 5 | 9 |
| s10 | Shutdown + Plan 协议 | 3 | 12 |
| s11 | 自主空闲轮询 + 认领 | 2 | 14 |
| s12 | Worktree 隔离 + 事件总线 | 8 | 16 |

**贯穿始终的工程原则**：
1. **Loop 不变**，每次只在外围加一层机制
2. **工具是原子的**，每个工具做且仅做一件事
3. **状态外置**，任务/邮箱/技能/transcript 全在磁盘，不依赖对话历史
4. **危险防护一致**，黑名单命令 + 路径逃逸检测贯穿所有文件
5. **并发安全**，凡多线程写同一资源，一律加 Lock
