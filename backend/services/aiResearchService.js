/**
 * AI 研究服务 - 为任意概念生成深度研究内容
 * 
 * 调用流程：
 * 1. generateFable() - 生成寓言故事（带映射表和解读）
 * 2. generateVertical() - 生成纵向分析（起源与演进）
 * 3. generateHorizontal() - 生成横向对比分析
 * 4. generateInsights() - 生成洞察与未来展望
 * 5. generateKnowledgeCard() - 核心概念 + 延伸主题
 * 6. generateTags() - 分类标签
 * 
 * 使用方法：
 *   const { generateFullResearch } = require('./services/aiResearchService');
 *   const research = await generateFullResearch('人工智能');
 */

const fs = require('fs');
const path = require('path');

// ========== LLM API 配置 ==========
const API_KEY = process.env.OPENAI_API_KEY || process.env.LLM_API_KEY || '';
const API_URL = process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions';
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o';

// 如果没有配置API key，启用模拟模式（用于开发测试）
const isMockMode = !API_KEY || API_KEY.trim() === '';

async function callLLM(systemPrompt, userPrompt, { maxTokens = 2000, temperature = 0.7, topic = '新概念' } = {}) {
  // 模拟模式：根据主题生成合理的占位内容，topic显式传入避免正则提取错误
  if (isMockMode) {
    return mockLLMResponse(systemPrompt, userPrompt, topic);
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature,
        max_tokens: maxTokens
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LLM API 请求失败 (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    if (!data.choices || data.choices.length === 0) {
      throw new Error('LLM API 返回空内容');
    }

    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error('LLM 调用异常:', error.message);
    throw error;
  }
}

// ========== 主题知识库：从 data/ 目录动态加载 JSON 主题文件 ==========
// 新增主题只需在 backend/data/ 目录下放置 {主题名}.json 文件，无需修改此代码
// JSON 字段规范：slug、displayName、fable（含 title、story、explanation）、vertical、horizontal、
// insights、keyConcepts、relatedTopics、tags
const DATA_DIR = path.join(__dirname, '..', 'data');

const _topicCache = new Map();
let _availableTopics = null;

function _loadJSON(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`[主题加载] 读取/解析失败: ${filePath}`, err.message);
    return null;
  }
}

function listAvailableTopics() {
  if (_availableTopics) return _availableTopics;
  if (!fs.existsSync(DATA_DIR)) {
    _availableTopics = [];
    return _availableTopics;
  }
  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
  const topics = [];
  for (const file of files) {
    const filePath = path.join(DATA_DIR, file);
    const data = _loadJSON(filePath);
    if (!data) continue;
    const slug = file.replace('.json', '');
    const name = data.displayName || slug;
    topics.push({ slug, name, filePath, hasResearch: true });
  }
  _availableTopics = topics;
  return topics;
}

function findTopicKnowledge(topic) {
  if (!topic) return null;
  const safeTopic = topic.trim();
  const topics = listAvailableTopics();

  let hit = topics.find(t => t.name === safeTopic);
  if (!hit) hit = topics.find(t => t.slug === safeTopic);
  if (!hit) hit = topics.find(t => safeTopic.includes(t.name) || t.name.includes(safeTopic));
  if (!hit) return null;

  if (_topicCache.has(hit.slug)) return _topicCache.get(hit.slug);
  const data = _loadJSON(hit.filePath);
  if (data) _topicCache.set(hit.slug, data);
  return data;
}

function refreshTopicList() {
  _availableTopics = null;
  _topicCache.clear();
  return listAvailableTopics();
}


