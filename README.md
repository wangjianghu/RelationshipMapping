# 双平台关系映射管理系统

一个纯前端单页应用，用于管理两平台树状节点的映射关系，支持深色/浅色主题切换、导入导出、智能批量映射、未映射统计等功能。

## 亮点特性
- 纯前端：仅 `HTML + CSS + JavaScript`，无需构建或安装依赖
- 主题切换：深色/浅色一键切换并持久化
- 数据导入：支持 JSON/CSV 文件上传或粘贴，并支持层级路径型 Excel(`.xlsx/.xls`)
- 智能映射：基于编辑距离的相似度分析、批量勾选应用
- 未映射统计：与“可映射范围（叶子/全部）”设置实时联动
- 导出映射：JSON/CSV 两种格式
- 绑定记录：分页查看、支持撤回
<img width="3284" height="2010" alt="image" src="https://github.com/user-attachments/assets/b334c114-442f-456e-95d1-6945847380cb" />

## 在线/本地预览
- 本地预览（推荐）：
  - 在项目根目录运行：
    - `python3 -m http.server 8000`
  - 打开：`http://localhost:8000/双平台关系映射.html`

## 快速开始
- 直接下载或克隆本仓库，双击 `双平台关系映射.html` 可离线打开
- 如需跨域安全与文件读写兼容，请按“本地预览”方式启动静态服务

## 文件结构
- `双平台关系映射.html`：应用主文件（引用外部样式与脚本）
- `css/style.css`：样式文件
- `js/script.js`：脚本文件
- `vendor/xlsx.full.min.js`：本地 Excel 解析库
- `关系映射.html`：旧版单文件（如存在，仅供参考）
- `README.md`：项目说明

## 使用说明
- 主题切换
  - 右上角“主题”图标按钮切换深/浅色；刷新后保持选择
  - 参考代码：`/js/script.js:31-55`
- 数据导入
  - 顶部“导入数据”，选择目标平台（A/B），支持文件上传或粘贴
  - 文件上传支持 `JSON / CSV / Excel(.xlsx/.xls)`
  - Excel 目前支持“层级路径型”表结构，每列代表一层、每行代表一条路径
  - 支持的表头示例：`层级1..N`、`第1级..N`、`一级..N级`、`第1层级..N`
  - 上传入口：`/双平台关系映射.html:210-237`
  - 拖拽/选择文件事件与解析逻辑：`/js/script.js:141-374`
  - 预览与格式切换：`/js/script.js:417-528`
- 映射管理
  - 在右侧树点击目标节点进行绑定；中间面板可查看绑定与移除
  - 列表渲染：`/js/script.js:1012-1047`
  - 移除逻辑：`/js/script.js:1212-1231`、`/js/script.js:1315-1335`
- 智能批量映射
  - 顶部“智能映射”，设置相似度阈值，点击“开始分析”
  - 匹配项支持名称/ID 搜索；列表显示 `ID: 源ID → 目标ID`
  - 主要逻辑：
    - 分析：`/js/script.js:2104-2179`
    - 相似度：`/js/script.js:2181-2220`
    - 渲染与搜索：`/js/script.js:2222-2283`
    - 批量应用：`/js/script.js:2285-2318`
- 未映射统计
  - 底栏“未映射”，展示平台 A/B 未映射节点数量与列表
  - 与“可映射范围（仅叶子/全部）”设置实时关联
  - 计算与刷新：`/js/script.js:2435-2524`、`/js/script.js:2728-2733`
- 导出映射
  - 顶部“导出映射”，选择 JSON/CSV；`/js/script.js:1487-1647`
- 绑定记录
  - 底栏“绑定记录”，分页查看；支持撤回：`/js/script.js:1892-2062`

## 技术栈与架构
- 技术栈：`HTML + CSS + JavaScript`；内置本地 `SheetJS` 用于 Excel 解析；不依赖框架与后端
- 存储：浏览器 `localStorage`，键名 `knowledgeMappingState`
- 架构要点：
  - 状态管理：`state`（平台树、映射、UI、设置、搜索等）`/js/script.js:98-139`
  - 事件总线：`emit/on` 用于模块间通讯 `/js/script.js:57-59`
  - 统计：覆盖率与未映射数 `/js/script.js:1418-1456`、`/js/script.js:2497-2517`

## 开源到 GitHub
1. 在 GitHub 创建公开仓库（例如 `dual-platform-mapping-ui`）
2. 在本地项目目录执行：
   - `git init`
   - `git checkout -b main`
   - `git add 双平台关系映射.html js/script.js css/style.css vendor/xlsx.full.min.js README.md`
   - `git commit -m "chore: initial open source release"`
   - `git remote add origin https://github.com/<你的用户名>/<仓库名>.git`
   - `git push -u origin main`
3. 可选：开启 GitHub Pages（Settings → Pages），选择 `main` 分支进行静态托管

## 贡献指南
- 提交 PR 前请确保：
  - 不引入外部依赖；保持零依赖原则
  - 遵循现有代码风格与模块划分
  - UI 改动需同时考虑深/浅色适配
- 建议增加：
  - 单元测试或最小可验证脚本（如相似度函数的用例）
  - 文档中的代码引用路径与行号保持最新

## 问题反馈
- 使用 GitHub Issues 提交缺陷或需求建议
- 建议提供：浏览器版本、操作步骤、预期与实际结果、截图

## 许可证
- 建议使用 MIT 许可证；如需变更请在仓库根目录添加 `LICENSE` 文件

## 版本信息
- 应用内部版本：`version: '2.0'`（`/关系映射.html:2808-2813`，旧版兼容存档字段）
- 变更记录：建议在 PR/Release 中维护
