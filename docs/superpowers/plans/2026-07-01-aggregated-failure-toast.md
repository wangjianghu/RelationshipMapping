# Aggregated Failure Toast Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为智能推荐与智能批量映射增加统计型失败提示，展示成功数、失败数和失败原因聚合结果，并同步覆盖主实现与旧版页面。

**Architecture:** 保留 `attemptBind()` 的 `success/reason` 返回值，并新增原因映射与结果聚合函数。智能推荐和智能批量映射在调用 `attemptBind()` 时关闭逐项错误 toast，改为在完成一轮处理后统一弹出一次汇总提示；普通手动绑定维持现有即时提示行为。

**Tech Stack:** HTML, Vanilla JavaScript, Playwright

---

### Task 1: 先写失败的浏览器回归测试

**Files:**
- Create: `/Users/cao/Documents/Trae/知识树映射/RelationshipMapping/.tmp_test_aggregated_toast.py`
- Test: `/Users/cao/Documents/Trae/知识树映射/RelationshipMapping/js/script.js`
- Test: `/Users/cao/Documents/Trae/知识树映射/RelationshipMapping/关系映射.html`

- [ ] **Step 1: 写浏览器测试，验证汇总提示文案**

```python
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto("http://127.0.0.1:8007/RelationshipMapping/双平台关系映射.html")
    # 注入包含非叶子节点的状态
    # 执行智能推荐绑定所选，期望看到：
    # “成功 0，失败 1；失败原因：A平台仅允许叶子节点映射（1项）”
    browser.close()
```

- [ ] **Step 2: 启动本地服务**

Run: `python3 -m http.server 8007`
Expected: 本地服务启动成功

- [ ] **Step 3: 运行测试并确认先失败**

Run: `python3 /Users/cao/Documents/Trae/知识树映射/RelationshipMapping/.tmp_test_aggregated_toast.py`
Expected: 至少一个断言失败，证明当前仍是旧提示

### Task 2: 修复主实现 `js/script.js`

**Files:**
- Modify: `/Users/cao/Documents/Trae/知识树映射/RelationshipMapping/js/script.js`

- [ ] **Step 1: 扩展 `attemptBind()`，支持关闭逐项错误 toast**

```js
function attemptBind(aNode, bNode, options = {}) {
    const { silent = false } = options;
    const fail = (reason, message) => {
        if (!silent && message) showToast(message, 'error');
        return { success: false, reason };
    };
    // 其余逻辑保持不变
}
```

- [ ] **Step 2: 新增原因码映射与汇总文案函数**

```js
function getBindFailureReasonText(reason) {
    const reasonMap = {
        leaf_only_a: 'A平台仅允许叶子节点映射',
        leaf_only_b: 'B平台仅允许叶子节点映射',
        b_used: '该B节点已绑定到其他A节点',
        duplicate: '重复绑定',
        invalid_node: '节点无效或不存在'
    };
    return reasonMap[reason] || '未知原因';
}

function buildBindSummaryToast(results) {
    const successCount = results.filter(r => r && r.success).length;
    const failed = results.filter(r => !r || !r.success);
    const failedCount = failed.length;
    if (failedCount === 0) return `成功 ${successCount}，失败 0`;

    const reasonCounts = new Map();
    failed.forEach(r => {
        const text = getBindFailureReasonText(r && r.reason);
        reasonCounts.set(text, (reasonCounts.get(text) || 0) + 1);
    });
    const reasonText = Array.from(reasonCounts.entries()).map(([text, count]) => `${text}（${count}项）`).join('，');
    return `成功 ${successCount}，失败 ${failedCount}；失败原因：${reasonText}`;
}
```

- [ ] **Step 3: 将主页面智能推荐改为汇总提示**

```js
function applySmartOverlaySelected() {
    const a = state.selectedA;
    if (!a) { showToast('请先选择A平台节点', 'error'); return; }
    const boxes = document.querySelectorAll('#smartBindOverlay .smart-overlay-checkbox:checked');
    const results = [];
    boxes.forEach(bx => {
        const bId = bx.getAttribute('data-target');
        const bNode = getNodeById(state.platformB, bId);
        results.push(bNode ? attemptBind(a, bNode, { silent: true }) : { success: false, reason: 'invalid_node' });
    });
    const successCount = results.filter(r => r.success).length;
    showToast(buildBindSummaryToast(results), successCount > 0 ? 'success' : 'error');
    if (successCount > 0) renderSmartOverlayRecommendations();
}
```

