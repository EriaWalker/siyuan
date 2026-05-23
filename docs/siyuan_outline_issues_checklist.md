# SiYuan Outline 多选、事务与快捷键问题清单

> 目的：汇总当前围绕 SiYuan Outline 标题多选、批量转换、Undo/Redo、样式一致性和快捷键支持讨论过的问题，作为后续 Codex TDD / 实现任务的需求清单。

## 0. 当前阶段结论

- 当前处于 TDD red-phase 文档状态：测试层已建立，部分测试故意失败，用于锁定后续实现目标。
- `headingsLevelTransaction` 事务层测试已通过，说明在“已经拿到 heading 元素集合”的前提下，批量标题升降级的事务生成、Undo/Redo、折叠标题 oldHTML、安全顺序等已有基础保障。
- 新增 Outline 相关测试中，部分是 intentional red tests，用来描述尚未实现或仍有 bug 的行为。
- 通过的 `headingShortcutTransaction` 测试只覆盖 transaction layer，不覆盖真实快捷键入口、Outline 多选状态收集、编辑器选区映射。
- `pnpm -C app test:unit -- Outline` 和 `pnpm -C app test:unit` 当前预期失败，失败来源是 intentional red tests。
- `pnpm -C app exec tsc --pretty false --emitDeclarationOnly false --noEmit` 和 `git diff --check` 已通过。
- 后续应避免把“事务层通过”误判为“真实 UI 快捷键和 Outline 多选已经正确”。

---

## 1. 折叠父标题选中子标题行为不一致

### 问题描述

在 Outline 中选中一个已经折叠的父标题时，子标题是否被选中存在不一致：

- 当父标题不是最后一个父标题时，子标题有时会被选中。
- 当父标题是最后一个父标题时，子标题不会被选中。

### 已确认的预期语义

采用 **Parent only** 语义：

```text
Selecting a folded parent heading selects the parent heading only.
Hidden/logical child headings must not be implicitly selected.
```

也就是说：

- 折叠只是视觉隐藏，不等于选择子树。
- 普通点击 folded parent 只应选中父标题本身。
- 是否包含子标题应由明确的 subtree command 决定，例如 `Transform with sub-headings`。
- 该行为不能依赖父标题是否是最后一个父标题。

### 测试要求

应有测试覆盖：

- 选中非最后一个 folded parent，不选中隐藏子标题。
- 选中最后一个 folded parent，也不选中隐藏子标题。
- 两种情况必须行为一致。

### 当前状态

- 已在 `Outline.selection.spec.ts` 加入 consistency 测试。
- `selects a folded final parent with the same parent-only rule` 当前通过。
- `selects a folded non-final parent without selecting hidden children` 当前是红测试。
- 仍需根据红测试修复 Outline selection 逻辑。

---

## 2. Outline 多选样式与 DocTree/FileTree 不一致

### 问题描述

当前 Outline 多选样式与 DocTree/FileTree 的选中样式不一致，导致视觉体验不统一。

### 预期行为

Outline 的多选视觉样式应尽量复用 DocTree/FileTree 的选中样式约定，例如：

```text
b3-list-item--focus
```

避免引入 Outline-only 的独立选中样式，除非有明确设计理由。

### 测试要求

应有静态或样式类测试覆盖：

- Outline 多选使用 DocTree/FileTree 的 selected row token。
- Outline 不额外引入独立的 selected row class。

### 当前状态

- 已在 `Outline.styles.spec.ts` 加入两个 static red tests：
  - `uses the DocTree/FileTree selected row token for Outline multi-selection`
  - `does not introduce a separate Outline-only selected row class`
- 后续需要对齐样式 class / token。

---

## 3. 编辑器选区包含多个标题时，Outline 不同步多选

### 问题描述

在编辑器中选中一个区域，该区域包含多个标题时，Outline 中对应的多个标题不会同步进入选中状态。

### 预期行为

当编辑器选区跨越多个 heading block 时，系统应能识别选区内所有标题，并在 Outline 中同步对应标题的选中状态。

### 需要的核心能力

建议后续抽出纯 helper，例如：

```ts
getHeadingIdsInEditorRange(range: Range, root: HTMLElement): string[]
```

