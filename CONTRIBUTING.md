# 贡献指南

感谢您对故事脑的兴趣！我们欢迎各种形式的贡献。

## 如何贡献

### 报告问题

发现 bug 或功能建议？请先搜索 [Issues](https://github.com/) 确保问题未被报告，然后提交新的 Issue 并附上：

- 清晰的问题描述
- 复现步骤
- 环境信息（Node.js 版本、操作系统等）
- 错误日志（如有）

### 新增主题

故事脑的核心价值在于主题内容库。在 `backend/data/` 下添加新的 JSON 文件即可贡献新主题。

**格式要求：**

请参考现有主题（如 `backend/data/传感器与执行器.json`）的结构，确保包含以下字段：

```json
{
  "slug": "主题名（英文或拼音）",
  "displayName": "主题显示名",
  "fable": {
    "title": "寓言标题",
    "story": "寓言故事正文（建议 300 字以上）",
    "explanation": {
      "conceptName": "概念名称",
      "oneSentence": "一句话定义",
      "whyItMatters": "为什么重要",
      "keyPoints": ["要点1", "要点2", "要点3", "要点4", "要点5"],
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
  "vertical": "纵向分析（历史演变，建议 300 字以上）",
  "horizontal": "横向对比（对比分析，建议 300 字以上）",
  "insights": "洞察与未来（建议 200 字以上）",
  "keyConcepts": [
    { "name": "概念名", "definition": "概念定义（建议 30 字以上）" }
  ],
  "relatedTopics": ["延伸主题1", "延伸主题2", "..."],
  "tags": {
    "category": "学科分类",
    "subCategory": "子领域",
    "coreConcepts": ["核心概念"],
    "applicationDomains": ["应用领域"],
    "relatedFields": ["关联学科"],
    "difficulty": "难度（入门/进阶/高级）",
    "learningPath": ["学习路径"],
    "customTags": ["自定义标签"]
  }
}
```

**质量标准：**
- 所有章节内容建议 >= 300 字
- 核心概念建议 >= 5 个，每个定义 >= 30 字
- 故事映射表建议 >= 3 条
- 避免出现占位符文本（如「建议接入」「XX」「placeholder」）
- 寓言故事中的概念应使用具体名称，不使用「A 概念」「B 概念」等代指

### 代码贡献

#### 开发环境设置

```bash
# 克隆仓库
git clone <repo-url>
cd StoryBrain

# 安装后端依赖
cd backend && npm install

# 安装前端依赖
cd ../frontend && npm install

# 启动后端（端口 3001）
cd backend && npm run dev

# 启动前端（端口 3000，另一终端）
cd frontend && npm run dev
```

#### 代码规范

- 使用 2 空格缩进
- 变量命名使用 camelCase
- 组件文件使用 PascalCase
- 提交前确保无 ESLint 错误
- 所有 API 变更需更新 README.md 中的接口文档

#### Pull Request 流程

1. Fork 本仓库并创建分支
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. 编写代码并测试

3. 提交代码（使用清晰的 commit message）
   ```bash
   git commit -m "feat: add new topic '机器学习'"
   ```

4. Push 到你的 Fork
   ```bash
   git push origin feature/your-feature-name
   ```

5. 在 GitHub 上创建 Pull Request

#### Commit Message 规范

遵循 [Conventional Commits](https://www.conventionalcommits.org/)：

- `feat:` 新功能
- `fix:` 修复 bug
- `docs:` 文档更新
- `style:` 代码格式（不影响功能）
- `refactor:` 重构
- `test:` 测试相关
- `chore:` 构建/工具相关

### 主题内容质量指南

编写高质量主题内容时请注意：

1. **寓言故事要具体**：使用具体的地名、人名、情节，不用 ABC 等代指
2. **历史分析要有时间线**：从起源到最新发展，覆盖关键里程碑
3. **横向对比要有区分度**：明确本主题与相邻概念的边界和联系
4. **概念定义要充实**：每个核心概念至少 30 字，包含定义 + 典型案例
5. **知识标签要系统**：覆盖学科/子领域/核心概念/应用/关联学科等多个维度

## 行为准则

请尊重所有参与者，保持友善和建设性的交流。

## 许可证

贡献的内容将基于 MIT 许可证发布。
