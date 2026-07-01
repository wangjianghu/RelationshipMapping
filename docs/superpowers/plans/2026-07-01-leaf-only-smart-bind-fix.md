# Leaf-Only Smart Bind Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复开启“仅允许叶子节点映射”后，智能推荐与智能批量映射仍可错误创建映射或错误显示成功提示的问题，并同步覆盖主实现与旧版页面。

**Architecture:** 将主实现和旧版页面中的 `attemptBind()` 改造成返回统一结果对象的底层绑定入口。智能推荐“绑定所选”和智能批量映射“应用选中映射”都改为依赖该返回结果统计真实成功数，避免绕过叶子校验或误报成功。

**Tech Stack:** HTML, Vanilla JavaScript, Playwright

---

### Task 1: 先写失败的浏览器回归测试

**Files:**
- Create: `/Users/cao/Documents/Trae/知识树映射/RelationshipMapping/.tmp_test_leaf_only_smart_bind.py`
- Test: `/Users/cao/Documents/Trae/知识树映射/RelationshipMapping/js/script.js`
- Test: `/Users/cao/Documents/Trae/知识树映射/RelationshipMapping/关系映射.html`

- [ ] **Step 1: 写浏览器测试，覆盖两个缺陷场景**

```python
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto("http://127.0.0.1:8005/RelationshipMapping/双平台关系映射.html")
    # 注入一个包含非叶子节点和叶子节点的状态
    # 场景1：智能推荐绑定所选，非叶子 A 节点不应新增映射，也不应显示“已绑定 1 个推荐节点”
    # 场景2：智能批量映射应用选中映射，非叶子 source/target 不应新增映射
    browser.close()
```

- [ ] **Step 2: 启动本地服务**

Run: `python3 -m http.server 8005`
Expected: 本地服务启动成功

- [ ] **Step 3: 运行测试并确认先失败**

Run: `python3 /Users/cao/Documents/Trae/知识树映射/RelationshipMapping/.tmp_test_leaf_only_smart_bind.py`
Expected: 至少一个断言失败，证明当前代码仍存在叶子节点绕过或成功提示错误

### Task 2: 修复主实现 `js/script.js`

**Files:**
- Modify: `/Users/cao/Documents/Trae/知识树映射/RelationshipMapping/js/script.js:928-964`
- Modify: `/Users/cao/Documents/Trae/知识树映射/RelationshipMapping/js/script.js:966-974`
- Modify: `/Users/cao/Documents/Trae/知识树映射/RelationshipMapping/js/script.js:1183-1195`
- Modify: `/Users/cao/Documents/Trae/知识树映射/RelationshipMapping/js/script.js:2309-2355`

- [ ] **Step 1: 将 `attemptBind()` 改为返回统一结果对象**

```js
function attemptBind(aNode, bNode) {
    const fail = (reason, message) => {
        if (message) showToast(message, 'error');
        return { success: false, reason };
    };
    if (!aNode || !bNode) return fail('invalid_node');
    const settings = state.mappingSettings;
    if (settings.leafOnlyA && !isLeafNode(aNode)) return fail('leaf_only_a', 'A平台仅允许叶子节点映射');
    if (settings.leafOnlyB && !isLeafNode(bNode)) return fail('leaf_only_b', 'B平台仅允许叶子节点映射');
    if ((settings.type === 'ONE_TO_ONE' || settings.type === 'ONE_TO_MANY') && isBUsedByOtherA(bNode.id, aNode.id)) {
        return fail('b_used', '该B节点已绑定到其他A节点');
    }
    // 成功写入或更新映射后返回 { success: true, reason: 'created' | 'updated' | 'appended' }
}
```

- [ ] **Step 2: 让普通 `createMapping()` 兼容返回值**

```js
function createMapping() {
    if (!state.selectedA || !state.selectedB) return;
    attemptBind(state.selectedA, state.selectedB);
    clearSelection();
    renderTrees();
    renderMappings();
    updateStats();
    saveToLocalStorage();
}
```

- [ ] **Step 3: 修复智能推荐“绑定所选”成功计数**

```js
function applySmartOverlaySelected() {
    const a = state.selectedA;
    if (!a) { showToast('请先选择A平台节点', 'error'); return; }
    const boxes = document.querySelectorAll('#smartBindOverlay .smart-overlay-checkbox:checked');
    let applied = 0;
    boxes.forEach(bx => {
        const bId = bx.getAttribute('data-target');
        const bNode = getNodeById(state.platformB, bId);
        const result = bNode ? attemptBind(a, bNode) : { success: false, reason: 'invalid_node' };
        if (result.success) applied++;
    });
    if (applied > 0) {
        showToast(`已绑定 ${applied} 个推荐节点`, 'success');
        renderSmartOverlayRecommendations();
    } else {
        showToast('没有成功绑定任何推荐节点', 'error');
    }
}
```