或者抽象为：

```ts
collectHeadingBlocksForShortcut(rangeOrCurrentBlock, outlineSelectionState)
```

### 测试要求

应覆盖：

- 编辑器 DOM selection/range 跨多个 heading block。
- 映射出所有对应 heading IDs。
- Outline 对应多个 heading 被标记为选中。

### 当前状态

- 当前主要是 `it.todo` / pending。
- 原因：现有公开同步路径偏向 `setCurrent` 单 block，不适合直接测试多 heading range。
- 后续需要先抽可测试 helper 或增加干净的 sync seam。

---

## 4. 普通点击后 Ctrl/Cmd 点击第二个标题，原选中丢失

### 问题描述

复现步骤：

1. 普通左键点击 Outline 标题 A。
2. 按住 `Ctrl/Cmd` 左键点击 Outline 标题 B。

实际结果：

- A 的选中状态会失效，或 A 只是视觉/current selected，并未进入真正的 batch selection set。

预期结果：

- A 和 B 都应该被批量操作识别为选中。

### 关键判断

这里很可能存在两个状态不一致：

```text
1. 视觉上的当前选中标题 / focused heading
2. 批量操作真正读取的 selection collection
```

普通左键点击 A 时，A 必须被记录到批量操作使用的同一 selection state 中，否则后续 Ctrl/Cmd 点击 B 后，批量操作只能拿到 B 或拿不到完整集合。

### 测试要求

应覆盖：

- 普通左键点击 A 后，batch selection collector 能返回 A。
- 普通左键点击 A，再 Ctrl/Cmd 点击 B 后，collector 返回 A 和 B。
- Ctrl/Cmd 点击已选中的 B 时，只 toggle B，不清空其他选中项。
- 测试不能只断言 CSS class，必须断言批量命令实际使用的数据路径，例如 `getSelectedHeadingItems(...)` 或等价 collector。

### 当前状态

- 已在 `Outline.selection.spec.ts` 加入 failing red tests。
- 视觉/CSS 行为红测试：
  - `ordinary click followed by Ctrl/Cmd click keeps the first heading selected and adds the second`
  - `Ctrl/Cmd click on an already selected heading toggles only that heading`
- batch command 数据路径红测试：
  - `ordinary left-click heading A records A in the batch command selection state`
  - `left-click A then Ctrl/Cmd-click B makes the batch selection collector return A and B`
  - `Ctrl/Cmd-click an already selected heading toggles only that heading in the batch selection collector`
- 这是后续批量 transform、批量快捷键的基础问题，建议优先修。

---

## 5. Batch Transform with sub-headings 不支持多选

### 问题描述

Outline 右键菜单已有 `Transform with sub-headings` 入口，但当前逻辑只支持单选标题，不支持多选标题批量转换。

### 预期行为

当 Outline 中多选多个标题后，执行 `Transform with sub-headings` 应：

- 对所有选中标题的子树执行转换。
- 生成一个可 Undo/Redo 的事务。
- 避免嵌套选中时重复转换同一个 subtree。
- 处理 H1/H6 等边界等级。
- 尽量复用 `app/src/protyle/wysiwyg/transaction.ts` 中已有事务逻辑，做最小必要改动。

### 需要注意的嵌套情况

如果同时选中父标题和它的子标题：

```text
H2 Parent
  H3 Child
```

执行 with-subheadings 时不应对子树重复转换。

### 测试要求

应覆盖：

- 单标题 `Transform with sub-headings` 现有行为不被破坏。
- 多选标题时，事务包含所有选中标题的子树。
- 嵌套选中时不会 double-transform。
- Undo/Redo 恢复所有受影响的子树。
- 边界等级安全。

### 当前状态

- `Outline.transformWithSubheadings.spec.ts` 已覆盖当前状态。
- `single heading transform with sub-headings requests and replays one heading transaction` 当前通过，用于保护现有单标题行为。
- 以下是 batch red tests：
  - `batch transform with sub-headings emits one transaction containing all selected heading subtrees`
  - `nested selected headings do not double-transform the same subtree`
- 完整 undo/redo 和 boundary levels 当前是 todo，因为需要更纯的 subtree transaction helper。

---

