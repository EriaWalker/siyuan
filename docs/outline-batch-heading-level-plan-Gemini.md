# Outline Batch Heading Level Modification Implementation Plan

## 1. Task Goal

Implement a feature in the Outline dock/panel that allows selecting multiple heading items and batch-increasing (promoting) or batch-decreasing (demoting) their heading levels.

### Example Behavior:
- Select multiple H2 and H3 headings.
- Execute "Promote heading level".
- They become H1 and H2 respectively.
- Execute "Demote heading level".
- They become H3 and H4 respectively.

### Special Boundary Requirements:
- H1 headings must remain H1 when promoted; they must not become an invalid level (e.g. H0).
- H6 headings must remain H6 when demoted; they must not become an invalid level (e.g. H7).
- Batch modification must preserve the existing Outline behavior, editor state, document structure, and refresh logic as much as possible.
- The implementation should reference the multi-selection logic from the file tree, but must not mechanically copy it. We need to evaluate which parts are suitable for migration into Outline.

---

## 2. Reference Files and Conclusions

### [Files.ts](file:///F:/SiYuan/siyuan/app/src/layout/dock/Files.ts)
- **File Path**: `F:\SiYuan\siyuan\app\src\layout\dock\Files.ts`
- **Relevant Code Locations**:
  - `click` event listener at [Lines 343-438](file:///F:/SiYuan/siyuan/app/src/layout/dock/Files.ts#L343-L438) handles selection logic: toggling focused items (with `Ctrl`/`Cmd` key) and range selection (with `Shift` key).
  - `setCurrent` at [Lines 1212-1225](file:///F:/SiYuan/siyuan/app/src/layout/dock/Files.ts#L1212-L1225) manages clearing existing selections and applying single focus.
  - `dragstart` at [Lines 457-464](file:///F:/SiYuan/siyuan/app/src/layout/dock/Files.ts#L457-L464) retrieves all selected nodes via the `.b3-list-item--focus` class selector.
- **Key Functions, Variables, or Class Names**:
  - `lastSelectedElement`: Holds the `Element` reference of the last clicked tree item to serve as the start anchor for Shift-click selection range calculations.
  - `.b3-list-item--focus`: The CSS class used to mark selected state on tree list items.
- **Reusable Points**:
  - The Shift-click index range calculations and the `toggle` logic for Ctrl-click selections.
- **Points That Should Not Be Reused Directly**:
  - `Files.ts` binds mouse click event listeners directly to its `this.element` and renders its own HTML list elements. It does not use the shared `Tree.ts` component. The Outline panel, on the other hand, utilizes `Tree.ts` which has built-in click and selection handlers that must be intercepted rather than completely replaced.

### [Outline.ts](file:///F:/SiYuan/siyuan/app/src/layout/dock/Outline.ts)
- **File Path**: `F:\SiYuan\siyuan\app\src\layout\dock\Outline.ts`
- **Relevant Code Locations**:
  - `Tree` initialization at [Lines 158-241](file:///F:/SiYuan/siyuan/app/src/layout/dock/Outline.ts#L158-L241).
  - `showContextMenu` at [Lines 919-1285](file:///F:/SiYuan/siyuan/app/src/layout/dock/Outline.ts#L919-L1285).
  - `onTransaction` at [Lines 534-581](file:///F:/SiYuan/siyuan/app/src/layout/dock/Outline.ts#L534-L581) handles reactivity.
- **Key Functions, Variables, or Class Names**:
  - `Outline`: The dock panel model class.
  - `this.blockId`: Stores the document ID of the active file.
  - `getHeadingLevel`: Retrieves the integer level (1-6) of a heading item.
  - `getProtyleAndBlockElement`: Finds the active editor instance and queries the specific WYSIWYG DOM element for a block ID.
- **Reusable Points**:
  - Document block ID resolution, fetching corresponding editor protyle instances via `getAllModels().editor`, and context menu popups.
- **Points That Should Not Be Reused Directly**:
  - The single-item `upgrade`/`downgrade` context menu items [Lines 929-966](file:///F:/SiYuan/siyuan/app/src/layout/dock/Outline.ts#L929-L966) execute `turnsIntoTransaction` on a single live editor DOM element. This cannot be directly reused for multi-selection because off-screen headings are not present in the editor DOM due to dynamic loading.

### [fileTree.ts](file:///F:/SiYuan/siyuan/app/src/config/fileTree.ts)
- **File Path**: `F:\SiYuan\siyuan\app\src\config\fileTree.ts`
- **Relevant Code Locations**:
  - Configuration UI template and setting updates at [Lines 4-171](file:///F:/SiYuan/siyuan/app/src/config/fileTree.ts#L4-L171).
- **Conclusions**:
  - Exclusively handles settings like `alwaysSelectOpenedFile` and `openFilesUseCurrentTab`. No configurations relate to the Outline selection mode.
  - **No new configurations are needed for Outline multi-selection**. It should be enabled natively by default, mimicking standard file managers/tree views.

---

## 3. File Tree Multi-Selection Logic Extraction

### How Multi-Selection State is Stored:
- Multi-selection state is stored directly in the DOM. Selected list items (`<li>`) are decorated with the class `.b3-list-item--focus`.
- An instance variable `this.lastSelectedElement` stores the HTML element clicked last, acting as the anchor point for subsequent range operations.

### How Click, Right-Click, and Keyboard Selection Work:
1. **Normal Click**:
   - Resets state: removes `.b3-list-item--focus` from all list items.
   - Adds `.b3-list-item--focus` to the clicked `<li>`.
   - Updates `this.lastSelectedElement = target`.
2. **Ctrl/Cmd + Click**:
   - Toggles `.b3-list-item--focus` on the clicked item.
   - Preserves selection of all other focused elements.
   - Updates `this.lastSelectedElement = target`.
3. **Shift + Click**:
   - Clears existing selections.
   - Obtains an array of all available file tree list items (`li.b3-list-item`).
   - Resolves the index of `this.lastSelectedElement` and the clicked target.
   - Selects all items in the range `[min(startIndex, endIndex), max(startIndex, endIndex)]` by adding the `.b3-list-item--focus` class.
4. **Right-Click (Context Menu)**:
   - If the right-clicked element already has `.b3-list-item--focus`, the selection is preserved.
   - If it does not, all selections are cleared, and only the right-clicked item is selected.

### Migration to Outline:
- This class-toggling and range-index computation logic can be cleanly migrated into a custom capturing event handler on the Outline's tree element.

---

## 4. Current Outline Implementation Analysis

### Outline Item Data Structure & DOM Fields:
An Outline item is represented by a `li.b3-list-item` DOM element with the following data attributes:
- `data-node-id`: The heading block ID (e.g. `20200812220555-abc1234`).
- `data-type`: `"NodeHeading"`.
- `data-subtype`: `"h1"`, `"h2"`, `"h3"`, etc., indicating heading level.
- `data-treetype`: `"outline"`.

### Click-to-Locate Logic:
- Handled in `click` callback in `Outline.ts` [Lines 163-191](file:///F:/SiYuan/siyuan/app/src/layout/dock/Outline.ts#L163-L191). It calls `openFileById` passing the block ID and `scrollPosition: "start"`, which triggers the editor to load the block context and scroll it into view.

### Context Menu Logic:
- Implemented in `showContextMenu` in `Outline.ts` [Lines 919-1285](file:///F:/SiYuan/siyuan/app/src/layout/dock/Outline.ts#L919-L1285). Calls Lute transformer or fetches transactions via `/api/block/getHeadingLevelTransaction`.

### Refresh Logic:
- Reactive websocket handler `onTransaction` [Lines 534-581](file:///F:/SiYuan/siyuan/app/src/layout/dock/Outline.ts#L534-L581) checks if block operations affect heading nodes. If so, it invokes `/api/outline/getDocOutline` and updates the Tree layout using `this.tree.updateData()`.

---

## 5. Correct Technical Path for Batch Heading Level Modification

### Technical Constraints:
- Due to editor dynamic loading, off-screen headings are not rendered in the editor's live DOM.
- Upgrading/downgrading via Lute requires the block's current outer HTML string.
- The kernel API `/api/block/getHeadingLevelTransaction` alters descendant subheadings hierarchically, which is not suitable for batch modifying only selected elements.

### Recommended Path:
1. **Target Identification**: Read `data-node-id` and `data-subtype` of all selected elements in the Outline.
2. **Boundary Filtering**:
   - For **Promote**: target level = `oldLevel - 1`. Skip items where `oldLevel === 1`.
   - For **Demote**: target level = `oldLevel + 1`. Skip items where `oldLevel === 6`.
3. **Retrieve Outer HTML**:
   - Check if the target heading block is currently rendered in the editor via `protyle.wysiwyg.element.querySelector('[data-node-id="..."]')`.
   - For any off-screen blocks, batch-fetch their HTML using the kernel endpoint `/api/block/getBlockDOMs` with `{ ids: string[] }`.
4. **Transform HTML via Lute**:
   - For each block, apply Lute's transformer: `protyle.lute.Blocks2Hs(oldHTML, targetLevel)`.
5. **Construct and Commit Transaction**:
   - Build a list of `doOperations` containing `update` actions with the `newHTML`.
   - Build a list of `undoOperations` containing `update` actions with the `oldHTML`.
   - Update the DOM `outerHTML` of any currently loaded live elements in the editor.
   - Commit the transaction using `transaction(protyle, doOperations, undoOperations)`.
   - Re-run editor render refreshes (`processRender`, `highlightRender`, `avRender`, `blockRender`).

---

## 6. Suggested Data Structure and State Design

### State Location:
- We will store the selected items directly in the DOM using the `.b3-list-item--focus` class on the outline tree elements.
- Add `this.lastSelectedElement: HTMLElement | null` to the `Outline` class to keep track of range selection anchors.

### Preserving Selections Across Refreshes:
- Modify the `update` method in `Outline.ts`:
  - Before updating the tree layout:
    ```typescript
    const selectedIds = Array.from(this.element.querySelectorAll(".b3-list-item--focus")).map(item => item.getAttribute("data-node-id"));
    ```
  - After updating the tree layout via `this.tree.updateData()`:
    ```typescript
    selectedIds.forEach(id => {
        this.element.querySelector(`[data-node-id="${id}"]`)?.classList.add("b3-list-item--focus");
    });
    ```

---

## 7. Menu and Interaction Design

### Intercepting Mouse Events:
- In the `Outline` constructor, bind capturing event listeners (`mousedown` and `click`) on `this.element`.
- If modifier keys (`Ctrl`/`Cmd` or `Shift`) are pressed during a click:
  - Handle state toggling or range selection manually on the DOM list items.
  - Call `event.stopPropagation()` and `event.preventDefault()` to stop event bubbles from triggering `Tree.ts` click and scroll handlers.

### Context Menu Configuration:
- Retrieve all elements containing the class `.b3-list-item--focus`.
- If the right-clicked item is part of the multi-selection:
  - Clear the standard context menu, and display only:
    - **Promote heading level** (升级) with icon `iconUp`.
    - **Demote heading level** (降级) with icon `iconDown`.
  - Disable "Promote heading level" if all selected headings are H1.
  - Disable "Demote heading level" if all selected headings are H6.
- If the right-clicked item is not in the selection (or selection size is 1), clear all selections, focus the right-clicked item, and show the default context menu.

---

## 8. Edge Cases

- **Promoting H1**: H1 remains H1. No transaction operation generated.
- **Demoting H6**: H6 remains H6. No transaction operation generated.
- **Mixed Selection (H1, H3, H6) + Promote**: H1 remains H1 (no change), H3 becomes H2 (update transaction generated), H6 becomes H5 (update transaction generated).
- **Selecting non-heading items**: All items inside `this.element` represent heading blocks. Document titles exist in a separate layout block, preventing accidental title selection.
- **Empty Selection**: Operations are bypassed.
- **Off-screen / Unloaded Blocks**: DOM HTML strings are fetched via `/api/block/getBlockDOMs` and transformed. Editor update behaves correctly even for hidden blocks.
- **Websocket Doc Refresh**: Selections are preserved by their block IDs across Outline reloads.
- **Undo / Redo Support**: Fully supported natively through standard transaction do/undo operation stacks.

---

## 9. Minimal Implementation Steps

### Step 1: Bind Interceptors in `Outline.ts`
- **File**: `app/src/layout/dock/Outline.ts`
- **Action**: In the constructor, bind capturing event listeners to `this.element` to catch modifier-click events, manage the selection state, and stop event propagation.
- **Verification**: Ctrl+click multiple outline nodes and verify they get highlighted with the `.b3-list-item--focus` class without scrolling the editor.

### Step 2: Implement Multi-Select Context Menu in `showContextMenu`
- **File**: `app/src/layout/dock/Outline.ts`
- **Action**: Check if the target element is in a multi-selection. If so, render a simplified menu with "Promote" and "Demote".
- **Verification**: Right-click a multi-selection and check that only the two batch level actions are displayed.

### Step 3: Implement Batch Heading Modification Logic
- **File**: `app/src/layout/dock/Outline.ts`
- **Action**: Add `batchModifyHeadingLevel(elements: HTMLElement[], direction: "promote" | "demote")`. Retrieve old HTMLs (either live or via `/api/block/getBlockDOMs`), transform them via `protyle.lute.Blocks2Hs`, update live DOMs, and submit do/undo operations using the `transaction` function.
- **Verification**: Batch upgrade/downgrade headings and check both live WYSIWYG changes and database persistence.

### Step 4: Add Multi-Selection State Preservation on Update
- **File**: `app/src/layout/dock/Outline.ts`
- **Action**: Modify `update` to collect selected block IDs before `updateData()` and restore them afterward.
- **Verification**: Check that selection highlight persists after executing a batch heading level transaction.

---

## 10. Test Plan

### Manual Verification:
1. Open a long document.
2. In the Outline dock, Ctrl+click one H2, one H3, and one H6 heading.
3. Right-click one of the selected headings and choose "Promote heading level".
4. Verify H2 becomes H1, H3 becomes H2, and H6 becomes H5.
5. Press `Ctrl+Z` and verify all headings revert to their original levels.
6. Select an H1 and an H2. Execute "Promote". Verify only H2 changes to H1.
7. Select a heading that is off-screen. Promote it and verify it has successfully updated when scrolled into view.

### Regression Targets:
- Single outline item click and positioning.
- Keyword outline filtering.
- Drag-and-drop hierarchy adjustments.

---

## 11. Open Questions

- **Q1**: Should we support keyboard shortcuts (e.g. `Tab` / `Shift+Tab`) inside the Outline dock to promote/demote selected items?
- **Q2**: Should we support other batch actions like batch deleting the selected headings along with their sub-blocks?