- [ ] **Step 4: 修复智能批量映射，统一走 `attemptBind()`**

```js
function applySmartMappings() {
    const checkboxes = document.querySelectorAll('.smart-selection:checked');
    let appliedCount = 0;
    checkboxes.forEach(checkbox => {
        const source = findNodeById(checkbox.dataset.source, 'A');
        const target = findNodeById(checkbox.dataset.target, 'B');
        const result = (source && target) ? attemptBind(source, target) : { success: false, reason: 'invalid_node' };
        if (result.success) appliedCount++;
    });
    if (appliedCount > 0) {
        addToHistory('智能批量映射', `应用了${appliedCount}个映射`, '');
        showToast(`成功应用 ${appliedCount} 个智能映射！`, 'success');
    } else {
        showToast('没有成功应用任何映射', 'error');
    }
    closeSmartMappingModal();
}
```

- [ ] **Step 5: 运行语法检查**

Run: `node --check /Users/cao/Documents/Trae/知识树映射/RelationshipMapping/js/script.js`
Expected: 无语法错误输出

### Task 3: 同步旧版 `关系映射.html`

**Files:**
- Modify: `/Users/cao/Documents/Trae/知识树映射/RelationshipMapping/关系映射.html:2110-2146`
- Modify: `/Users/cao/Documents/Trae/知识树映射/RelationshipMapping/关系映射.html:2148-2156`
- Modify: `/Users/cao/Documents/Trae/知识树映射/RelationshipMapping/关系映射.html:3340-3386`

- [ ] **Step 1: 将旧版页 `attemptBind()` 改为返回统一结果对象**

```js
function attemptBind(aNode, bNode) {
    const fail = (reason, message) => {
        if (message) showToast(message, 'error');
        return { success: false, reason };
    };
    // 与主实现保持相同校验与返回值语义
}
```

- [ ] **Step 2: 让旧版 `createMapping()` 兼容返回值**

```js
function createMapping() {
    if (!state.selectedA || !state.selectedB) return;
    attemptBind(state.selectedA, state.selectedB);
    clearSelection();
    renderTrees();
    renderMappings();
    updateStats();
    saveToLocalStorage();
}
```

- [ ] **Step 3: 将旧版 `applySmartMappings()` 改为依赖 `attemptBind()`**

```js
function applySmartMappings() {
    const checkboxes = document.querySelectorAll('.smart-selection:checked');
    let appliedCount = 0;
    checkboxes.forEach(checkbox => {
        const source = findNodeById(checkbox.dataset.source, 'A');
        const target = findNodeById(checkbox.dataset.target, 'B');
        const result = (source && target) ? attemptBind(source, target) : { success: false, reason: 'invalid_node' };
        if (result.success) appliedCount++;
    });
    if (appliedCount > 0) {
        addToHistory('智能批量映射', `应用了${appliedCount}个映射`, '');
        showToast(`成功应用 ${appliedCount} 个智能映射！`, 'success');
    } else {
        showToast('没有成功应用任何映射', 'error');
    }
    closeSmartMappingModal();
}
```

- [ ] **Step 4: 检查旧版页面诊断**

Run: 在 IDE 中检查 `/Users/cao/Documents/Trae/知识树映射/RelationshipMapping/关系映射.html`
Expected: 无新增错误级诊断

### Task 4: 复跑测试并清理

**Files:**
- Modify: `/Users/cao/Documents/Trae/知识树映射/RelationshipMapping/js/script.js`
- Modify: `/Users/cao/Documents/Trae/知识树映射/RelationshipMapping/关系映射.html`
- Test: `/Users/cao/Documents/Trae/知识树映射/RelationshipMapping/.tmp_test_leaf_only_smart_bind.py`

- [ ] **Step 1: 复跑浏览器测试，验证两个页面都通过**

Run: `python3 /Users/cao/Documents/Trae/知识树映射/RelationshipMapping/.tmp_test_leaf_only_smart_bind.py`
Expected: PASS，无断言失败

- [ ] **Step 2: 检查最近修改文件诊断**

Run: 在 IDE 中检查 `/Users/cao/Documents/Trae/知识树映射/RelationshipMapping/js/script.js` 与 `/Users/cao/Documents/Trae/知识树映射/RelationshipMapping/关系映射.html`
Expected: 无新增错误级诊断

- [ ] **Step 3: 删除临时测试文件**

```bash
rm -f /Users/cao/Documents/Trae/知识树映射/RelationshipMapping/.tmp_test_leaf_only_smart_bind.py
```
