const Database = require('better-sqlite3');
const path = require('path');

// 创建数据库连接
const dbPath = path.join(__dirname, '../database/storybrain.db');
const db = new Database(dbPath);

// 初始化数据库表
function initDatabase() {
  // 创建故事表
  db.exec(`
    CREATE TABLE IF NOT EXISTS stories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      topic TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      knowledge_card TEXT NOT NULL,
      knowledge_graph TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('✅ 数据库初始化完成');
}

// 保存故事
function saveStory(topic, title, content, knowledgeCard, knowledgeGraph) {
  const stmt = db.prepare(`
    INSERT INTO stories (topic, title, content, knowledge_card, knowledge_graph)
    VALUES (?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    topic,
    title,
    content,
    JSON.stringify(knowledgeCard),
    JSON.stringify(knowledgeGraph)
  );

  return result.lastInsertRowid;
}

// 获取所有故事
function getAllStories() {
  const stmt = db.prepare('SELECT * FROM stories ORDER BY created_at DESC');
  const stories = stmt.all();

  return stories.map(story => ({
    ...story,
    knowledge_card: JSON.parse(story.knowledge_card),
    knowledge_graph: JSON.parse(story.knowledge_graph)
  }));
}

// 根据ID获取故事
function getStoryById(id) {
  const stmt = db.prepare('SELECT * FROM stories WHERE id = ?');
  const story = stmt.get(id);

  if (story) {
    return {
      ...story,
      knowledge_card: JSON.parse(story.knowledge_card),
      knowledge_graph: JSON.parse(story.knowledge_graph)
    };
  }

  return null;
}

module.exports = {
  initDatabase,
  saveStory,
  getAllStories,
  getStoryById
};
