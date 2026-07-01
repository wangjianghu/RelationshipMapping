# Excel Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不影响现有 `JSON/CSV` 导入的前提下，为导入弹窗新增“层级路径型 Excel”上传解析能力。

**Architecture:** 保持现有导入主链路不变，只在文件上传分支中新增 `xlsx/xls` 解析逻辑。Excel 文件先被转换为系统已支持的 `{ nodes: [{ id, name, parentId, level }] }` 结构，再复用现有校验、预览和导入逻辑。

**Tech Stack:** HTML, Vanilla JavaScript, SheetJS CDN

---

### Task 1: 更新上传入口以接受 Excel 文件

**Files:**
- Modify: `RelationshipMapping/双平台关系映射.html`

- [ ] **Step 1: 更新文件类型和提示文案**

```html
<div class="upload-hint" id="uploadHint">支持 JSON、CSV 和 Excel(.xlsx/.xls) 格式，文件大小不超过 10MB</div>
<input type="file" id="fileInput" class="file-input" accept=".json,.csv,.xlsx,.xls">
```

- [ ] **Step 2: 在页面中引入 Excel 解析库**

```html
<script src="https://cdn.jsdelivr.net/npm/xlsx/dist/xlsx.full.min.js"></script>
<script src="js/script.js"></script>
```

- [ ] **Step 3: 手动验证页面仍能正常打开**

Run: `python3 -m http.server 8000`
Expected: 页面可正常加载，控制台无脚本加载错误

### Task 2: 新增层级路径型 Excel 解析函数

**Files:**
- Modify: `RelationshipMapping/js/script.js`

- [ ] **Step 1: 先写解析目标样例**

```js
const rows = [
  ['层级1', '层级2', '层级3'],
  ['知识图谱', '语言文字运用', '字音'],
  ['知识图谱', '语言文字运用', '字形']
];
```

- [ ] **Step 2: 新增表头识别、工作表读取和路径转节点函数**

```js
function isHierarchyHeader(value, index) {
  const text = String(value || '').trim();
  return text === `层级${index + 1}` || text === `第${index + 1}级`;
}

function parseExcelHierarchy(arrayBuffer) {
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) throw new Error('Excel文件为空');
  const worksheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });
  return convertHierarchyRowsToNodes(rows);
}
```

- [ ] **Step 3: 实现最小路径去重逻辑**

```js
function convertHierarchyRowsToNodes(rows) {
  if (!Array.isArray(rows) || rows.length < 2) throw new Error('Excel缺少有效数据');
  const header = rows[0].map(cell => String(cell || '').trim());
  const levelColumnCount = header.filter((cell, idx) => isHierarchyHeader(cell, idx)).length;
  if (!levelColumnCount) throw new Error('当前Excel不是支持的层级路径型格式');

  const nodeMap = new Map();
  let autoId = 1;

  rows.slice(1).forEach(row => {
    let parentKey = null;
    row.slice(0, levelColumnCount).forEach((cell, index) => {
      const name = String(cell || '').trim();
      if (!name) return;
      const key = parentKey ? `${parentKey}__${name}` : name;
      if (!nodeMap.has(key)) {
        nodeMap.set(key, {
          id: `excel-${autoId++}`,
          name,
          parentId: parentKey ? nodeMap.get(parentKey).id : null,
          level: index + 1
        });
      }
      parentKey = key;
    });
  });

  return { nodes: Array.from(nodeMap.values()) };
}
```

- [ ] **Step 4: 运行静态检查**

Run: `node --check /Users/cao/Documents/Trae/知识树映射/RelationshipMapping/js/script.js`
Expected: 无语法错误输出

### Task 3: 把 Excel 解析接入现有上传流程

**Files:**
- Modify: `RelationshipMapping/js/script.js`

- [ ] **Step 1: 在 `handleFile()` 中新增 Excel 分支**

```js
} else if (fileType.endsWith('.xlsx') || fileType.endsWith('.xls')) {
    state.uploadType = 'excel';
    switchFormat('upload');
    const parsedData = parseExcelHierarchy(e.target.result);
    document.getElementById('jsonEditor').value = JSON.stringify(parsedData, null, 2);
    validateAndPreview(parsedData);
}
```

- [ ] **Step 2: 按文件类型选择读取方式**

```js
if (fileType.endsWith('.xlsx') || fileType.endsWith('.xls')) {
  reader.readAsArrayBuffer(file);
} else {
  reader.readAsText(file, 'UTF-8');
}
```

- [ ] **Step 3: 让上传态显示 Excel 已解析结果**

```js
} else if (state.uploadType === 'excel') {
  jsonSection.style.display = 'block';
  csvSection.style.display = 'none';
  jsonEl.readOnly = true;
  jsonEl.classList.add('readonly');
}
```

- [ ] **Step 4: 回归验证**

Run: `python3 -m http.server 8000`
Expected: `JSON`、`CSV` 上传保持可用，`xlsx` 上传后能显示预览并成功导入

### Task 4: 用真实样本做导入验证

**Files:**
- Test: `新知识树/高中数学知识树.xlsx`
- Test: `新知识树/高中生物知识图谱1.2.xlsx`
- Test: `新知识树/高中语文新知识图谱（知识树）.xlsx`

- [ ] **Step 1: 导入数学样本**

```text
预期：识别“层级1..层级5”表头，生成树形预览，无格式报错。
```

- [ ] **Step 2: 导入生物样本**

```text
预期：识别“第1级..第7级”表头，忽略空尾列，生成树形预览。
```

- [ ] **Step 3: 导入语文样本**

```text
预期：能导入较深层级路径，重复前缀路径正确去重。
```

- [ ] **Step 4: 提交改动**

```bash
git add /Users/cao/Documents/Trae/知识树映射/RelationshipMapping/双平台关系映射.html /Users/cao/Documents/Trae/知识树映射/RelationshipMapping/js/script.js /Users/cao/Documents/Trae/知识树映射/RelationshipMapping/docs/superpowers/plans/2026-07-01-excel-import.md
git commit -m "feat: support hierarchy excel import"
```
