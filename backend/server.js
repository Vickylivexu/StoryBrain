const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');
require('dotenv').config();

const { generateFullResearch, saveResearchData, toSlug, isMockMode, validateResearchQuality } = require('./services/aiResearchService');

const app = express();
const PORT = process.env.PORT || 3001;

const DATA_DIR = path.join(__dirname, 'data');

app.use(cors());
app.use(express.json());

// 服务前端静态文件
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// 读取研究数据
function loadResearchData(slug) {
  const filePath = path.join(DATA_DIR, `${slug}.json`);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const data = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(data);
}

// 获取所有可用主题
function getAvailableTopics() {
  if (!fs.existsSync(DATA_DIR)) {
    return [];
  }
  const files = fs.readdirSync(DATA_DIR);
  const topics = files
    .filter(f => f.endsWith('.json'))
    .map(f => {
      const slug = f.replace('.json', '');
      const data = loadResearchData(slug);
      return {
        slug,
        name: getTopicName(slug),
        hasResearch: !!data,
        concepts: data && data.keyConcepts ? data.keyConcepts.length : 0,
        hasFable: data && data.fable ? true : false,
        hasTags: data && data.tags ? true : false,
        category: data && data.tags ? data.tags.category : null,
        difficulty: data && data.tags ? data.tags.difficulty : null
      };
    });
  return topics;
}

