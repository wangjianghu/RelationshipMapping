# Excel Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为当前主实现新增最小可用版 `Excel(.xlsx)` 导出能力，字段与当前 `CSV` 完全一致。

**Architecture:** 保持现有导出结构不变，只在导出弹层和导出分发逻辑中新增 `xlsx` 分支。Excel 明细复用当前 `CSV` 的拍平规则，使用已接入的本地 `SheetJS` 生成单工作表并下载。

**Tech Stack:** HTML, Vanilla JavaScript, SheetJS

---

### Task 1: 扩展导出格式弹层

**Files:**
- Modify: `/Users/cao/Documents/Trae/知识树映射/RelationshipMapping/js/script.js:1511-1602`

- [ ] **Step 1: 更新弹层按钮，新增 Excel 选项**

```js
pop.innerHTML = `
    <div style="font-size:16px; color:${isLight ? '#0f172a' : '#FFFFFF'}; margin-bottom:12px; font-weight:600;">选择导出格式</div>
    <div id="exportOptions" style="display:flex; gap:12px; justify-content:center; align-items:center; margin-bottom:16px; flex-wrap:wrap;">
        <button id="opt-json" class="btn-small" onclick="setExportFormat('json', this)" style="min-width:80px; text-align:center; padding:8px 16px; border-radius:10px; background:linear-gradient(135deg, #4F8EEA, #6AA5F5); color:#FFFFFF; font-weight:600; border:none; box-shadow:0 2px 4px rgba(79, 142, 234, 0.3);">JSON格式</button>
        <button id="opt-csv" class="btn-small btn-secondary" onclick="setExportFormat('csv', this)" style="min-width:80px; text-align:center; padding:8px 16px; border-radius:10px; background:#8C9CB2; color:#FFFFFF; font-weight:600; border:none;">CSV格式</button>
        <button id="opt-xlsx" class="btn-small btn-secondary" onclick="setExportFormat('xlsx', this)" style="min-width:80px; text-align:center; padding:8px 16px; border-radius:10px; background:#8C9CB2; color:#FFFFFF; font-weight:600; border:none;">Excel格式</button>
    </div>
    <div style="display:flex; gap:8px; justify-content:flex-end;">
        <button id="export-cancel" class="btn-small" onclick="this.closest('.confirm-popover').remove()" style="border-radius:8px; background:#FFFFFF; color:#1E262E; padding:6px 16px; font-weight:600; box-shadow:0 1px 3px rgba(0,0,0,0.1);">取消</button>
        <button id="export-confirm" class="btn-small btn-delete" onclick="confirmExport()" style="border-radius:8px; background:#E64A43; color:#FFFFFF; padding:6px 16px; font-weight:600; box-shadow:0 1px 3px rgba(230, 74, 67, 0.3);">确定</button>
    </div>
`;
```

- [ ] **Step 2: 扩展格式状态，支持 `xlsx`**

```js
function setExportFormat(fmt, el) {
    state.exportFormat = ['json', 'csv', 'xlsx'].includes(fmt) ? fmt : 'json';
    updateExportOptionsUI();
}
```

- [ ] **Step 3: 统一按钮选中态更新逻辑**

```js
function updateExportOptionsUI() {
    const jsonBtn = document.getElementById('opt-json');
    const csvBtn = document.getElementById('opt-csv');
    const xlsxBtn = document.getElementById('opt-xlsx');
    const confirmBtn = document.getElementById('export-confirm');
    const cancelBtn = document.getElementById('export-cancel');
    if (!jsonBtn || !csvBtn || !xlsxBtn || !confirmBtn || !cancelBtn) return;

    const activeFormat = state.exportFormat || 'json';
    const buttons = [
        { el: jsonBtn, active: activeFormat === 'json' },
        { el: csvBtn, active: activeFormat === 'csv' },
        { el: xlsxBtn, active: activeFormat === 'xlsx' }
    ];

    buttons.forEach(({ el, active }) => {
        el.style.background = active ? 'linear-gradient(135deg, #4F8EEA, #6AA5F5)' : '#8C9CB2';
        el.style.boxShadow = active ? '0 2px 4px rgba(79, 142, 234, 0.3)' : 'none';
        el.style.color = '#FFFFFF';
        el.style.textAlign = 'center';
        el.style.padding = '8px 16px';
        el.style.borderRadius = '10px';
        el.style.fontWeight = '600';
        el.style.minWidth = '80px';
        el.disabled = state.exportLoading;
    });

    [confirmBtn, cancelBtn].forEach(b => { b.disabled = state.exportLoading; });
    confirmBtn.textContent = state.exportLoading ? '导出中...' : '确定';
}
```

