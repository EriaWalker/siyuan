# SiYuan Outline 多选、事务与快捷键问题清单

> 目的：记录 SiYuan Outline 标题多选、批量转换、Undo/Redo、样式一致性和快捷键支持的实现状态，避免后续把已经修复的问题当作 red tests 继续处理。

## 0. 当前阶段结论

- Outline 标题多选基础行为已经实现并通过 focused tests。
- Outline 多选初始样式一致性已在代码与实际手动验证中得到修复。多选会立即显示正确的视觉多选蓝色状态，不再依赖切换页面/文档。该修复增加了显式的 Outline 多选视觉状态。
- `Transform with sub-headings` 已支持 Outline 多选批量入口：单标题仍发送 `{id, level}`，多选发送 `{ids, level}`，并过滤嵌套选择，避免同一 subtree 被重复转换。
- `/api/block/getHeadingLevelTransaction` 保持 `{id, level}` 兼容，同时新增 `{ids, level}` 批量能力。
- 手动验证显示：编辑器内 `Ctrl+Alt+1..6` 可用，但 Outline 面板内仍不可用（虽有测试尝试与按键穿透修改，但在 Outline 面板运行时依然不工作，手动验证失败，不视为已完成）。
- 手动验证显示：`Alt++` / `Alt+-` 在编辑器和 Outline 面板内都不可用，仍待修复。
- 编辑器 range 跨多个 heading 与部分 undo/redo 深度场景仍保留为 pending/todo，需要更干净的 helper seam 或更完整 UI/editor fixture。

## 1. 折叠父标题选中子标题行为(已修复)

### 预期语义

采用 **Parent only** 语义：

```text
Selecting a folded parent heading selects the parent heading only.
Hidden/logical child headings must not be implicitly selected.
```

### 当前状态

- 已修复。
- `selectOutlineRange(...)` 现在只收集可见 Outline heading row，排除隐藏在 `ul.fn__none` 下的子标题。
- 非最后一个 folded parent 与最后一个 folded parent 行为一致。
- 验证：`pnpm -C app test:unit -- Outline.selection` 通过。

## 2. Outline 多选样式一致性（已修复）

### 预期行为

Outline 多选复用 DocTree/FileTree 的 selected row token：

```text
b3-list-item--focus
```

### 当前状态

- 已修复。
- 解决了 Outline 多选最初保持灰色，仅在切换页面/文档后变为蓝色的状态更新延迟问题。
- 当前已修正，多选会立即显示正确的视觉多选蓝色状态。该修复增加了显式的 Outline 多选视觉状态，而不是仅依赖普通的 `b3-list-item--focus`。
- 自动验证：`pnpm -C app test:unit -- Outline.styles` 通过。
- 手动验证已通过。

## 3. 编辑器选区包含多个标题时，Outline 不同步多选

### 问题描述

在编辑器中选中一个区域，该区域包含多个 heading block 时，Outline 中对应的多个标题不会同步进入选中状态。

### 当前状态

- 未实现，仍为 pending/todo。
- 现有公开同步路径偏向 `setCurrent(...)` 单 block，不适合直接测试跨多个 heading 的 DOM range。

### 后续建议

先抽出纯 helper，再把 todo 转成可执行测试：

```ts
getHeadingIdsInEditorRange(range: Range, root: HTMLElement): string[]
collectHeadingBlocksForShortcut(rangeOrCurrentBlock, outlineSelectionState)
```

## 4. 普通点击后 Ctrl/Cmd 点击第二个标题

### 问题描述

原问题是：

1. 普通左键点击 Outline 标题 A。
2. 按住 `Ctrl/Cmd` 左键点击 Outline 标题 B。
3. A 没有进入 batch selection set，导致批量命令只看到 B 或看不到完整集合。

### 当前状态

- 已修复。
- 普通左键点击 heading 会调用同一个 selection-state path，把 clicked heading 写入 batch selection set。
- `Ctrl/Cmd` 点击继续作为 toggle，只切换当前 heading，不清空其他已选 heading。
- 批量命令统一通过 `getSelectedHeadingItems(...)` 收集当前选择。
- 验证：`pnpm -C app test:unit -- Outline.selection` 通过。

## 5. Batch Transform with sub-headings 多选

### 预期行为

Outline 多选后执行 `Transform with sub-headings` 应：

- 对所有选中标题的 subtree 执行转换。
- 生成一个可 Undo/Redo 的事务响应。
- 嵌套选择时不重复转换同一 subtree。
- 保持单标题现有行为。

### 当前状态

- 已实现基础批量路径。
- 单标题仍调用 `/api/block/getHeadingLevelTransaction` with `{id, level}`。
- 多选调用同一 API with `{ids, level}`。
- 前端在发送批量 payload 前过滤嵌套选择，例如同时选中 `parent-a` 与 `child-a` 时只发送 `parent-a`。
- 后端新增 `GetHeadingLevelTransactions(ids, level)` 聚合多个 heading subtree transaction。
- 验证：`pnpm -C app test:unit -- Outline.transformWithSubheadings` 通过。

### 仍待加强

- `undo and redo restore all affected heading subtrees` 仍为 todo。
- `boundary heading levels are handled safely` 仍为 todo。
- 需要更纯的 subtree transaction helper 或更完整的 transaction fixture。