// 生成 Markdown 内容
function generateMarkdown(topic, result, data) {
  const lines = [];
  const today = new Date().toISOString().split('T')[0];

  // --- YAML frontmatter (用于 Obsidian 的 metadata) ---
  const allTags = [];
  if (data && data.tags) {
    allTags.push(data.tags.category);
    allTags.push(data.tags.subCategory);
    (data.tags.coreConcepts || []).forEach(c => allTags.push(c));
    (data.tags.customTags || []).forEach(t => allTags.push(t));
  }

  lines.push('---');
  lines.push(`title: ${topic}`);
  lines.push(`aliases: ["${topic}的故事"]`);
  lines.push(`tags: [${allTags.join(', ')}]`);
  lines.push(`date: ${today}`);
  lines.push(`source: 故事脑 (StoryBrain)`);
  if (data && data.tags) {
    lines.push(`difficulty: ${data.tags.difficulty}`);
    lines.push(`category: ${data.tags.category}`);
    lines.push(`subCategory: ${data.tags.subCategory}`);
  }
  lines.push('---');
  lines.push('');

  // --- 顶部信息卡片 ---
  lines.push(`> 📚 **主题分类**：${data && data.tags ? `${data.tags.category} / ${data.tags.subCategory}` : '知识学习'}`);
  lines.push(`> 🎯 **难度**：${data && data.tags ? data.tags.difficulty : '入门'}`);
  lines.push('');

  // --- 寓言故事部分 ---
  if (result.fable) {
    lines.push(`# 📖 ${result.fable.title}`);
    lines.push('');
    lines.push(result.fable.story);
    lines.push('');
    lines.push('---');
    lines.push('');

    if (result.fable.explanation) {
      const exp = result.fable.explanation;
      lines.push(`## 📋 ${exp.conceptName} 解读`);
      lines.push('');
      if (exp.oneSentence) {
        lines.push(`**一句话定义**：${exp.oneSentence}`);
        lines.push('');
      }
      if (exp.whyItMatters) {
        lines.push(`**为什么重要**：${exp.whyItMatters}`);
        lines.push('');
      }
      if (exp.keyPoints && exp.keyPoints.length > 0) {
        lines.push('### 💡 核心要点');
        lines.push('');
        exp.keyPoints.forEach((point, i) => {
          lines.push(`${i + 1}. ${point}`);
        });
        lines.push('');
      }
      if (exp.mapping && exp.mapping.length > 0) {
        lines.push('### 🗺️ 故事元素 → 概念映射');
        lines.push('');
        lines.push('| 故事中的元素 | 对应的概念 |');
        lines.push('|-------------|-----------|');
        exp.mapping.forEach(m => {
          lines.push(`| ${m.storyElement} | ${m.conceptMapping} |`);
        });
        lines.push('');
      }
      if (exp.foodForThought) {
        lines.push('### 🤔 值得思考');
        lines.push('');
        lines.push(`> ${exp.foodForThought}`);
        lines.push('');
      }
      if (exp.relatedConcept) {
        lines.push('### 🔗 延伸：相关概念');
        lines.push('');
        lines.push(exp.relatedConcept.storyContinuation);
        lines.push('');
        lines.push(`> ${exp.relatedConcept.conceptIntro}`);
        lines.push('');
      }
    }
  }

  // --- 纵横分析部分 ---
  if (result.chapters && result.chapters.length > 0) {
    lines.push('---');
    lines.push('');
    lines.push('# 🔍 深度研究');
    lines.push('');

    result.chapters.forEach((chapter, idx) => {
      lines.push(`## ${chapter.title}`);
      lines.push('');
      lines.push(chapter.content);
      lines.push('');
    });
  }

  // --- 知识卡片部分 ---
  if (result.knowledgeCard && result.knowledgeCard.concepts && result.knowledgeCard.concepts.length > 0) {
    lines.push('---');
    lines.push('');
    lines.push('# 📝 核心概念卡片');
    lines.push('');

    const concepts = result.knowledgeCard.concepts;
    const definitions = result.knowledgeCard.definitions;

    concepts.forEach((concept, i) => {
      const name = typeof concept === 'string' ? concept : concept.name;
      const def = definitions ? definitions[i] : (typeof concept === 'string' ? '' : concept.definition);
      const emoji = ['🌐', '⚡', '🔗', '📊', '🎯', '💎', '🧩', '🔑', '📦', '🌱'];
      lines.push(`### ${emoji[i % emoji.length]} ${name}`);
      lines.push('');
      lines.push(def || '暂无定义');
      lines.push('');
    });

    if (result.knowledgeCard.relatedTopics && result.knowledgeCard.relatedTopics.length > 0) {
      lines.push('---');
      lines.push('');
      lines.push('### 🔍 延伸学习主题');
      lines.push('');
      result.knowledgeCard.relatedTopics.forEach(t => {
        lines.push(`- ${t}`);
      });
      lines.push('');
    }
  }

  // --- 知识图谱部分 (Obsidian 友好格式) ---
  if (result.knowledgeGraph && result.knowledgeGraph.nodes && result.knowledgeGraph.nodes.length > 0) {
    lines.push('---');
    lines.push('');
    lines.push('# 🕸️ 知识关系图');
    lines.push('');
    lines.push('> 在 Obsidian 中，这些概念可通过 [[内链]] 连接到你的其他笔记');
    lines.push('');
    lines.push('### 核心节点');
    lines.push('');
    result.knowledgeGraph.nodes.forEach(node => {
      const typeEmoji = node.type === 'core' ? '⭐' : node.type === 'concept' ? '💡' : '🔗';
      lines.push(`- ${typeEmoji} [[${node.label}]]`);
    });
    lines.push('');
  }

  // --- 学习路径建议 (Obsidian的MOC格式) ---
  if (data && data.tags && data.tags.learningPath && data.tags.learningPath.length > 0) {
    lines.push('---');
    lines.push('');
    lines.push('# 📖 学习路径建议');
    lines.push('');
    lines.push(`> 📚 **${data.tags.category} / ${data.tags.subCategory}** 推荐学习路径：`);
    lines.push('');
    data.tags.learningPath.forEach((step, i) => {
      lines.push(`${i + 1}. [[${step}]]`);
    });
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push(`**推荐前置知识**：`);
    (data.tags.relatedFields || []).forEach(f => {
      lines.push(`- [[${f}]]`);
    });
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  // --- 应用场景标签 ---
  if (data && data.tags && data.tags.applicationDomains && data.tags.applicationDomains.length > 0) {
    lines.push('### 💼 典型应用场景');
    lines.push('');
    data.tags.applicationDomains.forEach(domain => {
      lines.push(`- #${domain.replace(/\s+/g, '')}`);
    });
    lines.push('');
  }

  // --- 大学专业专属：学科分类信息（标签样式）---
  if (result.majorInfo) {
    lines.push('---');
    lines.push('');
    lines.push('# 🎓 学科分类信息');
    lines.push('');
    const m = result.majorInfo;

    // 基础信息标签（与 tags 风格统一）
    lines.push('### 🏷️ 基础信息');
    lines.push('');
    if (m.subjectCategory) lines.push(`- **学科大类**：#${m.subjectCategory.replace(/[\/\s]+/g, '')} — ${m.subjectCategory}`);
    if (m.subCategory) lines.push(`- **子领域**：#${m.subCategory.replace(/[\/\s]+/g, '')} — ${m.subCategory}`);
    if (m.degreeType) lines.push(`- **学位类型**：${m.degreeType}`);
    if (m.difficulty) lines.push(`- **学习难度**：${m.difficulty}`);
    lines.push('');

    // 核心课程标签
    if (m.keyCourses && m.keyCourses.length > 0) {
      lines.push('### 📖 核心课程');
      lines.push('');
      m.keyCourses.forEach(course => {
        lines.push(`- #${course.replace(/[\/\s]+/g, '')}  [[${course}]]`);
      });
      lines.push('');
    }

    // 专业方向标签
    if (m.specializations && m.specializations.length > 0) {
      lines.push('### 🔬 专业方向');
      lines.push('');
      m.specializations.forEach(spec => {
        lines.push(`- ${spec}`);
      });
      lines.push('');
    }

    // 就业方向标签
    if (m.careerPaths && m.careerPaths.length > 0) {
      lines.push('### 💼 就业方向');
      lines.push('');
      m.careerPaths.forEach(career => {
        lines.push(`- ${career}`);
      });
      lines.push('');
    }

    // 相近专业标签
    if (m.relatedMajors && m.relatedMajors.length > 0) {
      lines.push('### 🔗 相近专业');
      lines.push('');
      m.relatedMajors.forEach(major => {
        lines.push(`- [[${major}]]`);
      });
      lines.push('');
    }

    // 学科特点
    if (m.subjectAssessment) {
      lines.push('### 🌟 学科特点与就业建议');
      lines.push('');
      lines.push(m.subjectAssessment);
      lines.push('');
    }
  }

  // --- 底部：Obsidian 友好的 metadata 区域 ---
  lines.push('---');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push(`*本文由 **故事脑 (StoryBrain)** 生成，基于 concept-fable 方法论和纵横分析法深度研究。*`);
  lines.push(`*生成时间：${new Date().toLocaleString('zh-CN')}*`);

  return lines.join('\n');
}

// 生成 HTML 内容（用于 PDF 渲染，独立样式，避免 oklch 问题）
function generateHTML(topic, result, data) {
  const escapeHTML = (s) => {
    if (s === null || s === undefined) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  const formatText = (s) => {
    if (!s) return '';
    return escapeHTML(s).replace(/\n/g, '<br/>');
  };

  let body = '';

  // 顶部主题信息
  body += `
    <div class="cover">
      <h1>${escapeHTML(topic)}的故事</h1>
      <p class="subtitle">故事脑（StoryBrain）· 用故事把新知识装进脑子里</p>
      <p class="meta">分类：${escapeHTML((data && data.tags) ? (data.tags.category + ' / ' + data.tags.subCategory) : '知识学习')}　|　难度：${escapeHTML((data && data.tags) ? data.tags.difficulty : '入门')}</p>
      <p class="meta-sm">生成时间：${new Date().toLocaleString('zh-CN')}</p>
    </div>
  `;

  // 寓言故事
  if (result.fable) {
    body += `
      <section>
        <h2>📖 ${escapeHTML(result.fable.title)}</h2>
        <div class="story-text">${formatText(result.fable.story)}</div>
    `;

    if (result.fable.explanation) {
      const exp = result.fable.explanation;
      body += `<div class="explanation"><h3>${escapeHTML(exp.conceptName)} 解读</h3>`;
      if (exp.oneSentence) body += `<p><strong>一句话定义：</strong>${formatText(exp.oneSentence)}</p>`;
      if (exp.whyItMatters) body += `<p><strong>为什么重要：</strong>${formatText(exp.whyItMatters)}</p>`;
      if (exp.keyPoints && exp.keyPoints.length > 0) {
        body += `<p><strong>核心要点：</strong></p><ul>`;
        exp.keyPoints.forEach((p) => { body += `<li>${formatText(p)}</li>`; });
        body += `</ul>`;
      }
      if (exp.mapping && exp.mapping.length > 0) {
        body += `<table class="tbl"><thead><tr><th>故事中的元素</th><th>对应的概念</th></tr></thead><tbody>`;
        exp.mapping.forEach((m) => {
          body += `<tr><td>${formatText(m.storyElement)}</td><td>${formatText(m.conceptMapping)}</td></tr>`;
        });
        body += `</tbody></table>`;
      }
      if (exp.foodForThought) body += `<p class="note">🤔 ${formatText(exp.foodForThought)}</p>`;
      if (exp.relatedConcept) {
        body += `<p><strong>延伸：</strong>${formatText(exp.relatedConcept.storyContinuation)}</p>`;
        body += `<p class="note">${formatText(exp.relatedConcept.conceptIntro)}</p>`;
      }
      body += `</div>`;
    }
    body += `</section>`;
  }

  // 纵横分析章节
  if (result.chapters && result.chapters.length > 0) {
    result.chapters.forEach((chapter) => {
      body += `
        <section>
          <h2>${escapeHTML(chapter.title)}</h2>
          <div class="chapter-text">${formatText(chapter.content)}</div>
        </section>
      `;
    });
  }

  // 核心概念卡片
  if (result.knowledgeCard && result.knowledgeCard.concepts && result.knowledgeCard.concepts.length > 0) {
    body += `<section><h2>📝 核心概念</h2>`;
    const concepts = result.knowledgeCard.concepts;
    const definitions = result.knowledgeCard.definitions;
    body += `<div class="concept-grid">`;
    concepts.forEach((concept, i) => {
      const name = typeof concept === 'string' ? concept : concept.name;
      const def = definitions ? definitions[i] : (typeof concept === 'string' ? '' : concept.definition);
      body += `
        <div class="concept-card">
          <h4>${escapeHTML(name)}</h4>
          <p>${formatText(def)}</p>
        </div>
      `;
    });
    body += `</div>`;

    if (result.knowledgeCard.relatedTopics && result.knowledgeCard.relatedTopics.length > 0) {
      body += `<p class="tags-label">🔍 延伸学习主题：</p><div class="tags">`;
      result.knowledgeCard.relatedTopics.forEach((t) => {
        body += `<span class="tag">${escapeHTML(t)}</span>`;
      });
      body += `</div>`;
    }
    body += `</section>`;
  }

  // 学科分类信息（大学专业）
  if (result.majorInfo) {
    const m = result.majorInfo;
    body += `<section><h2>🎓 学科分类信息</h2>`;
    body += `<div class="major-info">`;
    if (m.subjectCategory) body += `<p><strong>学科大类：</strong>${escapeHTML(m.subjectCategory)}</p>`;
    if (m.subCategory) body += `<p><strong>子领域：</strong>${escapeHTML(m.subCategory)}</p>`;
    if (m.degreeType) body += `<p><strong>学位类型：</strong>${escapeHTML(m.degreeType)}</p>`;
    if (m.difficulty) body += `<p><strong>学习难度：</strong>${escapeHTML(m.difficulty)}</p>`;
    if (m.keyCourses && m.keyCourses.length > 0) {
      body += `<p><strong>核心课程：</strong></p><div class="tags">`;
      m.keyCourses.forEach((c) => { body += `<span class="tag">${escapeHTML(c)}</span>`; });
      body += `</div>`;
    }
    if (m.specializations && m.specializations.length > 0) {
      body += `<p><strong>专业方向：</strong></p><div class="tags">`;
      m.specializations.forEach((s) => { body += `<span class="tag">${escapeHTML(s)}</span>`; });
      body += `</div>`;
    }
    if (m.careerPaths && m.careerPaths.length > 0) {
      body += `<p><strong>就业方向：</strong></p><div class="tags">`;
      m.careerPaths.forEach((c) => { body += `<span class="tag">${escapeHTML(c)}</span>`; });
      body += `</div>`;
    }
    if (m.relatedMajors && m.relatedMajors.length > 0) {
      body += `<p><strong>相近专业：</strong></p><div class="tags">`;
      m.relatedMajors.forEach((c) => { body += `<span class="tag">${escapeHTML(c)}</span>`; });
      body += `</div>`;
    }
    if (m.subjectAssessment) {
      body += `<p><strong>学科特点与就业建议：</strong></p><p class="note">${formatText(m.subjectAssessment)}</p>`;
    }
    body += `</div></section>`;
  }

  // 页脚
  body += `<footer>本文由故事脑（StoryBrain）生成 · 基于 concept-fable 方法论和纵横分析法</footer>`;

  // 独立样式（只用 rgb/hex，避免 oklch）
  const css = `
    * { box-sizing: border-box; }
    body {
      font-family: "PingFang SC", "Microsoft YaHei", "Hiragino Sans GB", "STHeiti", "SimHei", sans-serif;
      color: rgb(51, 51, 51);
      font-size: 14px;
      line-height: 1.8;
      margin: 0;
      padding: 30px 40px;
      background: rgb(255, 255, 255);
    }
    h1, h2, h3, h4 { color: rgb(30, 41, 59); margin-top: 0; }
    .cover {
      text-align: center;
      padding: 40px 30px;
      margin-bottom: 30px;
      border-bottom: 2px solid rgb(200, 205, 220);
    }
    .cover h1 {
      font-size: 32px;
      margin: 0 0 10px 0;
      color: rgb(79, 70, 229);
    }
    .cover .subtitle { font-size: 15px; color: rgb(100, 116, 139); margin: 5px 0; }
    .cover .meta { font-size: 13px; color: rgb(100, 116, 139); margin: 5px 0; }
    .cover .meta-sm { font-size: 12px; color: rgb(148, 163, 184); margin: 5px 0; }
    section {
      margin-bottom: 30px;
      padding: 20px 25px;
      background: rgb(250, 251, 254);
      border: 1px solid rgb(225, 228, 238);
      border-radius: 8px;
      page-break-inside: avoid;
    }
    section h2 {
      font-size: 20px;
      color: rgb(67, 56, 202);
      border-bottom: 1px solid rgb(220, 220, 240);
      padding-bottom: 10px;
      margin-bottom: 15px;
    }
    section h3 { font-size: 16px; color: rgb(55, 48, 163); margin: 15px 0 10px 0; }
    section h4 { font-size: 15px; color: rgb(190, 24, 93); margin: 0 0 8px 0; }
    .story-text {
      font-style: italic;
      padding: 15px 18px;
      background: rgb(255, 250, 240);
      border-left: 4px solid rgb(245, 158, 11);
      border-radius: 4px;
    }
    .explanation {
      margin-top: 15px;
      padding: 15px 18px;
      background: rgb(255, 255, 255);
      border: 1px solid rgb(240, 240, 250);
      border-radius: 6px;
    }
    .chapter-text {
      font-size: 14px;
      color: rgb(60, 60, 70);
    }
    ul { padding-left: 22px; margin: 8px 0; }
    li { margin-bottom: 4px; }
    p { margin: 8px 0; }
    .tbl {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0;
      font-size: 13px;
    }
    .tbl th, .tbl td {
      border: 1px solid rgb(210, 210, 220);
      padding: 8px 12px;
      text-align: left;
    }
    .tbl th { background: rgb(240, 240, 250); color: rgb(67, 56, 202); }
    .tbl tr:nth-child(even) td { background: rgb(250, 250, 252); }
    .concept-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin: 10px 0;
    }
    .concept-card {
      flex: 1 1 calc(50% - 12px);
      min-width: 200px;
      padding: 12px 15px;
      background: rgb(255, 240, 245);
      border: 1px solid rgb(250, 200, 220);
      border-radius: 6px;
    }
    .tags-label { font-size: 13px; color: rgb(80, 80, 100); margin-top: 15px; }
    .tags { display: flex; flex-wrap: wrap; gap: 6px; margin: 6px 0; }
    .tag {
      display: inline-block;
      padding: 4px 10px;
      background: rgb(238, 242, 255);
      color: rgb(67, 56, 202);
      border: 1px solid rgb(216, 223, 245);
      border-radius: 12px;
      font-size: 12px;
    }
    .major-info {
      padding: 15px 18px;
      background: rgb(255, 248, 240);
      border-radius: 6px;
    }
    .note {
      padding: 10px 14px;
      background: rgb(255, 245, 225);
      border-left: 3px solid rgb(217, 119, 6);
      border-radius: 4px;
      margin: 10px 0;
    }
    footer {
      text-align: center;
      font-size: 12px;
      color: rgb(148, 163, 184);
      padding: 20px 0;
      border-top: 1px solid rgb(230, 230, 240);
      margin-top: 30px;
    }
  `;

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>${escapeHTML(topic)} - 故事脑</title>
  <style>${css}</style>
</head>
<body>
${body}
</body>
</html>`;
}

// 主题中文名映射
function getTopicName(slug) {
  const names = {
    'blockchain': '区块链',
    'quantum-computing': '量子计算',
    'compound-interest': '复利效应'
  };
  return names[slug] || slug;
}

// 根据输入文本查找匹配的主题
function findTopicByInput(input) {
  const topics = getAvailableTopics();
  const lowerInput = input.toLowerCase();
  // 精确匹配slug
  let matched = topics.find(t => t.slug === lowerInput);
  if (matched) return matched;
  // 匹配中文名或包含关键词
  matched = topics.find(t => 
    t.name === input || 
    lowerInput.includes(t.slug) || 
    input.includes(t.name)
  );
  return matched || null;
}

// API路由
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '故事脑服务运行正常' });
});

// 获取所有可用主题
app.get('/api/topics', (req, res) => {
  const topics = getAvailableTopics();
  res.json({ topics: topics });
});

// 生成故事 - 主API
app.post('/api/generate-story', async (req, res) => {
  try {
    const { topic, slug, category } = req.body;

    if (!topic && !slug) {
      return res.status(400).json({ error: '请提供学习主题' });
    }

    // 优先使用slug查找
    let researchData = null;
    let topicName = topic;
    let topicSlug = slug;

    if (slug) {
      researchData = loadResearchData(slug);
      topicName = getTopicName(slug);
    }

    // 如果slug没找到，尝试用topic名称匹配
    if (!researchData && topic) {
      const matched = findTopicByInput(topic);
      if (matched) {
        researchData = loadResearchData(matched.slug);
        topicSlug = matched.slug;
        topicName = matched.name;
      }
    }

    // 如果主题库中没有，调用AI动态生成研究内容
    if (!researchData) {
      console.log(`🔍 主题「${topic}」不在库中，启动AI动态研究...`);

      try {
        const progressTracker = [];
        const onProgress = (message, percent) => {
          progressTracker.push({ message, percent, time: new Date().toISOString() });
          console.log(`   📊 ${percent}% - ${message}`);
        };

        // 调用AI生成完整研究内容
        const aiResearch = await generateFullResearch(topic, onProgress);

        // 保存到本地数据文件（下次直接命中缓存）
        const newSlug = toSlug(topic);
        topicSlug = newSlug;
        topicName = topic;
        researchData = aiResearch;

        saveResearchData(newSlug, researchData, DATA_DIR);
        console.log(`✨ 动态研究完成: ${topic} → ${newSlug}.json`);
      } catch (aiError) {
        console.error('❌ AI研究生成失败，降级为占位内容:', aiError.message);
        // AI失败时，返回友好提示但不让用户体验中断
        const fallbackStory = {
          title: `${topic}的故事`,
          topic: topic,
          slug: null,
          fable: {
            title: `关于「${topic}」`,
            story: `故事脑正在为你研究「${topic}」...\n\n这是一个还未被深入分析的概念。由于当前AI服务暂时不可用，我们无法为你生成完整的寓言故事和深度分析。\n\n请稍后重试，或检查后端的 API Key 配置。`
          },
          chapters: [
            { title: '提示', content: `AI研究服务当前处于${isMockMode ? '模拟模式（未配置API Key）' : '调用失败状态'}。请在 backend/.env 中配置 LLM_API_KEY（或 OPENAI_API_KEY）后重启服务，以获得完整的动态研究能力。` }
          ],
          knowledgeCard: { concepts: [], relatedTopics: [] },
          knowledgeGraph: { nodes: [], edges: [] }
        };
        return res.json(fallbackStory);
      }
    }

    // 构建完整的故事对象 - 使用新的fable格式
    const concepts = researchData.keyConcepts || [];
    const definitions = concepts.map(c => c.definition);

    const result = {
      title: `${topicName}的故事`,
      topic: topicName,
      slug: topicSlug,
      fable: researchData.fable ? {
        title: researchData.fable.title,
        story: researchData.fable.story,
        explanation: researchData.fable.explanation
      } : null,
      chapters: [
        { title: '第一章：起源与演进', content: researchData.vertical },
        { title: '第二章：横向对比', content: researchData.horizontal },
        { title: '第三章：洞察与未来', content: researchData.insights }
      ],
      knowledgeCard: {
        concepts: concepts,
        definitions: definitions,
        relatedTopics: researchData.relatedTopics || []
      },
      knowledgeGraph: {
        nodes: concepts.slice(0, 6).map((c, i) => ({
          id: i + 2,
          label: c.name,
          type: 'concept'
        })).concat([{ id: 1, label: topicName, type: 'core' }]),
        edges: concepts.slice(0, 6).map((_, i) => ({
          from: 1, to: i + 2
        }))
      },
      tags: researchData.tags || null
    };

    // --- 大学专业：增加学科分类信息 ---
    if (category === 'major' && researchData.majorInfo) {
      result.majorInfo = researchData.majorInfo;
    } else if (category === 'major' && researchData.tags) {
      // 如果 JSON 中没有专门的 majorInfo，基于 tags 生成学科分类
      result.majorInfo = {
        subjectCategory: researchData.tags.category,
        subCategory: researchData.tags.subCategory,
        coreConcepts: researchData.tags.coreConcepts,
        applicationDomains: researchData.tags.applicationDomains,
        relatedFields: researchData.tags.relatedFields,
        learningPath: researchData.tags.learningPath,
        difficulty: researchData.tags.difficulty
      };
    }

    // 确保节点1在知识图谱中
    result.knowledgeGraph.nodes = [
      { id: 1, label: topicName, type: 'core' },
      ...result.knowledgeGraph.nodes.filter(n => n.id !== 1)
    ];

    // ---------- 质量验证 ----------
    const quality = validateResearchQuality(topicName, researchData, result);
    result.quality = quality;

    // 服务端日志（开发者诊断）
    const qLabel = quality.quality === 'high' ? '✅' : (quality.quality === 'medium' ? '⚠️' : '❌');
    console.log(`   ${qLabel} 质量验证: score=${quality.score}/100, quality=${quality.quality}, 检查${quality.passedChecks}/${quality.totalChecks}项`);
    if (quality.issues.length > 0) {
      console.log(`   ❌ 严重问题: ${quality.issues.join('; ')}`);
    }
    if (quality.warnings.length > 0) {
      console.log(`   ⚠️  警告: ${quality.warnings.join('; ')}`);
    }

    res.json(result);
  } catch (error) {
    console.error('生成故事失败:', error);
    res.status(500).json({ error: '生成故事失败，请重试' });
  }
});

// 获取单个主题详情
app.get('/api/topics/:slug', (req, res) => {
  const research = loadResearchData(req.params.slug);
  if (!research) {
    return res.status(404).json({ error: '主题不存在' });
  }

  const topicName = getTopicName(req.params.slug);

  const detailResult = {
    slug: req.params.slug,
    name: topicName,
    fable: research.fable,
    tags: research.tags,
    chapters: [
      { title: '第一章：起源与演进', content: research.vertical },
      { title: '第二章：横向对比', content: research.horizontal },
      { title: '第三章：洞察与未来', content: research.insights }
    ],
    knowledgeCard: {
      concepts: research.keyConcepts,
      relatedTopics: research.relatedTopics
    }
  };

  // ---------- 质量验证 ----------
  detailResult.quality = validateResearchQuality(topicName, research, detailResult);

  res.json(detailResult);
});

// 导出 Markdown 文件
app.post('/api/export-markdown', (req, res) => {
  try {
    const { slug, topic, category } = req.body;

    if (!slug && !topic) {
      return res.status(400).json({ error: '请提供主题' });
    }

    let researchData = null;
    let topicName = topic;
    let topicSlug = slug;

    if (slug) {
      researchData = loadResearchData(slug);
      topicName = getTopicName(slug);
    }

    if (!researchData && topic) {
      const matched = findTopicByInput(topic);
      if (matched) {
        researchData = loadResearchData(matched.slug);
        topicSlug = matched.slug;
        topicName = matched.name;
      }
    }

    if (!researchData) {
      return res.status(404).json({ error: '未找到该主题的研究数据' });
    }

    // 自动判断 category：如果主题数据中有 majorInfo 字段，则视为 major
    const effectiveCategory = category || (researchData.majorInfo ? 'major' : 'general');

    // 构建与前端相同的 result 对象
    const concepts = researchData.keyConcepts || [];
    const definitions = concepts.map(c => c.definition);

    const result = {
      title: `${topicName}的故事`,
      topic: topicName,
      slug: topicSlug,
      fable: researchData.fable ? {
        title: researchData.fable.title,
        story: researchData.fable.story,
        explanation: researchData.fable.explanation
      } : null,
      chapters: [
        { title: '第一章：起源与演进', content: researchData.vertical },
        { title: '第二章：横向对比', content: researchData.horizontal },
        { title: '第三章：洞察与未来', content: researchData.insights }
      ],
      knowledgeCard: {
        concepts: concepts,
        definitions: definitions,
        relatedTopics: researchData.relatedTopics || []
      },
      knowledgeGraph: {
        nodes: concepts.slice(0, 6).map((c, i) => ({
          id: i + 2,
          label: c.name,
          type: 'concept'
        })).concat([{ id: 1, label: topicName, type: 'core' }]),
        edges: concepts.slice(0, 6).map((_, i) => ({
          from: 1, to: i + 2
        }))
      },
      tags: researchData.tags || null
    };

    // 大学专业：增加学科分类信息（自动判断）
    if (effectiveCategory === 'major' && researchData.majorInfo) {
      result.majorInfo = researchData.majorInfo;
    } else if (effectiveCategory === 'major' && researchData.tags) {
      result.majorInfo = {
        subjectCategory: researchData.tags.category,
        subCategory: researchData.tags.subCategory,
        coreConcepts: researchData.tags.coreConcepts,
        applicationDomains: researchData.tags.applicationDomains,
        relatedFields: researchData.tags.relatedFields,
        learningPath: researchData.tags.learningPath,
        difficulty: researchData.tags.difficulty
      };
    }

    // 生成 Markdown
    const markdown = generateMarkdown(topicName, result, researchData);

    const filename = `${topicSlug || topicName}-故事脑.md`;
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

    res.send(markdown);
  } catch (error) {
    console.error('导出 Markdown 失败:', error);
    res.status(500).json({ error: '导出失败，请重试' });
  }
});

// 导出 PDF 文件
app.post('/api/export-pdf', async (req, res) => {
  let browser = null;
  try {
    const { slug, topic, category } = req.body;

    if (!slug && !topic) {
      return res.status(400).json({ error: '请提供主题' });
    }

    let researchData = null;
    let topicName = topic;
    let topicSlug = slug;

    if (slug) {
      researchData = loadResearchData(slug);
      topicName = getTopicName(slug);
    }

    if (!researchData && topic) {
      const matched = findTopicByInput(topic);
      if (matched) {
        researchData = loadResearchData(matched.slug);
        topicSlug = matched.slug;
        topicName = matched.name;
      }
    }

    if (!researchData) {
      return res.status(404).json({ error: '未找到该主题的研究数据' });
    }

    // 自动判断 category：如果主题数据中有 majorInfo 字段，则视为 major
    const effectiveCategory = category || (researchData.majorInfo ? 'major' : 'general');

    // 构建与前端相同的 result 对象
    const concepts = researchData.keyConcepts || [];
    const definitions = concepts.map(c => c.definition);

    const result = {
      title: `${topicName}的故事`,
      topic: topicName,
      slug: topicSlug,
      fable: researchData.fable ? {
        title: researchData.fable.title,
        story: researchData.fable.story,
        explanation: researchData.fable.explanation
      } : null,
      chapters: [
        { title: '第一章：起源与演进', content: researchData.vertical },
        { title: '第二章：横向对比', content: researchData.horizontal },
        { title: '第三章：洞察与未来', content: researchData.insights }
      ],
      knowledgeCard: {
        concepts: concepts,
        definitions: definitions,
        relatedTopics: researchData.relatedTopics || []
      },
      tags: researchData.tags || null
    };

    // 大学专业：增加学科分类信息
    if (effectiveCategory === 'major' && researchData.majorInfo) {
      result.majorInfo = researchData.majorInfo;
    } else if (effectiveCategory === 'major' && researchData.tags) {
      result.majorInfo = {
        subjectCategory: researchData.tags.category,
        subCategory: researchData.tags.subCategory,
        difficulty: researchData.tags.difficulty,
        keyCourses: researchData.tags.coreConcepts,
        specializations: researchData.tags.applicationDomains,
        learningPath: researchData.tags.learningPath,
        relatedMajors: researchData.tags.relatedFields
      };
    }

    // 生成 HTML
    const html = generateHTML(topicName, result, researchData);

    // 启动 puppeteer 渲染 PDF
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote'
      ]
    });

    const page = await browser.newPage();
    await page.setContent(html, {
      waitUntil: ['load', 'domcontentloaded'],
      timeout: 30000
    });

    // 等待字体/布局稳定
    await page.evaluateHandle('document.fonts && document.fonts.ready').catch(() => {});
    await new Promise(resolve => setTimeout(resolve, 300));

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '10mm',
        bottom: '10mm',
        left: '10mm',
        right: '10mm'
      },
      preferCSSPageSize: false
    });

    await browser.close();
    browser = null;

    const filename = `${topicSlug || topicName}-故事脑.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Type');
    res.send(Buffer.from(pdfBuffer));

  } catch (error) {
    console.error('导出 PDF 失败:', error);
    if (browser) {
      try { await browser.close(); } catch (e) {}
    }
    res.status(500).json({ error: '导出 PDF 失败：' + error.message });
  }
});

// 生产环境路由处理
app.get('*', (req, res) => {
  const distPath = path.join(__dirname, '../frontend/dist/index.html');
  if (fs.existsSync(distPath)) {
    res.sendFile(distPath);
  } else {
    res.json({ message: '故事脑后端服务运行中，请启动前端服务' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 故事脑服务运行在 http://localhost:${PORT}`);
  console.log(`📚 可用主题: ${getAvailableTopics().map(t => t.name).join('、')}`);
});