// ========== 模拟模式（无 API Key 时）==========
function mockLLMResponse(systemPrompt, userPrompt, topic) {
  // topic 由调用方显式传入
  const safeTopic = (topic && topic.length > 0 && topic.length <= 20)
    ? topic.replace(/[「""'`\s]+$/g, '').replace(/^[「""'`\s]+/g, '').trim()
    : '新概念';

  // 查找主题专属内容
  const topicInfo = findTopicKnowledge(safeTopic);

  return new Promise(resolve => {
    setTimeout(() => {
      // 优先使用主题知识库中的专属内容
      if (topicInfo) {
        if (systemPrompt.includes('寓言故事') || systemPrompt.includes('fable')) {
          resolve(JSON.stringify(topicInfo.fable));
        } else if (systemPrompt.includes('纵向分析') || systemPrompt.includes('历史')) {
          resolve(topicInfo.vertical);
        } else if (systemPrompt.includes('横向分析') || systemPrompt.includes('对比')) {
          resolve(topicInfo.horizontal);
        } else if (systemPrompt.includes('洞察') || systemPrompt.includes('未来')) {
          resolve(topicInfo.insights);
        } else if (systemPrompt.includes('知识整理专家') || systemPrompt.includes('核心知识点')) {
          resolve(JSON.stringify({
            keyConcepts: topicInfo.keyConcepts,
            relatedTopics: topicInfo.relatedTopics
          }));
        } else if (systemPrompt.includes('图书管理员') || systemPrompt.includes('知识分类') || systemPrompt.includes('tags')) {
          resolve(JSON.stringify(topicInfo.tags));
        } else {
          resolve(JSON.stringify(topicInfo.fable));
        }
        return;
      }

      // 未匹配知识库时，输出改进后的通用模板
      if (systemPrompt.includes('寓言故事') || systemPrompt.includes('fable')) {
        resolve(JSON.stringify({
          title: `${safeTopic}：一个探索的起点`,
          story: `有一位研究者踏入了一个新领域。他发现，在关于${safeTopic}的众多解释中，最有用的不是最抽象的理论，而是那些能与具体实践相互印证的洞察。他逐渐学会了用多重视角观察同一个问题——从原理出发看应用，从应用倒推反思原理，最终形成自己的理解框架。`,
          conceptName: safeTopic,
          oneSentence: `${safeTopic}是一个值得系统探索的概念，当前使用通用模板生成内容。建议接入真实 LLM API 以获得高质量专属内容。`,
          whyItMatters: `理解${safeTopic}的价值在于它能改变我们看问题的方式，提供新的分析工具和思维框架。`,
          keyPoints: [
            `${safeTopic}有明确的定义和适用范围，不应泛化为万能概念`,
            `理解${safeTopic}需要结合具体案例和实践经验`,
            `${safeTopic}与其他概念有联系和边界，需要系统梳理`,
            `应用${safeTopic}时注意前提条件和局限性`
          ],
          mapping: [
            { storyElement: '研究者踏入新领域', conceptMapping: '概念学习的起点 / 认知探索过程' },
            { storyElement: '多重视角观察同一个问题', conceptMapping: '多维度理解 / 系统性思维' },
            { storyElement: '从原理看应用，从应用倒推反思', conceptMapping: '理论与实践的双向互动' }
          ],
          foodForThought: `你想从哪个角度深入探索${safeTopic}？`,
          relatedConcept: {
            storyContinuation: '随着研究深入，研究者发现这一概念与其他多个领域有交叉连接。',
            conceptIntro: '跨学科融合 / 概念迁移能力'
          }
        }));
      } else if (systemPrompt.includes('纵向分析') || systemPrompt.includes('历史')) {
        resolve(`${safeTopic}作为一个值得深入了解的概念，其发展脉络可以从概念的提出、核心原理的系统化、应用场景的拓展三个阶段来梳理。建议接入真实 LLM API 以获得专属历史脉络分析。`);
      } else if (systemPrompt.includes('横向分析') || systemPrompt.includes('对比')) {
        resolve(`将${safeTopic}与相关概念进行对比，有助于理清其独特贡献和适用边界。建议接入真实 LLM API 以获得高质量的跨概念对比分析。`);
      } else if (systemPrompt.includes('洞察') || systemPrompt.includes('未来')) {
        resolve(`${safeTopic}的深层洞察和未来发展方向需要结合具体学科背景来分析。建议接入真实 LLM API 以获得高质量专属内容。`);
      } else if (systemPrompt.includes('知识整理专家') || systemPrompt.includes('核心知识点')) {
        resolve(JSON.stringify({
          keyConcepts: [
            { name: safeTopic, definition: `${safeTopic}的核心定义和关键原理（当前使用通用模板，建议接入 LLM 获得专属内容）。` }
          ],
          relatedTopics: [safeTopic, '相关概念']
        }));
      } else if (systemPrompt.includes('图书管理员') || systemPrompt.includes('知识分类') || systemPrompt.includes('tags')) {
        resolve(JSON.stringify({
          category: '通用知识',
          subCategory: safeTopic,
          coreConcepts: [safeTopic],
          applicationDomains: ['待完善'],
          relatedFields: ['待完善'],
          difficulty: '待完善',
          learningPath: ['待完善'],
          customTags: [safeTopic]
        }));
      } else {
        resolve(`关于${safeTopic}的研究内容。`);
      }
    }, 800);
  });
}

// ========== 工具函数 ==========

// 从LLM返回中解析JSON（处理可能的markdown代码块包裹）
function parseJSON(text) {
  if (!text) return null;
  let cleaned = text.trim();

  // 处理 ```json ... ``` 包裹
  const fencedMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch) {
    cleaned = fencedMatch[1].trim();
  }

  try {
    return JSON.parse(cleaned);
  } catch (e1) {
    // 尝试提取第一个完整的JSON对象
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      try {
        return JSON.parse(cleaned.substring(firstBrace, lastBrace + 1));
      } catch (e2) {
        console.warn('JSON解析失败，原始内容:', cleaned.substring(0, 200));
        return null;
      }
    }
    return null;
  }
}

// 生成 slug
function toSlug(name) {
  return name.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\u4e00-\u9fa5-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'topic';
}

// ========== 各模块的生成函数 ==========

async function generateFable(topic, onProgress) {
  onProgress && onProgress('正在构思寓言故事...', 15);

  const systemPrompt = `你是一位擅长用寓言故事解释复杂概念的老师。你的任务是为一个学习概念创作一个引人入胜的寓言故事。

要求：
1. 故事必须有完整的起承转合（200-500字中文）
2. 故事中的每个关键元素都应该能映射回概念的核心原理
3. 语言通俗易懂，适合普通读者理解

请以严格的JSON格式返回，结构如下：
{
  "title": "故事标题（有诗意，不包含概念名）",
  "story": "完整的寓言故事正文（200-500字）",
  "conceptName": "概念名（原样返回）",
  "oneSentence": "用一句话定义这个概念",
  "whyItMatters": "为什么理解这个概念很重要（2-3句话）",
  "keyPoints": ["要点1", "要点2", "要点3", "要点4"],
  "mapping": [
    {"storyElement": "故事中的某事物", "conceptMapping": "它对应的概念原理"},
    {"storyElement": "...", "conceptMapping": "..."}
  ],
  "foodForThought": "一个引导读者进一步思考的开放性问题",
  "relatedConcept": {
    "storyContinuation": "用故事延续的方式引出一个相关概念（100字）",
    "conceptIntro": "这个相关概念的一句话介绍"
  }
}`;

  const userPrompt = `请为主题：「${topic}」创作一个寓言故事和完整解读。

要求：
- 故事要有情节和人物，不要太抽象
- 故事正文控制在200-500字
- mapping 部分至少要有4组对应关系
- keyPoints 至少3-5条
- 所有内容用中文回答
- 严格返回JSON，不要有任何JSON之外的文字

请开始：`;

  const response = await callLLM(systemPrompt, userPrompt, { maxTokens: 2500, temperature: 0.8, topic });
  const parsed = parseJSON(response);

  if (!parsed || !parsed.story) {
    throw new Error('寓言故事生成失败：返回内容无法解析');
  }

  return parsed;
}

async function generateVertical(topic, onProgress) {
  onProgress && onProgress('正在追溯历史脉络...', 30);

  const systemPrompt = `你是一位擅长概念史分析的研究员。你的任务是为一个概念撰写「纵向分析」——即它的起源、发展、演进到当前状态的完整历史脉络。

要求：
- 800-1500字中文
- 分阶段描述（可以自然分段，不需要小标题）
- 包含重要的历史节点、关键人物/事件、转折点
- 有清晰的时间线逻辑
- 语言流畅、有深度，不要教科书式罗列`;

  const userPrompt = `请为主题「${topic}」撰写纵向分析（起源与演进）。

内容要求：
1. 这个概念最早是如何被提出/发现的？有怎样的历史背景？
2. 它经历了哪些关键发展阶段？每个阶段有什么标志性事件或人物？
3. 在发展过程中遇到过什么困难或争议？如何解决的？
4. 它当前的状态是怎样的？有哪些最新进展？
5. 请用800-1500字完成，分段清晰，语言流畅。

请只返回分析正文，不需要小标题或其他格式：`;

  return await callLLM(systemPrompt, userPrompt, { maxTokens: 2500, temperature: 0.7, topic });
}

async function generateHorizontal(topic, onProgress) {
  onProgress && onProgress('正在进行横向对比分析...', 50);

  const systemPrompt = `你是一位擅长跨领域比较分析的专家。你的任务是为一个概念撰写「横向分析」——把它放到更广阔的知识地图中，与相似/相关概念进行对比，明确它的定位和适用边界。

要求：
- 800-1500字中文
- 自然分段，逻辑清晰
- 明确该概念与相似概念的异同
- 指出适用场景和不适用场景
- 给出实际应用中的组合策略`;

  const userPrompt = `请为主题「${topic}」撰写横向对比分析。

内容要求：
1. 这个概念与哪些传统/相似概念有本质区别？区别在哪里？
2. 与哪些概念容易混淆？如何准确区分？
3. 它在什么场景下最有效？在什么场景下不适用？
4. 它与哪些概念组合使用效果最佳？
5. 用800-1500字完成，分段清晰，语言流畅。

请只返回分析正文：`;

  return await callLLM(systemPrompt, userPrompt, { maxTokens: 2500, temperature: 0.7, topic });
}

async function generateInsights(topic, onProgress) {
  onProgress && onProgress('正在提炼核心洞察...', 65);

  const systemPrompt = `你是一位有深刻洞察力的思想家。你的任务是对一个概念进行「洞察与未来展望」分析——总结它的本质、反直觉之处、以及它在未来可能的发展方向。

要求：
- 600-1200字中文
- 有思想深度，不要重复常识
- 包含至少2-3条「反直觉洞察」
- 对未来3-5年有合理的预测
- 语言流畅，有启发性`;

  const userPrompt = `请为主题「${topic}」撰写洞察与未来展望。

内容要求：
1. 这个概念最核心、最本质的洞察是什么？
2. 它有哪些「反直觉」的特点（初学者最容易理解错的地方）？
3. 它在实际应用中最大的价值在哪里（往往不在表面）？
4. 未来3-5年它最可能的发展方向是什么？有什么值得关注的趋势？
5. 它可能与哪些新技术/新概念结合产生新的可能性？

用600-1200字完成，语言流畅，有思考深度。

请只返回分析正文：`;

  return await callLLM(systemPrompt, userPrompt, { maxTokens: 2000, temperature: 0.8, topic });
}

async function generateKnowledgeCard(topic, onProgress) {
  onProgress && onProgress('正在整理核心概念...', 80);

  const systemPrompt = `你是一位知识整理专家。你的任务是为一个概念提炼核心知识点和延伸学习方向。

请以严格的JSON格式返回：
{
  "keyConcepts": [
    {"name": "概念1", "definition": "这个概念的精确定义（1-2句话）"},
    {"name": "概念2", "definition": "定义..."},
    ...(5-7个)
  ],
  "relatedTopics": ["延伸主题1", "延伸主题2", "延伸主题3", "延伸主题4", "延伸主题5", "延伸主题6"]
}`;

  const userPrompt = `请为主题「${topic}」提炼核心概念卡片和延伸主题。

要求：
- keyConcepts: 5-7个最核心的子概念，每个有清晰的1-2句话中文定义
- relatedTopics: 6个左右值得进一步学习的延伸主题
- 所有内容用中文

请严格返回JSON：`;

  const response = await callLLM(systemPrompt, userPrompt, { maxTokens: 1500, temperature: 0.7, topic });
  const parsed = parseJSON(response);

  if (!parsed || !parsed.keyConcepts) {
    throw new Error('核心概念生成失败');
  }

  return parsed;
}

async function generateTags(topic, onProgress) {
  onProgress && onProgress('正在生成分类标签...', 90);

  const systemPrompt = `你是一位图书管理员和知识分类专家。你的任务是为一个学习概念生成准确的分类标签，帮助学习者在知识库中快速定位。

请以严格的JSON格式返回：
{
  "category": "一级学科分类（如：计算机科学、经济学、物理学、心理学）",
  "subCategory": "二级分类（更具体的领域）",
  "coreConcepts": ["核心概念1", "核心概念2", "核心概念3", "核心概念4", "核心概念5"],
  "applicationDomains": ["应用领域1", "应用领域2", "应用领域3", "应用领域4"],
  "relatedFields": ["相关学科1", "相关学科2", "相关学科3"],
  "difficulty": "入门/进阶/专业（三选一）",
  "learningPath": ["阶段1", "阶段2", "阶段3", "阶段4", "阶段5"],
  "customTags": ["自定义标签1", "自定义标签2", "自定义标签3", "自定义标签4", "自定义标签5"]
}`;

  const userPrompt = `请为主题「${topic}」生成分类标签系统。

要求：
- category: 归入哪个大学科（如果不确定就用「通用知识」）
- subCategory: 更具体的二级分类
- coreConcepts: 这个主题下的5个核心子概念名称
- applicationDomains: 最典型的4个应用领域
- relatedFields: 3个最相关的其他学科
- difficulty: 三选一（入门/进阶/专业）
- learningPath: 5个阶段的学习路径名称
- customTags: 5个用于知识库检索的自定义关键词

请严格返回JSON：`;

  const response = await callLLM(systemPrompt, userPrompt, { maxTokens: 1000, temperature: 0.6, topic });
  const parsed = parseJSON(response);

  if (!parsed || !parsed.category) {
    return {
      category: '通用知识',
      subCategory: topic,
      coreConcepts: [topic, '核心原理', '应用方法', '实践案例'],
      applicationDomains: ['学习应用', '工作实践', '日常决策'],
      relatedFields: ['方法论', '认知科学'],
      difficulty: '入门',
      learningPath: ['概念理解', '原理掌握', '实践应用', '融会贯通'],
      customTags: [topic, '知识学习', '深度研究']
    };
  }

  return parsed;
}

// ========== 主函数：完整研究流程 ==========
async function generateFullResearch(topic, onProgress) {
  console.log(`🔬 开始动态研究: ${topic}`);
  console.log(`   API模式: ${isMockMode ? '🔵 模拟模式（未配置API Key）' : '🟢 真实LLM模式'}`);

  const startTime = Date.now();

  // 并行执行寓言 + 知识卡片（这两个相互独立）
  const [fable, knowledgeCard] = await Promise.all([
    generateFable(topic, onProgress),
    generateKnowledgeCard(topic, onProgress)
  ]);

  // 串行执行纵/横/洞察（顺序有逻辑意义）+ 标签
  const vertical = await generateVertical(topic, onProgress);
  const horizontal = await generateHorizontal(topic, onProgress);
  const insights = await generateInsights(topic, onProgress);
  const tags = await generateTags(topic, onProgress);

  onProgress && onProgress('整理研究成果...', 98);

  // 组装完整的研究数据（与 data/*.json 的格式保持一致）
  const researchData = {
    vertical,
    horizontal,
    insights,
    keyConcepts: knowledgeCard.keyConcepts,
    relatedTopics: knowledgeCard.relatedTopics,
    fable: {
      title: fable.title,
      story: fable.story,
      explanation: {
        conceptName: fable.conceptName || topic,
        oneSentence: fable.oneSentence,
        whyItMatters: fable.whyItMatters,
        keyPoints: fable.keyPoints,
        mapping: fable.mapping,
        foodForThought: fable.foodForThought,
        relatedConcept: fable.relatedConcept
      }
    },
    tags
  };

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`✅ 研究完成: ${topic} (耗时 ${elapsed}s)`);

  return researchData;
}

// ========== 保存研究结果到文件 ==========
function saveResearchData(slug, data, dataDir) {
  const dir = dataDir || path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const filePath = path.join(dir, `${slug}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`💾 研究成果已保存: ${filePath}`);
  return filePath;
}

// ========== 质量验证模块：在输出前对生成内容做结构性质量检查 ==========
const PLACEHOLDER_SIGNALS = [
  '创作一个寓言故事',
  '建议接入真实 LLM',
  '建议接入',
  '待完善',
  'A概念',
  'B概念',
  'C概念',
  'a concept',
  'Concept A',
  '通用模板'
];

const GENERIC_TOPIC_TAGS = ['系统性思维', '反馈循环', '复利效应', '认知升级',
  '实践方法论', '长期主义', '通用知识'];

function _containsAny(text, signals) {
  if (!text) return false;
  const t = typeof text === 'string' ? text : JSON.stringify(text);
  return signals.some(s => t.includes(s));
}

function validateResearchQuality(topicName, data, resultObj) {
  const checks = [];
  const issues = [];
  const warnings = [];
  const passed = [];

  // ---- 1. Topic 名称纯净度 ----
  const cleanTopic = (topicName || '').trim();
  const topicIsClean = cleanTopic.length <= 10 &&
    !_containsAny(cleanTopic, PLACEHOLDER_SIGNALS) &&
    !cleanTopic.includes('的故事') && cleanTopic.length > 0;
  checks.push({ key: 'topic_clean', ok: topicIsClean,
    detail: `主题名干净 (${cleanTopic})` });

  // ---- 2. 寓言故事有专属内容 ----
  const fable = resultObj.fable;
  if (fable && fable.story) {
    const hasStory = fable.story.length >= 200;
    checks.push({ key: 'fable_length', ok: hasStory,
      detail: `寓言故事字数=${fable.story.length}` });

    const containsOldTemplate =
      fable.story.includes('奇特的盒子') ||
      fable.story.includes('盒子里装着');
    checks.push({ key: 'fable_original', ok: !containsOldTemplate,
      detail: '寓言故事是专属原创内容（不是旧模板）' });

    const mapping = (fable.explanation && fable.explanation.mapping) || [];
    checks.push({ key: 'fable_mapping', ok: mapping.length >= 3,
      detail: `映射表条目=${mapping.length}` });
  } else {
    checks.push({ key: 'fable_missing', ok: false, detail: '缺少寓言故事' });
  }

  // ---- 3. 核心概念卡片质量 ----
  const concepts = (resultObj.knowledgeCard && resultObj.knowledgeCard.concepts) || [];

  // 检查概念名不是「主题的XX」模板格式
  const genericConcepts = concepts.filter(c => {
    const name = typeof c === 'string' ? c : c.name;
    if (!name) return false;
    // 判断：以主题开头 + 包含「的」 + 总长度 < 15
    const isGenericTemplate =
      (name.startsWith(cleanTopic) || name.startsWith(topicName)) &&
      name.includes('的') &&
      name.length < cleanTopic.length + 12;
    // 另一个判断：包含「XX的XX」格式且未出现专业括号符号
    const hasNoTechnicalContent =
      !name.includes('(') && !name.includes('（') &&
      !name.includes(' vs ') && !name.includes(' VS ') && !name.includes('/');
    return isGenericTemplate || (name.includes('的') && name.length < 8 && hasNoTechnicalContent && !name.includes('熵') && !name.includes('律') && !name.includes('论') && !name.includes('学'));
  });
  const conceptRealCount = concepts.length - genericConcepts.length;
  checks.push({ key: 'concepts_real', ok: conceptRealCount >= 3 && concepts.length >= 3,
    detail: `核心概念 ${concepts.length} 个中真实术语 ${conceptRealCount} 个` });

  // 检查概念是否有定义
  const conceptsWithDef = concepts.filter(c => {
    const def = typeof c === 'string' ? null : c.definition;
    return def && def.length >= 20;
  });
  checks.push({ key: 'concepts_definition', ok: conceptsWithDef.length >= 2,
    detail: `有定义的概念=${conceptsWithDef.length}` });

  // ---- 4. 延伸主题相关性 ----
  const related = (resultObj.knowledgeCard && resultObj.knowledgeCard.relatedTopics) || [];
  const genericRelated = related.filter(t => GENERIC_TOPIC_TAGS.some(g => t.includes(g)));
  checks.push({ key: 'related_specific',
    ok: related.length >= 3 && genericRelated.length === 0,
    detail: `延伸主题 ${related.length} 个，其中通用标签=${genericRelated.length}` });

  // ---- 5. 纵横分析章节内容长度 ----
  const chapters = resultObj.chapters || [];
  chapters.forEach((ch, i) => {
    const ok = ch.content && ch.content.length >= 200;
    checks.push({ key: `chapter_${i}_length`, ok,
      detail: `${ch.title} 字数=${ch.content ? ch.content.length : 0}` });
  });

  // ---- 6. 标签质量 ----
  const tags = resultObj.tags;
  if (tags) {
    checks.push({ key: 'tags_category', ok: tags.category !== '通用知识' && tags.category !== topicName,
      detail: `tags.category=${tags.category}` });
    checks.push({ key: 'tags_subcategory', ok: tags.subCategory !== topicName,
      detail: `tags.subCategory=${tags.subCategory}` });
    const hasRealCore = (tags.coreConcepts || []).some(c =>
      !c.includes(cleanTopic) && c !== '原理' && c !== '应用' && c !== '方法论' && c !== '待完善'
    );
    checks.push({ key: 'tags_core', ok: hasRealCore,
      detail: `tags.coreConcepts=${JSON.stringify(tags.coreConcepts)}` });
  } else {
    checks.push({ key: 'tags_missing', ok: false, detail: '缺少 tags 分类信息' });
  }

  // ---- 7. 无明显占位符文本 ----
  const fullText = JSON.stringify(resultObj);
  const foundPlaceholders = PLACEHOLDER_SIGNALS.filter(s => fullText.includes(s));
  checks.push({ key: 'no_placeholders', ok: foundPlaceholders.length === 0,
    detail: `占位符文本=${foundPlaceholders.length} 个 (${foundPlaceholders.slice(0,3).join(', ')})` });

  // ---- 评分与分级 ----
  const totalChecks = checks.length;
  const passedChecks = checks.filter(c => c.ok).length;
  const score = Math.round((passedChecks / totalChecks) * 100);

  let quality;
  if (score >= 80) quality = 'high';
  else if (score >= 55) quality = 'medium';
  else quality = 'low';

  checks.forEach(c => {
    if (c.ok) passed.push(c.detail);
    else if (score >= 60) warnings.push(c.detail);
    else issues.push(c.detail);
  });

  return {
    score,
    quality,
    totalChecks,
    passedChecks,
    passed,
    warnings,
    issues,
    checkDetails: checks,
    isKnowledgeBase: data && !!data._fromKnowledgeBase,
    source: (data && data._source) || (data && Object.keys(data).length > 10 ? 'knowledge_base' : 'unknown')
  };
}

module.exports = {
  generateFullResearch,
  generateFable,
  generateVertical,
  generateHorizontal,
  generateInsights,
  generateKnowledgeCard,
  generateTags,
  saveResearchData,
  validateResearchQuality,
  listAvailableTopics,
  findTopicKnowledge,
  toSlug,
  isMockMode
};
