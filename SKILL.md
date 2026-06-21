---
name: "story-brain"
description: "基于 concept-fable 方法论和纵横分析法，通过故事帮助用户深度理解概念，包含动态研究生成、知识分类标签、Obsidian Markdown 导出、输出质量验证。Invoke when user wants to learn a concept through storytelling, requests topic deep-dive research, or asks for systematic knowledge organization."
---

# StoryBrain - 故事化知识学习系统

StoryBrain 是一个结合 **concept-fable（概念寓言）** 和 **hv-analysis（纵横分析）** 的知识学习工具。它通过五个核心模块帮助用户深度理解任何概念：

1. **📖 概念寓言** - 用一个引人入胜的故事诠释核心概念
2. **🔍 纵横分析** - 纵向追溯起源发展 + 横向对比相关概念
3. **🏷️ 知识分类** - 学科分类、核心概念、应用领域、学习路径、关键词标签
4. **🕸️ 知识图谱** - 建立概念间的连接关系
5. **📥 Markdown 导出** - 一键导出为 Obsidian 兼容格式，永久整理进知识库

**新特性**：
- **动态研究生成**：用户输入任意新概念，系统即可生成完整研究（通过 `backend/data/` 目录动态加载 JSON 主题文件 + 可配置真实 LLM）
- **输出质量验证**：每次输出附 `quality` 对象，包含评分/等级/检查项明细/警告/严重问题，保证内容不是模板占位文字
- **Obsidian 元数据**：导出 Markdown 自动写入 YAML frontmatter，包含 tags / category / difficulty / learningPath 等信息

---

## 核心方法论

### Concept Fable（概念寓言）

用隐喻故事解释抽象概念。**完整结构**：

| 字段 | 说明 |
|------|------|
| `title` | 故事标题（如「藏书阁的秩序与岁月」） |
| `story` | 完整故事文本，≥ 200 字 |
| `explanation.conceptName` | 概念名（如「熵增定律」） |
| `explanation.oneSentence` | 一句话定义 |
| `explanation.whyItMatters` | 为什么重要 |
| `explanation.keyPoints` | 3-5 条核心要点 |
| `explanation.mapping` | 故事元素 → 概念映射表（≥ 3 条） |
| `explanation.foodForThought` | 值得思考的问题 |
| `explanation.relatedConcept` | 相关概念延伸（含故事续写和概念介绍） |

### HV-Analysis（纵横分析）

**纵轴（Vertical）**：概念的起源、演变脉络、关键里程碑

**横轴（Horizontal）**：与相似/相对概念对比，在领域中的定位

**洞察与未来**：综合分析 + 发展展望

### 知识分类标签（Tags）

每个主题输出结构化的元数据，为知识管理和导出 Obsidian 做准备：

| 字段 | 说明 |
|------|------|
| `category` | 学科大类（例：物理学、计算机科学、经济学） |
| `subCategory` | 子领域（例：热力学、分布式系统） |
| `coreConcepts` | 该主题下的核心概念清单 |
| `applicationDomains` | 典型应用领域 |
| `relatedFields` | 关联学科 |
| `difficulty` | 入门 / 进阶 / 专业 |
| `learningPath` | 推荐学习路径（步骤序列） |
| `customTags` | 自定义关键词标签（进入 Obsidian tags） |

---

## 使用场景

### 触发条件（INVOKE WHEN）：

- 用户想"深入理解某个概念/主题"
- 用户要求"用故事解释"或"用寓言说明"
- 用户需要"系统性研究"某个话题
- 用户说"帮我分析一下XXX"或"我想了解XXX"
- 用户想要"横向对比"或"纵向追溯"
- 用户希望"把某个概念整理进自己的笔记/Obsidian/知识库"
- 用户请求"输出一份研究报告/Markdown"

### 不适用场景：

- 用户只需要简单定义或名词解释
- 用户明确要求纯技术实现细节
- 用户只是想查一个事实/数据