## 6. Ctrl+Alt+数字：设置标题为指定等级，Outline 多选不生效

### 重要语义修正

真实快捷键是：

```text
Ctrl + Alt + number
```

不是：

```text
Alt + number
```

语义是：

```text
Ctrl+Alt+1 => 设置为 H1
Ctrl+Alt+2 => 设置为 H2
...
Ctrl+Alt+6 => 设置为 H6
```

### 手动验证发现的问题

- 编辑器中测试标题快捷键存在问题，需要进一步定位。
- Outline 中单选标题时，`Ctrl+Alt+number` 正常。
- Outline 中多选标题时，`Ctrl+Alt+number` 不生效。
- Outline 中多选还依赖 Ctrl/Cmd 进入多选状态；普通左键先单选的标题不会被记录到真正的多选集合。

### 现有测试覆盖缺口

`headingShortcutTransaction.spec.ts` 通过了，但它只覆盖 transaction layer：

```text
已经拿到 heading elements + target level 后，能否生成正确事务。
```

它不覆盖：

- 真实 `Ctrl+Alt+number` 快捷键是否注册。
- 快捷键是否分发到正确 handler。
- Outline 多选集合是否被正确读取。
- 多选快捷键是否调用 batch path。
- 编辑器选区是否能收集多个 heading。

### 测试要求

应补充：

- 测试命名/注释中明确：`Ctrl+Alt+number = set exact heading level`。
- 单选 Outline heading + `Ctrl+Alt+2` 调用标题等级修改路径，目标 H2。
- 多选 Outline headings + `Ctrl+Alt+2` 调用 batch path，并传入所有选中标题。
- 至少覆盖 `Ctrl+Alt+1`、`Ctrl+Alt+2`、`Ctrl+Alt+6`。
- 如果真实快捷键 handler 暂无可测 seam，则增加 `it.todo` 并注明需要抽出的 helper。

### 当前状态

- transaction-layer `headingShortcutTransaction` 测试通过，但覆盖不足。
- 已补真实 shortcut dispatch / Outline selection collector 的红测试。
- `headingShortcutTransaction.spec.ts` 明确标注为 transaction-layer only：只证明“已经收集到 heading blocks 后，Ctrl+Alt+number 对应的 target level 能进入批量事务路径”，不证明真实快捷键分发或 Outline 多选收集。
- `Outline.selection.spec.ts` 已加入 Outline 快捷键分发红测试：
  - `Ctrl+Alt+2 with one selected Outline heading calls the exact H2 heading-level path for that heading`
  - `Ctrl+Alt+2 with multiple selected Outline headings calls the exact H2 batch heading-level path for all selected headings`
  - `Ctrl+Alt+1 and Ctrl+Alt+6 are exact Outline heading-level shortcuts, not relative upgrade/downgrade shortcuts`
- 上述 Outline dispatch 测试当前都是红测试，要求单选和多选都读取 batch selection collector，而不是只读取 focused/current heading。
- editor real shortcut dispatch 当前是 todo，需要可测的 shortcut dispatch / heading collection seam。
- `Outline.shortcuts.spec.ts` 已加入快捷键术语静态测试，明确：
  - `Ctrl+Alt+number` = 设置为指定 heading level。
  - `Alt++` / `Alt+-` = 相对 upgrade / downgrade。

---

## 7. 新增 Alt++ / Alt+-：标题相对升降级快捷键

### 新功能描述

希望复用现有快捷键系统，为标题相对升降级增加快捷键：

```text
Alt + +
Alt + -
```

### 语义约定

已讨论约定：

```text
upgrade = H3 -> H2
Alt++ = upgrade
Alt+- = downgrade
```

即：

- `Alt++`：标题等级数字减小，标题变大，例如 H3 -> H2。
- `Alt+-`：标题等级数字增大，标题变小，例如 H3 -> H4。

### 与 Ctrl+Alt+数字的区别

```text
Ctrl+Alt+number = 设置为指定 heading level
Alt++ / Alt+- = 相对 upgrade / downgrade
```

这两个功能不能混淆。

### 测试要求

应覆盖：

