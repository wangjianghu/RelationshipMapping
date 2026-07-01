# Legacy Excel Export Sync Design

## Goal

为旧版单文件页面 `关系映射.html` 同步最小可用版 `Excel(.xlsx)` 导出能力，与当前主实现保持一致。

## Scope

本次仅覆盖：

- `关系映射.html`

本次不覆盖：

- `双平台关系映射.html`
- `js/script.js`
- README 更新
- 公共导出模块抽取
- Excel 样式增强

## Output Format

Excel 导出的字段与旧版页面当前 `CSV` 完全一致，仅包含以下四列：

- `sourceId`
- `sourceName`
- `targetId`
- `targetName`

导出规则：

- 一个源节点映射多个目标节点时，导出为多行
- 空映射不导出
- 下载文件名沿用旧版页面当前命名规则，仅扩展名改为 `.xlsx`
- 工作表名固定为 `Mappings`

## UI Changes

在旧版页面现有“导出映射”弹层中新增第三个格式按钮：

- `JSON格式`
- `CSV格式`
- `Excel格式`

默认选中仍为 `JSON`。用户切换到 `Excel格式` 后，确认按钮触发 `.xlsx` 下载。

## Implementation

延续旧版页面现有导出实现，不做结构重写，仅追加最小改动：

1. 扩展 `showExportOptions()`，新增 `Excel格式`
2. 扩展 `setExportFormat()`，支持 `xlsx`
3. 扩展 `updateExportOptionsUI()`，让三个按钮的选中态和 loading 态一致
4. 扩展 `confirmExport()`，新增 `xlsx` 分支
5. 新增 `buildMappingExportRows()`，复用一套拍平逻辑给 `CSV` 和 `Excel`
6. 新增 `exportMappingsExcel()`，使用页面已加载的 `SheetJS`

## Validation

需要验证：

- 旧版页面导出弹层出现 `JSON / CSV / Excel`
- `.xlsx` 文件可以正常下载
- 工作表名为 `Mappings`
- 表头与 `CSV` 一致
- Excel 行数与 CSV 行数一致
- 无映射数据时仍保留原有提示行为

## Risks

风险较低，主要是：

- 旧版页面为单文件实现，局部改动时要避免误伤其他内联逻辑
- 必须让 `CSV` 与 `Excel` 共用拍平逻辑，避免两种导出结果口径漂移
