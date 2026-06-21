# 故事脑 (StoryBrain)

> 用故事把新知识装进脑子里

[English](#english) | [中文](#中文)

---

## 中文

### 项目简介

故事脑是一个 AI 驱动的学习工具，核心理念来自认知科学：人类对故事的记忆强度是对孤立事实的 **22 倍**。用户输入任意想学的主题，系统自动完成深度研究，生成一篇有血有肉的故事化学习内容，末尾附知识卡片巩固要点，同时生成可视化的知识关系图。

**工作流程：** 纵横分析法（纵向历史脉络 + 横向对比分析）→ 生成寓言故事（含故事-概念映射表）→ 核心洞察 → 知识卡片 → 质量验证 → Obsidian Markdown 导出

### 核心特性

| 特性 | 说明 |
|---|---|
| **故事化学习** | 每个主题生成一篇原创寓言故事，配有「故事元素 → 概念」映射表 |
| **纵横分析法** | 纵向追溯历史演变，横向对比相关概念，确保知识框架完整 |
| **质量验证系统** | 14 项质量检查规则（主题名纯净度、寓言长度、概念充实度、标签有效性、无占位符等），输出 quality=high/medium/low |
| **动态主题库** | 新增主题只需在 `backend/data/` 下放置 JSON 文件，无需修改代码 |
| **Obsidian 导出** | 一键导出为带 YAML frontmatter 的 Markdown 文件，可直接导入 Obsidian 知识库 |
| **知识关系图** | 基于 ReactFlow 的可视化节点图，展示主题与核心概念之间的关联 |
| **TRAE Skill 封装** | 已封装为 `story-brain` Skill，可通过 TRAE AI 助理直接调用 |

### 技术栈

| 层级 | 技术 |
|---|---|
| **前端** | React 18 + Vite 5 + Tailwind CSS 3 + ReactFlow 11 + Axios |
| **后端** | Node.js + Express 4 |
| **本地数据** | SQLite (better-sqlite3) + JSON 文件动态加载 |
| **AI 集成** | TRAE Auto Model / OpenAI GPT-4（通过 skill 调用 hv-analysis 和 concept-fable） |

### 项目结构

```
StoryBrain/
├── backend/                      # 后端服务
│   ├── server.js                 # Express 服务器入口，API 路由
│   ├── services/
│   │   ├── aiResearchService.js  # 核心研究生成服务（动态加载主题 + 质量验证）
│   │   ├── topicService.js       # 主题数据加载
│   │   └── storyService.js       # 故事数据服务
│   ├── data/                     # 主题数据目录（JSON 格式）
│   │   ├── 自动化.json
│   │   ├── 区块链.json
│   │   ├── 熵增定律.json
│   │   ├── 心理学效应.json
│   │   ├── 认知偏差.json
│   │   ├── 复利效应.json
│   │   ├── 量子计算.json
│   │   └── 传感器与执行器.json
│   ├── database/
│   │   ├── db.js                 # SQLite 连接与初始化
│   │   └── storybrain.db         # SQLite 数据库文件
│   └── package.json
│
├── frontend/                     # 前端应用
│   ├── src/
│   │   ├── App.jsx               # 主组件（故事生成、显示、导出）
│   │   ├── components/
│   │   │   └── KnowledgeGraph.jsx # 知识关系图组件
│   │   ├── main.jsx              # React 入口
│   │   └── index.css             # Tailwind 样式
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
│
├── .trae/                        # TRAE AI 助理 Skill 配置
│   └── skills/
│       └── story-brain/
│           └── SKILL.md          # story-brain Skill 文档
│
├── start.sh                      # 一键启动脚本
├── 创意-故事脑.md                 # 原始创意文档
├── README.md
└── LICENSE
```

### 快速开始

#### 环境要求

- Node.js >= 18
- npm >= 9

#### 1. 安装依赖

```bash
# 后端
cd backend && npm install

# 前端
cd ../frontend && npm install
```

#### 2. 启动服务

**方式一：一键启动（推荐）**
```bash
cd StoryBrain
chmod +x start.sh
./start.sh
```

**方式二：手动启动**

```bash
# 终端 1 - 后端（端口 3001）
cd backend && npm run dev

# 终端 2 - 前端（端口 3000）
cd frontend && npm run dev
```

#### 3. 访问应用

打开浏览器访问 **http://localhost:3000**，输入主题名称即可体验。

### API 接口

#### 生成故事与研究

```
POST /api/generate-story
Content-Type: application/json

{ "topic": "熵增定律" }
```

**返回字段说明：**

| 字段 | 类型 | 说明 |
|---|---|---|
| `title` | string | 故事标题 |
| `fable` | object | 寓言故事，含 `title`、`story`、`explanation` |
| `chapters` | array | 三章纵横分析：纵向分析、横向对比、洞察与未来 |
| `knowledgeCard` | object | 核心概念卡片，含 `concepts`、`definitions`、`relatedTopics` |
| `knowledgeGraph` | object | 知识关系图，含 `nodes`（节点）和 `edges`（连线） |
| `tags` | object | 知识分类标签 |
| `quality` | object | 质量验证结果：`score`（分值）、`quality`（high/medium/low）、`checks`（各检查项详情） |

#### 获取主题列表

```
GET /api/topics
```

返回所有可用主题，含名称、slug、分类标签。

#### 获取主题详情（slug 路由）

```
GET /api/topics/:slug
```

#### 导出为 Markdown

```
POST /api/export-markdown
Content-Type: application/json

{ "topic": "认知偏差" }
# 或
{ "slug": "cognitive-bias" }
```

返回 Obsidian 友好的 Markdown 文件，含 YAML frontmatter、寓言故事、纵横分析、知识卡片和知识关系图节点列表。

#### 获取历史故事

```
GET /api/stories
GET /api/stories/:id
```

### 主题数据格式

每个主题存储在 `backend/data/` 目录下，格式为 JSON：

```json
{
  "slug": "认知偏差",
  "displayName": "认知偏差",
  "fable": {
    "title": "地图绘制员的盲点",
    "story": "（寓言故事正文）...",
    "explanation": {
      "conceptName": "认知偏差",
      "oneSentence": "一句话定义",
      "whyItMatters": "为什么重要",
      "keyPoints": ["要点1", "要点2", ...],
      "mapping": [
        { "storyElement": "故事元素", "conceptMapping": "对应概念" }
      ],
      "foodForThought": "值得思考的问题",
      "relatedConcept": {
        "storyContinuation": "延伸故事",
        "conceptIntro": "相关概念引入"
      }
    }
  },
  "vertical": "纵向分析：历史演变...",
  "horizontal": "横向分析：对比与区分...",
  "insights": "洞察与未来展望...",
  "keyConcepts": [
    { "name": "概念名", "definition": "概念定义" }
  ],
  "relatedTopics": ["延伸主题1", "延伸主题2", ...],
  "tags": {
    "category": "学科分类",
    "subCategory": "子领域",
    "coreConcepts": ["核心概念1", "核心概念2"],
    "applicationDomains": ["应用领域"],
    "relatedFields": ["关联学科"],
    "difficulty": "难度等级",
    "learningPath": ["学习路径"],
    "customTags": ["自定义标签"]
  }
}
```

### 如何新增主题

在 `backend/data/` 目录下创建一个新的 JSON 文件，按上述格式填充内容，服务重启后自动加载。

**新增主题流程（无需修改代码）：**
1. 复制 `backend/data/传感器与执行器.json` 作为模板
2. 填写所有必填字段
3. 重启后端服务
4. 新主题出现在列表中，可直接查询

### 质量验证规则

系统内置 14 项质量检查：

1. 主题名纯净度（无英文字母混入中文标题）
2. 寓言故事长度（>= 300 字）
3. 映射表条目数（>= 3 条）
4. 核心概念真实性（>= 5 个）
5. 概念定义充实度（>= 70% 定义长度 > 20 字）
6. 延伸主题相关性（>= 5 个）
7. 第一章（纵向分析）内容长度（>= 300 字）
8. 第二章（横向对比）内容长度（>= 300 字）
9. 第三章（洞察与未来）内容长度（>= 200 字）
10. 标签分类有效性（分类/子领域/核心概念齐全）
11. 无占位符文本（不含「建议接入」「XX」「placeholder」等）
12. 寓言标题存在
13. 解读内容完整（一句话 + 为什么重要 + 要点齐全）
14. 思考时间存在

**质量等级：**
- `high`：评分 >= 80 分
- `medium`：评分 55-79 分
- `low`：评分 < 55 分

### TRAE Skill 使用

已封装为 `story-brain` Skill，可在 TRAE AI 助理中直接调用：

```
Use Skill: story-brain 我想深入了解一下：认知偏差
```

Skill 会自动调用 hv-analysis 进行深度研究，调用 concept-fable 生成故事化内容，并在结果输出前进行质量验证。

### 开发路线图

- [x] 故事化学习内容生成
- [x] 纵横分析法研究框架
- [x] 寓言故事与概念映射
- [x] 知识卡片展示
- [x] 知识关系图可视化
- [x] 本地 SQLite 数据存储
- [x] Obsidian Markdown 导出
- [x] 14 项质量验证系统
- [x] 动态主题库（代码与内容分离）
- [x] TRAE Skill 封装
- [ ] 用户认证与收藏功能
- [ ] 支持 OpenAI API 配置
- [ ] 多语言主题内容生成
- [ ] 知识图谱节点点击展开

### 许可证

本项目基于 MIT 许可证开源，详见 [LICENSE](LICENSE) 文件。

---

## English

### About

StoryBrain is an AI-powered learning tool that transforms complex topics into engaging stories. Based on cognitive science research showing humans remember stories **22x better** than isolated facts, it generates narrative-based learning content for any concept using a structured research methodology.

### Tech Stack

- **Frontend:** React 18 + Vite 5 + Tailwind CSS 3 + ReactFlow 11
- **Backend:** Node.js + Express 4
- **Data:** SQLite + JSON (dynamic topic loading)
- **AI:** TRAE Auto Model / OpenAI GPT-4

### Quick Start

```bash
# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Start services
./start.sh  # or manually: backend on :3001, frontend on :3000

# Open http://localhost:3000
```

### License

MIT License