- [ ] **Step 4: 将主页面智能批量映射改为汇总提示**

```js
function applySmartMappings() {
    const checkboxes = document.querySelectorAll('.smart-selection:checked');
    const results = [];
    checkboxes.forEach(checkbox => {
        const source = findNodeById(checkbox.dataset.source, 'A');
        const target = findNodeById(checkbox.dataset.target, 'B');
        results.push((source && target) ? attemptBind(source, target, { silent: true }) : { success: false, reason: 'invalid_node' });
    });
    const successCount = results.filter(r => r.success).length;
    if (successCount > 0) addToHistory('智能批量映射', `应用了${successCount}个映射`, '');
    showToast(buildBindSummaryToast(results), successCount > 0 ? 'success' : 'error');
    closeSmartMappingModal();
}
```

- [ ] **Step 5: 运行语法检查**

Run: `node --check /Users/cao/Documents/Trae/知识树映射/RelationshipMapping/js/script.js`
Expected: 无语法错误输出

### Task 3: 同步旧版 `关系映射.html`

**Files:**
- Modify: `/Users/cao/Documents/Trae/知识树映射/RelationshipMapping/关系映射.html`

- [ ] **Step 1: 扩展旧版 `attemptBind()`，支持 `silent`**

```js
function attemptBind(aNode, bNode, options = {}) {
    const { silent = false } = options;
    const fail = (reason, message) => {
        if (!silent && message) showToast(message, 'error');
        return { success: false, reason };
    };
    // 其余逻辑与主实现保持一致
}
```

- [ ] **Step 2: 新增旧版页面的原因映射与汇总文案函数**

```js
function getBindFailureReasonText(reason) { /* 与主实现相同 */ }
function buildBindSummaryToast(results) { /* 与主实现相同 */ }
```

- [ ] **Step 3: 将旧版智能批量映射改为汇总提示**

```js
function applySmartMappings() {
    const checkboxes = document.querySelectorAll('.smart-selection:checked');
    const results = [];
    checkboxes.forEach(checkbox => {
        const source = findNodeById(checkbox.dataset.source, 'A');
        const target = findNodeById(checkbox.dataset.target, 'B');
        results.push((source && target) ? attemptBind(source, target, { silent: true }) : { success: false, reason: 'invalid_node' });
    });
    const successCount = results.filter(r => r.success).length;
    if (successCount > 0) addToHistory('智能批量映射', `应用了${successCount}个映射`, '');
    showToast(buildBindSummaryToast(results), successCount > 0 ? 'success' : 'error');
    closeSmartMappingModal();
}
```

- [ ] **Step 4: 检查旧版页面诊断**

Run: 在 IDE 中检查 `/Users/cao/Documents/Trae/知识树映射/RelationshipMapping/关系映射.html`
Expected: 无新增错误级诊断

### Task 4: 复跑测试并清理

**Files:**
- Test: `/Users/cao/Documents/Trae/知识树映射/RelationshipMapping/.tmp_test_aggregated_toast.py`

- [ ] **Step 1: 复跑浏览器测试，验证统计型提示**

Run: `python3 /Users/cao/Documents/Trae/知识树映射/RelationshipMapping/.tmp_test_aggregated_toast.py`
Expected: PASS，无断言失败

- [ ] **Step 2: 检查最近修改文件诊断**

Run: 在 IDE 中检查 `/Users/cao/Documents/Trae/知识树映射/RelationshipMapping/js/script.js` 与 `/Users/cao/Documents/Trae/知识树映射/RelationshipMapping/关系映射.html`
Expected: 无新增错误级诊断

- [ ] **Step 3: 删除临时测试文件**

```bash
rm -f /Users/cao/Documents/Trae/知识树映射/RelationshipMapping/.tmp_test_aggregated_toast.py
```
