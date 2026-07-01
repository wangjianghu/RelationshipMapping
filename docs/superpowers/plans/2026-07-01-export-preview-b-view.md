# Export Preview And B-View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为导出映射弹层新增分组化选项、每个选项的示例数据预览和字段说明，并补齐 B 主视角 CSV/Excel 导出。

**Architecture:** 保留现有原始关系导出链路不变，在现有导出弹层中增加“原始关系 / A 主视角 / B 主视角”三组选择器，并通过统一的预览元数据函数生成表头、示例行和字段说明。A/B 主视角导出分别基于 `state.mappings` 聚合生成单行视角数据，再复用 CSV/Excel 导出逻辑输出。

**Tech Stack:** 原生 HTML、Vanilla JavaScript、SheetJS、Playwright

---

### Task 1: 锁定失败验证

**Files:**
- Modify: `/Users/cao/Documents/Trae/知识树映射/RelationshipMapping/js/script.js`
- Modify: `/Users/cao/Documents/Trae/知识树映射/RelationshipMapping/关系映射.html`
- Test: `/tmp/export_preview_red_check.py`

- [ ] **Step 1: 写失败验证**

```python
from pathlib import Path
from urllib.parse import quote
from playwright.sync_api import sync_playwright, expect

HTML = "/Users/cao/Documents/Trae/知识树映射/RelationshipMapping/双平台关系映射.html"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1400, "height": 1000})
    page.goto("file://" + quote(HTML))
    page.wait_for_load_state("load")
    page.get_by_role("button", name="导出映射").click()
    expect(page.locator("#export-preview-table")).to_be_visible()
    expect(page.locator("#group-target-view")).to_be_visible()
    func_exists = page.evaluate("typeof buildTargetCentricExportRows === 'function'")
    assert func_exists, "buildTargetCentricExportRows should exist"
    browser.close()
```

- [ ] **Step 2: 运行失败验证并确认失败**

Run: `python3 /tmp/export_preview_red_check.py`
Expected: FAIL，因为当前不存在预览区、B 主视角分组和 `buildTargetCentricExportRows`

### Task 2: 主实现导出弹层分组与预览

**Files:**
- Modify: `/Users/cao/Documents/Trae/知识树映射/RelationshipMapping/js/script.js`
- Test: `/tmp/export_preview_verify.py`

- [ ] **Step 1: 为主实现新增导出预览元数据函数**

```javascript
function buildExportPreviewMeta(format) {
    const previewMap = {
        json: { columns: ['exportTime', 'mappingCount', 'mappings'], descriptions: [...] },
        csv: { columns: ['sourceId', 'sourceName', 'targetId', 'targetName'], descriptions: [...] },
        source_csv: { columns: ['sourceId', 'sourceName', 'targetIds', 'targetNames', 'targetDisplay'], descriptions: [...] },
        target_csv: { columns: ['targetId', 'targetName', 'sourceIds', 'sourceNames', 'sourceDisplay'], descriptions: [...] }
    };
    return previewMap[format] || previewMap.json;
}
```

- [ ] **Step 2: 为主实现新增示例行构建函数**

```javascript
function buildExportPreviewRows(format) {
    const rows = getExportRowsForFormat(format);
    if (rows.length > 0) return rows.slice(0, 3);
    return getFallbackPreviewRows(format);
}
```

- [ ] **Step 3: 重构主实现导出弹层分组结构**

```javascript
pop.innerHTML = `
  <div>选择导出格式</div>
  <div id="group-original-view">...</div>
  <div id="group-source-view">...</div>
  <div id="group-target-view">...</div>
  <div id="export-preview-panel">
    <div id="export-preview-table"></div>
    <div id="export-preview-desc"></div>
  </div>
  <div>...</div>
`;
```

- [ ] **Step 4: 更新主实现选项切换 UI 和预览刷新**

```javascript
function updateExportOptionsUI() {
    ...
    renderExportPreview();
}
```

- [ ] **Step 5: 运行页面验证确保主实现通过**

