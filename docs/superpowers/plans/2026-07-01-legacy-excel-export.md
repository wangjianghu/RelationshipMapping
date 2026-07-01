# Legacy Excel Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为旧版 `关系映射.html` 同步最小可用版 `Excel(.xlsx)` 导出能力，字段与当前 `CSV` 完全一致。

**Architecture:** 保持旧版单文件页结构不变，只在导出弹层、导出分发和导出函数区域增加 `xlsx` 支持。`CSV` 与 `Excel` 共用一套拍平逻辑，Excel 使用页面已加载的本地 `SheetJS` 导出单工作表。

**Tech Stack:** HTML, Vanilla JavaScript, SheetJS

---

### Task 1: 先写失败的浏览器验证

**Files:**
- Create: `/Users/cao/Documents/Trae/知识树映射/RelationshipMapping/.tmp_test_legacy_export_xlsx.py`
- Test: `/Users/cao/Documents/Trae/知识树映射/RelationshipMapping/关系映射.html`

- [ ] **Step 1: 写一个最小浏览器测试，要求旧版导出弹层出现 `Excel格式`**

```python
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto("http://127.0.0.1:8003/RelationshipMapping/关系映射.html", wait_until="networkidle")
    page.get_by_role("button", name="导出映射").click()
    assert page.locator("#opt-xlsx").count() == 1
    browser.close()
```

- [ ] **Step 2: 运行测试并确认先失败**

Run: `python3 /Users/cao/Documents/Trae/知识树映射/RelationshipMapping/.tmp_test_legacy_export_xlsx.py`
Expected: 失败于“未找到 Excel 导出选项”

### Task 2: 同步旧版页面导出逻辑

**Files:**
- Modify: `/Users/cao/Documents/Trae/知识树映射/RelationshipMapping/关系映射.html`

- [ ] **Step 1: 在导出弹层增加 `Excel格式` 按钮**

```js
<button id="opt-xlsx" class="btn-small btn-secondary" onclick="setExportFormat('xlsx', this)" style="min-width:80px; text-align:center; padding:8px 16px; border-radius:10px; background:#8C9CB2; color:#FFFFFF; font-weight:600; border:none;">Excel格式</button>
```

- [ ] **Step 2: 扩展 `setExportFormat()` 和 `updateExportOptionsUI()` 支持三种格式**

```js
state.exportFormat = ['json', 'csv', 'xlsx'].includes(fmt) ? fmt : 'json';
```

- [ ] **Step 3: 扩展 `confirmExport()`，增加 `xlsx` 分支**

```js
if (fmt === 'csv') exportMappingsCSV();
else if (fmt === 'xlsx') exportMappingsExcel();
else exportMappingsJSON();
```

- [ ] **Step 4: 新增 `buildMappingExportRows()` 并让 `CSV` 复用**

```js
function buildMappingExportRows() {
    const rows = [];
    state.mappings.forEach(m => {
        (m.targetIds || []).forEach((tid, idx) => {
            const tname = (m.targetNames || [])[idx] || '';
            rows.push({
                sourceId: m.sourceId,
                sourceName: m.sourceName,
                targetId: tid,
                targetName: tname
            });
        });
    });
    return rows;
}
```

- [ ] **Step 5: 新增 `exportMappingsExcel()`**

```js
function exportMappingsExcel() {
    if (state.mappings.length === 0) { alert('没有映射关系可导出！'); return; }
    if (typeof XLSX === 'undefined') {
        throw new Error('Excel导出库加载失败，请刷新页面重试');
    }
    const rows = buildMappingExportRows();
    const worksheet = XLSX.utils.json_to_sheet(rows, {
        header: ['sourceId', 'sourceName', 'targetId', 'targetName']
    });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Mappings');
    XLSX.writeFile(workbook, `${state.ui.platformNameA}_${state.ui.platformNameB}关系映射 ${formatDateYMD(new Date())}.xlsx`);
}
```

- [ ] **Step 6: 运行语法检查**

Run: `node --check /Users/cao/Documents/Trae/知识树映射/RelationshipMapping/关系映射.html`
Expected: 无语法错误输出

### Task 3: 回归验证并清理

**Files:**
- Modify: `/Users/cao/Documents/Trae/知识树映射/RelationshipMapping/关系映射.html`

- [ ] **Step 1: 复跑浏览器测试并检查 `.xlsx` 下载**

```text
1. 构造至少 1 条映射，其中一个源节点对应两个目标节点
2. 打开旧版页面的导出弹层
3. 切换到 Excel 格式
4. 下载并打开 `.xlsx`
5. 验证工作表名为 Mappings，表头正确，行数与 CSV 一致
```

- [ ] **Step 2: 检查最近修改文件的诊断**

Run: 在 IDE 中检查 `/Users/cao/Documents/Trae/知识树映射/RelationshipMapping/关系映射.html`
Expected: 无新增错误级诊断

- [ ] **Step 3: 删除临时测试文件**

```bash
rm -f /Users/cao/Documents/Trae/知识树映射/RelationshipMapping/.tmp_test_legacy_export_xlsx.py
```
