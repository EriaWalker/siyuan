# Outline 多选仍待修复事项

> 当前文档记录的是仍需要修复的功能缺口和未跑通的红测试。这里的 todo 不是“补充测试”本身，而是“功能还没正确实现，相关红测试/手动验证还没通过”。已完成项不再作为 todo 保留。

## 已完成，不再待做

- 折叠父标题 parent-only selection 行为已修复。
- 普通点击 A 后再 Ctrl/Cmd 点击 B 的 batch selection state 已修复。
- Ctrl/Cmd 点击已选 heading 只 toggle 当前 heading，保留其他已选 heading。
- `Transform with sub-headings` 已支持多选 payload `{ids, level}`，并保留单标题 payload `{id, level}`。
- 嵌套选择时已避免重复发送子 subtree。
- `/api/block/getHeadingLevelTransaction` 已兼容 `{id, level}` 与 `{ids, level}`。

## 手动验证失败 / 仍待修复

1. Outline 多选样式一致性
   - 代码/静态测试层面已改用 `b3-list-item--focus`，但手动验证显示仍未完全修复。
   - FileTree 单选 CSS 是灰色，FileTree 多选 CSS 是蓝色。
   - Outline 单选是灰色。
   - Outline 多选在刚选中多个标题后仍是灰色。
   - 切换 Outline 面板到另一个页面/文档，再切回后，多选才变成蓝色。
   - 待调查：为什么 Outline 多选初始渲染为灰色，但经过 panel/page switching 后变成蓝色。

2. Outline `Ctrl+Alt+1..6` exact heading-level shortcut
   - 手动验证：编辑器中 `Ctrl+Alt+number` 可用。
   - 手动验证：Outline 面板中 `Ctrl+Alt+number` 不可用。
   - 目标语义保持不变：`Ctrl+Alt+1 => H1`，直到 `Ctrl+Alt+6 => H6`。
   - 待修复：真实 Outline keydown integration。
   - 验收状态：Outline 单选 heading 与多选 heading 的相关红测试仍应视为未跑通，不能只补测试绕过。

3. `Alt++` / `Alt+-` relative heading shortcut
   - 手动验证：编辑器中不可用。
   - 手动验证：Outline 面板中不可用。
   - 目标语义保持不变：`Alt++ = upgrade, H3 -> H2`；`Alt+- = downgrade, H3 -> H4`。
   - 待修复：keymap registration 加载、实际 keyboard event matching、editor dispatch、Outline dispatch。
   - 验收状态：editor 单 heading、editor range 多 heading、Outline 单选、Outline 多选这些场景仍未跑通。

## 仍待做

1. 编辑器 range 多 heading -> Outline 多选同步
   - 现状：编辑器 DOM selection/range 跨多个 heading block 时，Outline 仍不能同步标记多个 heading。
   - 待修复：实现 range -> heading IDs 的收集，例如通过 `getHeadingIdsInEditorRange(range, root): string[]`。
   - 验收标准：相关红测试应能证明跨多个 heading block 的选区会同步到 Outline 多选。

2. Shortcut heading 收集 seam
   - 现状：`headingShortcutTransaction.spec.ts` 只覆盖 transaction layer；真实快捷键路径仍不能稳定拿到要操作的 heading 集合。
   - 待修复：实现统一收集入口，例如 `collectHeadingBlocksForShortcut(rangeOrCurrentBlock, outlineSelectionState)`。
   - 验收标准：editor 单 heading、editor range 多 heading、Outline 单选、Outline 多选都能走同一收集语义并通过红测试。

3. Transform with sub-headings undo/redo 行为
   - 现状：批量 subtree 转换的基础 payload 已有，但 undo/redo 是否完整恢复所有受影响 subtree 仍未跑通。
   - 待修复：抽出或实现 `buildTransformWithSubheadingsTransaction(...)` 等真实事务构造路径，而不是只补测试。
   - 验收标准：红测试应证明 do/undo operations 可以完整恢复所有受影响 subtree。

4. Transform with sub-headings boundary level 行为
   - 现状：H1/H6 边界等级在批量 with-subheadings 路径下仍缺少实际行为保证。
   - 待修复：确保 H1/H6 边界不越界、不生成无效 heading level。
   - 验收标准：相关红测试跑通，证明 boundary heading levels are handled safely。

5. Outline/editor shortcut 行为修复
   - 现状：`Outline.shortcuts.spec.ts` 仍有 9 个未跑通场景，且手动验证确认 Outline exact shortcuts 与 editor/Outline relative shortcuts 仍不可用。
   - 待修复场景：
     - `Ctrl+Alt+1 changes all selected Outline headings to exact H1`
     - `Ctrl+Alt+2 changes all selected Outline headings to exact H2`
     - `Ctrl+Alt+6 changes all selected Outline headings to exact H6`
     - `undo/redo works for Ctrl+Alt+number batch exact-heading-level shortcuts`
     - `Alt++ on one selected Outline heading calls the existing upgrade path`
     - `Alt+- on one selected Outline heading calls the existing downgrade path`
     - `Alt++ and Alt+- use the batch path for multiple Outline headings`
     - `editor Ctrl+Alt+number dispatch on a single editor heading calls the exact heading-level path`
     - `editor Ctrl+Alt+number dispatch with a selection/range containing multiple headings calls the batch exact-level path`

6. Go Back vs Undo UI 语义调查
   - 当前不属于 Outline heading 多选、heading shortcut 修复范围。
   - 本任务不要实现 Go Back vs Undo UI。
   - 如未来单独处理，需要先确认产品语义，再决定是否改 tooltip、文档说明或实际行为。

## 最近一次验证结果

- `pnpm -C app test:unit -- Outline.selection`：通过，`10 passed | 2 todo`
- `pnpm -C app test:unit -- Outline.styles`：通过，`2 passed`
- `pnpm -C app test:unit -- Outline.transformWithSubheadings`：通过，`3 passed | 2 todo`
- `pnpm -C app test:unit -- headingShortcutTransaction`：通过，`3 passed`
- `pnpm -C app test:unit -- Outline.shortcuts`：通过，`3 passed | 9 todo`
- `pnpm -C app test:unit -- headingsLevelTransaction`：通过，`7 passed`
- `pnpm -C app test:unit -- Outline`：通过，`18 passed | 13 todo`
- `pnpm -C app test:unit`：通过，`28 passed | 13 todo`
- `pnpm -C app exec tsc --pretty false --emitDeclarationOnly false --noEmit`：通过
- `git diff --check`：通过
- `go test -vet=off -run '^$' -count=0 ./api ./model` from `kernel`：通过

## 最新手动验证结论

- 已确认 working：folded parent parent-only selection、普通点击后 Ctrl/Cmd 点击的 batch selection、Transform with sub-headings 基础批量 payload、嵌套 subtree 去重、后端 `{id, level}` / `{ids, level}` 兼容。
- 手动验证 failed：Outline 多选样式一致性、Outline `Ctrl+Alt+1..6`、editor/Outline `Alt++` / `Alt+-`。
- Out of scope：Go Back vs Undo UI。