---

## 完整工作流程

### Step 1: 确定研究主题

分析用户需求，明确核心概念。

```markdown
示例：
- 区块链
- 量子计算
- 复利效应
- 熵增定律
- 贝叶斯定理
- 认知偏差
```

### Step 2: 生成概念寓言（调用 concept-fable skill）

使用 concept-fable skill 生成完整寓言故事（title / story / explanation 所有子字段）。

### Step 3: 纵横分析（调用 hv-analysis skill）

使用 hv-analysis skill 进行三章深度研究（起源演进 / 横向对比 / 洞察与未来）。

### Step 4: 构建知识卡片与标签

- 提取 5-8 个核心概念（含定义）
- 列出 3-6 个延伸学习主题
- 生成完整 tags 元数据（见上表）
- 构建知识图谱（nodes/edges）

### Step 5: 质量验证（**必做**）

对输出内容运行质量检查。**若出现以下任一情况则不应交付，需重新生成**：

| 信号 | 含义 | 处置 |
|------|------|------|
| 概念名为「XX 的核心定义」「XX 的关键原理」 | 模板占位文字，未生成真实术语 | 重写概念清单 |
| story 字数 < 200 字 | 故事未生成或过短 | 重新生成故事 |
| tags.category = "通用知识" 或 subCategory = 主题名本身 | 分类未做 | 重新分类 |
| 含"建议接入真实 LLM"或"待完善" | 占位提示，未生成内容 | 重新研究 |
| relatedTopics = [主题名, "相关概念"] | 延伸主题未生成 | 补充关联主题 |
| quality.quality = "low" | 综合评分过低 | 重新研究 / 扩充知识库 |

质量验证标准输出（`quality` 对象）：

```json
{
  "score": 93,
  "quality": "high",
  "totalChecks": 14,
  "passedChecks": 13,
  "passed": ["主题名干净", "寓言故事字数≥200", "概念5个中真实术语5个", "..."],
  "warnings": [],
  "issues": [],
  "checkDetails": [...]
}
```

**质量等级**：high (≥80) / medium (55-79) / low (<55)

### Step 6: 整合输出 → JSON + Markdown

**JSON 标准格式**（后端 API 响应结构）：

```json
{
  "title": "熵增定律的故事",
  "topic": "熵增定律",
  "slug": "shang-zeng-ding-lv",
  "fable": {
    "title": "藏书阁的秩序与岁月",
    "story": "藏书阁的老馆长有一条奇怪的规定...",
    "explanation": {
      "conceptName": "熵增定律",
      "oneSentence": "一句话定义",
      "whyItMatters": "为什么重要",
      "keyPoints": ["要点1", "要点2", "要点3", "要点4", "要点5"],
      "mapping": [
        {"storyElement": "精心整理的藏书阁", "conceptMapping": "低熵状态 / 高度有序系统"}
      ],
      "foodForThought": "值得思考的问题",
      "relatedConcept": {"storyContinuation": "...", "conceptIntro": "..."}
    }
  },
  "chapters": [
    {"title": "第一章：起源与演进", "content": "纵向分析内容"},
    {"title": "第二章：横向对比", "content": "横向分析内容"},
    {"title": "第三章：洞察与未来", "content": "洞察与展望"}
  ],
  "knowledgeCard": {
    "concepts": [
      {"name": "熵 (Entropy)", "definition": "衡量系统混乱度..."}
    ],
    "relatedTopics": ["热力学与统计力学", "信息论与香农熵", "..."]
  },
  "knowledgeGraph": {"nodes": [...], "edges": [...]},
  "tags": {
    "category": "物理学",
    "subCategory": "热力学",
    "coreConcepts": ["熵", "热力学第二定律", "封闭系统", "耗散结构", "信息熵"],
    "applicationDomains": ["物理化学", "信息论", "系统生物学", "复杂性科学"],
    "relatedFields": ["统计力学", "量子信息", "非线性动力学"],
    "difficulty": "进阶",
    "learningPath": ["热力学基础", "统计力学入门", "熵的微观解释", "非平衡态热力学"],
    "customTags": ["热力学", "熵", "时间箭头", "开放系统", "涌现", "自组织"]
  },
  "quality": {
    "score": 100,
    "quality": "high",
    "totalChecks": 14,
    "passedChecks": 14,
    "warnings": [],
    "issues": []
  }
}
```

