# Export Preview Scroll Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 优化导出弹窗中 CSV 和 Excel 示例预览区域，使示例表格与字段说明作为同一整体内容区联动滚动，并确保所有内容完整展示。

**Architecture:** 保持现有导出格式和数据构建逻辑不变，只重组导出弹窗中的预览渲染结构。对于 CSV 和 Excel 预览，使用一个统一的滚动容器承载“示例数据表格”和“字段说明”两个内容块，并在块之间加入清晰分隔线；JSON 预览继续保留代码块样式。

**Tech Stack:** Vanilla JavaScript、原生 HTML/CSS、Playwright

---

### Task 1: 锁定失败验证

**Files:**
- Create: `/tmp/export_preview_scroll_red.py`
- Modify: `/Users/cao/Documents/Trae/知识树映射/RelationshipMapping/js/script.js`
- Modify: `/Users/cao/Documents/Trae/知识树映射/RelationshipMapping/关系映射.html`

- [ ] **Step 1: 编写失败验证**

```python
from urllib.parse import quote
from playwright.sync_api import sync_playwright

HTML = "/Users/cao/Documents/Trae/知识树映射/RelationshipMapping/双平台关系映射.html"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1100, "height": 700})
    page.goto("file://" + quote(HTML))
    page.wait_for_load_state("load")
    page.evaluate("""() => {
        state.mappings = [{ sourceId: 'A-1', sourceName: '代数', targetIds: ['B-1'], targetNames: ['方程'] }];
    }""")
    page.get_by_role("button", name="导出映射").click()
    page.locator("#opt-csv").click()
    assert page.locator("#export-preview-scroll").count() == 1
    assert page.locator("#preview-table-section").count() == 1
    assert page.locator("#preview-desc-section").count() == 1
    assert page.locator("#preview-divider").count() == 1
    browser.close()
```

- [ ] **Step 2: 运行失败验证确认当前缺失**

Run: `python3 /tmp/export_preview_scroll_red.py`
Expected: FAIL，因为当前 CSV/Excel 预览未使用统一滚动容器和区块分隔结构

### Task 2: 主实现统一滚动预览区

**Files:**
- Modify: `/Users/cao/Documents/Trae/知识树映射/RelationshipMapping/js/script.js`
- Create: `/tmp/export_preview_scroll_verify.py`

- [ ] **Step 1: 重构主实现预览容器结构**

```javascript
<div id="export-preview-table" ...></div>
```

改为：

```javascript
<div id="export-preview-body" style="...">
  <div id="export-preview-scroll" style="..."></div>
</div>
```

- [ ] **Step 2: 为 CSV/Excel 新增统一内容渲染函数**

```javascript
function buildStructuredPreviewHtml(columns, rows, descriptions) {
    return `
        <div id="preview-table-section">...</div>
        <div id="preview-divider">...</div>
        <div id="preview-desc-section">...</div>
    `;
}
```

- [ ] **Step 3: 更新主实现预览渲染逻辑**

```javascript
if (fmt === 'json') {
    tableEl.innerHTML = buildJsonPreviewHtml(...);
} else {
    tableEl.innerHTML = buildStructuredPreviewHtml(meta.columns, rows, meta.descriptions);
}
```

- [ ] **Step 4: 运行主页面验证**

Run: `python3 /tmp/export_preview_scroll_verify.py`
Expected: PASS，CSV/Excel 预览中的表格和字段说明在同一滚动区域中连续展示

### Task 3: 旧版页面同步

**Files:**
- Modify: `/Users/cao/Documents/Trae/知识树映射/RelationshipMapping/关系映射.html`

- [ ] **Step 1: 同步主实现中的统一滚动预览结构和渲染逻辑到旧版页面**

```javascript
// Keep the same ids:
// export-preview-scroll
// preview-table-section
// preview-divider
// preview-desc-section
```

- [ ] **Step 2: 运行旧版验证**

Run: `python3 /tmp/export_preview_scroll_verify.py`
Expected: PASS，旧版页面也采用统一滚动内容区

### Task 4: 回归与收尾

**Files:**
- Modify: `/Users/cao/Documents/Trae/知识树映射/RelationshipMapping/js/script.js`
- Modify: `/Users/cao/Documents/Trae/知识树映射/RelationshipMapping/关系映射.html`

- [ ] **Step 1: 运行最终验证**

```python
assert "sourceId" in source_preview
assert "sourceName" in source_preview
assert "targetId" in source_preview
assert "targetName" in source_preview
```

- [ ] **Step 2: 获取诊断**

Run: `GetDiagnostics` on both files
Expected: 无新增错误

- [ ] **Step 3: 清理临时脚本**

Run: `rm /tmp/export_preview_scroll_red.py /tmp/export_preview_scroll_verify.py`
Expected: 清理完成
