function generateStory(research, topic) {
  if (!research) {
    return {
      title: `关于"${topic}"的故事`,
      content: `这是一个关于${topic}的故事...`,
      chapters: []
    };
  }

  const chapters = [];

  if (research.vertical) {
    chapters.push({
      title: '第一章：起源',
      content: research.vertical
    });
  }

  if (research.horizontal) {
    chapters.push({
      title: '第二章：横向对比',
      content: research.horizontal
    });
  }

  if (research.insights) {
    chapters.push({
      title: '第三章：洞察',
      content: research.insights
    });
  }

  const narrativeContent = chapters.map(c => `## ${c.title}\n\n${c.content}`).join('\n\n---\n\n');

  return {
    title: `${topic}：一个关于知识的故事`,
    content: narrativeContent,
    chapters: chapters
  };
}

function generateKnowledgeCard(research, topic) {
  const concepts = [];
  const definitions = [];

  if (research && research.keyConcepts && research.keyConcepts.length > 0) {
    research.keyConcepts.forEach(concept => {
      concepts.push(concept.name);
      definitions.push(concept.definition);
    });
  } else {
    concepts = [
      `${topic}的核心概念`,
      `${topic}的应用场景`,
      `${topic}的发展历程`
    ];
    definitions = [
      `${topic}是一种重要的概念，它帮助我们理解和解决相关问题。`,
      `${topic}可以应用于多个领域，包括科技、商业和日常生活。`,
      `${topic}经历了长期的发展，从最初的概念到现在的成熟应用。`
    ];
  }

  return {
    concepts: concepts.slice(0, 5),
    definitions: definitions.slice(0, 5)
  };
}

function generateKnowledgeGraph(research, topic) {
  const nodes = [{ id: 1, label: topic, type: 'core' }];
  const edges = [];
  let nodeId = 2;

  if (research && research.keyConcepts) {
    research.keyConcepts.forEach(concept => {
      nodes.push({ id: nodeId, label: concept.name, type: 'concept' });
      edges.push({ from: 1, to: nodeId });
      nodeId++;
    });
  }

  if (research && research.relatedTopics) {
    research.relatedTopics.forEach(related => {
      nodes.push({ id: nodeId, label: related, type: 'related' });
      edges.push({ from: 1, to: nodeId });
      nodeId++;
    });
  }

  if (nodes.length === 1) {
    nodes.push(
      { id: 2, label: '核心概念', type: 'concept' },
      { id: 3, label: '应用场景', type: 'related' },
      { id: 4, label: '发展历程', type: 'concept' },
      { id: 5, label: '相关技术', type: 'related' }
    );
    edges.push(
      { from: 1, to: 2 },
      { from: 1, to: 3 },
      { from: 1, to: 4 },
      { from: 1, to: 5 }
    );
  }

  return { nodes, edges };
}

function buildCompleteStory(topic, research) {
  const story = generateStory(research, topic);
  const knowledgeCard = generateKnowledgeCard(research, topic);
  const knowledgeGraph = generateKnowledgeGraph(research, topic);

  return {
    title: story.title,
    content: story.content,
    chapters: story.chapters,
    knowledgeCard: knowledgeCard,
    knowledgeGraph: knowledgeGraph,
    topic: topic
  };
}

module.exports = {
  generateStory,
  generateKnowledgeCard,
  generateKnowledgeGraph,
  buildCompleteStory
};
