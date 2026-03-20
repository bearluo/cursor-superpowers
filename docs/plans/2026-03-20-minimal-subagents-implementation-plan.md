# Minimal Subagent Workflow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 把“最小 subagent 组合（A+C+D）+ 完成门禁”固化成团队可复用入口，降低新任务理解成本。

**Architecture:** 不改变业务代码。通过文档入口（`AGENTS.md` 或等效文件）把规则一页讲清，并在每次“宣称完成/可合并”之前走验证门禁清单。

**Tech Stack:** Cursor Agent 工作流、Git、仓库文档（`docs/plans/`）。

---

## Task 1: 创建团队入口文档

**Files:**
- Create: `AGENTS.md`
- Reference: `docs/plans/2026-03-20-minimal-subagents-design.md`

**Step 1: 写入最小规则摘要（文档内容）**

- 在 `AGENTS.md` 中放入三块内容（每块 3-5 行以内）：
  - “最小集合”：主编排代理 + 验证门禁（流程）+ 只读 Explore（条件性）。
  - “并行策略”：默认禁止并行；例外必须写明不可冲突边界。
  - “完成门禁”：行为门禁、 一致性门禁、回归门禁、证据记录。

**Step 2: 在 `AGENTS.md` 添加链接指向设计文档**

- 使用清晰的相对链接指向 `docs/plans/2026-03-20-minimal-subagents-design.md`，让成员可以按需展开细节。

**Step 3: git 提交**

- Run:
  - `git add "AGENTS.md"`
  - `git commit -m "docs: add minimal subagent workflow entry"`
  - Expected: 仅出现 `AGENTS.md` 的提交记录。

---

## Task 2（可选）: 在 `.cursor/` 规则中加入“完成门禁”提示

**Files:**
- Modify: `.cursor/rules/` 下的现有规则文件（若存在）
- Or Create: `.cursor/rules/RULE.md`（若不存在）

**Step 1: 检查是否已有团队规则入口**

- Run: 检查 `.cursor/rules/` 目录中是否已有规则文件。

**Step 2: 添加一条短提示**

- 提示内容必须包含：宣称完成/可合并前必须执行“完成门禁清单”，并记录证据。

**Step 3: git 提交**

- Run:
  - `git add ".cursor/rules/"`
  - `git commit -m "docs: add completion gate hint"`

---

## Task 3: 人工验证（无自动化依赖）

**Files:**
- Verify: `AGENTS.md`
- Verify: `docs/plans/2026-03-20-minimal-subagents-design.md`

**Step 1: 打开文档确认可读性**
- Expected:
  - 读者 1 分钟内能找到：主/门禁/Explore/并行策略/完成门禁四要素。

**Step 2: 用一句话描述团队执行方式**
- Expected:
  - 文档最后包含一句“新任务启动时先读入口，然后按门禁执行”的话术。

---

## Execution Handoff

Plan complete and saved to `docs/plans/2026-03-20-minimal-subagents-implementation-plan.md`.

Two execution options:
1. Subagent-Driven (this session) - 我可以继续把 `AGENTS.md` 落地并提交。
2. Parallel Session (separate) - 你用新会话开启执行（需要另起执行计划会话）。

Which approach?