- 快捷键系统注册 `Alt++`。
- 快捷键系统注册 `Alt+-`。
- 单选 Outline heading 时调用已有 upgrade/downgrade 路径。
- 多选 Outline headings 时调用 batch path。
- 编辑器选区包含多个标题时，如果支持，也应走 batch path。

### 当前状态

- `Outline.shortcuts.spec.ts` 已加入 failing static registration tests：
  - `registers Alt++ as heading upgrade`
  - `registers Alt+- as heading downgrade`
- handler 行为当前是 todo：
  - 单选 Outline heading 调用已有 upgrade/downgrade path。
  - 多选 Outline headings 调用 batch path。
- 仍需后续找到或抽出快捷键 dispatch seam。

---

## 8. Go Back vs Undo UI 尚未进入本轮测试覆盖

### 问题描述

之前讨论中出现过 Go Back 与 Undo UI 语义可能混淆的问题，但它不属于本轮 Outline 多选、标题事务、快捷键 TDD 测试的主要覆盖范围。

### 当前状态

- 当前没有新增 Go Back vs Undo 相关测试。
- 该问题不在本轮新增的 `Outline.*.spec.ts` 或 `headingShortcutTransaction.spec.ts` 覆盖内。
- 后续如要处理，需要先确认产品语义：
  - 该按钮是否本来就是 navigation back。
  - 是否只是 tooltip / 文案造成 UX 混淆。
  - 是否实际应接入 Undo 行为。
- 第 10 节保留该项作为后续调查批次，不应和当前红测试混为一组。

---


## 9. 已完成 / 已验证的测试层情况

### 新增测试文件

- `app/src/layout/dock/Outline.selection.spec.ts`
- `app/src/layout/dock/Outline.shortcuts.spec.ts`
- `app/src/layout/dock/Outline.styles.spec.ts`
- `app/src/layout/dock/Outline.transformWithSubheadings.spec.ts`
- `app/src/protyle/wysiwyg/headingShortcutTransaction.spec.ts`

### 通过的测试

- `headingShortcutTransaction.spec.ts`
  - `Ctrl+Alt+1 transaction-layer input maps pre-collected editor heading blocks to exact H1`
  - `Ctrl+Alt+2 transaction-layer input maps pre-collected editor heading blocks to exact H2`
  - `Ctrl+Alt+6 transaction-layer input maps pre-collected editor heading blocks to exact H6`
- `Outline.shortcuts.spec.ts`
  - `documents Ctrl+Alt+number as the exact heading-level shortcut family`
- `Outline.selection.spec.ts`
  - `selects a folded final parent with the same parent-only rule`
- `Outline.transformWithSubheadings.spec.ts`
  - `single heading transform with sub-headings requests and replays one heading transaction`

说明：`headingShortcutTransaction.spec.ts` 是事务层测试，不是快捷键集成测试。它不覆盖真实 keydown dispatch、Outline 多选状态收集，也不覆盖编辑器 range 中多个 heading 的收集。

### 故意失败的红测试

这些测试用于锁定待实现行为，当前失败是预期状态。

- `Outline.selection.spec.ts`
  - `selects a folded non-final parent without selecting hidden children`
  - `ordinary click followed by Ctrl/Cmd click keeps the first heading selected and adds the second`
  - `ordinary left-click heading A records A in the batch command selection state`
  - `left-click A then Ctrl/Cmd-click B makes the batch selection collector return A and B`
  - `Ctrl/Cmd click on an already selected heading toggles only that heading`
  - `Ctrl/Cmd-click an already selected heading toggles only that heading in the batch selection collector`
  - `Ctrl+Alt+2 with one selected Outline heading calls the exact H2 heading-level path for that heading`
  - `Ctrl+Alt+2 with multiple selected Outline headings calls the exact H2 batch heading-level path for all selected headings`
  - `Ctrl+Alt+1 and Ctrl+Alt+6 are exact Outline heading-level shortcuts, not relative upgrade/downgrade shortcuts`
- `Outline.styles.spec.ts`
  - `uses the DocTree/FileTree selected row token for Outline multi-selection`
  - `does not introduce a separate Outline-only selected row class`
- `Outline.transformWithSubheadings.spec.ts`
  - `batch transform with sub-headings emits one transaction containing all selected heading subtrees`
  - `nested selected headings do not double-transform the same subtree`
