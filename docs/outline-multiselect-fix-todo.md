# Outline 多选后续待做

> 当前文档只记录上一轮实现后仍需要继续处理的事项。已完成项不再作为 todo 保留。

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
   - 待补测试：Outline 单选 heading 与多选 heading 的 focused tests。

3. `Alt++` / `Alt+-` relative heading shortcut
   - 手动验证：编辑器中不可用。
   - 手动验证：Outline 面板中不可用。
   - 目标语义保持不变：`Alt++ = upgrade, H3 -> H2`；`Alt+- = downgrade, H3 -> H4`。
   - 待修复：keymap registration 加载、实际 keyboard event matching、editor dispatch、Outline dispatch。
   - 待补测试：editor 单 heading、editor range 多 heading、Outline 单选、Outline 多选。

## 仍待做

1. 编辑器 range 多 heading -> Outline 多选同步
   - 现状：`Outline.selection.spec.ts` 仍有 todo。
   - 建议 helper：`getHeadingIdsInEditorRange(range, root): string[]`。
   - 目标：编辑器 DOM selection/range 跨多个 heading block 时，能收集所有 heading ID，并同步标记 Outline 对应 heading。

2. Shortcut heading 收集 seam
   - 现状：`headingShortcutTransaction.spec.ts` 只覆盖 transaction layer；编辑器真实 keydown dispatch 仍缺少干净 unit seam。
   - 建议 helper：`collectHeadingBlocksForShortcut(rangeOrCurrentBlock, outlineSelectionState)`。
   - 目标：统一 editor 单 heading、editor range 多 heading、Outline 单选、Outline 多选的 heading collection。

3. Transform with sub-headings undo/redo 深度测试
   - 现状：`Outline.transformWithSubheadings.spec.ts` 仍有 `undo and redo restore all affected heading subtrees` todo。
   - 建议 helper：`buildTransformWithSubheadingsTransaction(...)`。
   - 目标：用纯 helper 或更完整 fixture 验证批量 subtree 转换的 do/undo operations 能完整恢复所有受影响 subtree。

4. Transform with sub-headings boundary level 测试
   - 现状：`Outline.transformWithSubheadings.spec.ts` 仍有 `boundary heading levels are handled safely` todo。
   - 目标：覆盖 H1/H6 边界，不越界、不生成无效 heading level。

5. Outline shortcut 行为测试补全
   - 现状：`Outline.shortcuts.spec.ts` 仍有 9 个 todo，且手动验证确认 Outline exact shortcuts 与 editor/Outline relative shortcuts 仍不可用。
   - 待转成 real tests：
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
