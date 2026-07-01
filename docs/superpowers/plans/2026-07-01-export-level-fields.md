# Export Level Fields Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为原始关系导出、A 主视角导出、B 主视角导出新增节点层级字段，并同步更新 CSV/Excel 表头与预览说明。

**Architecture:** 保持现有映射数据结构不变，在导出构建阶段根据 `sourceId` 和 `targetId` 动态回查当前树节点并补出 `level`。原始关系导出新增 `sourceLevel/targetLevel`，A 主视角新增 `sourceLevel`，B 主视角新增 `targetLevel`，同时同步更新预览列定义、示例数据和字段说明。

**Tech Stack:** Vanilla JavaScript、原生 HTML/CSS、SheetJS、Playwright

---

### Task 1: 失败验证

**Files:**
- Create: `/tmp/export_level_fields_red.py`
- Modify: `/Users/cao/Documents/Trae/知识树映射/RelationshipMapping/js/script.js`

- [ ] **Step 1: 写失败验证**

```python
from urllib.parse import quote
from playwright.sync_api import sync_playwright

HTML = "/Users/cao/Documents/Trae/知识树映射/RelationshipMapping/双平台关系映射.html"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto("file://" + quote(HTML))
    page.wait_for_load_state("load")
    page.evaluate("""() => {
        state.platformA = { id: 'rootA', children: [{ id: 'A-1', name: '代数', level: 2, children: [] }] };
        state.platformB = { id: 'rootB', children: [{ id: 'B-1', name: '方程', level: 3, children: [] }] };
        state.mappings = [{ sourceId: 'A-1', sourceName: '代数', targetIds: ['B-1'], targetNames: ['方程'] }];
    }""")
    raw_rows = page.evaluate("buildMappingExportRows()")
    assert "sourceLevel" in raw_rows[0]
    browser.close()
```

- [ ] **Step 2: 运行失败验证**

Run: `python3 /tmp/export_level_fields_red.py`
Expected: FAIL，因为当前导出结果里还没有层级字段

### Task 2: 主实现导出层级字段

**Files:**
- Modify: `/Users/cao/Documents/Trae/知识树映射/RelationshipMapping/js/script.js`
- Create: `/tmp/export_level_fields_verify.py`

- [ ] **Step 1: 新增层级解析辅助函数**

```javascript
function getNodeLevelById(tree, id) {
    const node = getNodeById(tree, id);
    return node && node.level != null ? node.level : '';
}
```

- [ ] **Step 2: 更新三类导出构建函数**

```javascript
// raw: sourceLevel / targetLevel
// source view: sourceLevel
// target view: targetLevel
```

- [ ] **Step 3: 更新 CSV/Excel 表头和预览元数据**

```javascript
columns: [
  { key: 'sourceId', label: 'sourceId' },
  { key: 'sourceName', label: 'sourceName' },
  { key: 'sourceLevel', label: 'sourceLevel' },
  ...
]
```

- [ ] **Step 4: 运行主页面验证**

Run: `python3 /tmp/export_level_fields_verify.py`
Expected: PASS，主页面三类导出和预览均带层级字段

### Task 3: 旧版同步

**Files:**
- Modify: `/Users/cao/Documents/Trae/知识树映射/RelationshipMapping/关系映射.html`

- [ ] **Step 1: 同步主实现中的导出层级字段逻辑到旧版**

```javascript
// Keep the same field names:
// sourceLevel
// targetLevel
```

- [ ] **Step 2: 再次运行验证**

Run: `python3 /tmp/export_level_fields_verify.py`
Expected: PASS，旧版页面与主页面保持一致

### Task 4: 回归与收尾

**Files:**
- Modify: `/Users/cao/Documents/Trae/知识树映射/RelationshipMapping/js/script.js`
- Modify: `/Users/cao/Documents/Trae/知识树映射/RelationshipMapping/关系映射.html`

- [ ] **Step 1: 获取诊断**

Run: `GetDiagnostics` on both files
Expected: 无新增错误

- [ ] **Step 2: 清理临时脚本**

Run: `rm /tmp/export_level_fields_red.py /tmp/export_level_fields_verify.py`
Expected: 清理完成
