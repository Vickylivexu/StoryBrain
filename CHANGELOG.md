# CHANGELOG - 2026-06-21

## 功能更新

### 1. PDF 导出功能
- **新增依赖**：`puppeteer`（Chromium 无头浏览器）
- **新增接口**：`POST /api/export-pdf` — 将研究内容渲染为 A4 PDF 文件
- **新增函数**：`generateHTML()` — 为 PDF 渲染生成独立 HTML（避免 Tailwind v4 oklch 颜色问题）
- **前端入口**：故事页新增「导出 PDF」按钮（红色渐变样式）

### 2. 导出功能优化
- **独立状态**：将 `exporting` 拆分为 `exportingMD` 和 `exportingPDF`，两个导出按钮互不阻塞
- **数据格式**：前端改用 `arraybuffer` + `transformResponse` 接收二进制，避免 axios blob 解析问题
- **二进制修复**：后端 PDF 响应移除 `charset=utf-8`（PDF 不支持），使用 `Buffer.from(pdfBuffer)` 确保二进制完整性

### 3. 难度显示优化
- **问题**：部分主题的 `difficulty` 字段包含完整说明文字（如 `高 —— 电气工程被公认为...`），导致前端展示过长
- **解决**：新增 `getDifficultyLabel()` 函数，以 `——` 为分界只取等级部分
- **生效位置**：首页卡片、故事页顶部分类、学科分类卡片 — 三处统一

## 新增主题数据
- `backend/data/机械设计制造及其自动化.json`
- `backend/data/具身智能.json`
- `backend/data/低空技术与工程.json`
- `backend/data/社会学.json`

## 文件变更
| 文件 | 改动 |
|------|------|
| `backend/package.json` | 新增 puppeteer 依赖 |
| `backend/package-lock.json` | 依赖锁定 |
| `backend/server.js` | 新增 generateHTML 函数、POST /api/export-pdf 接口 |
| `frontend/src/App.jsx` | 导出按钮独立状态、getDifficultyLabel、PDF 导出逻辑 |
| `backend/data/*.json` | 4 个新增主题数据文件 |