- `Outline.shortcuts.spec.ts`
  - `registers Alt++ as heading upgrade`
  - `registers Alt+- as heading downgrade`

### Pending / Todo 测试

这些测试记录当前缺少干净 unit seam 的行为。后续实现前建议先抽取最小 helper，再把 todo 转成可执行测试。

- `Outline.selection.spec.ts`
  - `maps an editor DOM selection spanning multiple headings to all outline heading ids`
  - `marks every corresponding outline heading when the editor selection spans multiple headings`
  - 需要 helper：`getHeadingIdsInEditorRange(range, root)` 或 `collectHeadingBlocksForShortcut(rangeOrCurrentBlock, outlineSelectionState)`。
- `Outline.transformWithSubheadings.spec.ts`
  - `undo and redo restore all affected heading subtrees`
  - `boundary heading levels are handled safely`
  - 需要 helper：从现有 `genHeadingTransform` / `transaction.ts` 路径抽出可直接测试的 subtree transaction 生成逻辑。
- `Outline.shortcuts.spec.ts`
  - `Ctrl+Alt+1 changes all selected Outline headings to exact H1`
  - `Ctrl+Alt+2 changes all selected Outline headings to exact H2`
  - `Ctrl+Alt+6 changes all selected Outline headings to exact H6`
  - `undo/redo works for Ctrl+Alt+number batch exact-heading-level shortcuts`
  - `Alt++ on one selected Outline heading calls the existing upgrade path`
  - `Alt+- on one selected Outline heading calls the existing downgrade path`
  - `Alt++ and Alt+- use the batch path for multiple Outline headings`
  - `editor Ctrl+Alt+number dispatch on a single editor heading calls the exact heading-level path`
  - `editor Ctrl+Alt+number dispatch with a selection/range containing multiple headings calls the batch exact-level path`
  - 需要 helper：快捷键 dispatch seam，例如 `extractHeadingShortcutLevel(event, keymap)`，以及 heading 收集 seam，例如 `collectHeadingBlocksForShortcut(rangeOrCurrentBlock, outlineSelectionState)`。

### 通过的工程检查

- `pnpm -C app test:unit -- headingShortcutTransaction`：通过。
- `pnpm -C app exec tsc --pretty false --emitDeclarationOnly false --noEmit`：通过。
- `git diff --check`：通过。

### 当前预期失败的验证命令

- `pnpm -C app test:unit -- Outline`：预期失败，失败项是上述 Outline 红测试。
- `pnpm -C app test:unit`：预期失败，失败项是上述红测试。


## 10. 建议后续实现顺序

建议不要一次性修所有红测试，而是按依赖关系分批：

### 第一批：修 Outline selection 状态

优先修：

- folded parent parent-only 一致性。
- 普通点击 A 后进入 batch selection state。
- Ctrl/Cmd 点击 B 保留 A。
- toggle 已选项不影响其他项。

原因：这是后续批量 transform 和批量快捷键的基础。

### 第二批：修 Outline 多选样式

目标：

- 对齐 DocTree/FileTree 的 selected row token。
- 避免 Outline-only 视觉状态分叉。

### 第三批：实现 Batch Transform with sub-headings

目标：

- 复用 transaction.ts。
- 抽最小必要 helper。
- 支持多选 subtree。
- 避免嵌套重复转换。
- 加强 Undo/Redo 测试。

### 第四批：修 Ctrl+Alt+数字真实快捷键路径

目标：

- 明确真实 shortcut dispatch。
- Outline 单选、多选都走正确 heading-level path。
- 多选时读取 batch selection collector，而不是只读 focused heading。
- 编辑器 range 多 heading 视是否设计支持再实现。

### 第五批：新增 Alt++ / Alt+- 快捷键

目标：

- 注册快捷键。
- 复用已有 upgrade/downgrade batch function。
- 支持 Outline 单选、多选。
- 必要时支持编辑器多 heading range。

### 第六批：调查 Go Back vs Undo UI

目标：

- 确认该按钮是否是 navigation back。
- 如果只是 UX 混淆，考虑 tooltip / 文档层面说明。
- 如果实际应为 undo，则再设计修复。