**Markdown 导出格式**（Obsidian 兼容）：

```markdown
---
title: 熵增定律
aliases: ["熵增定律的故事"]
tags: [物理学, 热力学, 熵, 热力学第二定律, 封闭系统, 时间箭头]
date: 2026-06-21
source: 故事脑 (StoryBrain)
difficulty: 进阶
category: 物理学
subCategory: 热力学
---

# 📖 藏书阁的秩序与岁月

（故事正文）

## 🗺️ 概念解读

**熵增定律**：（一句话定义）

**为什么重要**：...

### 💡 核心要点

1. ...
2. ...

### 🗺️ 故事-概念映射

| 故事中的元素 | 对应的概念 |
|-------------|-----------|
| 精心整理的藏书阁 | 低熵状态 / 高度有序的系统 |
| ... | ... |

### 🤔 值得思考

> 开放式思考问题...

---

# 🔍 深度研究

## 第一章：起源与演进

（纵向分析内容）

## 第二章：横向对比

（横向分析内容）

## 第三章：洞察与未来

（洞察与展望）

# 📝 核心概念卡片

### 📐 熵 (Entropy)
定义文本...

### 🔬 热力学第二定律
定义文本...

### 🔍 延伸学习主题

- 热力学与统计力学
- 信息论与香农熵
- ...

# 🕸️ 知识关系图

[[熵]]
[[热力学第二定律]]
[[信息熵]]
[[耗散结构]]

---

*本文由 **故事脑 (StoryBrain)** 生成，基于 concept-fable 方法论和纵横分析法深度研究。*
*生成时间：2026-06-21*
```

---

## 动态研究生成说明

系统通过三层机制支持用户输入**任意新概念**：

```
用户输入主题
  ↓
① backend/data/*.json 动态扫描
  ↓ 命中 → 直接返回（最新方式，最高质量）
② findTopicKnowledge() 实时查找
  ↓ 命中 → 即时构建完整研究对象
③ 真实 LLM（需在 backend/.env 配置 LLM_API_KEY / OPENAI_API_KEY）
  ↓ 未配置 → 回退通用模板（quality.score 通常 < 30）
```

**扩展指南**：要让更多主题达到 high 质量评分，只有一条路径：

**新增数据文件**：在 `backend/data/` 目录新增 `主题名.json`，结构参考 `传感器与执行器.json`。服务启动时自动扫描并加载。无需修改任何代码。

---

## 与其他 Skill 的协作

| 协作 Skill | 作用 | 调用时机 |
|-----------|------|---------|
| `concept-fable` | 生成寓言故事和概念映射 | Step 2 |
| `hv-analysis` | 进行纵横深度分析 | Step 3 |
| `lark-*` | 可选：将结果保存到飞书文档 | 输出阶段 |

---

## 技术实现参考

**前端技术栈**：
- React 18 + Vite
- Tailwind CSS（样式）
- ReactFlow（知识图谱可视化）
- Axios（API 调用）

**后端技术栈**：
- Node.js + Express
- 本地 JSON 文件存储研究数据
- `aiResearchService.js` 含：`generateFullResearch`、`generateFable`、`generateVertical`、`generateHorizontal`、`generateInsights`、`generateKnowledgeCard`、`generateTags`、`validateResearchQuality`、`TOPIC_KNOWLEDGE`
- 可配置 OpenAI / OpenAI-compatible API Key 接入真实 LLM