## 6. Ctrl+Alt+数字 exact heading-level shortcuts（仅编辑器可用，Outline 仍失败）

### 语义

真实快捷键是：

```text
Ctrl + Alt + number
```

### 当前状态

- 手动验证：编辑器中 `Ctrl+Alt+number` 可用。
- 手动验证：Outline 面板中 `Ctrl+Alt+number` 仍不可用（虽已添加测试与按键穿透修改，并在测试层面通过，但在 Outline 面板运行时真实按键仍然不生效）。
- 即使自动化测试通过，此项依然不视为已完成，依然保留在待修复的未解决部分中（以手动验证为准）。
- `headingsLevelTransaction(...)` 已支持 exact `level`，同时保留原有 `direction: "upgrade" | "downgrade"` 相对升降级调用方式；这只说明 transaction/helper 层具备能力，不代表真实 Outline keydown integration 已正确工作。
- `headingShortcutTransaction.spec.ts` 仍是 transaction-layer coverage，不代表完整编辑器 shortcut integration coverage。
- 自动验证：
  - `pnpm -C app test:unit -- headingShortcutTransaction` 通过。
  - `pnpm -C app test:unit -- Outline.selection` 通过。

### 仍待修复

- 修复真实 Outline keydown integration。
- 为 Outline 单选 heading 与多选 heading 增加 focused tests，覆盖 `Ctrl+Alt+1`、`Ctrl+Alt+2`、`Ctrl+Alt+6`。
- 编辑器真实 shortcut dispatch 与 editor range 多 heading 收集仍需要单独 helper seam。

## 7. Alt++ / Alt+- 相对 heading shortcuts（手动验证失败）

### 语义

```text
Alt++ = upgrade, H3 -> H2
Alt+- = downgrade, H3 -> H4
```

### 当前状态

- 代码层面曾加入 keymap 配置：
  - `headingUpgrade: {default: "⌥+", custom: "⌥+"}`
  - `headingDowngrade: {default: "⌥-", custom: "⌥-"}`
- `Config.IKeymapEditorHeading` 已新增 `headingUpgrade` / `headingDowngrade`。
- 手动验证：`Alt++` / `Alt+-` 在编辑器中不可用。
- 手动验证：`Alt++` / `Alt+-` 在 Outline 面板中不可用。
- 因此不能描述为 registered and working，也不能描述为 Outline/Editor 行为已完成。
- 自动验证：`pnpm -C app test:unit -- Outline.shortcuts` 通过，但当前只覆盖静态注册/文档语义，不足以证明真实 keyboard event matching 和 dispatch 正确。

### 仍待修复

- 验证 keymap registration 是否被配置加载、展示和运行时 shortcut matcher 正确读取。
- 验证实际 keyboard event matching：`Alt++` 可能涉及 `+` / `=` / keyboard layout 差异。
- 修复 editor dispatch 与 Outline dispatch。
- 增加覆盖：editor 单 heading、editor range 多 heading、Outline 单选、Outline 多选。

## 8. 已完成 / 已验证 / 手动失败

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

### 已手动确认或仍可信的完成项

- Outline 多选初始样式一致性已修复（移出待办）：多选会立即显示正确的视觉多选蓝色状态，而不是之前需要切换页面/文档才更新。此修复添加了显式的 Outline 多选视觉状态，不再仅依赖 `b3-list-item--focus`。
- folded parent parent-only selection 行为已修复。
- 普通点击 A 后再 Ctrl/Cmd 点击 B 的 batch selection state 已修复。
- `Transform with sub-headings` 基础多选 payload 支持已实现。
- 嵌套 subtree de-duplication 已实现。
- 后端兼容 `{id, level}` 和 `{ids, level}`。

### 手动验证失败 / 仍待修复

- Issue 6：编辑器 `Ctrl+Alt+number` 工作；Outline `Ctrl+Alt+number` 不工作。
- Issue 7：`Alt++` / `Alt+-` 在编辑器和 Outline 面板均不工作。

### Go 测试说明

- `go test ./api ./model` 在当前机器上触发 repo 既有 vet 报错，集中在 unrelated non-constant format string 调用。
- 使用 `-vet=off` 的 build-only check 可以通过，说明本轮 Go API/model 改动可编译。

## 9. 剩余待办

- 抽 `getHeadingIdsInEditorRange(range, root)` 或同等 helper，支持编辑器 range 内多个 heading 映射到 Outline 多选。
- 抽 `collectHeadingBlocksForShortcut(...)` 或同等 helper，统一 editor/Outline shortcut heading 收集。
- 抽 `buildTransformWithSubheadingsTransaction(...)` 或完善 fixture，把 `undo/redo restore all affected heading subtrees` and `boundary heading levels are handled safely` 从 todo 转成 real tests。
- 修复真实 Outline `Ctrl+Alt+1..6` keydown integration，并补单选/多选 focused tests。
- 修复 `Alt++` / `Alt+-` 的 keymap registration、keyboard event matching、editor dispatch、Outline dispatch。
- 为 `Outline.shortcuts.spec.ts` 中单选/多选 exact shortcuts、relative shortcuts、undo/redo 行为补可执行测试。
