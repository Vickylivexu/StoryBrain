const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
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

  // --- 底部：Obsidian 友好的 metadata 区域 ---
  lines.push('---');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push(`*本文由 **故事脑 (StoryBrain)** 生成，基于 concept-fable 方法论和纵横分析法深度研究。*`);
  lines.push(`*生成时间：${new Date().toLocaleString('zh-CN')}*`);

  return lines.join('\n');
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
    const { topic, slug } = req.body;

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
    const { slug, topic } = req.body;

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