**API 端点**：

| 方法 | 路径 | 输入 | 输出 |
|------|------|------|------|
| `POST` | `/api/generate-story` | `{topic, slug?}` | 完整 JSON 研究对象（含 quality） |
| `POST` | `/api/export-markdown` | `{topic, slug}` | Obsidian 兼容的 Markdown 文本 |
| `GET` | `/api/topics` | 无 | 所有可用主题列表及元数据 |
| `GET` | `/api/topics/:slug` | 无 | 单个主题详情（含 quality） |
| `GET` | `/api/health` | 无 | 服务健康检查 |

**项目结构**：
```
StoryBrain/
├── frontend/              # React 前端应用
│   ├── src/
│   │   ├── App.jsx        # 主组件（输入/生成/展示）
│   │   └── components/
│   │       └── KnowledgeGraph.jsx
│   └── package.json
├── backend/               # Node.js 后端服务
│   ├── server.js         # Express 服务器 & 路由
│   ├── services/
│   │   └── aiResearchService.js  # 核心研究生成 + 质量验证 + 动态加载
│   └── data/             # 研究数据 JSON 文件（服务启动时自动扫描加载）
│       ├── 自动化.json
│       ├── 区块链.json
│       ├── 熵增定律.json
│       ├── 心理学效应.json
│       ├── 认知偏差.json
│       ├── 复利效应.json
│       ├── 量子计算.json
│       └── 传感器与执行器.json
└── SKILL.md              # 本文件（根目录）
```

**服务启动**：
```bash
# 后端
cd backend && node server.js
# 监听端口 3001

# 前端
cd frontend && npm run dev
# 监听端口 3000（Vite 代理 3001 的 API）
```

---

## 使用提示

1. **选择有深度的概念**：复杂概念更适合故事化解释，简单概念可直接定义
2. **故事要贴近生活**：选择用户熟悉的场景作为故事背景（村庄、藏书阁、花园等）
3. **映射要准确**：每个故事元素必须清晰对应一个概念要素
4. **纵横结合**：不要孤立分析，纵向追溯发展，横向对比关联
5. **知识分类要认真**：tags 直接进入 Obsidian YAML frontmatter，好的分类意味着好的知识管理
6. **质量验证不跳过**：低质量（low）或有占位符信号的内容不应交付给用户
7. **扩充主题知识库**：遇到用户高频研究但未收录的主题，应优先在 `backend/data/` 下新增 JSON 文件

---

## 示例对话

```
用户：我想深入了解一下区块链

助手：[INVOKE story-brain skill]
  → 使用 concept-fable 生成《青禾村的边缘记号》故事
  → 使用 hv-analysis 进行纵横分析（区块链的历史、与传统数据库的对比、未来发展）
  → 构建知识卡片（核心概念：区块链、比特币、以太坊、智能合约、DeFi、NFT、共识机制）
  → 生成 tags：category=计算机科学, subCategory=分布式系统, difficulty=进阶
  → 质量验证：score=100, quality=high
  → 调用 /api/export-markdown 生成 Obsidian 兼容 .md 文件
  → 交付给用户：可预览界面 + 一键下载 .md 文件
```

```
用户：帮我研究熵增定律，最后导出成 Obsidian 笔记

助手：[INVOKE story-brain skill]
  → 《藏书阁的秩序与岁月》寓言故事（含完整解释、映射表、思考问题）
  → 三章深度研究（19世纪热力学史 / 与经典力学和信息论的对比 / 开放系统和耗散结构展望）
  → 核心概念（熵、热力学第二定律、封闭 vs 开放系统、麦克斯韦妖、玻尔兹曼熵、时间箭头、耗散结构、信息熵）
  → 分类标签（物理学 / 热力学 / 进阶）
  → 质量验证：score=100, quality=high ✅
  → 生成并交付 .md 文件（含 YAML frontmatter + [[概念]] 内链）
```
