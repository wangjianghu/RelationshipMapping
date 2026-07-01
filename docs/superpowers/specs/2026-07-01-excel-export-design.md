# Excel Export Design

## Goal

在现有 `JSON / CSV` 导出能力之外，为当前主实现新增最小可用版 `Excel(.xlsx)` 导出功能。

## Scope

本次仅覆盖当前主实现：

- `双平台关系映射.html`
- `js/script.js`

本次不覆盖：

- 旧版 `关系映射.html`
- 多工作表
- Excel 样式美化
- 自动列宽
- 额外导出字段

## Output Format

Excel 导出的字段与当前 `CSV` 完全一致，仅包含以下四列：

- `sourceId`
- `sourceName`
- `targetId`
- `targetName`

导出规则与当前 `CSV` 保持一致：

- 一个源节点如果映射多个目标节点，则导出为多行
- 空映射不导出
- 下载文件名沿用当前命名规则，仅扩展名改为 `.xlsx`

建议工作表名：

- `Mappings`

## UI Changes

在现有“导出映射”弹层中新增第三个格式按钮：

- `JSON格式`
- `CSV格式`
- `Excel格式`

默认选中仍保持为 `JSON`，用户手动切换到 `Excel` 后，确认按钮触发 `.xlsx` 下载。

## Implementation Plan

导出逻辑继续集中在 `js/script.js` 的现有导出区域，不新增独立模块。

需要调整的点：

1. 扩展 `showExportOptions()` 的弹层按钮内容，新增 `Excel格式`
2. 扩展 `setExportFormat()`，支持 `xlsx`
3. 扩展 `updateExportOptionsUI()`，让第三个按钮正确响应选中态和 loading 态
4. 扩展 `confirmExport()`，新增 `xlsx` 分支
5. 新增 `exportMappingsExcel()`，复用当前 `CSV` 的拍平逻辑生成二维明细
6. 使用已接入的本地 `SheetJS` 生成单工作表并下载
7. 更新 `README.md` 的导出格式说明

## Data Flow

数据流保持简单：

1. 从 `state.mappings` 读取当前映射关系
2. 按照当前 `CSV` 逻辑拍平成明细行
3. 生成 Excel worksheet
4. 写入 workbook
5. 下载到本地 `.xlsx`

## Error Handling

延续当前导出行为：

- 当 `state.mappings` 为空时，提示“没有映射关系可导出”
- 当 `XLSX` 不可用时，提示导出失败
- 导出失败时不改变已有映射数据

## Validation

需要完成的验证：

- `JSON / CSV / Excel` 三个格式选项都能切换
- `Excel` 下载文件能被 Excel/WPS 正常打开
- Excel 表头与 CSV 一致
- Excel 行数与 CSV 导出行数一致
- 无映射数据时仍保持现有提示行为

## Risks

风险较低，主要集中在两点：

- 导出弹层当前是手工按钮样式，新增第三个按钮时需要同步修改选中态逻辑
- 必须确保 Excel 与 CSV 使用同一套拍平规则，避免导出结果口径不一致
