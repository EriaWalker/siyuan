# Outline 多选仍待修复事项

> 当前文档记录的是仍需要修复的功能缺口和未跑通的红测试。这里的 todo 不是“补充测试”本身，而是“功能还没正确实现，相关红测试/手动验证还没通过”。已完成项不再作为 todo 保留。

## 已完成，不再待做

- 折叠父标题 parent-only selection 行为已修复。
- 普通点击 A 后再 Ctrl/Cmd 点击 B 的 batch selection state 已修复。
- Ctrl/Cmd 点击已选 heading 只 toggle 当前 heading，保留其他已选 heading。
- `Transform with sub-headings` 已支持多选 payload `{ids, level}`，并保留单标题 payload `{id, level}`。
- 嵌套选择时已避免重复发送子 subtree。
- `/api/block/getHeadingLevelTransaction` 已兼容 `{id, level}` 与 `{ids, level}`。
- Outline 多选初始样式问题已修复。修复前，Outline 多选最初保持灰色，仅在切换页面/文档后变为蓝色。当前已修正，多选会立即显示正确的视觉多选状态。该修复增加了显式的 Outline 多选视觉状态，而不是仅依赖普通的 `b3-list-item--focus`。

## 手动验证失败 / 仍待修复

1. Outline `Ctrl+Alt+1..6` exact heading-level shortcut
   - 手动验证：编辑器中 `Ctrl+Alt+number` 可用。
   - 手动验证：Outline 面板中 `Ctrl+Alt+number` 不可用（已在 `keydown.ts` / `Outline.ts` 尝试添加按键穿透与测试，但真实 Outline 运行时依然不工作，手动验证失败）。
   - 目标语义保持不变：`Ctrl+Alt+1 => H1`，直到 `Ctrl+Alt+6 => H6`。
   - 待修复：真实 Outline 运行时的 keydown 键盘事件处理与分发。
   - 验收状态：虽然自动化测试可能已通过，但在通过手动验证之前，此项必须保留在未解决部分中（以手动验证为准）。

2. `Alt++` / `Alt+-` relative heading shortcut
   - 手动验证：编辑器中不可用。
   - 手动验证：Outline 面板中不可用。
   - 目标语义保持不变：`Alt++ = upgrade, H3 -> H2`；`Alt+- = downgrade, H3 -> H4`。
   - 待修复：keymap registration 加载、实际 keyboard event matching、editor dispatch、Outline dispatch。
   - 验收状态：editor 单 heading、editor range 多 heading、Outline 单选、Outline 多选这些场景仍未跑通。

3. outline 多选标题右键菜单中Transformation with sub-headings功能仍然不可靠，有时好用，但是大多数尝试都会出错，行为和语义不一致，有时都能转换，有时只会转换鼠标右键打开菜单时右键点击的标题。

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


## 最近一次验证结果

### 自动化测试 (Automated Tests)
- 运行测试命令：
  ```bash
  pnpm vitest run src/layout/dock/Outline.selection.spec.ts src/layout/dock/Outline.styles.spec.ts src/layout/dock/Outline.shortcuts.spec.ts src/protyle/wysiwyg/headingsLevelTransaction.spec.ts src/protyle/wysiwyg/headingShortcutTransaction.spec.ts
  ```
  结果：5 files, 29 passed, 7 existing todo。
- 类型生成验证：
  ```bash
  pnpm run gen:types
  ```
  结果：已通过。

### 手动验证结论 (Manual Verification - 具有最终决定权/Authoritative)

- **已通过手动验证 (Completed / Working)**:
  - Outline 多选初始样式一致性已修复（移出待办）：多选会立即显示正确的视觉多选蓝色状态，而不是之前需要切换页面/文档才更新。此修复添加了显式的 Outline 多选视觉状态，不再仅依赖 `b3-list-item--focus`。
  - Folded parent parent-only selection。
  - 普通点击 A 后 Ctrl/Cmd 点击 B 的 batch selection。
  - Transform with sub-headings 基础批量 payload 与嵌套 subtree 去重。
  - 后端 `{id, level}` / `{ids, level}` 兼容。

- **手动验证失败 (Failed / Unresolved - 即使自动化测试通过，也以手动验证为准)**:
  - Outline `Ctrl+Alt+1..6` 快捷键：在 Outline 面板中仍不生效，即使自动化测试已覆盖/通过。
  - Editor 与 Outline 中的 `Alt++` / `Alt+-` 相对标题层级快捷键：均不工作。

- **Out of scope**:
  - Go Back vs Undo UI。
