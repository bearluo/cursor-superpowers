# docs/plans 使用说明（临时孵化区）

`docs/plans/` 用于存放临时规划文档，不作为长期归档目录。

## 适用范围

- 设计草案（尚在迭代）
- 实施计划（执行中）
- 重构提案（未稳定）

## 状态约定

建议在文档开头标注状态：

- `draft`：草案阶段
- `active`：执行中
- `archived`：已完成且不再维护（通常应迁移后留简短索引）

## 迁移触发条件

满足以下任一条件，应迁移到正式目录（`docs/design`、`docs/tech`、`docs/pipeline` 等）：

- 文档内容稳定，可作为团队长期参考
- 已被其它正式文档/规则长期引用
- 对应方案已落地，需要作为维护基线

## 迁移记录

- `docs/plans/2026-03-16-cocos-creator-project-structure-design.md` -> `docs/tech/2026-03-16-cocos-creator-project-structure-design.md`
- `docs/plans/2026-03-20-minimal-subagents-design.md` -> `docs/pipeline/2026-03-20-minimal-subagents-design.md`
- `docs/plans/2026-03-18-uimanager-async-redesign.md` -> `docs/tech/2026-03-18-uimanager-async-redesign.md`

## 暂留清单（active，不迁移）

以下文档当前仍在迭代，按决定保留在 `docs/plans/`：

- `docs/plans/2026-03-18-cyber-protocol-overload-roguelike-design.md`
- `docs/plans/2026-03-19-playable-demo-design.md`