Run: `python3 /tmp/export_preview_verify.py`
Expected: PASS，主页面存在三组导出选项且预览随选择变化

### Task 3: 新增 B 主视角导出

**Files:**
- Modify: `/Users/cao/Documents/Trae/知识树映射/RelationshipMapping/js/script.js`
- Test: `/tmp/export_b_view_verify.py`

- [ ] **Step 1: 写 B 主视角聚合函数**

```javascript
function buildTargetCentricExportRows() {
    const rows = [];
    const rowMap = new Map();
    state.mappings.forEach(m => {
        (m.targetIds || []).forEach((targetId, idx) => {
            const targetName = String((m.targetNames || [])[idx] || '');
            let row = rowMap.get(String(targetId));
            if (!row) {
                row = { targetId: String(targetId), targetName, sourceIds: [], sourceNames: [], sourceDisplay: [] };
                rowMap.set(String(targetId), row);
                rows.push(row);
            }
            if (!row.sourceIds.includes(String(m.sourceId))) {
                row.sourceIds.push(String(m.sourceId));
                row.sourceNames.push(String(m.sourceName || ''));
                row.sourceDisplay.push(`${m.sourceName || ''}(${m.sourceId})`);
            }
        });
    });
    return rows.map(row => ({
        targetId: row.targetId,
        targetName: row.targetName,
        sourceIds: row.sourceIds.join(','),
        sourceNames: row.sourceNames.join(','),
        sourceDisplay: row.sourceDisplay.join(',')
    }));
}
```

- [ ] **Step 2: 新增 B 主视角 CSV/Excel 导出函数**

```javascript
function exportTargetCentricCSV() { ... }
function exportTargetCentricExcel() { ... }
```

- [ ] **Step 3: 更新主实现导出分流**

```javascript
if (fmt === 'target_csv') exportTargetCentricCSV();
else if (fmt === 'target_xlsx') exportTargetCentricExcel();
```

- [ ] **Step 4: 运行聚合验证**

Run: `python3 /tmp/export_b_view_verify.py`
Expected: PASS，B 主视角按单个 B 一行聚合且多 A 使用英文逗号拼接

### Task 4: 旧版页面同步

**Files:**
- Modify: `/Users/cao/Documents/Trae/知识树映射/RelationshipMapping/关系映射.html`
- Test: `/tmp/export_legacy_verify.py`

- [ ] **Step 1: 同步主实现中的导出分组、预览和 B 主视角逻辑到旧版页面**

```javascript
// Keep the same helper names and export format keys:
// json, csv, xlsx, source_csv, source_xlsx, target_csv, target_xlsx
```

- [ ] **Step 2: 运行旧版验证**

Run: `python3 /tmp/export_legacy_verify.py`
Expected: PASS，旧版也存在三组导出选项、预览区和 B 主视角导出

### Task 5: 回归与收尾

**Files:**
- Modify: `/Users/cao/Documents/Trae/知识树映射/RelationshipMapping/js/script.js`
- Modify: `/Users/cao/Documents/Trae/知识树映射/RelationshipMapping/关系映射.html`
- Test: `/tmp/export_preview_final_verify.py`

- [ ] **Step 1: 运行最终页面验证**

```python
assert main_result["preview"] is True
assert legacy_result["preview"] is True
assert main_result["sourceRows"][0]["targetDisplay"] == "方程(B-1),函数(B-2)"
assert main_result["targetRows"][0]["sourceDisplay"] == "代数(A-1),几何(A-2)"
```

- [ ] **Step 2: 获取诊断**

Run: `GetDiagnostics` for both files
Expected: 无新增错误，允许保留原有 hint

- [ ] **Step 3: 清理临时验证脚本**

Run: `rm /tmp/export_preview_red_check.py /tmp/export_preview_verify.py /tmp/export_b_view_verify.py /tmp/export_legacy_verify.py /tmp/export_preview_final_verify.py`
Expected: 临时脚本清理完成，验证结果文件保留