- [ ] **Step 4: 运行语法检查**

Run: `node --check /Users/cao/Documents/Trae/知识树映射/RelationshipMapping/js/script.js`
Expected: 无语法错误输出

### Task 2: 新增 Excel 导出分支

**Files:**
- Modify: `/Users/cao/Documents/Trae/知识树映射/RelationshipMapping/js/script.js:1606-1647`

- [ ] **Step 1: 扩展导出分发逻辑**

```js
function confirmExport() {
    if (state.exportLoading) return;
    const pop = document.querySelector('.confirm-popover');
    const fmt = state.exportFormat || 'json';
    if (!state.mappings || state.mappings.length === 0) { alert('没有映射关系可导出！'); return; }
    state.exportLoading = true; updateExportOptionsUI();
    try {
        if (fmt === 'csv') exportMappingsCSV();
        else if (fmt === 'xlsx') exportMappingsExcel();
        else exportMappingsJSON();
    } finally {
        state.exportLoading = false; updateExportOptionsUI();
        if (pop) pop.remove();
    }
}
```

- [ ] **Step 2: 抽取与 CSV 一致的拍平数据**

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

- [ ] **Step 3: 让 CSV 复用同一套拍平逻辑**

```js
function exportMappingsCSV() {
    if (state.mappings.length === 0) { alert('没有映射关系可导出！'); return; }
    const rows = buildMappingExportRows();
    const csvLines = [];
    csvLines.push(['sourceId', 'sourceName', 'targetId', 'targetName'].join(','));
    rows.forEach(row => {
        csvLines.push([
            escapeCSV(row.sourceId),
            escapeCSV(row.sourceName),
            escapeCSV(row.targetId),
            escapeCSV(row.targetName)
        ].join(','));
    });
    const csv = csvLines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.ui.platformNameA}_${state.ui.platformNameB}关系映射 ${formatDateYMD(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}
```

- [ ] **Step 4: 新增 `exportMappingsExcel()`**

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

- [ ] **Step 5: 运行语法检查**

Run: `node --check /Users/cao/Documents/Trae/知识树映射/RelationshipMapping/js/script.js`
Expected: 无语法错误输出

### Task 3: 更新文档并验证导出结果

**Files:**
- Modify: `/Users/cao/Documents/Trae/知识树映射/RelationshipMapping/README.md:61-64`

- [ ] **Step 1: 更新 README 导出说明**

```md
- 导出映射
  - 顶部“导出映射”，选择 JSON/CSV/Excel；`/js/script.js:1487-1675`
```

- [ ] **Step 2: 启动本地服务**

Run: `python3 -m http.server 8000`
Expected: 本地服务正常启动

- [ ] **Step 3: 手动验证三种导出格式**

```text
1. 导入或构造至少 1 条映射关系
2. 分别点击 JSON / CSV / Excel 导出
3. 确认 .xlsx 可被 Excel/WPS 打开
4. 确认 Excel 表头为 sourceId/sourceName/targetId/targetName
5. 确认 Excel 明细行数与 CSV 一致
```

- [ ] **Step 4: 检查最近修改文件诊断**

Run: 在 IDE 中检查 `/Users/cao/Documents/Trae/知识树映射/RelationshipMapping/js/script.js` 与 `/Users/cao/Documents/Trae/知识树映射/RelationshipMapping/README.md`
Expected: 无新增错误级诊断

- [ ] **Step 5: 提交改动**

```bash
git add /Users/cao/Documents/Trae/知识树映射/RelationshipMapping/js/script.js /Users/cao/Documents/Trae/知识树映射/RelationshipMapping/README.md /Users/cao/Documents/Trae/知识树映射/RelationshipMapping/docs/superpowers/specs/2026-07-01-excel-export-design.md /Users/cao/Documents/Trae/知识树映射/RelationshipMapping/docs/superpowers/plans/2026-07-01-excel-export.md
git commit -m "feat: support xlsx mapping export"
```
