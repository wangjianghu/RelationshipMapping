        // Toast 提示函数
        function showToast(message, type = 'success', duration = 3000) {
            const existingToast = document.querySelector('.toast');
            if (existingToast) {
                existingToast.classList.add('fade-out');
                setTimeout(() => existingToast.remove(), 300);
            }
            
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            toast.textContent = message;
            
            document.body.appendChild(toast);
            
            setTimeout(() => {
                toast.classList.add('fade-out');
                setTimeout(() => toast.remove(), 300);
            }, duration);
        }
        
        // 显示成功导入的toast
        function showImportSuccessToast(count) {
            showToast(`成功导入 ${count} 个节点`, 'success');
        }
        
        // 显示错误的toast
        function showErrorToast(message) {
            showToast(message, 'error');
        }

        function applyTheme(theme) {
            document.documentElement.setAttribute('data-theme', theme);
            updateThemeButton();
        }

        function updateThemeButton() {
            const btn = document.getElementById('themeBtn');
            if (!btn) return;
            const t = (state.ui && state.ui.theme) ? state.ui.theme : 'dark';
            const svg = t === 'dark' 
                ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"/></svg>' 
                : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2"/><path d="M12 21v2"/><path d="M4.22 4.22l1.42 1.42"/><path d="M18.36 18.36l1.42 1.42"/><path d="M1 12h2"/><path d="M21 12h2"/><path d="M4.22 19.78l1.42-1.42"/><path d="M18.36 5.64l1.42-1.42"/></svg>';
            btn.innerHTML = svg;
            btn.title = `主题: ${t === 'dark' ? '深色' : '浅色'}`;
            btn.setAttribute('aria-label', `切换为${t === 'dark' ? '浅色' : '深色'}主题`);
        }

        function toggleTheme() {
            state.ui = state.ui || {};
            const next = state.ui.theme === 'light' ? 'dark' : 'light';
            state.ui.theme = next;
            applyTheme(next);
            saveToLocalStorage();
            showToast(next === 'light' ? '已切换为浅色主题' : '已切换为深色主题', 'success');
        }

        const appEvents = new EventTarget();
        function emit(name, detail) { try { appEvents.dispatchEvent(new CustomEvent(name, { detail })); } catch(e) {} }
        function on(name, handler) { try { appEvents.addEventListener(name, handler); } catch(e) {} }

        let statsDebounceTimer = null;
        function scheduleStatsUpdate() { if (statsDebounceTimer) clearTimeout(statsDebounceTimer); statsDebounceTimer = setTimeout(() => { try { updateStats(); } catch (e) { setTimeout(() => { try { updateStats(); } catch (err) { showToast('同步失败', 'error'); } }, 300); } }, 120); }
        
        function toggleSelectAll() {
            const selectAllCheckbox = document.getElementById('selectAllCheckbox');
            const selectAllText = document.getElementById('selectAllText');
            if (!selectAllCheckbox || !selectAllText) return;
            const checkboxes = document.querySelectorAll('.smart-selection:not(:disabled)');
            checkboxes.forEach(checkbox => { checkbox.checked = selectAllCheckbox.checked; });
            selectAllText.textContent = selectAllCheckbox.checked ? '取消全选' : '全选';
        }
        
        function updateSelectAllState() {
            const selectAllCheckbox = document.getElementById('selectAllCheckbox');
            const selectAllText = document.getElementById('selectAllText');
            if (!selectAllCheckbox || !selectAllText) return;
            const checkboxes = document.querySelectorAll('.smart-selection:not(:disabled)');
            const checkedBoxes = document.querySelectorAll('.smart-selection:not(:disabled):checked');
            if (checkboxes.length === 0) {
                selectAllCheckbox.checked = false;
                selectAllCheckbox.indeterminate = false;
                selectAllText.textContent = '全选';
            } else if (checkedBoxes.length === 0) {
                selectAllCheckbox.checked = false;
                selectAllCheckbox.indeterminate = false;
                selectAllText.textContent = '全选';
            } else if (checkedBoxes.length === checkboxes.length) {
                selectAllCheckbox.checked = true;
                selectAllCheckbox.indeterminate = false;
                selectAllText.textContent = '取消全选';
            } else {
                selectAllCheckbox.checked = false;
                selectAllCheckbox.indeterminate = true;
                selectAllText.textContent = '全选';
            }
        }
        // 增强版状态管理 - 新增历史记录和模板功能
        const state = {
            platformA: null,
            platformB: null,
            mappings: [],
            selectedA: null,
            selectedB: null,
            importTarget: null,
            currentFormat: 'upload',
            importData: null,
            visualMappingEnabled: false,
            templates: [],
            ui: {
                systemTitle: '双平台关系映射管理系统',
                platformNameA: '平台 A 关系树',
                platformNameB: '平台 B 关系树'
            },
            editingMappingId: null,
            bindingLogs: [],
            bindingLogsPage: 1,
            bindingLogsPageSize: 10,
            bindingLogsTotal: 0,
            bindingLogsLoading: false,
            bindingLogsError: null,
            bindingLogsUndoingId: null,
            bindingLogsScrollBound: false,
            bindingLogsScrollHandler: null,
            bindingLogsUserScrolled: false,
            bindingLogsReachedEnd: false,
            bindingLogsDocClickHandler: null,
            bindingLogsHiddenKeys: [],
            exportFormat: 'json',
            exportLoading: false,
            mappingSettings: {
                type: 'ONE_TO_ONE',
                leafOnlyA: true,
                leafOnlyB: true
            },
            searchCache: {},
            searchLimit: 200,
            smartSuggestions: [],
            smartSearchBound: false
        };

        // 文件上传相关（保持不变）
        const fileInput = document.getElementById('fileInput');
        const fileUploadArea = document.getElementById('fileUploadArea');

        fileUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            fileUploadArea.classList.add('dragover');
        });

        fileUploadArea.addEventListener('dragleave', () => {
            fileUploadArea.classList.remove('dragover');
        });

        fileUploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            fileUploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handleFile(files[0]);
            }
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleFile(e.target.files[0]);
            }
        });

        function handleFile(file) {
            if (file.size > 10 * 1024 * 1024) {
                showValidation('❌ 文件大小超过10MB限制', 'error');
                state.importData = null;
                return;
            }

            const fileType = file.name.toLowerCase();
            const reader = new FileReader();

            reader.onerror = () => {
                showValidation('❌ 文件读取失败，请检查文件是否损坏', 'error');
                state.importData = null;
            };

            reader.onload = (e) => {
                try {
                    document.getElementById('uploadFilename').textContent = `已选择文件：${file.name}`;
                    document.getElementById('uploadText').style.display = 'none';
                    document.getElementById('uploadHint').style.display = 'none';
                    document.getElementById('clearFileBtn').style.display = 'flex';
                    if (fileType.endsWith('.json')) {
                        const jsonData = JSON.parse(e.target.result);
                        state.uploadType = 'json';
                        switchFormat('upload');
                        const je = document.getElementById('jsonEditor');
                        je.value = JSON.stringify(jsonData, null, 2);
                        validateAndPreview(jsonData);
                    } else if (fileType.endsWith('.csv')) {
                        const csvData = e.target.result;
                        state.uploadType = 'csv';
                        switchFormat('upload');
                        const ce = document.getElementById('csvEditor');
                        ce.value = csvData;
                        const parsedData = parseCSV(csvData);
                        validateAndPreview(parsedData);
                    } else {
                        showValidation('❌ 不支持的文件格式，请选择 .json 或 .csv 文件', 'error');
                        state.importData = null;
                    }
                } catch (error) {
                    showValidation(`❌ 文件解析失败: ${error.message}`, 'error');
                    state.importData = null;
                }
            };

            reader.readAsText(file, 'UTF-8');
        }
        function clearSelectedFile(e) {
            if (e) e.stopPropagation();
            const fi = document.getElementById('fileInput');
            fi.value = '';
            const nameEl = document.getElementById('uploadFilename');
            nameEl.textContent = '';
            document.getElementById('uploadText').style.display = 'block';
            document.getElementById('uploadHint').style.display = 'block';
            document.getElementById('clearFileBtn').style.display = 'none';
        }

        function parseCSV(csvText) {
            const lines = csvText.trim().split('\n');
            if (lines.length === 0) throw new Error('CSV文件为空');

            const detectDelimiter = (line) => {
                if (line.includes(',')) return ',';
                if (line.includes('\t')) return '\t';
                return 'ws';
            };
            const firstLine = lines[0];
            const delim = detectDelimiter(firstLine);
            const splitLine = (line) => {
                if (delim === ',') return line.split(',').map(s => s.trim());
                if (delim === '\t') return line.split('\t').map(s => s.trim());
                return line.trim().split(/\s+/).map(s => s.trim());
            };

            let headers = splitLine(firstLine).map(h => h.trim());
            const canon = (h) => {
                const k = h.toLowerCase();
                if (k === 'parentid') return 'parentId';
                return k === 'id' ? 'id' : (k === 'name' ? 'name' : (k === 'level' ? 'level' : h));
            };
            headers = headers.map(canon);

            const required = ['id', 'name'];
            for (const f of required) {
                if (!headers.map(h => h.toLowerCase()).includes(f)) {
                    throw new Error(`CSV缺少必要字段: ${f}`);
                }
            }

            const nodes = [];
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                const values = splitLine(line);
                const node = {};
                headers.forEach((header, idx) => {
                    if (values[idx] !== undefined) node[header] = values[idx];
                });
                if (node.level !== undefined) node.level = parseInt(node.level);
                if (node.parentId === '' || String(node.parentId).toLowerCase() === 'null') node.parentId = null;
                nodes.push(node);
            }
            return { nodes };
        }

        function downloadCSVTemplate() {
            const template = `id,name,parentId,level
1,数学基础,null,1
2,代数,1,2
3,几何,1,2
4,方程,2,3
5,函数,2,3
6,平面几何,3,3
7,立体几何,3,3
8,语言艺术,null,1
9,文学,8,2
10,古诗词,9,3
11,现代文,9,3`;

            const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = '知识点模板.csv';
            link.click();
            URL.revokeObjectURL(link.href);
        }

        function loadCSVExample() {
            const example = `id,name,parentId,level
1,数学基础,null,1
2,代数,1,2
3,几何,1,2
4,方程,2,3
5,函数,2,3`;
            const ce = document.getElementById('csvEditor');
            if (ce) {
                ce.value = example;
                try {
                    const data = parseCSV(example);
                    validateAndPreview(data);
                } catch (e) {
                    showValidation('❌ CSV格式错误: ' + e.message, 'error');
                }
            }
        }

        function switchFormat(format) {
            state.currentFormat = format;
            document.querySelectorAll('.format-tab').forEach(tab => { tab.classList.remove('active'); });
            document.querySelector(`[data-format="${format}"]`).classList.add('active');
            const uploadArea = document.getElementById('fileUploadArea');
            const jsonSection = document.getElementById('jsonEditorSection');
            const csvSection = document.getElementById('csvEditorSection');
            const jsonEl = document.getElementById('jsonEditor');
            const csvEl = document.getElementById('csvEditor');
            const preview = document.getElementById('previewSection');
            const previewContent = document.getElementById('previewContent');
            const count = document.getElementById('previewCount');

            uploadArea.style.display = format === 'upload' ? 'block' : 'none';

            if (format === 'upload') {
                if (!state.uploadType) {
                    jsonSection.style.display = 'block';
                    csvSection.style.display = 'none';
                    jsonEl.readOnly = true; jsonEl.classList.add('readonly');
                    csvEl.readOnly = false; csvEl.classList.remove('readonly');
                    preview.style.display = 'block';
                    previewContent.innerHTML = '';
                    count.style.display = 'none'; count.textContent = '';
                } else if (state.uploadType === 'json') {
                    jsonSection.style.display = 'block';
                    csvSection.style.display = 'none';
                    jsonEl.readOnly = true; jsonEl.classList.add('readonly');
                    csvEl.readOnly = false; csvEl.classList.remove('readonly');
                } else if (state.uploadType === 'csv') {
                    jsonSection.style.display = 'none';
                    csvSection.style.display = 'block';
                    csvEl.readOnly = true; csvEl.classList.add('readonly');
                    jsonEl.readOnly = false; jsonEl.classList.remove('readonly');
                }
            } else {
                jsonSection.style.display = format === 'json' ? 'block' : 'none';
                csvSection.style.display = format === 'csv' ? 'block' : 'none';
                jsonEl.readOnly = false; jsonEl.classList.remove('readonly');
                csvEl.readOnly = false; csvEl.classList.remove('readonly');
                state.uploadType = null;
                const jsonText = jsonEl.value.trim();
                const csvText = csvEl.value.trim();
                if (format === 'json') {
                    if (jsonText) {
                        try { validateAndPreview(JSON.parse(jsonText)); }
                        catch (e) { showValidation('❌ JSON格式错误: ' + e.message, 'error'); document.getElementById('previewSection').style.display='block'; document.getElementById('previewContent').innerHTML=''; document.getElementById('previewCount').style.display='none'; }
                    } else { clearPreview(); }
                } else if (format === 'csv') {
                    if (csvText) {
                        try { validateAndPreview(parseCSV(csvText)); }
                        catch (e) { showValidation('❌ CSV格式错误: ' + e.message, 'error'); document.getElementById('previewSection').style.display='block'; document.getElementById('previewContent').innerHTML=''; document.getElementById('previewCount').style.display='none'; }
                    } else { clearPreview(); }
                }
            }
        }
        function clearPreview() {
            const preview = document.getElementById('previewSection');
            const previewContent = document.getElementById('previewContent');
            const count = document.getElementById('previewCount');
            if (preview) preview.style.display = 'block';
            if (previewContent) previewContent.innerHTML = '';
            if (count) { count.style.display = 'none'; count.textContent = ''; }
        }

        function validateAndPreview(data) {
            try {
                if (!data || typeof data !== 'object') {
                    throw new Error('数据必须是有效的对象');
                }
                if (!Array.isArray(data.nodes)) {
                    throw new Error('数据格式错误：必须包含nodes数组');
                }
                if (data.nodes.length === 0) {
                    throw new Error('数据为空：nodes数组不能为空');
                }

                const requiredFields = ['id', 'name'];
                for (const node of data.nodes) {
                    for (const field of requiredFields) {
                        if (!node[field]) {
                            throw new Error(`节点 ${JSON.stringify(node)} 缺少必要字段: ${field}`);
                        }
                    }
                    node.id = String(node.id);
                    if (node.parentId !== null && node.parentId !== undefined && node.parentId !== '') node.parentId = String(node.parentId);
                }

                const preview = document.getElementById('previewSection');
                const previewContent = document.getElementById('previewContent');
                preview.style.display = 'block';

                const tree = buildTreePreview(data.nodes);
                previewContent.innerHTML = `<pre style="margin: 0;">${tree}</pre>`;
                document.getElementById('previewCount').style.display = 'block';
                document.getElementById('previewCount').textContent = `共 ${data.nodes.length} 个节点`;

                state.importData = data;
                showValidation('✅ 数据验证通过，可以导入', 'success');
            } catch (error) {
                showValidation(`❌ 数据验证失败: ${error.message}`, 'error');
                document.getElementById('previewSection').style.display = 'block';
                document.getElementById('previewContent').innerHTML = '';
                document.getElementById('previewCount').style.display = 'none';
                state.importData = null;
            }
        }

        function buildTreePreview(nodes) {
            const nodeMap = {};
            const rootNodes = [];

            nodes.forEach(node => {
                nodeMap[node.id] = { ...node, children: [] };
            });

            nodes.forEach(node => {
                if (node.parentId && nodeMap[node.parentId]) {
                    nodeMap[node.parentId].children.push(nodeMap[node.id]);
                } else {
                    rootNodes.push(nodeMap[node.id]);
                }
            });

            const renderPreview = (node, depth = 0) => {
                const indent = '  '.repeat(depth);
                const childCount = node.children ? node.children.length : 0;
                let result = `${indent}├─ ${node.name} (ID: ${node.id})`;
                if (childCount > 0) {
                    result += ` [${childCount}个子节点]`;
                }
                result += '\n';
                if (node.children) {
                    node.children.forEach(child => {
                        result += renderPreview(child, depth + 1);
                    });
                }
                return result;
            };

            return rootNodes.map(root => renderPreview(root)).join('\n');
        }

        function showValidation(message, type) {
            const validationDiv = document.getElementById('validationMessage');
            validationDiv.className = `validation-message validation-${type}`;
            validationDiv.textContent = message;
            validationDiv.style.display = 'block';
        }

        function loadExample() {
            const exampleData = {
                nodes: [
                    { id: "1", name: "数学基础", parentId: null, level: 1 },
                    { id: "2", name: "代数", parentId: "1", level: 2 },
                    { id: "3", name: "几何", parentId: "1", level: 2 },
                    { id: "4", name: "方程", parentId: "2", level: 3 },
                    { id: "5", name: "函数", parentId: "2", level: 3 },
                    { id: "6", name: "平面几何", parentId: "3", level: 3 },
                    { id: "7", name: "立体几何", parentId: "3", level: 3 },
                    { id: "8", name: "语言艺术", parentId: null, level: 1 },
                    { id: "9", name: "文学", parentId: "8", level: 2 },
                    { id: "10", name: "古诗词", parentId: "9", level: 3 },
                    { id: "11", name: "现代文", parentId: "9", level: 3 }
                ]
            };
            document.getElementById('jsonEditor').value = JSON.stringify(exampleData, null, 2);
            validateAndPreview(exampleData);
        }

        document.getElementById('jsonEditor').addEventListener('input', (e) => {
            try {
                const data = JSON.parse(e.target.value);
                validateAndPreview(data);
            } catch (error) {
                showValidation('❌ JSON格式错误: ' + error.message, 'error');
                document.getElementById('previewSection').style.display = 'block';
                document.getElementById('previewContent').innerHTML = '';
                document.getElementById('previewCount').style.display = 'none';
                state.importData = null;
            }
        });

        document.getElementById('csvEditor').addEventListener('input', (e) => {
            try {
                const data = parseCSV(e.target.value);
                validateAndPreview(data);
            } catch (error) {
                showValidation('❌ CSV格式错误: ' + error.message, 'error');
                document.getElementById('previewSection').style.display = 'block';
                document.getElementById('previewContent').innerHTML = '';
                document.getElementById('previewCount').style.display = 'none';
                state.importData = null;
            }
        });

        function importPlatform(platform) {
            state.importTarget = platform;
            state.currentFormat = 'json';
            state.importData = null;
            
            const title = platform === 'A' ? state.ui.platformNameA : state.ui.platformNameB;
            document.getElementById('modalTitle').textContent = `导入数据`;
            document.getElementById('importModal').style.display = 'block';
            document.getElementById('jsonEditor').value = '';
            document.getElementById('csvEditor').value = '';
            document.getElementById('previewSection').style.display = 'block';
            document.getElementById('validationMessage').style.display = 'none';
            document.getElementById('fileInput').value = '';
            const ra = document.getElementById('importTargetA');
            const rb = document.getElementById('importTargetB');
            if (ra && rb) {
                ra.checked = platform === 'A';
                rb.checked = platform === 'B';
            }
        }

        function showImportDataModal() {
            importPlatform('A');
        }

        function setImportTarget(target) {
            state.importTarget = target === 'B' ? 'B' : 'A';
        }

        function closeImportModal() {
            document.getElementById('importModal').style.display = 'none';
            state.importData = null;
            const jsonEl = document.getElementById('jsonEditor');
            const csvEl = document.getElementById('csvEditor');
            const preview = document.getElementById('previewSection');
            const previewContent = document.getElementById('previewContent');
            const count = document.getElementById('previewCount');
            const fileInput = document.getElementById('fileInput');
            const nameEl = document.getElementById('uploadFilename');
            const hintEl = document.getElementById('uploadHint');
            const clearBtn = document.getElementById('clearFileBtn');
            if (jsonEl) jsonEl.value = '';
            if (csvEl) csvEl.value = '';
            if (preview) preview.style.display = 'block';
            if (previewContent) previewContent.innerHTML = '';
            if (count) { count.style.display = 'none'; count.textContent = ''; }
            if (fileInput) fileInput.value = '';
            if (nameEl) nameEl.textContent = '';
            if (hintEl) hintEl.style.display = 'block';
            if (clearBtn) clearBtn.style.display = 'none';
            state.uploadType = null;
        }

        function confirmImport() {
            const data = state.importData ? JSON.parse(JSON.stringify(state.importData)) : null;
            if (!data || !Array.isArray(data.nodes)) {
                alert('❌ 请先上传或输入有效的数据！\n\n错误: 数据为空或格式不正确。');
                return;
            }

            try {
                const tree = normalizeTreeIDs(convertToTree(data.nodes));
                expandAll(tree);
                if (state.importTarget === 'A') {
                    state.platformA = tree;
                } else {
                    state.platformB = tree;
                }

                closeImportModal();
                renderTrees();
                updateMappableCounts();
                scheduleStatsUpdate();
                saveToLocalStorage();
                showImportSuccessToast(data.nodes.length);
                // 清空弹窗输入与预览，避免下次打开遗留
                closeImportModal();
            } catch (error) {
                showErrorToast(`导入失败: ${error.message}`);
            }
        }

        function convertToTree(nodes) {
            const nodeMap = {};
            const root = {
                id: `${state.importTarget}-root`,
                name: state.importTarget === 'A' ? state.ui.platformNameA : state.ui.platformNameB,
                level: 0,
                children: [],
                parentId: null,
                isExpanded: true
            };

            nodes.forEach(node => {
                nodeMap[node.id] = {
                    ...node,
                    children: [],
                    isExpanded: true
                };
            });

            nodes.forEach(node => {
                node.id = String(node.id);
                if (node.parentId !== null && node.parentId !== undefined && node.parentId !== '') node.parentId = String(node.parentId);
                if (node.parentId === null || node.parentId === 'null' || node.parentId === '' || !nodeMap[node.parentId]) {
                    root.children.push(nodeMap[node.id]);
                } else {
                    nodeMap[node.parentId].children.push(nodeMap[node.id]);
                }
            });

            return root;
        }
        function normalizeTreeIDs(tree) {
            const walk = (n) => {
                if (n.id !== undefined && n.id !== null) n.id = String(n.id);
                if (n.parentId !== undefined && n.parentId !== null && n.parentId !== '') n.parentId = String(n.parentId);
                if (n.children) n.children.forEach(walk);
            };
            walk(tree);
            return tree;
        }
        function expandAll(tree) {
            const traverse = (n) => {
                n.isExpanded = true;
                if (n.children) n.children.forEach(traverse);
            };
            traverse(tree);
        }

        function renderTrees() {
            const containerA = document.getElementById('treeA');
            const containerB = document.getElementById('treeB');

            if (state.platformA) {
                containerA.innerHTML = renderTree(state.platformA, 'A');
            }
            if (state.platformB) {
                containerB.innerHTML = renderTree(state.platformB, 'B');
            }

            if (state.visualMappingEnabled) {
                drawVisualMappings();
            }
        }

        function renderTree(node, platform, searchTerm = '') {
            const hasChildren = node.children && node.children.length > 0;
            const isSelectedA = state.selectedA?.id === node.id;
            const isBoundToSelectedA = platform === 'B' && node.level > 0 && isNodeBoundToSelectedA(node.id);
            
            // 修复：正确统计绑定的目标知识点数量（去重后）
            const bindingCount = platform === 'A' && node.level > 0 ? (() => {
                const allTargetIds = [];
                state.mappings.forEach(m => {
                    if (m.sourceId === node.id && Array.isArray(m.targetIds)) {
                        m.targetIds.forEach(targetId => {
                            if (targetId) allTargetIds.push(targetId);
                        });
                    }
                });
                return new Set(allTargetIds).size;
            })() : 0;
            
            const bindingCountB = platform === 'B' && node.level > 0 ? (() => {
                let count = 0;
                state.mappings.forEach(m => {
                    if (Array.isArray(m.targetIds) && m.targetIds.includes(node.id)) {
                        count++;
                    }
                });
                return count;
            })() : 0;
            
            const boundTargetNames = platform === 'A' && node.level > 0 ? (() => {
                const allTargetNames = [];
                state.mappings.forEach(m => {
                    if (m.sourceId === node.id && Array.isArray(m.targetNames)) {
                        m.targetNames.forEach(targetName => {
                            if (targetName && !allTargetNames.includes(targetName)) {
                                allTargetNames.push(targetName);
                            }
                        });
                    }
                });
                return allTargetNames;
            })() : [];

            if (searchTerm && node.level > 0) {
                const qLower = searchTerm.toLowerCase();
                const byName = String(node.name).toLowerCase().includes(qLower);
                const byId = String(node.id) === searchTerm;
                if (!byName && !byId) {
                    if (!hasChildren || !node.children.some(child => String(child.name).toLowerCase().includes(qLower) || String(child.id) === searchTerm)) {
                        return '';
                    }
                }
            }

            const ctx = state.searchContext || { term: '', mode: 'fuzzy' };
            const termLower = (ctx.term || '').toLowerCase();
            const termRaw = (ctx.term || '');
            const nameLower = String(node.name).toLowerCase();
            const idLower = String(node.id).toLowerCase();
            let displayName = node.name;
            let displayId = node.id;
            if (termLower) {
                if (ctx.mode === 'exact_name' && nameLower === termLower) displayName = `<span class="search-highlight">${node.name}</span>`;
                else if (ctx.mode === 'exact_id' && String(node.id) === termRaw) displayId = `<span class="search-highlight">${node.id}</span>`;
                else {
                    const idx = nameLower.indexOf(termLower);
                    if (idx >= 0) displayName = `${node.name.slice(0, idx)}<span class="search-highlight">${node.name.slice(idx, idx + termLower.length)}</span>${node.name.slice(idx + termLower.length)}`;
                    else if (String(node.id) === termRaw) displayId = `<span class="search-highlight">${node.id}</span>`;
                }
            }

            return `
                <div class="tree-node" data-id="${node.id}" data-platform="${platform}">
                    <div class="node-content ${isSelectedA ? 'selected-a' : ''} ${isBoundToSelectedA ? 'selected-b' : ''}"
                         onclick="selectNode('${node.id}', '${platform}')">
                        ${hasChildren ? `<span class="toggle-icon ${node.isExpanded ? 'expanded' : ''}" onclick="toggleNode('${node.id}', '${platform}', event)">▶</span>` : '<span style="width: 20px;"></span>'}
                        <span class="node-icon"></span>
                        <span class="node-name">${displayName}<span class="node-id">${displayId}</span></span>
                        ${platform === 'A' && node.level > 0 ? `<span class="binding-count" title="已绑定数量">${bindingCount}</span>` : ''}
                        ${platform === 'B' && node.level > 0 && bindingCountB > 0 ? `<span class="binding-count" title="被绑定次数" onclick="showBindingsForB('${node.id}', event)">${bindingCountB}</span>` : ''}
                    </div>
                    ${platform === 'A' && boundTargetNames.length > 0 ? `<div class="bound-targets">→ ${boundTargetNames.join(', ')}</div>` : ''}
                    <div class="children" style="display: ${node.isExpanded ? 'block' : 'none'};">
                        ${hasChildren ? node.children.map(child => renderTree(child, platform, searchTerm)).join('') : ''}
                    </div>
                </div>
            `;
        }

        function renderTreeWithMode(node, platform, searchTerm = '', mode = 'fuzzy', allowedIds) {
            const termRaw = (searchTerm || '');
            const termLower = termRaw.toLowerCase();
            const shouldKeep = (n) => {
                if (!termRaw) return true;
                const nameLower = String(n.name).toLowerCase();
                const idStr = String(n.id);
                const idLower = idStr.toLowerCase();
                const idSubMatch = termRaw.length >= 2 && idLower.includes(termLower);
                if (mode === 'exact_name') return nameLower === termLower;
                if (mode === 'exact_id') return idStr === termRaw;
                return nameLower.includes(termLower) || idStr === termRaw || idSubMatch;
            };
            const filterNode = (n) => {
                if (n.level === 0) return { ...n, children: (n.children || []).map(filterNode).filter(Boolean) };
                const keepSelf = shouldKeep(n) && (!allowedIds || allowedIds.has(String(n.id)));
                const children = (n.children || []).map(filterNode).filter(Boolean);
                if (keepSelf || children.length) return { ...n, children };
                return null;
            };
            const filtered = filterNode(node) || { ...node, children: [] };
            return renderTree(filtered, platform, '');
        }

        function collectMatches(node, termRaw, mode) {
            const ids = [];
            const termLower = (termRaw || '').toLowerCase();
            const minLen = 2;
            const scan = (n) => {
                if (n.level > 0) {
                    const nameLower = String(n.name).toLowerCase();
                    const idStr = String(n.id);
                    const idLower = idStr.toLowerCase();
                    let hit = false;
                    if (!termRaw) hit = true; else if (mode === 'exact_name') hit = nameLower === termLower; else if (mode === 'exact_id') hit = idStr === termRaw; else hit = nameLower.includes(termLower) || idStr === termRaw || (termRaw.length >= minLen && idLower.includes(termLower));
                    if (hit) ids.push(idStr);
                }
                if (n.children) n.children.forEach(scan);
            };
            scan(node);
            return ids;
        }

        function selectNode(nodeId, platform) {
            const node = findNodeById(nodeId, platform);
            if (platform === 'A') {
                state.selectedA = node;
                state.selectedB = null;
                renderTrees();
                renderMappings();
                return;
            }
            if (platform === 'B') {
                if (state.selectedA && node.level > 0) {
                    state.selectedB = node;
                    attemptBind(state.selectedA, node);
                    return;
                }
            }
            renderTrees();
            renderMappings();
        }

        function showMappingHint() {
            const hint = document.getElementById('mappingHint');
            if (hint) hint.innerHTML = '';
        }

        function isLeafNode(node) {
            return node && node.level > 0 && (!node.children || node.children.length === 0);
        }

        function isBUsedByOtherA(bId, aId) {
            return state.mappings.some(m => m.sourceId !== aId && Array.isArray(m.targetIds) && m.targetIds.includes(bId));
        }

        function attemptBind(aNode, bNode) {
            const settings = state.mappingSettings;
            if (settings.leafOnlyA && !isLeafNode(aNode)) { showToast('A平台仅允许叶子节点映射', 'error'); return; }
            if (settings.leafOnlyB && !isLeafNode(bNode)) { showToast('B平台仅允许叶子节点映射', 'error'); return; }
            if ((settings.type === 'ONE_TO_ONE' || settings.type === 'ONE_TO_MANY') && isBUsedByOtherA(bNode.id, aNode.id)) { showToast('该B节点已绑定到其他A节点', 'error'); return; }

            const existing = state.mappings.find(m => m.sourceId === aNode.id);
            const now = Date.now();
            if (!existing) {
                state.mappings.push({ id: 'map-' + now, sourceId: aNode.id, sourceName: aNode.name, targetIds: [bNode.id], targetNames: [bNode.name], targetTimes: [now], createTime: now, updateTime: now, status: 'active', creator: 'admin', updateCount: 0 });
            
                refreshBindingLogsIfOpen();
            } else {
                if (settings.type === 'ONE_TO_ONE' || settings.type === 'MANY_TO_ONE') {
                    existing.targetIds = [bNode.id];
                    existing.targetNames = [bNode.name];
                    existing.targetTimes = [now];
                    existing.updateTime = now;
                    
                    refreshBindingLogsIfOpen();
                } else {
                    if (!existing.targetIds.includes(bNode.id)) {
                        existing.targetIds.push(bNode.id);
                        existing.targetNames.push(bNode.name);
                        if (!Array.isArray(existing.targetTimes)) existing.targetTimes = [];
                        existing.targetTimes.push(now);
                        existing.updateTime = now;
                        
                        refreshBindingLogsIfOpen();
                    }
                }
            }
            renderTrees();
            renderMappings();
            updateStats();
            saveToLocalStorage();
        }

        function createMapping() {
            if (!state.selectedA || !state.selectedB) return;
            attemptBind(state.selectedA, state.selectedB);
            clearSelection();
            renderTrees();
            renderMappings();
            updateStats();
            saveToLocalStorage();
        }

        function clearSelection() {
            state.selectedA = null;
            state.selectedB = null;
            document.getElementById('mappingHint').innerHTML = '';
        }

        function toggleNode(nodeId, platform, event) {
            event.stopPropagation();
            const node = findNodeById(nodeId, platform);
            if (node) {
                node.isExpanded = !node.isExpanded;
                renderTrees();
            }
        }

        function quickMap(nodeId, platform, event) {
            event.stopPropagation();
            selectNode(nodeId, platform);
        }

        function findNodeById(nodeId, platform) {
            const tree = platform === 'A' ? state.platformA : state.platformB;
            return findNodeRecursive(tree, nodeId);
        }

        function findNodeRecursive(node, nodeId) {
            if (node.id === nodeId) return node;
            if (node.children) {
                for (let child of node.children) {
                    const found = findNodeRecursive(child, nodeId);
                    if (found) return found;
                }
            }
            return null;
        }

        function renderMappings() {
            const container = document.getElementById('mappingsList');
            const selectedA = state.selectedA;
            const list = selectedA ? state.mappings.filter(m => m.sourceId === selectedA.id) : [];

            if (!selectedA || list.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon"></div>
                        <div>选择右侧节点绑定</div>
                    </div>
                `;
                return;
            }

            if (selectedA) {
                const items = list
                    .map(m => m.targetIds.map((tid, idx) => ({ id: tid, name: m.targetNames[idx], time: (m.targetTimes && m.targetTimes[idx]) || m.updateTime || 0 })))
                    .flat()
                    .sort((a,b) => b.time - a.time)
                    .map(item => `<div class=\"target-item\">${item.name} <button class=\"btn-small btn-delete\" onclick=\"removeMappingTarget('${selectedA.id}', '${item.id}')\">移除</button></div>`)
                    .join('');
                container.innerHTML = `
                    <div class="mapping-item" style="cursor: default;">
                        <div class="mapping-header" style="display: flex; justify-content: space-between; align-items: center;">
                            <div class="mapping-title">选中节点：${selectedA.name}</div>
                            <button class="btn-small btn-delete" onclick="showRemoveAllConfirm('${selectedA.id}', this)" title="移除该节点的所有绑定">移除全部</button>
                        </div>
                        <div>
                            ${items || '<div class="empty-state" style="padding: 10px;">选择右侧节点绑定</div>'}
                        </div>
                    </div>
                `;
                updateSmartOverlayAnchor();
                return;
            }
        }

        function openSmartOverlay() {
            const overlay = document.getElementById('smartBindOverlay');
            const btn = document.getElementById('smartOverlayBtn');
            if (!overlay || !btn) return;
            const isLight = (state.ui && state.ui.theme) === 'light';
            overlay.style.background = isLight ? '#ffffff' : '#0f172a';
            overlay.style.border = isLight ? '1px solid #e2e8f0' : '1px solid rgba(94, 234, 212, 0.35)';
            const title = document.getElementById('smartOverlayTitle');
            if (title) title.style.color = isLight ? '#0f172a' : '#5eead4';
            const closeBtn = document.getElementById('smartOverlayCloseBtn');
            if (closeBtn) {
                closeBtn.style.color = isLight ? '#334155' : '#5eead4';
                closeBtn.onmouseenter = () => { closeBtn.style.background = isLight ? '#f1f5f9' : 'rgba(94, 234, 212, 0.08)'; };
                closeBtn.onmouseleave = () => { closeBtn.style.background = 'transparent'; };
            }
            renderSmartOverlayRecommendations();
            overlay.style.display = 'flex';
            updateSmartOverlayAnchor();
            adjustSmartOverlayHeight();
            const onDocClick = (e) => {
                const inside = overlay.contains(e.target) || btn.contains(e.target);
                if (!inside) {
                    const t = setTimeout(() => { closeSmartOverlay(); }, 300);
                    overlay.dataset.blurTimer = String(t);
                }
            };
            const onKey = (e) => { if (e.key === 'Escape') closeSmartOverlay(); };
            window.addEventListener('resize', updateSmartOverlayAnchor);
            window.addEventListener('resize', adjustSmartOverlayHeight);
            document.addEventListener('mousedown', onDocClick, { once: true });
            document.addEventListener('keydown', onKey, { once: true });
            overlay.dataset.onceHandlers = 'true';
            requestAnimationFrame(() => {
                overlay.style.opacity = '1';
                overlay.style.transform = 'translateY(0)';
            });
        }

        function closeSmartOverlay() {
            const overlay = document.getElementById('smartBindOverlay');
            if (!overlay) return;
            overlay.style.opacity = '0';
            overlay.style.transform = 'translateY(-8px)';
            setTimeout(() => { overlay.style.display = 'none'; window.removeEventListener('resize', updateSmartOverlayAnchor); window.removeEventListener('resize', adjustSmartOverlayHeight); const s = overlay.dataset.blurTimer; if (s) try { clearTimeout(Number(s)); } catch(e) {} }, 200);
        }

        function adjustSmartOverlayHeight() {
            const overlay = document.getElementById('smartBindOverlay');
            if (!overlay) return;
            const footer = document.querySelector('.footer');
            const rect = overlay.getBoundingClientRect();
            const footerH = footer ? footer.getBoundingClientRect().height : 0;
            const safe = 12;
            const available = Math.max(240, Math.floor(window.innerHeight - footerH - rect.top - safe));
            overlay.style.maxHeight = `${available}px`;
            const body = document.getElementById('smartBindOverlayBody');
            if (body) {
                const header1 = overlay.children[0] ? overlay.children[0].getBoundingClientRect().height : 0;
                const header2 = overlay.children[1] ? overlay.children[1].getBoundingClientRect().height : 0;
                const footerEl = document.getElementById('smartOverlayFooter');
                const footerH2 = footerEl ? footerEl.getBoundingClientRect().height : 0;
                const bodyMax = Math.max(120, available - header1 - header2 - footerH2);
                body.style.maxHeight = `${bodyMax}px`;
            }
        }

        function updateSmartOverlayAnchor() {
            const overlay = document.getElementById('smartBindOverlay');
            const anchor = document.getElementById('smartOverlayAnchor');
            const btn = document.getElementById('smartOverlayBtn');
            if (!overlay || !anchor || !btn) return;
            const btnRect = btn.getBoundingClientRect();
            const overlayRect = overlay.getBoundingClientRect();
            const center = btnRect.left + btnRect.width / 2 - overlayRect.left;
            anchor.style.left = `${center}px`;
        }

        function renderSmartOverlayRecommendations() {
            const body = document.getElementById('smartBindOverlayBody');
            if (!body) return;
            const a = state.selectedA;
            if (!a || !state.platformB) { body.innerHTML = '<div class="empty-state" style="padding:8px;">无可用推荐</div>'; return; }
            const allB = getAllNodes(state.platformB);
            const recs = allB.map(b => {
                const s = calculateSimilarity(a.name, b.name);
                const mapped = state.mappings.some(m => m.sourceId === a.id && Array.isArray(m.targetIds) && m.targetIds.includes(b.id));
                return { b, s, mapped };
            }).sort((x,y)=> y.s - x.s).slice(0, 10);
            const summary = document.getElementById('smartOverlaySummary');
            if (summary) summary.textContent = `推荐结果 ${recs.length}项`;
            if (recs.length === 0) { body.innerHTML = '<div class="empty-state" style="padding:8px;">未找到推荐项</div>'; return; }
            const isLight = (state.ui && state.ui.theme) === 'light';
            const simColor = isLight ? '#0ea5e9' : '#5eead4';
            const listHtml = recs.map(r => `
                <div style="display:flex; align-items:center; justify-content:space-between; padding:6px; border-bottom:1px dashed rgba(94,234,212,0.15);">
                    <div>
                        <strong>${r.b.name}</strong>
                        <span style="color:${simColor}; margin-left:8px; font-size:12px;">${r.s}%</span>
                    </div>
                    <input type="checkbox" class="smart-overlay-checkbox" data-target="${r.b.id}" ${r.mapped ? 'checked disabled' : ''} onchange="updateSmartOverlaySelectAllState(); updateSmartOverlaySelectedCount();" style="width: 16px; height: 16px;">
                </div>
            `).join('');
            body.innerHTML = `<div id="smartOverlayList">${listHtml}</div>`;
            const countEl = document.getElementById('smartOverlaySelectedCount');
            if (countEl) countEl.style.color = isLight ? '#0ea5e9' : '#5eead4';
            updateSmartOverlaySelectAllState();
            updateSmartOverlaySelectedCount();
        }

        function toggleSmartOverlaySelectAll() {
            const btn = document.getElementById('smartOverlaySelectAllBtn');
            const checked = btn && btn.textContent === '全选';
            const boxes = document.querySelectorAll('#smartBindOverlay .smart-overlay-checkbox:not(:disabled)');
            boxes.forEach(b => { b.checked = checked; });
            if (btn) btn.textContent = checked ? '取消全选' : '全选';
            updateSmartOverlaySelectedCount();
        }

        function updateSmartOverlaySelectAllState() {
            const btn = document.getElementById('smartOverlaySelectAllBtn');
            const boxes = document.querySelectorAll('#smartBindOverlay .smart-overlay-checkbox:not(:disabled)');
            if (!btn) return;
            const allChecked = Array.from(boxes).length > 0 && Array.from(boxes).every(b => b.checked);
            btn.textContent = allChecked ? '取消全选' : '全选';
        }

        function updateSmartOverlaySelectedCount() {
            const countEl = document.getElementById('smartOverlaySelectedCount');
            if (!countEl) return;
            const boxes = document.querySelectorAll('#smartBindOverlay .smart-overlay-checkbox:checked');
            countEl.textContent = `已选${boxes.length}项`;
        }

        function applySmartOverlaySelected() {
            const a = state.selectedA;
            if (!a) { showToast('请先选择A平台节点', 'error'); return; }
            const boxes = document.querySelectorAll('#smartBindOverlay .smart-overlay-checkbox:checked');
            let applied = 0;
            boxes.forEach(bx => {
                const bId = bx.getAttribute('data-target');
                const bNode = getNodeById(state.platformB, bId);
                if (bNode) { attemptBind(a, bNode); applied++; }
            });
            if (applied > 0) { showToast(`已绑定 ${applied} 个推荐节点`, 'success'); renderSmartOverlayRecommendations(); }
            else { showToast('没有选中的推荐节点', 'error'); }
        }
        function isNodeBoundToSelectedA(bNodeId) {
            if (!state.selectedA) return false;
            return state.mappings.some(m => m.sourceId === state.selectedA.id && Array.isArray(m.targetIds) && m.targetIds.includes(bNodeId));
        }

        function deleteMapping(mappingId) {
            if (confirm('确定删除此映射关系吗？')) {
                const mapping = state.mappings.find(m => m.id === mappingId);
                state.mappings = state.mappings.filter(m => m.id !== mappingId);
                renderTrees();
                renderMappings();
                updateStats();
                saveToLocalStorage();
                refreshBindingLogsIfOpen();
            }
        }
        function removeAllMappingsForSource(sourceId) {
            const mappingsToRemove = state.mappings.filter(m => m.sourceId === sourceId);
            if (mappingsToRemove.length === 0) return;
            
            // 获取第一个映射的sourceName用于历史记录
            const sourceName = mappingsToRemove[0].sourceName;
            const targetNames = mappingsToRemove.flatMap(m => m.targetNames).join(', ');
            
            // 移除所有相关映射
            state.mappings = state.mappings.filter(m => m.sourceId !== sourceId);
            
            
            renderTrees();
            renderMappings();
            updateStats();
            saveToLocalStorage();
            showNotification('已移除该节点的所有绑定关系', 'success');
            refreshBindingLogsIfOpen();
        }
        function showRemoveAllConfirm(sourceId, btn) {
            const existing = document.querySelector('.confirm-popover');
            if (existing) existing.remove();
            const pop = document.createElement('div');
            pop.className = 'confirm-popover';
            pop.style.position = 'fixed';
            const isLight = (state.ui && state.ui.theme) === 'light';
            pop.style.background = isLight ? '#FFFFFF' : '#0F1826';
            pop.style.border = isLight ? '1px solid #e2e8f0' : '1px solid #3A5364';
            pop.style.boxShadow = isLight ? '0 8px 24px rgba(15,23,42,0.12)' : '0 8px 24px rgba(0,0,0,0.4)';
            pop.style.borderRadius = '14px';
            pop.style.padding = '16px';
            pop.style.zIndex = '3000';
            pop.style.minWidth = '220px';
            pop.style.animation = 'fadeIn 0.18s ease';
            pop.innerHTML = `
                <div style="font-size:13px; color:${isLight ? '#334155' : '#e2e8f0'}; margin-bottom:8px;">确认移除该节点的所有绑定？</div>
                <div style="display:flex; gap:8px; justify-content:flex-end;">
                    <button class="btn-small" onclick="this.closest('.confirm-popover').remove()">取消</button>
                    <button class="btn-small btn-delete" onclick="confirmRemoveAllNow('${sourceId}')">确认</button>
                </div>
            `;
            document.body.appendChild(pop);
            const rect = btn.getBoundingClientRect();
            const vw = window.innerWidth; const vh = window.innerHeight; const pad = 6;
            let left = rect.left;
            let top = rect.bottom + 8;
            const width = Math.max(pop.offsetWidth, 220);
            const height = Math.max(pop.offsetHeight, 60);
            if (left + width > vw - pad) left = Math.max(pad, vw - width - pad);
            if (top + height > vh - pad) top = Math.max(pad, rect.top - height - pad);
            pop.style.left = left + 'px';
            pop.style.top = top + 'px';
            const remove = (e) => { if (!pop.contains(e.target)) { pop.remove(); document.removeEventListener('click', remove, true); } };
            setTimeout(() => document.addEventListener('click', remove, true), 0);
            pop.addEventListener('click', (e) => e.stopPropagation());
        }
        function confirmRemoveAllNow(sourceId) {
            const pop = document.querySelector('.confirm-popover');
            if (pop) pop.remove();
            removeAllMappingsForSource(sourceId);
        }
        function showUndoConfirm(logId, btn) {
            const existing = document.querySelector('.confirm-popover');
            if (existing) existing.remove();
            const pop = document.createElement('div');
            pop.className = 'confirm-popover';
            pop.style.position = 'fixed';
            const isLight = (state.ui && state.ui.theme) === 'light';
            pop.style.background = isLight ? '#FFFFFF' : '#0F1826';
            pop.style.border = isLight ? '1px solid #e2e8f0' : '1px solid #3A5364';
            pop.style.boxShadow = isLight ? '0 8px 24px rgba(15,23,42,0.12)' : '0 8px 24px rgba(0,0,0,0.4)';
            pop.style.borderRadius = '14px';
            pop.style.padding = '16px';
            pop.style.zIndex = '3000';
            pop.style.minWidth = '220px';
            pop.style.animation = 'fadeIn 0.18s ease';
            pop.innerHTML = `
                <div style="font-size:13px; color:${isLight ? '#334155' : '#e2e8f0'}; margin-bottom:8px;">确认撤回该绑定记录吗？</div>
                <div style="display:flex; gap:8px; justify-content:flex-end;">
                    <button class="btn-small" onclick="this.closest('.confirm-popover').remove()">取消</button>
                    <button class="btn-small btn-delete" onclick="confirmUndoNow('${logId}')">确认</button>
                </div>
            `;
            document.body.appendChild(pop);
            const rect = btn.getBoundingClientRect();
            const vw = window.innerWidth; const vh = window.innerHeight; const pad = 6;
            const width = Math.max(pop.offsetWidth, 220);
            const height = Math.max(pop.offsetHeight, 60);
            let left = rect.left;
            let top = rect.top - height - 8;
            if (left + width > vw - pad) left = Math.max(pad, vw - width - pad);
            if (top < pad) top = rect.bottom + 8;
            pop.style.left = left + 'px';
            pop.style.top = top + 'px';
            const remove = (e) => { if (!pop.contains(e.target)) { pop.remove(); document.removeEventListener('click', remove, true); } };
            setTimeout(() => document.addEventListener('click', remove, true), 0);
            pop.addEventListener('click', (e) => e.stopPropagation());
        }
        function confirmUndoNow(logId) {
            const pop = document.querySelector('.confirm-popover');
            if (pop) pop.remove();
            undoBindingLog(logId);
        }
        function removeMappingTarget(sourceId, targetId) {
            const mapping = state.mappings.find(m => m.sourceId === sourceId && m.targetIds.includes(targetId));
            if (!mapping) return;
            const idx = mapping.targetIds.indexOf(targetId);
            if (idx >= 0) {
                mapping.targetIds.splice(idx, 1);
                const removedName = mapping.targetNames.splice(idx, 1)[0];
                if (Array.isArray(mapping.targetTimes)) mapping.targetTimes.splice(idx, 1);
                mapping.updateTime = Date.now();
                mapping.updateCount = (mapping.updateCount || 0) + 1;
            
                refreshBindingLogsIfOpen();
            }
            if (mapping.targetIds.length === 0) {
                state.mappings = state.mappings.filter(m => m !== mapping);
            }
            renderTrees();
            renderMappings();
            updateStats();
            saveToLocalStorage();
        }
        function showBindingsForB(nodeId, event) {
            const names = [];
            state.mappings.forEach(m => {
                if (Array.isArray(m.targetIds) && m.targetIds.includes(nodeId)) {
                    names.push(m.sourceName);
                }
            });
            const existing = document.querySelector('.bindings-popover');
            if (existing) existing.remove();
            const pop = document.createElement('div');
            pop.className = 'bindings-popover';
            pop.style.animation = 'fadeIn 0.18s ease';
            pop.innerHTML = names.length > 0 ? names.map(n => `<div style="padding:4px 6px; font-size:13px;">${n}</div>`).join('') : '<div style="padding:4px 6px; font-size:13px; color:#94a3b8;">无绑定</div>';
            document.body.appendChild(pop);
            const rect = event.target.getBoundingClientRect();
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            const pad = 4;
            // Initial position below the badge
            let left = rect.left;
            let top = rect.bottom + pad;
            // Measure and clamp within viewport
            const width = Math.max(pop.offsetWidth, 180);
            const height = Math.min(pop.offsetHeight, 140);
            if (left + width > vw - pad) left = Math.max(pad, vw - width - pad);
            if (top + height > vh - pad) top = Math.max(pad, rect.top - height - pad);
            pop.style.left = `${left}px`;
            pop.style.top = `${top}px`;
            const remove = () => { pop.remove(); document.removeEventListener('click', remove); };
            setTimeout(() => document.addEventListener('click', remove), 0);
            pop.addEventListener('click', (e) => e.stopPropagation());
            event.stopPropagation();
        }

        function editMapping(mappingId) {
            const mapping = state.mappings.find(m => m.id === mappingId);
            if (!mapping) return;
            state.editingMappingId = mappingId;
            const form = document.getElementById('mappingEditForm');
            form.innerHTML = `
                <div style="margin-bottom:8px; color:#5eead4;">源节点：${mapping.sourceName}</div>
                ${mapping.targetNames.map((name, idx) => `
                    <div style='display:flex; gap:8px; align-items:center;'>
                        <input type='text' value='${name}' data-idx='${idx}' style='flex:1; padding:8px; border-radius:6px; border:1px solid rgba(94,234,212,0.2); background: rgba(15,23,42,0.4); color:#e2e8f0;'>
                        <button class='btn-small btn-delete' onclick='removeEditTarget(${idx}); return false;'>移除</button>
                    </div>
                `).join('')}
                <div style='margin-top:8px;'>
                    <input id='newEditTarget' type='text' placeholder='新增目标名称' style='width:70%; padding:8px; border-radius:6px; border:1px solid rgba(94,234,212,0.2); background: rgba(15,23,42,0.4); color:#e2e8f0;'>
                    <button class='btn-small btn-edit' onclick='addEditTarget(); return false;'>添加</button>
                </div>
            `;
            document.getElementById('mappingEditModal').style.display = 'block';
        }
        function removeEditTarget(idx) {
            const mapping = state.mappings.find(m => m.id === state.editingMappingId);
            if (!mapping) return;
            mapping.targetNames.splice(idx, 1);
            document.querySelector(`#mappingEditForm button[onclick="removeEditTarget(${idx}); return false;"]`).parentElement.remove();
        }
        function addEditTarget() {
            const val = document.getElementById('newEditTarget').value.trim();
            if (!val) return;
            const mapping = state.mappings.find(m => m.id === state.editingMappingId);
            if (!mapping) return;
            mapping.targetNames.push(val);
            editMapping(state.editingMappingId);
        }
        function applyMappingEdit() {
            const mapping = state.mappings.find(m => m.id === state.editingMappingId);
            if (!mapping) return;
            const inputs = document.querySelectorAll('#mappingEditForm input[type="text"][data-idx]');
            mapping.targetNames = Array.from(inputs).map(i => i.value.trim()).filter(Boolean);
            mapping.updateTime = Date.now();
            mapping.updateCount = (mapping.updateCount || 0) + 1;
            
            renderMappings();
            saveToLocalStorage();
            closeMappingEditModal();
        }
        function closeMappingEditModal() { document.getElementById('mappingEditModal').style.display = 'none'; state.editingMappingId = null; }

        function updateStats() {
            if (!state.platformA || !state.platformB) return;

            const totalA = countMappableNodes(state.platformA, state.mappingSettings.leafOnlyA);
            const totalB = countMappableNodes(state.platformB, state.mappingSettings.leafOnlyB);

            const mappableAIds = getMappableIds(state.platformA, state.mappingSettings.leafOnlyA);
            const mappableBIds = getMappableIds(state.platformB, state.mappingSettings.leafOnlyB);

            const mappedASourceIds = new Set(state.mappings.map(m => m.sourceId));
            const mappedBTargetIds = new Set(state.mappings.flatMap(m => Array.isArray(m.targetIds) ? m.targetIds : []));

            const mappedA = mappableAIds.filter(id => mappedASourceIds.has(id)).length;
            const mappedB = mappableBIds.filter(id => mappedBTargetIds.has(id)).length;

            const statsAEl = document.getElementById('statsA');
            const statsBEl = document.getElementById('statsB');
            const aText = `${mappedA}/${totalA}`;
            const bText = `${mappedB}/${totalB}`;
            if (statsAEl && statsAEl.textContent !== aText) statsAEl.textContent = aText;
            if (statsBEl && statsBEl.textContent !== bText) statsBEl.textContent = bText;
            document.getElementById('totalMappings').textContent = `${state.mappings.length} 条`;
            const covAEl = document.getElementById('coverageA');
            const covBEl = document.getElementById('coverageB');
            const covAText = `${totalA > 0 ? Math.round((mappedA / totalA) * 100) : 0}%`;
            const covBText = `${totalB > 0 ? Math.round((mappedB / totalB) * 100) : 0}%`;
            if (covAEl && covAEl.textContent !== covAText) covAEl.textContent = covAText;
            if (covBEl && covBEl.textContent !== covBText) covBEl.textContent = covBText;
            const covALabel = document.getElementById('coverageALabel');
            const covBLabel = document.getElementById('coverageBLabel');
            if (covALabel) covALabel.textContent = `${state.ui.platformNameA}覆盖率:`;
            if (covBLabel) covBLabel.textContent = `${state.ui.platformNameB}覆盖率:`;

            const lastUpdate = state.mappings.length > 0 ? Math.max(...state.mappings.map(m => m.updateTime)) : null;
            document.getElementById('lastUpdate').textContent = lastUpdate ? new Date(lastUpdate).toLocaleString() : '-';
            updateSmartMappingStatsInternal(totalA, mappedA, totalB, mappedB);
        }

        function updateSmartMappingStatsInternal(totalA, mappedA, totalB, mappedB) {
            const el = document.getElementById('smartMappingStats');
            if (!el) return;
            const remainA = Math.max(0, totalA - mappedA);
            const remainB = Math.max(0, totalB - mappedB);
            const nameA = (state.ui && state.ui.platformNameA) || '平台A';
            const nameB = (state.ui && state.ui.platformNameB) || '平台B';
            el.textContent = `${nameA}总:${totalA} 已映射:${mappedA} 未映射:${remainA}  |  ${nameB}总:${totalB} 已映射:${mappedB} 未映射:${remainB}`;
        }

        function countNodes(node) {
            if (!node.children || node.children.length === 0) return 0;
            let count = node.children.length;
            node.children.forEach(child => {
                count += countNodes(child);
            });
            return count;
        }

        function countMappedNodes(node, platform) {
            if (!node.children || node.children.length === 0) return 0;
            let count = 0;
            node.children.forEach(child => {
                if (state.mappings.some(m => m.sourceId === child.id || m.targetIds.includes(child.id))) {
                    count++;
                }
                count += countMappedNodes(child, platform);
            });
            return count;
        }

        function exportMappings() {
            if (state.mappings.length === 0) {
                alert('没有映射关系可导出！');
                return;
            }

            const exportData = {
                exportTime: new Date().toISOString(),
                mappingCount: state.mappings.length,
                platformA: state.platformA ? { name: state.platformA.name, nodeCount: countNodes(state.platformA) } : null,
                platformB: state.platformB ? { name: state.platformB.name, nodeCount: countNodes(state.platformB) } : null,
                mappings: state.mappings,
                templates: state.templates
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${state.ui.platformNameA}_${state.ui.platformNameB}关系映射 ${formatDateYMD(new Date())}.json`;
            a.click();
            URL.revokeObjectURL(url);
        }

        function showExportOptions(btn) {
            const existing = document.querySelector('.confirm-popover');
            if (existing) existing.remove();
            const pop = document.createElement('div');
            pop.className = 'confirm-popover';
            pop.style.position = 'fixed';
            const isLight = (state.ui && state.ui.theme) === 'light';
            pop.style.background = isLight ? '#FFFFFF' : '#0F1826';
            pop.style.border = isLight ? '1px solid #e2e8f0' : '1px solid #3A5364';
            pop.style.boxShadow = isLight ? '0 8px 24px rgba(15,23,42,0.12)' : '0 8px 24px rgba(0,0,0,0.4)';
            pop.style.borderRadius = '14px';
            pop.style.padding = '16px';
            pop.style.zIndex = '3000';
            pop.style.minWidth = '220px';
            pop.style.animation = 'fadeIn 0.18s ease';
            state.exportFormat = 'json';
            state.exportLoading = false;
            pop.innerHTML = `
                <div style="font-size:16px; color:${isLight ? '#0f172a' : '#FFFFFF'}; margin-bottom:12px; font-weight:600;">选择导出格式</div>
                <div id="exportOptions" style="display:flex; gap:12px; justify-content:center; align-items:center; margin-bottom:16px;">
                    <button id="opt-json" class="btn-small" onclick="setExportFormat('json', this)" style="min-width:80px; text-align:center; padding:8px 16px; border-radius:10px; background:linear-gradient(135deg, #4F8EEA, #6AA5F5); color:#FFFFFF; font-weight:600; border:none; box-shadow:0 2px 4px rgba(79, 142, 234, 0.3);">JSON格式</button>
                    <button id="opt-csv" class="btn-small btn-secondary" onclick="setExportFormat('csv', this)" style="min-width:80px; text-align:center; padding:8px 16px; border-radius:10px; background:#8C9CB2; color:#FFFFFF; font-weight:600; border:none;">CSV格式</button>
                </div>
                <div style="display:flex; gap:8px; justify-content:flex-end;">
                    <button id="export-cancel" class="btn-small" onclick="this.closest('.confirm-popover').remove()" style="border-radius:8px; background:#FFFFFF; color:#1E262E; padding:6px 16px; font-weight:600; box-shadow:0 1px 3px rgba(0,0,0,0.1);">取消</button>
                    <button id="export-confirm" class="btn-small btn-delete" onclick="confirmExport()" style="border-radius:8px; background:#E64A43; color:#FFFFFF; padding:6px 16px; font-weight:600; box-shadow:0 1px 3px rgba(230, 74, 67, 0.3);">确定</button>
                </div>
            `;
            document.body.appendChild(pop);
            const rect = btn.getBoundingClientRect();
            const vw = window.innerWidth; const vh = window.innerHeight; const pad = 6;
            const width = Math.max(pop.offsetWidth, 220);
            const height = Math.max(pop.offsetHeight, 60);
            let left = rect.left;
            let top = rect.bottom + 8;
            if (left + width > vw - pad) left = Math.max(pad, vw - width - pad);
            if (top + height > vh - pad) top = Math.max(pad, rect.top - height - pad);
            pop.style.left = left + 'px';
            pop.style.top = top + 'px';
            const remove = (e) => { if (!pop.contains(e.target)) { pop.remove(); document.removeEventListener('click', remove, true); } };
            setTimeout(() => document.addEventListener('click', remove, true), 0);
            pop.addEventListener('click', (e) => e.stopPropagation());
            updateExportOptionsUI();
        }

        function setExportFormat(fmt, el) {
            state.exportFormat = fmt === 'csv' ? 'csv' : 'json';
            updateExportOptionsUI();
        }

        function updateExportOptionsUI() {
            const jsonBtn = document.getElementById('opt-json');
            const csvBtn = document.getElementById('opt-csv');
            const confirmBtn = document.getElementById('export-confirm');
            const cancelBtn = document.getElementById('export-cancel');
            if (!jsonBtn || !csvBtn || !confirmBtn || !cancelBtn) return;
            const jsonActive = state.exportFormat === 'json';
            
            // JSON按钮样式
            if (jsonActive) {
                jsonBtn.style.background = 'linear-gradient(135deg, #4F8EEA, #6AA5F5)';
                jsonBtn.style.boxShadow = '0 2px 4px rgba(79, 142, 234, 0.3)';
                jsonBtn.style.color = '#FFFFFF';
            } else {
                jsonBtn.style.background = '#8C9CB2';
                jsonBtn.style.boxShadow = 'none';
                jsonBtn.style.color = '#FFFFFF';
            }
            
            // CSV按钮样式
            if (!jsonActive) {
                csvBtn.style.background = 'linear-gradient(135deg, #4F8EEA, #6AA5F5)';
                csvBtn.style.boxShadow = '0 2px 4px rgba(79, 142, 234, 0.3)';
                csvBtn.style.color = '#FFFFFF';
            } else {
                csvBtn.style.background = '#8C9CB2';
                csvBtn.style.boxShadow = 'none';
                csvBtn.style.color = '#FFFFFF';
            }
            jsonBtn.style.textAlign = 'center';
            csvBtn.style.textAlign = 'center';
            jsonBtn.style.padding = '8px 16px';
            csvBtn.style.padding = '8px 16px';
            jsonBtn.style.borderRadius = '10px';
            csvBtn.style.borderRadius = '10px';
            jsonBtn.style.fontWeight = '600';
            csvBtn.style.fontWeight = '600';
            jsonBtn.style.minWidth = '80px';
            csvBtn.style.minWidth = '80px';
            [jsonBtn, csvBtn, confirmBtn, cancelBtn].forEach(b => { b.disabled = state.exportLoading; });
            confirmBtn.textContent = state.exportLoading ? '导出中...' : '确定';
        }

        

        function confirmExport() {
            if (state.exportLoading) return;
            const pop = document.querySelector('.confirm-popover');
            const fmt = state.exportFormat || 'json';
            if (!state.mappings || state.mappings.length === 0) { alert('没有映射关系可导出！'); return; }
            state.exportLoading = true; updateExportOptionsUI();
            try {
                if (fmt === 'csv') exportMappingsCSV(); else exportMappingsJSON();
            } finally {
                state.exportLoading = false; updateExportOptionsUI();
                if (pop) pop.remove();
            }
        }

        function exportMappingsJSON() {
            exportMappings();
        }

        function exportMappingsCSV() {
            if (state.mappings.length === 0) { alert('没有映射关系可导出！'); return; }
            const rows = [];
            rows.push(['sourceId','sourceName','targetId','targetName'].join(','));
            state.mappings.forEach(m => {
                (m.targetIds || []).forEach((tid, idx) => {
                    const tname = (m.targetNames || [])[idx] || '';
                    rows.push([escapeCSV(m.sourceId), escapeCSV(m.sourceName), escapeCSV(tid), escapeCSV(tname)].join(','));
                });
            });
            const csv = rows.join('\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${state.ui.platformNameA}_${state.ui.platformNameB}关系映射 ${formatDateYMD(new Date())}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        }

        function escapeCSV(v) {
            const s = String(v == null ? '' : v);
            if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
            return s;
        }

        function formatDateYMD(d) {
            const y = d.getFullYear();
            const m = String(d.getMonth()+1).padStart(2,'0');
            const day = String(d.getDate()).padStart(2,'0');
            return `${y}-${m}-${day}`;
        }

        function showClearAllConfirm(btn) {
            const existing = document.querySelector('.confirm-popover');
            if (existing) existing.remove();
            const pop = document.createElement('div');
            pop.className = 'confirm-popover';
            pop.style.position = 'fixed';
            const isLight = (state.ui && state.ui.theme) === 'light';
            pop.style.background = isLight ? '#FFFFFF' : '#0F1826';
            pop.style.border = isLight ? '1px solid #e2e8f0' : '1px solid #3A5364';
            pop.style.boxShadow = isLight ? '0 8px 24px rgba(15,23,42,0.12)' : '0 8px 24px rgba(0,0,0,0.4)';
            pop.style.borderRadius = '14px';
            pop.style.padding = '16px';
            const rect = btn.getBoundingClientRect();
            let left = rect.left - 30; if (left < 8) left = 8; pop.style.left = `${left}px`;
            pop.style.top = `${rect.bottom + 6}px`;
            pop.style.zIndex = '3000';
            pop.innerHTML = `
                <div style='font-size:13px; color:${isLight ? '#334155' : '#e2e8f0'}; margin-bottom:8px;'>确认清空所有数据和绑定关系？此操作不可恢复。</div>
                <div style='display:flex; gap:8px; justify-content:flex-end;'>
                    <button class='btn-small' onclick="this.closest('.confirm-popover').remove()">取消</button>
                    <button class='btn-small btn-danger' onclick='clearAllNow()'>确认清空</button>
                </div>
            `;
            document.body.appendChild(pop);
            const removeByOutside = (e) => { if (!pop.contains(e.target)) { try { pop.remove(); } catch(_){} document.removeEventListener('mousedown', removeByOutside, true); document.removeEventListener('focusin', removeByFocus, true); } };
            const removeByFocus = (e) => { if (!pop.contains(e.target)) { try { pop.remove(); } catch(_){} document.removeEventListener('focusin', removeByFocus, true); document.removeEventListener('mousedown', removeByOutside, true); } };
            setTimeout(() => { document.addEventListener('mousedown', removeByOutside, true); document.addEventListener('focusin', removeByFocus, true); }, 0);
            pop.addEventListener('click', (e) => e.stopPropagation());
        }
        function clearAllNow() {
            const savedTheme = (state.ui && state.ui.theme) || (() => { try { const d = JSON.parse(localStorage.getItem('knowledgeMappingState')||'{}'); return (d.ui && d.ui.theme) || 'dark'; } catch(_) { return 'dark'; } })();
            state.platformA = null;
            state.platformB = null;
            state.mappings = [];
            state.selectedA = null;
            state.selectedB = null;
            state.history = [];
            state.historyIndex = -1;
            state.ui = state.ui || {};
            state.ui.theme = savedTheme;
            document.getElementById('treeA').innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon"></div>
                        <div id="emptyA">请导入平台 A 数据</div>
                    </div>
                `;
            document.getElementById('treeB').innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon"></div>
                        <div id="emptyB">请导入平台 B 数据</div>
                    </div>
                `;
                
            renderMappings();
            updateStats();
            saveToLocalStorage();
            applyTheme(savedTheme);
            const pop = document.querySelector('.confirm-popover'); if (pop) pop.remove();
            showToast('已清空全部数据', 'success');
        }
        function initTitles() {
            document.title = state.ui.systemTitle;
            const sysText = document.getElementById('systemTitleText');
            if (sysText) sysText.textContent = state.ui.systemTitle;
            const aText = document.getElementById('platformTitleAText');
            if (aText) aText.textContent = state.ui.platformNameA;
            const bText = document.getElementById('platformTitleBText');
            if (bText) bText.textContent = state.ui.platformNameB;
            const emptyA = document.getElementById('emptyA');
            if (emptyA) emptyA.textContent = '请导入平台 A 数据';
            const emptyB = document.getElementById('emptyB');
            if (emptyB) emptyB.textContent = '请导入平台 B 数据';
        }
        function startEditTitle(type) {
            let container, current;
            if (type === 'system') { container = document.getElementById('systemTitleDisplay'); current = state.ui.systemTitle; }
            else if (type === 'A') { container = document.querySelector('.panel-title .edit-icon').closest('.panel-title'); current = state.ui.platformNameA; }
            else if (type === 'B') { container = document.querySelectorAll('.panel-title .edit-icon')[1].closest('.panel-title'); current = state.ui.platformNameB; }
            if (!container) return;
            const input = document.createElement('input');
            input.className = 'title-input';
            input.maxLength = 30;
            input.value = current;
            const btn = document.createElement('button');
            btn.className = 'btn-primary btn-small';
            btn.textContent = '保存';
            const err = document.createElement('div');
            err.style.fontSize = '12px';
            err.style.color = '#f87171';
            err.style.marginTop = '4px';
            const old = container.innerHTML;
            container.innerHTML = '';
            container.appendChild(input);
            container.appendChild(btn);
            container.appendChild(err);
            input.focus();
            const save = () => {
                const val = input.value.trim();
                if (!val) { err.textContent = '标题不能为空'; input.focus(); return false; }
                if (val.length > 30) { err.textContent = '最多30个字符'; input.focus(); return false; }
                if (type === 'system') { state.ui.systemTitle = val; }
                if (type === 'A') { state.ui.platformNameA = val; if (state.platformA) state.platformA.name = val; }
                if (type === 'B') { state.ui.platformNameB = val; if (state.platformB) state.platformB.name = val; }
                container.innerHTML = old;
                initTitles();
                renderTrees();
                updateStats();
                saveToLocalStorage();
                showToast('保存成功', 'success');
                emit('title-changed', { ui: state.ui });
                return true;
            };
            btn.onclick = save;
            input.onkeydown = (e) => { if (e.key === 'Enter') save(); };
            input.onblur = () => { try { save(); } catch (e) {} };
        }

        // ===== 新增功能：本地存储 =====
        function saveToLocalStorage() {
            try {
                const data = {
                    platformA: state.platformA,
                    platformB: state.platformB,
                    mappings: state.mappings,
                    timestamp: Date.now(),
                    version: '2.0',
                    ui: state.ui,
                    history: state.history,
                    historyIndex: state.historyIndex,
                    historyMinimized: state.historyMinimized,
                    historyUnread: state.historyUnread,
                    mappingSettings: state.mappingSettings
                };
                localStorage.setItem('knowledgeMappingState', JSON.stringify(data));
                console.log('已自动保存到本地存储');
            } catch (error) {
                console.error('本地存储失败:', error);
            }
        }

        function loadFromLocalStorage() {
            try {
                const saved = localStorage.getItem('knowledgeMappingState');
                if (saved) {
                    const data = JSON.parse(saved);
                    state.platformA = data.platformA;
                    state.platformB = data.platformB;
                    if (state.platformA) expandAll(state.platformA);
                    if (state.platformB) expandAll(state.platformB);
                    state.mappings = data.mappings || [];
                    if (data.ui) state.ui = data.ui;
                    state.history = data.history || [];
                    state.historyIndex = typeof data.historyIndex === 'number' ? data.historyIndex : -1;
                    state.historyMinimized = !!data.historyMinimized;
                    state.historyUnread = data.historyUnread || 0;
                    if (data.mappingSettings) state.mappingSettings = data.mappingSettings;
                    console.log('已从本地存储恢复数据');
                    
                    renderTrees();
                    renderMappings();
                    updateStats();
                    initTitles();
                    
                    // 显示恢复提示
                    const lastSaved = new Date(data.timestamp).toLocaleString();
                    showNotification(`已自动恢复上次的数据（${lastSaved}）`, 'success');
                }
            } catch (error) {
                console.error('加载本地存储失败:', error);
                localStorage.removeItem('knowledgeMappingState');
            }
        }

        // ===== 新增功能：操作历史 =====
        function addToHistory() { }

        function refreshBindingLogsIfOpen() {
            const modal = document.getElementById('bindingLogsModal');
            if (modal && modal.style.display === 'block') {
                loadBindingLogsPage(1);
            }
        }

        function undo() { }

        function redo() { }

        function updateHistoryPanel() { }
        function openHistoryModal() { }
        function closeHistoryModal() { }
        function renderHistoryModal() { }

        // ===== 绑定记录：分页 + 撤回 =====
        const makeBindingLogKey = (log) => `${log.time}|${log.sourceName}|${(log.targetName || ((log.targetNames||[]).join(',')))}|${log.action||''}`;
        const api = {
            fetchBindingLogs: (page, size) => new Promise((resolve) => {
                const rows = [];
                (state.mappings || []).forEach(m => {
                    const times = Array.isArray(m.targetTimes) ? m.targetTimes : [];
                    (m.targetIds || []).forEach((tid, idx) => {
                        const name = (m.targetNames || [])[idx] || '';
                        const t = times[idx] || m.updateTime || m.createTime || Date.now();
                        rows.push({ id: `pair-${m.id}-${tid}`, time: t, sourceName: m.sourceName, targetName: name, action: 'active', status: 'active' });
                    });
                });
                rows.sort((a,b) => b.time - a.time);
                const filtered = rows.filter(item => !state.bindingLogsHiddenKeys.includes(`${item.time}|${item.sourceName}|${item.targetName}|${item.action}`));
                const total = filtered.length;
                const start = (page - 1) * size;
                const items = filtered.slice(start, start + size);
                setTimeout(() => resolve({ items, total }), 80);
            }),
            undoBinding: (log) => new Promise((resolve, reject) => {
                setTimeout(() => {
                    try {
                        const sourceNode = state.platformA ? getAllNodes(state.platformA).find(n => n.name === log.sourceName) : null;
                        if (sourceNode) {
                            const tn = log.targetName;
                            if (!tn) {
                                state.mappings = state.mappings.filter(m => m.sourceId !== sourceNode.id);
                            } else {
                                const targetNode = state.platformB ? getAllNodes(state.platformB).find(n => n.name === tn) : null;
                                if (targetNode) removeMappingTarget(sourceNode.id, targetNode.id);
                            }
                            saveToLocalStorage();
                            renderTrees();
                            renderMappings();
                            updateStats();
                        }
                        resolve(true);
                    } catch (e) { reject(e); }
                }, 300);
            })
        };

        function openBindingLogsModal() {
            state.bindingLogsPage = 1;
            state.bindingLogsUserScrolled = false;
            state.bindingLogsReachedEnd = false;
            const modal = document.getElementById('bindingLogsModal');
            modal.style.display = 'block';
            loadBindingLogsPage(1);
            positionBindingLogsPopover();
            
            // 添加失焦自动隐藏功能
            setTimeout(() => {
                const content = modal.querySelector('.modal-content');
                if (content) {
                    content.focus();
                    content.tabIndex = -1; // 使元素可以获得焦点
                }
            }, 100);
            // 绑定滚动分页加载
            setTimeout(() => {
                const body = document.getElementById('bindingLogsBody');
                if (!body) return;
                if (!state.bindingLogsScrollBound) {
                    state.bindingLogsScrollHandler = () => {
                        const nearBottom = body.scrollTop + body.clientHeight >= body.scrollHeight - 16;
                        const hasMore = state.bindingLogsPage * state.bindingLogsPageSize < state.bindingLogsTotal;
                        if (nearBottom && hasMore && !state.bindingLogsLoading) {
                            loadBindingLogsPage(state.bindingLogsPage + 1);
                        }
                        const atEnd = !hasMore && (state.bindingLogsTotal > 0);
                        if (body.scrollTop > 0) state.bindingLogsUserScrolled = true;
                        if (nearBottom && atEnd) state.bindingLogsReachedEnd = true;
                        updateBindingLogsEndTip();
                    };
                    body.addEventListener('scroll', state.bindingLogsScrollHandler);
                    state.bindingLogsScrollBound = true;
                }
            }, 120);
            // 点击外部自动隐藏（不影响弹窗内部与确认浮层）
            if (!state.bindingLogsDocClickHandler) {
                state.bindingLogsDocClickHandler = (e) => {
                    const content = document.querySelector('#bindingLogsModal .modal-content');
                    const confirm = document.querySelector('.confirm-popover');
                    const isInside = content && content.contains(e.target);
                    const inConfirm = confirm && confirm.contains(e.target);
                    if (!isInside && !inConfirm) closeBindingLogsModal();
                };
                document.addEventListener('mousedown', state.bindingLogsDocClickHandler, true);
            }
        }
        function closeBindingLogsModal() {
            const modal = document.getElementById('bindingLogsModal');
            modal.style.display = 'none';
            const body = document.getElementById('bindingLogsBody');
            if (body && state.bindingLogsScrollBound && state.bindingLogsScrollHandler) {
                body.removeEventListener('scroll', state.bindingLogsScrollHandler);
                state.bindingLogsScrollBound = false;
                state.bindingLogsScrollHandler = null;
            }
            state.bindingLogsReachedEnd = false;
            state.bindingLogsUserScrolled = false;
            if (state.bindingLogsDocClickHandler) {
                document.removeEventListener('mousedown', state.bindingLogsDocClickHandler, true);
                state.bindingLogsDocClickHandler = null;
            }
        }
        function loadBindingLogsPage(page) {
            state.bindingLogsLoading = true; state.bindingLogsError = null;
            api.fetchBindingLogs(page, state.bindingLogsPageSize)
                .then(({items, total}) => {
                    if (page === 1) {
                        state.bindingLogs = items;
                    } else {
                        state.bindingLogs = (state.bindingLogs || []).concat(items);
                    }
                    state.bindingLogsTotal = total; state.bindingLogsPage = page;
                    state.bindingLogsLoading = false;
                    renderBindingLogs();
                    const expected = (() => {
                        let count = 0;
                        (state.mappings || []).forEach(m => { count += (m.targetIds || []).length; });
                        return count;
                    })();
                    if (expected !== state.bindingLogsTotal) {
                        api.fetchBindingLogs(1, state.bindingLogsPageSize).then(({items: it2, total: t2}) => {
                            state.bindingLogs = it2; state.bindingLogsTotal = t2; state.bindingLogsPage = 1; renderBindingLogs();
                        });
                    }
                })
                .catch(err => {
                    state.bindingLogsError = String(err);
                    state.bindingLogsLoading = false;
                    renderBindingLogs();
                });
        }
        function renderBindingLogs() {
            const body = document.getElementById('bindingLogsBody');
            const pag = document.getElementById('bindingLogsPagination');
            if (!body || !pag) return;
            if (state.bindingLogsLoading && (state.bindingLogs || []).length === 0) { body.innerHTML = '<div class="empty-state" style="padding:8px;">加载中...</div>'; pag.innerHTML=''; return; }
            if (state.bindingLogsError) { body.innerHTML = `<div style='display:flex; align-items:center; justify-content:center; height:120px; font-size:14px; color:#999;'>加载失败：${state.bindingLogsError} <button class='btn-small btn-edit' style='margin-left:8px;' onclick='loadBindingLogsPage(${state.bindingLogsPage})'>重试</button></div>`; pag.innerHTML=''; return; }
            if (state.bindingLogs.length === 0) { body.innerHTML = '<div style="display:flex; align-items:center; justify-content:center; height:120px; font-size:14px; color:#999;">暂无绑定记录</div>'; pag.innerHTML=''; return; }
            const isLight = (state.ui && state.ui.theme) === 'light';
            const nameColor = isLight ? '#334155' : '#e2e8f0';
            const tsColor = isLight ? '#64748b' : '#94a3b8';
            body.innerHTML = state.bindingLogs.map(log => {
                const ts = new Date(log.time).toLocaleString();
                const target = log.targetName ? log.targetName : '未记录';
                const loading = state.bindingLogsUndoingId === log.id;
                return `<div class='history-item' style='display:flex; justify-content:space-between; align-items:center; padding:6px 8px; border-radius:8px; margin:4px 0;'>
                    <div>
                        <div style='color:${nameColor};'>${log.sourceName} → ${target}</div>
                        <div style='color:${tsColor};'>${ts}</div>
                    </div>
                    <button class='btn-small ${loading ? '' : 'btn-secondary'}' ${loading ? 'disabled' : ''} onclick='showUndoConfirm("${log.id}", this)'>${loading ? '撤回中...' : '撤回'}</button>
                </div>`;
            }).join('') + "<div id='bindingLogsEndTip' style='display:none; text-align:center; font-size:12px; color:#94a3b8; padding:6px 0;'>已经是最后一条记录</div>";
            const loaded = (state.bindingLogs || []).length;
            const total = state.bindingLogsTotal || 0;
            pag.innerHTML = '';
            pag.style.display = 'none';
            const titleEl = document.querySelector('#bindingLogsModal .modal-title');
            if (titleEl) titleEl.textContent = `绑定记录-共${total}条`;
            updateBindingLogsEndTip();
            positionBindingLogsPopover();
        }
        function updateBindingLogsEndTip() {
            const tip = document.getElementById('bindingLogsEndTip');
            if (!tip) return;
            // 延后一帧，避免因重绘引起的高度变化造成计算抖动
            requestAnimationFrame(() => {
                const body = document.getElementById('bindingLogsBody');
                if (!body) return;
                const hasMore = state.bindingLogsPage * state.bindingLogsPageSize < state.bindingLogsTotal;
                const nearBottom = body.scrollTop + body.clientHeight >= body.scrollHeight - 16;
                if (!hasMore && nearBottom) state.bindingLogsReachedEnd = true;
                const show = state.bindingLogsReachedEnd && !hasMore && state.bindingLogsUserScrolled && (state.bindingLogsTotal > 0);
                tip.style.display = show ? 'block' : 'none';
            });
        }
        function positionBindingLogsPopover() {
            const btn = Array.from(document.querySelectorAll('.toolbar-btn')).find(b => b.textContent.includes('绑定记录'));
            const modal = document.querySelector('#bindingLogsModal .modal-content');
            if (!btn || !modal) return;
            const rect = btn.getBoundingClientRect();
            const vw = window.innerWidth; const vh = window.innerHeight;
            const width = Math.min(vw * 0.2, 420);
            const offset = 10;
            const right = Math.max(8, vw - rect.right - offset);
            let bottom = Math.max(8, vh - rect.bottom - offset + 10);
            modal.style.width = width + 'px';
            modal.style.right = right + 'px';
            const h = modal.offsetHeight || 0;
            if (bottom + h > vh - 8) bottom = Math.max(8, vh - h - 8);
            modal.style.bottom = bottom + 'px';
        }
        function undoBindingLog(logId) {
            const log = state.bindingLogs.find(l => l.id === logId);
            if (!log) return;
            state.bindingLogsUndoingId = logId; renderBindingLogs();
            api.undoBinding(log)
                .then(() => {
                    const key = makeBindingLogKey(log);
                    if (!state.bindingLogsHiddenKeys.includes(key)) state.bindingLogsHiddenKeys.push(key);
                    state.bindingLogs = state.bindingLogs.filter(l => l.id !== logId);
                    state.bindingLogsTotal = Math.max(0, state.bindingLogsTotal - 1);
                    showNotification('撤回成功', 'success');
                    loadBindingLogsPage(1);
                })
                .catch(() => { showNotification('撤回失败，请重试', 'info'); })
                .finally(() => { state.bindingLogsUndoingId = null; renderBindingLogs(); });
            }
        function toggleHistoryPanel() { }
        function undoHistory() { }
        function logEvent(type, detail) { try { console.log('[LOG]', type, new Date().toLocaleString(), detail); } catch (_) {} }

        // ===== 新增功能：可视化映射 =====
        function toggleVisualMapping(btn) {
            state.visualMappingEnabled = !state.visualMappingEnabled;
            btn.classList.toggle('active');
            
            const visualArea = document.getElementById('visualMapping');
            visualArea.style.display = state.visualMappingEnabled ? 'block' : 'none';
            
            if (state.visualMappingEnabled) {
                drawVisualMappings();
            }
        }

        function drawVisualMappings() {
            if (!state.visualMappingEnabled || !state.platformA || !state.platformB) return;
            
            const svg = document.getElementById('mappingSvg');
            svg.innerHTML = '';
            
            // 简化的连线绘制（实际应用中需要更复杂的计算）
            state.mappings.forEach((mapping, index) => {
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('class', 'mapping-line');
                line.setAttribute('x1', '10%');
                line.setAttribute('y1', `${20 + (index * 30)}%`);
                line.setAttribute('x2', '90%');
                line.setAttribute('y2', `${20 + (index * 30)}%`);
                line.setAttribute('title', `${mapping.sourceName} → ${mapping.targetNames.join(', ')}`);
                svg.appendChild(line);
            });
            
            if (state.mappings.length === 0) {
                svg.innerHTML = '<text x="50%" y="50%" text-anchor="middle" fill="#94a3b8" font-size="14">暂无映射关系</text>';
            }
        }

        // ===== 新增功能：智能映射 =====
        function showSmartMapping() {
            if (!state.platformA || !state.platformB) {
                alert('请先导入两个平台的数据！');
                return;
            }
            
            document.getElementById('smartMappingModal').style.display = 'block';
            updateThresholdDisplay(document.getElementById('similarityThreshold').value);
            scheduleStatsUpdate();
        }

        function closeSmartMappingModal() {
            document.getElementById('smartMappingModal').style.display = 'none';
        }
        
        function updateThresholdDisplay(value) {
            const input = document.getElementById('similarityThreshold');
            const display = document.getElementById('thresholdDisplay');
            const val = parseInt(value, 10);
            document.getElementById('thresholdValue').textContent = val;
            if (input && display) {
                const min = parseInt(input.min || '50', 10);
                const max = parseInt(input.max || '100', 10);
                const percent = ((val - min) / (max - min)) * 100;
                display.style.left = `calc(${percent}% )`;
                display.style.transform = 'translateX(-50%)';
            }
            const ct = document.getElementById('currentThreshold');
            if (ct) ct.textContent = val;
        }

        function startSmartMapping() {
            const threshold = parseInt(document.getElementById('similarityThreshold').value);
            const results = document.getElementById('smartMappingResults');
            
            results.innerHTML = '<div class="empty-state"><div class="empty-state-icon"></div><div>正在分析相似度...</div></div>';
            
            setTimeout(() => {
                const suggestions = findSimilarNodes(threshold);
                displaySmartSuggestions(suggestions);
            }, 500);
        }

        function findSimilarNodes(threshold) {
            const suggestions = [];
            const allNodesA = getAllNodes(state.platformA);
            const allNodesB = getAllNodes(state.platformB);
            
            allNodesA.forEach(nodeA => {
                allNodesB.forEach(nodeB => {
                    const similarity = calculateSimilarity(nodeA.name, nodeB.name);
                    if (similarity >= threshold) {
                        suggestions.push({
                            source: nodeA,
                            target: nodeB,
                            similarity: Math.round(similarity),
                            isCurrentMapping: state.mappings.some(m => 
                                m.sourceId === nodeA.id && m.targetIds.includes(nodeB.id)
                            )
                        });
                    }
                });
            });
            
            return suggestions.sort((a, b) => b.similarity - a.similarity);
        }

        function getAllNodes(tree) {
            const nodes = [];
            const traverse = (node) => {
                if (node.level > 0) nodes.push(node);
                if (node.children) node.children.forEach(traverse);
            };
            traverse(tree);
            return nodes;
        }

        function calculateSimilarity(str1, str2) {
            // 纯文本相似度计算：基于编辑距离
            const name1 = str1.toLowerCase().trim();
            const name2 = str2.toLowerCase().trim();
            
            if (name1 === name2) return 100;
            if (name1.length === 0 || name2.length === 0) return 0;
            
            // 使用编辑距离计算相似度
            const longer = name1.length > name2.length ? name1 : name2;
            const shorter = name1.length > name2.length ? name2 : name1;
            const editDistance = levenshteinDistance(longer, shorter);
            const similarity = Math.round(((longer.length - editDistance) / longer.length) * 100);
            
            return similarity;
        }

        function levenshteinDistance(str1, str2) {
            const matrix = [];
            for (let i = 0; i <= str2.length; i++) {
                matrix[i] = [i];
            }
            for (let j = 0; j <= str1.length; j++) {
                matrix[0][j] = j;
            }
            for (let i = 1; i <= str2.length; i++) {
                for (let j = 1; j <= str1.length; j++) {
                    if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                        matrix[i][j] = matrix[i - 1][j - 1];
                    } else {
                        matrix[i][j] = Math.min(
                            matrix[i - 1][j - 1] + 1,
                            matrix[i][j - 1] + 1,
                            matrix[i - 1][j] + 1
                        );
                    }
                }
            }
            return matrix[str2.length][str1.length];
        }

        function displaySmartSuggestions(suggestions) {
            const results = document.getElementById('smartMappingResults');
            const selectAllControls = document.getElementById('selectAllControls');
            const isLight = (state.ui && state.ui.theme) === 'light';
            const baseBg = isLight ? '#ffffff' : 'rgba(15, 23, 42, 0.4)';
            const baseBorder = isLight ? '#e2e8f0' : 'rgba(94, 234, 212, 0.1)';
            const simColor = isLight ? '#0ea5e9' : '#5eead4';
            const idColor = isLight ? '#64748b' : '#94a3b8';
            
            if (suggestions.length === 0) {
                results.innerHTML = '<div class="empty-state"><div class="empty-state-icon"></div><div>未找到满足条件的相似知识点</div></div>';
                selectAllControls.style.display = 'none';
                return;
            }

            selectAllControls.style.display = 'block';
            
            // 更新匹配数量和当前阈值
            document.getElementById('matchCount').textContent = suggestions.length;
            document.getElementById('currentThreshold').textContent = document.getElementById('similarityThreshold').value;
            state.smartSuggestions = suggestions;
            results.innerHTML = `<div id="smartSearchBar" style="position: sticky; top: 0; background: transparent; padding: 6px 0; z-index: 1;"><input id="smartSearchInput" class="search-box" placeholder="搜索匹配项名称或ID" aria-label="搜索匹配项名称或ID"></div><div id="smartListWrap"></div>`;

            function renderList(data) {
                const wrap = document.getElementById('smartListWrap');
                if (!wrap) return;
                wrap.innerHTML = `
                ${data.map((s) => `
                    <div style="padding: 10px; margin-bottom: 8px; background: ${s.isCurrentMapping ? (isLight ? 'rgba(52, 211, 153, 0.15)' : 'rgba(52, 211, 153, 0.1)') : baseBg}; 
                                border: 1px solid ${s.isCurrentMapping ? '#34d399' : baseBorder}; 
                                border-radius: 8px; display: flex; align-items: center; justify-content: space-between;">
                        <div>
                            <strong>${s.source.name}</strong> → <strong style="color: #8b5cf6;">${s.target.name}</strong>
                            <span style="color: ${simColor}; margin-left: 10px; font-size: 12px;">相似度: ${s.similarity}%</span>
                            <div style="font-size:12px; color:${idColor}; margin-top:4px;">ID: ${s.source.id} → ${s.target.id}</div>
                            ${s.isCurrentMapping ? '<span style="color: #34d399; margin-left: 10px;">已映射</span>' : ''}
                        </div>
                        <input type="checkbox" class="smart-selection" data-source="${s.source.id}" data-target="${s.target.id}" 
                               ${s.isCurrentMapping ? 'checked' : ''} ${s.isCurrentMapping ? 'disabled' : ''} 
                               onchange="updateSelectAllState()" style="width: 18px; height: 18px;">
                    </div>
                `).join('')}
            `;
                updateSelectAllState();
            }

            function applySmartSearchInternal() {
                const input = document.getElementById('smartSearchInput');
                const q = (input && input.value || '').trim().toLowerCase();
                const data = !q ? state.smartSuggestions : state.smartSuggestions.filter(s => {
                    const fields = [String(s.source.name), String(s.source.id), String(s.target.name), String(s.target.id)].map(v => v.toLowerCase());
                    return fields.some(v => v.includes(q));
                });
                document.getElementById('matchCount').textContent = data.length;
                selectAllControls.style.display = data.length > 0 ? 'block' : 'none';
                renderList(data);
            }

            const input = document.getElementById('smartSearchInput');
            if (input) input.addEventListener('input', debounce(applySmartSearchInternal, 150));
            applySmartSearchInternal();
        }

        function applySmartMappings() {
            const checkboxes = document.querySelectorAll('.smart-selection:checked');
            let appliedCount = 0;
            
            checkboxes.forEach(checkbox => {
                const sourceId = checkbox.dataset.source;
                const targetId = checkbox.dataset.target;
                
                const source = findNodeById(sourceId, 'A');
                const target = findNodeById(targetId, 'B');
                
                if (source && target) {
                    // 检查是否已存在
                    const existing = state.mappings.find(m => 
                        m.sourceId === sourceId && m.targetIds.includes(targetId)
                    );
                    
                    if (!existing) {
                        state.mappings.push({
                            id: 'map-' + Date.now() + '-' + Math.random(),
                            sourceId: sourceId,
                            sourceName: source.name,
                            targetIds: [targetId],
                            targetNames: [target.name],
                            createTime: Date.now(),
                            updateTime: Date.now(),
                            status: 'active',
                            creator: 'smart-mapping',
                            updateCount: 0
                        });
                        appliedCount++;
                    }
                }
            });
            
            if (appliedCount > 0) {
                saveToLocalStorage();
                renderTrees();
                renderMappings();
                updateStats();
                addToHistory('智能批量映射', `应用了${appliedCount}个映射`, '');
                showToast(`成功应用 ${appliedCount} 个智能映射！`, 'success');
            } else {
                showToast('没有选中的映射需要应用', 'error');
            }
            
            closeSmartMappingModal();
        }

        // ===== 新增功能：映射模板 =====
        function saveTemplate() {
            if (state.mappings.length === 0) {
                alert('当前没有映射关系可保存为模板！');
                return;
            }
            
            const name = prompt('请输入模板名称：', `模板_${new Date().toLocaleDateString()}`);
            if (!name) return;
            
            const template = {
                id: 'tpl-' + Date.now(),
                name: name,
                mappings: state.mappings.map(m => ({
                    sourceName: m.sourceName,
                    targetNames: [...m.targetNames]
                })),
                createTime: Date.now(),
                platformA: state.platformA ? state.platformA.name : '未命名',
                platformB: state.platformB ? state.platformB.name : '未命名'
            };
            
            state.templates.push(template);
            saveToLocalStorage();
            alert(`✅ 模板 "${name}" 已保存！`);
        }

        function loadTemplate() {
            if (state.templates.length === 0) {
                alert('没有可用的模板！');
                return;
            }
            
            const templateNames = state.templates.map(t => t.name).join('\n');
            const selected = prompt(`请选择模板（输入编号或名称）：\n\n${state.templates.map((t, i) => `${i + 1}. ${t.name}`).join('\n')}`);
            
            if (!selected) return;
            
            let template;
            const index = parseInt(selected);
            if (!isNaN(index) && index > 0 && index <= state.templates.length) {
                template = state.templates[index - 1];
            } else {
                template = state.templates.find(t => t.name === selected);
            }
            
            if (!template) {
                alert('未找到指定的模板！');
                return;
            }
            
            if (!confirm(`确定要加载模板 "${template.name}" 吗？这将不会自动创建映射，而是显示模板中的映射关系供参考。`)) return;
            
            // 显示模板映射
            const results = document.getElementById('smartMappingResults');
            results.innerHTML = `
                <div style="margin-bottom: 10px; color: #5eead4;">
                    模板 "${template.name}" 包含 ${template.mappings.length} 个映射关系：
                </div>
                ${template.mappings.map((m, i) => `
                    <div style="padding: 10px; margin-bottom: 8px; background: rgba(15, 23, 42, 0.4); 
                                border: 1px solid rgba(94, 234, 212, 0.1); border-radius: 8px;">
                        <strong>${m.sourceName}</strong> → <strong style="color: #8b5cf6;">${m.targetNames.join(', ')}</strong>
                    </div>
                `).join('')}
            `;
            document.getElementById('smartMappingModal').style.display = 'block';
        }

        function showMappingDetail(mappingId) {
            const mapping = state.mappings.find(m => m.id === mappingId);
            if (!mapping) return;
            
            const content = document.getElementById('mappingDetailContent');
            content.innerHTML = `
                <div style="padding: 15px;">
                    <div style="margin-bottom: 15px; padding: 10px; background: rgba(15, 23, 42, 0.5); border-radius: 8px;">
                        <strong style="color: #5eead4;">源知识点:</strong> ${mapping.sourceName}
                    </div>
                    <div style="margin-bottom: 15px; padding: 10px; background: rgba(15, 23, 42, 0.5); border-radius: 8px;">
                        <strong style="color: #8b5cf6;">目标知识点:</strong><br>
                        ${mapping.targetNames.map(name => `• ${name}`).join('<br>')}
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 13px;">
                        <div><strong>创建时间:</strong><br>${new Date(mapping.createTime).toLocaleString()}</div>
                        <div><strong>更新时间:</strong><br>${new Date(mapping.updateTime).toLocaleString()}</div>
                        <div><strong>更新次数:</strong><br>${mapping.updateCount || 0}</div>
                        <div><strong>状态:</strong><br>${mapping.status === 'active' ? '活跃' : '已废弃'}</div>
                        <div><strong>创建者:</strong><br>${mapping.creator || '未知'}</div>
                        <div><strong>映射ID:</strong><br><code style="font-size: 11px;">${mapping.id}</code></div>
                    </div>
                </div>
            `;
            
            document.getElementById('mappingDetailModal').style.display = 'block';
        }

        function closeMappingDetailModal() {
            document.getElementById('mappingDetailModal').style.display = 'none';
        }

        function showUnmapped() {
            if (!state.platformA || !state.platformB) {
                alert('请先导入两个平台的数据！');
                return;
            }
            const stats = computeUnmappedStats();
            const unmappedA = stats.unmappedA;
            const unmappedB = stats.unmappedB;
            
            const results = document.getElementById('smartMappingResults');
            results.innerHTML = `
                <div style="color: #5eead4; margin-bottom: 10px;">
                    <h3>未映射节点统计</h3>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div>
                        <h4 style="color: #f87171;">${(state.ui && state.ui.platformNameA) || '平台A'}未映射 (${unmappedA.length}个)</h4>
                        ${unmappedA.map(node => `<div style="padding: 5px; font-size: 13px;">• ${node.name}</div>`).join('')}
                    </div>
                    <div>
                        <h4 style="color: #f87171;">${(state.ui && state.ui.platformNameB) || '平台B'}未映射 (${unmappedB.length}个)</h4>
                        ${unmappedB.map(node => `<div style="padding: 5px; font-size: 13px;">• ${node.name}</div>`).join('')}
                    </div>
                </div>
            `;
            document.getElementById('smartMappingModal').style.display = 'block';
        }

        on('title-changed', () => {
            const modal = document.getElementById('smartMappingModal');
            if (!modal || modal.style.display !== 'block') return;
            const headers = modal.querySelectorAll('h4');
            headers.forEach(h => {
                const nameA = (state.ui && state.ui.platformNameA) || '平台A';
                const nameB = (state.ui && state.ui.platformNameB) || '平台B';
                if (h.textContent.startsWith('平台A未映射') || h.textContent.includes('未映射') && h.textContent.includes('A')) {
                    const count = (h.textContent.match(/\((\d+)个\)/) || [0, '0'])[1];
                    h.textContent = `${nameA}未映射 (${count}个)`;
                }
                if (h.textContent.startsWith('平台B未映射') || h.textContent.includes('未映射') && h.textContent.includes('B')) {
                    const count = (h.textContent.match(/\((\d+)个\)/) || [0, '0'])[1];
                    h.textContent = `${nameB}未映射 (${count}个)`;
                }
            });
            scheduleStatsUpdate();
        });

        function getUnmappedNodes(tree, platform) {
            const unmapped = [];
            const traverse = (node) => {
                if (node.level > 0) {
                    const isMapped = state.mappings.some(m => 
                        platform === 'A' ? m.sourceId === node.id : m.targetIds.includes(node.id)
                    );
                    if (!isMapped) unmapped.push(node);
                }
                if (node.children) node.children.forEach(traverse);
            };
            traverse(tree);
            return unmapped;
        }

        function computeUnmappedStats() {
            const leafA = !!state.mappingSettings.leafOnlyA;
            const leafB = !!state.mappingSettings.leafOnlyB;
            const mappableAIds = getMappableIds(state.platformA, leafA);
            const mappableBIds = getMappableIds(state.platformB, leafB);
            const mappedASourceIds = new Set(state.mappings.map(m => m.sourceId));
            const mappedBTargetIds = new Set(state.mappings.flatMap(m => Array.isArray(m.targetIds) ? m.targetIds : []));
            const unmappedA = getUnmappedNodesFiltered(state.platformA, leafA, 'A').filter(n => mappableAIds.includes(n.id) && !mappedASourceIds.has(n.id));
            const unmappedB = getUnmappedNodesFiltered(state.platformB, leafB, 'B').filter(n => mappableBIds.includes(n.id) && !mappedBTargetIds.has(n.id));
            return { unmappedA, unmappedB };
        }

        function getUnmappedNodesFiltered(tree, leafOnly, platform) {
            const out = [];
            const stack = [tree];
            while (stack.length) {
                const n = stack.pop();
                if (n.level > 0) {
                    const isLeaf = !n.children || n.children.length === 0;
                    if (!leafOnly || isLeaf) {
                        const mapped = state.mappings.some(m => platform === 'A' ? m.sourceId === n.id : (Array.isArray(m.targetIds) && m.targetIds.includes(n.id)));
                        if (!mapped) out.push(n);
                    }
                }
                if (n.children) for (const c of n.children) stack.push(c);
            }
            return out;
        }

        // ===== 辅助功能 =====
        function showNotification(message, type = 'info') {
            const isLight = (state.ui && state.ui.theme) === 'light';
            const palette = {
                info: isLight ? { bg: '#ffffff', fg: '#0f172a', border: '#e2e8f0', shadow: '0 4px 12px rgba(15,23,42,0.12)' } : { bg: 'rgba(15,23,42,0.9)', fg: '#e2e8f0', border: 'rgba(255,255,255,0.1)', shadow: '0 4px 12px rgba(0,0,0,0.3)' },
                success: { bg: 'rgba(52, 211, 153, 0.9)', fg: '#0f172a', border: 'rgba(52, 211, 153, 0.35)', shadow: isLight ? '0 4px 12px rgba(15,23,42,0.12)' : '0 4px 12px rgba(0,0,0,0.3)' }
            };
            const theme = palette[type] || palette.info;
            const notification = document.createElement('div');
            notification.style.cssText = `position:fixed; top:20px; right:20px; padding:15px 20px; background:${theme.bg}; color:${theme.fg}; border:1px solid ${theme.border}; border-radius:8px; box-shadow:${theme.shadow}; z-index:2000; font-size:14px; animation: slideIn 0.3s ease;`;
            notification.textContent = message;
            document.body.appendChild(notification);
            setTimeout(() => { try { notification.remove(); } catch(_){} }, 3000);
        }

        // 添加滑入动画
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(6px); }
                to { opacity: 1; transform: translateY(0); }
            }
        `;
        document.head.appendChild(style);

        // 搜索功能
        function debounce(fn, delay) { let t; return function(...args){ const ctx=this; clearTimeout(t); t=setTimeout(()=>fn.apply(ctx,args), delay); } }
        function searchModeParser(q) {
            const s = q.trim();
            if (!s) return { mode: 'fuzzy', term: '' };
            if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) return { mode: 'exact_name', term: s.slice(1,-1) };
            if (s.startsWith('id:')) return { mode: 'exact_id', term: s.slice(3) };
            return { mode: 'fuzzy', term: s };
        }
        function applySearch(side, value) {
            const { mode, term } = searchModeParser(sanitizeQuery(value));
            state.searchContext = { mode, term };
            addSearchHistory(side, term);
            renderSearchSuggestions(side);
            const container = document.getElementById(side === 'A' ? 'treeA' : 'treeB');
            const tree = side === 'A' ? state.platformA : state.platformB;
            if (!tree) return;
            const cacheKey = side + '|' + mode + '|' + term + '|' + state.searchLimit;
            let html = state.searchCache[cacheKey];
            // 始终计算匹配数量，确保提示与实际一致
            const allMatchedIds = collectMatches(tree, term, mode);
            const matchesCount = allMatchedIds.length;
            if (!html) {
                const limitedIds = new Set(allMatchedIds.slice(0, state.searchLimit));
                console.time('search_'+side);
                html = renderTreeWithMode(tree, side, term, mode, limitedIds);
                console.timeEnd('search_'+side);
                state.searchCache[cacheKey] = html;
            }
            container.innerHTML = html;
            updateSearchInfo(side, term, matchesCount);
            if (term && matchesCount === 0) {
                container.innerHTML = '<div class="empty-state"><div class="empty-state-icon"></div><div>未找到结果</div></div>';
            }
        }
        function updateSearchInfo(side, term, count) {
            const infoEl = document.getElementById(side === 'A' ? 'searchInfoA' : 'searchInfoB');
            if (!infoEl) return;
            if (!term) { infoEl.textContent = ''; return; }
            if (count === 0) {
                infoEl.textContent = '未找到结果';
            } else if (count > state.searchLimit) {
                infoEl.innerHTML = `匹配到 ${count} 条结果，已显示前 ${state.searchLimit} 条。<button class="btn-small" onclick="showMoreSearch('${side}')">显示更多相似结果</button>`;
            } else {
                infoEl.textContent = `匹配到 ${count} 条结果`;
            }
        }
        function showMoreSearch(side) { state.searchLimit = Number.MAX_SAFE_INTEGER; const input = document.getElementById(side === 'A' ? 'searchA' : 'searchB'); applySearch(side, input ? input.value : ''); }
        document.getElementById('searchA')?.addEventListener('input', debounce((e)=>{ try { applySearch('A', e.target.value); } catch(err){ console.warn('搜索A错误', err); } }, 150));
        document.getElementById('searchB')?.addEventListener('input', debounce((e)=>{ try { applySearch('B', e.target.value); } catch(err){ console.warn('搜索B错误', err); } }, 150));

        function updateClearVisibility(side) {
            const input = document.getElementById(side === 'A' ? 'searchA' : 'searchB');
            const btn = document.getElementById(side === 'A' ? 'clearSearchA' : 'clearSearchB');
            if (!input || !btn) return;
            if (input.value && input.value.length > 0) btn.classList.add('show'); else btn.classList.remove('show');
        }
        function clearSearch(side) {
            const input = document.getElementById(side === 'A' ? 'searchA' : 'searchB');
            if (!input) return;
            input.value = '';
            applySearch(side, '');
            updateClearVisibility(side);
            input.focus();
        }

        // 轻量测试：验证ID匹配准确性与高亮
        function runSearchTests() {
            const sample = { id: 'root', name: 'ROOT', level: 0, children: [
                { id: 'A1', name: '节点Alpha', level: 1 },
                { id: 'a1', name: '节点alpha', level: 1 },
                { id: 'B-2_3', name: '节点Beta', level: 1 }
            ]};
            const exactIdUpper = hasMatchWithMode(sample, 'A1', 'exact_id');
            const exactIdLower = hasMatchWithMode(sample, 'a1', 'exact_id');
            const exactIdSymbol = hasMatchWithMode(sample, 'B-2_3', 'exact_id');
            console.assert(exactIdUpper === true, '测试失败: 精确ID A1');
            console.assert(exactIdLower === true, '测试失败: 精确ID a1');
            console.assert(exactIdSymbol === true, '测试失败: 精确ID 带符号');
            const fuzzyIdShouldExact = hasMatchWithMode(sample, 'A1', 'fuzzy');
            console.assert(fuzzyIdShouldExact === true, '测试失败: 模糊模式下ID应精确等于');
        }
        function hasMatchWithMode(tree, q, mode) {
            const termRaw = (q || '').trim();
            const termLower = termRaw.toLowerCase();
            const minLen = 2;
            let found = false;
            const walk = (n) => {
                if (n.level > 0) {
                    const nameLower = String(n.name).toLowerCase();
                    const idStr = String(n.id);
                    const idLower = idStr.toLowerCase();
                    let hit = false;
                    if (!termRaw) hit = true;
                    else if (mode === 'exact_name') hit = nameLower === termLower;
                    else if (mode === 'exact_id') hit = idStr === termRaw;
                    else hit = nameLower.includes(termLower) || idStr === termRaw || (termRaw.length >= minLen && idLower.includes(termLower));
                    if (hit) { found = true; return; }
                }
                if (n.children) n.children.forEach(walk);
            };
            walk(tree);
            return found;
        }
        function sanitizeQuery(q) { return (q || '').replace(/[\r\n\t]/g, ' ').trim().slice(0, 64); }
        function addSearchHistory(side, q) {
            if (!q) return;
            state[`searchHistory${side}`] = state[`searchHistory${side}`] || [];
            const arr = state[`searchHistory${side}`];
            if (arr[0] === q) return;
            const idx = arr.indexOf(q);
            if (idx >= 0) arr.splice(idx, 1);
            arr.unshift(q);
            while (arr.length > 10) arr.pop();
        }
        function renderSearchSuggestions(side) {
            const arr = state[`searchHistory${side}`] || [];
            const listEl = document.getElementById(side === 'A' ? 'searchAList' : 'searchBList');
            if (!listEl) return;
            listEl.innerHTML = arr.map(item => `<option value="${item}"></option>`).join('');
        }

        // 模态框关闭
        window.onclick = function(event) {
            const modals = ['importModal', 'smartMappingModal', 'mappingDetailModal'];
            modals.forEach(modalId => {
                const modal = document.getElementById(modalId);
                if (event.target === modal) {
                    modal.style.display = 'none';
                }
            });
            const panel = document.getElementById('historyPanel');
            const toggle = document.getElementById('toggleHistory');
            if (panel && panel.style.display === 'block') {
                if (!panel.contains(event.target) && event.target !== toggle) {
                    state.historyMinimized = true;
                    updateHistoryPanel();
                }
            }
        }

        // 相似度滑块
        document.getElementById('similarityThreshold')?.addEventListener('input', (e) => {
            document.getElementById('thresholdValue').textContent = e.target.value;
        });

        // 初始化
        window.addEventListener('DOMContentLoaded', () => {
            loadFromLocalStorage();
            initTitles();
            state.ui = state.ui || {};
            if (!state.ui.theme) state.ui.theme = 'dark';
            applyTheme(state.ui.theme);
            
            // 如果没有本地数据，加载示例
            if (!state.platformA || !state.platformB) {
                setTimeout(() => {
                    showNotification('提示：您可以导入数据或点击"加载示例"查看演示', 'info');
                }, 1000);
            }
            setTimeout(runDisplayTests, 0);
            on('mapping-settings-changed', () => scheduleStatsUpdate());
            on('mapping-settings-changed', () => refreshUnmappedIfOpen());
            on('mappable-counts-updated', () => scheduleStatsUpdate());
            on('mappable-counts-updated', () => refreshUnmappedIfOpen());
            on('mapping-settings-opened', () => updateMappableCounts());
            updateClearVisibility('A');
            updateClearVisibility('B');
            document.getElementById('searchA')?.addEventListener('input', ()=>updateClearVisibility('A'));
            document.getElementById('searchB')?.addEventListener('input', ()=>updateClearVisibility('B'));
            runIconButtonTests();
        });

        function refreshUnmappedIfOpen() {
            const modal = document.getElementById('smartMappingModal');
            if (modal && modal.style.display === 'block') {
                showUnmapped();
            }
        }

        function runIconButtonTests() {
            try {
                const theme = document.getElementById('themeBtn');
                if (!theme) return;
                if (!theme.querySelector('svg')) updateThemeButton();
            } catch (e) {}
        }

        function showMappingSettingsModal() {
            const m = document.getElementById('mappingSettingsModal');
            const t = state.mappingSettings.type;
            document.querySelectorAll('#mappingSettingsModal input[name="mapType"]').forEach(r => { r.checked = r.value === t; });
            document.getElementById('leafOnlyA').checked = !!state.mappingSettings.leafOnlyA;
            document.getElementById('leafOnlyB').checked = !!state.mappingSettings.leafOnlyB;
            m.style.display = 'block';
            updateMappableCounts();
            emit('mapping-settings-opened', {});
        }

        function closeMappingSettingsModal() {
            const m = document.getElementById('mappingSettingsModal');
            m.style.display = 'none';
        }

        function saveMappingSettings() {
            const typeEl = document.querySelector('#mappingSettingsModal input[name="mapType"]:checked');
            const type = typeEl ? typeEl.value : 'ONE_TO_ONE';
            const leafA = document.getElementById('leafOnlyA').checked;
            const leafB = document.getElementById('leafOnlyB').checked;
            state.mappingSettings = { type, leafOnlyA: leafA, leafOnlyB: leafB };
            saveToLocalStorage();
            closeMappingSettingsModal();
            showToast('映射设置已保存', 'success');
            emit('mapping-settings-changed', { settings: state.mappingSettings });
            scheduleStatsUpdate();
            updateSmartMappingStatsInternal(
                countMappableNodes(state.platformA, leafA),
                getMappableIds(state.platformA, leafA).filter(id => new Set(state.mappings.map(m => m.sourceId)).has(id)).length,
                countMappableNodes(state.platformB, leafB),
                getMappableIds(state.platformB, leafB).filter(id => new Set(state.mappings.flatMap(m => m.targetIds||[])).has(id)).length
            );
        }

        function getNodeById(tree, id) {
            if (!tree || !id) return null;
            const stack = [tree];
            while (stack.length) {
                const n = stack.pop();
                if (n.id === id) return n;
                if (n.children) for (const c of n.children) stack.push(c);
            }
            return null;
        }

        function normalizeIdList(input) {
            if (!input) return [];
            return Array.from(new Set(String(input).split(/[,\s]+/).map(s => s.trim()).filter(Boolean)));
        }

        function batchBindByIdLists() {
            const srcRaw = document.getElementById('batchSourceIds').value;
            const tgtRaw = document.getElementById('batchTargetIds').value;
            const srcIds = normalizeIdList(srcRaw);
            const tgtIds = normalizeIdList(tgtRaw);
            if (srcIds.length === 0 || tgtIds.length === 0) { showToast('请填写A/B平台的节点ID列表', 'error'); return; }
            const leafA = document.getElementById('leafOnlyA').checked;
            const leafB = document.getElementById('leafOnlyB').checked;
            const aNodes = srcIds.map(id => getNodeById(state.platformA, id)).filter(Boolean);
            const bNodes = tgtIds.map(id => getNodeById(state.platformB, id)).filter(Boolean);
            if (aNodes.length === 0 || bNodes.length === 0) { showToast('填写的ID未在对应平台中找到', 'error'); return; }
            const validANodes = leafA ? aNodes.filter(isLeafNode) : aNodes;
            const validBNodes = leafB ? bNodes.filter(isLeafNode) : bNodes;
            if (validANodes.length === 0 || validBNodes.length === 0) { showToast('已启用叶子限定，未找到可映射的节点', 'error'); return; }
            const type = state.mappingSettings && state.mappingSettings.type;
            const pairs = [];
            for (const a of validANodes) for (const b of validBNodes) pairs.push([a,b]);
            if (pairs.length > 100000) { showToast('批量映射数量过大，请分批执行', 'error'); return; }
            let index = 0;
            const total = pairs.length;
            const chunk = Math.max(100, Math.min(500, Math.floor(total/10) || 100));
            let applied = 0;
            let skipped = 0;
            function step() {
                const end = Math.min(total, index + chunk);
                for (; index < end; index++) {
                    const pair = pairs[index];
                    if (!pair) continue;
                    const a = pair[0];
                    const b = pair[1];
                    if ((type === 'ONE_TO_ONE' || type === 'ONE_TO_MANY') && isBUsedByOtherA(b.id, a.id)) { skipped++; continue; }
                    attemptBind(a, b);
                    applied++;
                }
                if (index < total) {
                    setTimeout(step, 0);
                } else {
                    showToast(`批量建立完成，成功 ${applied}，跳过 ${skipped}`, 'success');
                }
            }
            showToast('开始批量建立映射', 'info');
            step();
        }

        function countMappableNodes(tree, leafOnly) {
            if (!tree) return 0;
            let count = 0;
            const stack = [tree];
            while (stack.length) {
                const n = stack.pop();
                if (n.level > 0) {
                    if (leafOnly) {
                        const isLeaf = !n.children || n.children.length === 0;
                        if (isLeaf) count++;
                    } else {
                        count++;
                    }
                }
                if (n.children) for (const c of n.children) stack.push(c);
            }
            return count;
        }

        function getMappableIds(tree, leafOnly) {
            const ids = [];
            if (!tree) return ids;
            const stack = [tree];
            while (stack.length) {
                const n = stack.pop();
                if (n.level > 0) {
                    if (leafOnly) {
                        const isLeaf = !n.children || n.children.length === 0;
                        if (isLeaf) ids.push(n.id);
                    } else {
                        ids.push(n.id);
                    }
                }
                if (n.children) for (const c of n.children) stack.push(c);
            }
            return ids;
        }

        function updateMappableCounts() {
            const leafA = document.getElementById('leafOnlyA').checked;
            const leafB = document.getElementById('leafOnlyB').checked;
            const a = countMappableNodes(state.platformA, leafA);
            const b = countMappableNodes(state.platformB, leafB);
            const ca = document.getElementById('mappableCountA');
            const cb = document.getElementById('mappableCountB');
            if (ca) ca.textContent = String(a);
            if (cb) cb.textContent = String(b);
            emit('mappable-counts-updated', { a, b });
            scheduleStatsUpdate();
        }
        function runDisplayTests() {
            const selectAnyA = state.platformA && state.platformA.children && state.platformA.children[0];
            if (selectAnyA) {
                state.selectedA = selectAnyA;
                renderTrees();
                const highlightedA = document.querySelectorAll('#treeA .node-content.selected-a').length;
                const mappedA = document.querySelectorAll('#treeA .node-content.mapped').length;
                console.log('TEST:selectedAOnly', highlightedA === 1);
                console.log('TEST:noMappedHighlightOnA', mappedA === 0);
                const highlightedB = document.querySelectorAll('#treeB .node-content.selected-b').length;
                const anyMappedB = document.querySelectorAll('#treeB .node-content.mapped').length;
                console.log('TEST:onlyBoundBHighlighted', highlightedB >= 0 && anyMappedB === 0);
            }
        }

        function runManyToManyUnitTests() {
            const leafA = true;
            const leafB = true;
            state.mappingSettings = { type: 'MANY_TO_MANY', leafOnlyA: leafA, leafOnlyB: leafB };
            const aIds = getMappableIds(state.platformA, leafA).slice(0, 5);
            const bIds = getMappableIds(state.platformB, leafB).slice(0, 5);
            if (aIds.length < 2 || bIds.length < 2) { showToast('测试失败：样本不足', 'error'); return; }
            const a1 = getNodeById(state.platformA, aIds[0]);
            const a2 = getNodeById(state.platformA, aIds[1]);
            const b1 = getNodeById(state.platformB, bIds[0]);
            const b2 = getNodeById(state.platformB, bIds[1]);
            attemptBind(a1, b1);
            attemptBind(a1, b2);
            attemptBind(a2, b1);
            attemptBind(a2, b2);
            const m1 = state.mappings.find(m => m.sourceId === a1.id);
            const m2 = state.mappings.find(m => m.sourceId === a2.id);
            const ok = m1 && m1.targetIds && m1.targetIds.includes(b1.id) && m1.targetIds.includes(b2.id) && m2 && m2.targetIds && m2.targetIds.includes(b1.id) && m2.targetIds.includes(b2.id);
            if (!ok) { showToast('N对N正确性测试未通过', 'error'); return; }
            const reused = isBUsedByOtherA(b1.id, a1.id);
            if (!reused) { showToast('B复用检测未通过', 'error'); return; }
            showToast('N对N正确性测试通过', 'success');
        }

        function runManyToManyPerformanceTest() {
            state.mappingSettings = { type: 'MANY_TO_MANY', leafOnlyA: true, leafOnlyB: true };
            const aIds = getMappableIds(state.platformA, true).slice(0, 30);
            const bIds = getMappableIds(state.platformB, true).slice(0, 30);
            if (aIds.length === 0 || bIds.length === 0) { showToast('性能测试失败：样本不足', 'error'); return; }
            const aNodes = aIds.map(id => getNodeById(state.platformA, id)).filter(Boolean);
            const bNodes = bIds.map(id => getNodeById(state.platformB, id)).filter(Boolean);
            const pairs = [];
            for (const a of aNodes) for (const b of bNodes) pairs.push([a,b]);
            let i = 0;
            const t0 = performance.now();
            function step() {
                const end = Math.min(pairs.length, i + 300);
                for (; i < end; i++) {
                    const p = pairs[i];
                    attemptBind(p[0], p[1]);
                }
                if (i < pairs.length) {
                    setTimeout(step, 0);
                } else {
                    const t1 = performance.now();
                    showToast(`性能测试完成，总建立 ${pairs.length}，耗时 ${(t1 - t0).toFixed(0)}ms`, 'success');
                }
            }
            showToast('开始性能测试', 'info');
            step();
        }
