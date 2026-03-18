# Cocos Creator 项目目录结构实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在项目根目录下搭好设计文档中的目录与文档骨架，便于在 Cocos Creator 中直接使用或迁入已有工程。

**Architecture:** 先建 docs 与根级目录，再建 assets 下 scripts/prefabs/resources 等分支，最后补关键文档占位与 .gitignore。

**Tech Stack:** 无（仅目录与 Markdown）；后续在 Cocos Creator 中创建工程或迁入本结构。

---

## Task 1: 确认 docs 骨架已存在

**Files:** 已创建
- `docs/design/README.md`
- `docs/tech/README.md`
- `docs/art/README.md`
- `docs/audio/README.md`
- `docs/pipeline/README.md`
- `docs/changelog/README.md`

**Step 1:** 若尚未存在，则创建上述文件（内容见设计文档中的「文档与流程」）。  
**Step 2:** 提交（可选）：`git add docs/ && git commit -m "docs: add doc skeleton for design, tech, art, audio, pipeline, changelog"`

---

## Task 2: 创建 assets/scripts 子目录

**Files:** 新建空目录（用 .gitkeep 占位以便纳入版本控制）
- `assets/scripts/core/.gitkeep`
- `assets/scripts/framework/.gitkeep`
- `assets/scripts/framework/ui/.gitkeep`
- `assets/scripts/systems/.gitkeep`
- `assets/scripts/features/.gitkeep`
- `assets/scripts/services/.gitkeep`
- `assets/scripts/ui/.gitkeep`
- `assets/scripts/debug/.gitkeep`

**Step 1:** 在项目根下创建 `assets/scripts/`，再创建 core、framework、framework/ui、systems、features、services、ui、debug，各目录下放空文件 `.gitkeep`。  
**Step 2:** 提交（可选）：`git add assets/scripts/ && git commit -m "chore: add scripts dir structure (core, framework, systems, features, services, ui, debug)"`

---

## Task 3: 创建 assets 下资源目录

**Files:** 新建
- `assets/scenes/.gitkeep`
- `assets/prefabs/ui/.gitkeep`
- `assets/prefabs/gameplay/.gitkeep`
- `assets/prefabs/common/.gitkeep`
- `assets/textures/.gitkeep`
- `assets/audio/.gitkeep`
- `assets/animations/.gitkeep`
- `assets/effects/.gitkeep`
- `assets/data/config/.gitkeep`
- `assets/data/i18n/.gitkeep`
- `assets/resources/dynamic/.gitkeep`
- `assets/tests/.gitkeep`

**Step 1:** 按设计文档在 `assets/` 下创建 scenes、prefabs（含 ui、gameplay、common）、textures、audio、animations、effects、data/config、data/i18n、resources/dynamic、tests，各目录下放 `.gitkeep`。  
**Step 2:** 提交（可选）：`git add assets/ && git commit -m "chore: add assets dirs (scenes, prefabs, textures, audio, data, resources, tests)"`

---

## Task 4: 创建 tools 与 configs

**Files:**
- `tools/.gitkeep`
- `configs/.gitkeep`

**Step 1:** 在项目根创建 `tools/`、`configs/`，各放 `.gitkeep`。  
**Step 2:** 提交（可选）：`git add tools/ configs/ && git commit -m "chore: add tools and configs dirs"`

---

## Task 5: 添加关键文档占位

**Files:**
- Create: `docs/tech/architecture.md`
- Create: `docs/pipeline/assets-workflow.md`

**Step 1:** 创建 `docs/tech/architecture.md`，内容为标题与 2～3 句说明（依赖方向、core/framework/systems/features 职责）。  
**Step 2:** 创建 `docs/pipeline/assets-workflow.md`，内容为标题与命名规范表、分包对应目录说明（可从设计文档复制摘要）。  
**Step 3:** 提交（可选）：`git add docs/tech/architecture.md docs/pipeline/assets-workflow.md && git commit -m "docs: add architecture and assets-workflow stubs"`

---

## Task 6: 添加 .gitignore（Cocos 与本地）

**Files:** Create: `.gitignore`

**Step 1:** 若项目根尚无 `.gitignore`，则创建；若已有，则追加。内容需包含：
- `library/`
- `temp/`
- `local/`
- `*.meta` 的取舍（若 Cocos 需提交 meta 则不要忽略）

**Step 2:** 提交（可选）：`git add .gitignore && git commit -m "chore: add gitignore for Cocos library, temp, local"`

---

## 执行方式说明

**计划已保存到 `docs/plans/2026-03-16-cocos-creator-project-structure-impl.md`。两种执行方式：**

1. **本会话内由子代理执行**：按任务拆分子代理，每步完成后做一次检查，迭代快。  
2. **另开会话执行**：在新会话中使用 executing-plans，按批次执行并在检查点暂停。

**若选 1**：本会话内使用 subagent-driven-development，按 Task 2～6 依次执行（Task 1 已完成）。  
**若选 2**：在新会话中打开本计划，用 executing-plans 从 Task 1 或 2 开始执行。

请回复 1 或 2，或直接说「按计划执行」由我按方式 1 推进。
