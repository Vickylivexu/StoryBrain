# CHANGELOG

## 2026-06-23 - 重构为纯 Skill 模式

### 重大重构

项目从「Web 应用」模式重构为「纯 Skill」模式，去掉前端和后端，SKILL.md 成为唯一入口。

#### 删除

- `frontend/` - 整个前端目录（React + Vite + Tailwind CSS）
- `backend/server.js` - Express API 服务器
- `backend/services/` - 后端服务层（aiResearchService、storyService、topicService）
- `start.sh` - 启动脚本

#### 新增

- `data/` - 预生成研究数据目录（从 backend/data/ 迁移）
- 重写 `SKILL.md` - 扩充为核心入口文档，包含：
  - 完整工作流程（7 步）
  - 14 项质量验证标准
  - JSON 输出格式规范
  - Markdown 导出模板（含大学专业附加章节）
  - 3 个完整示例对话
  - 预生成数据目录说明

#### 保留

- `data/*.json` - 13 个预生成研究数据文件
- `README.md` - 更新为 Skill 模式说明
- `CHANGELOG.md`
- `CONTRIBUTING.md`
- `LICENSE`

#### 改动后结构

```
StoryBrain/
├── SKILL.md              # 唯一入口
├── data/                 # 预生成研究数据（13 个主题）
├── README.md
├── CHANGELOG.md
├── CONTRIBUTING.md
└── LICENSE
```

---

## 2026-06-21 - PDF 导出 + 难度显示优化

- 新增 puppeteer 依赖，支持导出 PDF
- 新增 POST /api/export-pdf 接口
- 前端新增「导出 PDF」按钮
- 难度显示只展示等级，去除详细说明
- 新增 4 个主题数据
