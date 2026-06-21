const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');
const TOPICS_FILE = path.join(DATA_DIR, 'topics.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadTopics() {
  if (!fs.existsSync(TOPICS_FILE)) {
    return [];
  }
  const data = fs.readFileSync(TOPICS_FILE, 'utf8');
  return JSON.parse(data);
}

function saveTopics(topics) {
  fs.writeFileSync(TOPICS_FILE, JSON.stringify(topics, null, 2), 'utf8');
}

function getTopicBySlug(slug) {
  const topics = loadTopics();
  return topics.find(t => t.slug === slug);
}

function getTopicByName(name) {
  const topics = loadTopics();
  return topics.find(t => t.name === name);
}

function addTopic(topic) {
  const topics = loadTopics();
  topic.slug = topic.slug || topic.name.toLowerCase().replace(/\s+/g, '-');
  topic.createdAt = new Date().toISOString();
  topics.push(topic);
  saveTopics(topics);
  return topic;
}

function updateTopic(slug, updates) {
  const topics = loadTopics();
  const index = topics.findIndex(t => t.slug === slug);
  if (index === -1) return null;
  topics[index] = { ...topics[index], ...updates, updatedAt: new Date().toISOString() };
  saveTopics(topics);
  return topics[index];
}

function deleteTopic(slug) {
  const topics = loadTopics();
  const filtered = topics.filter(t => t.slug !== slug);
  saveTopics(filtered);
  return filtered;
}

module.exports = {
  loadTopics,
  saveTopics,
  getTopicBySlug,
  getTopicByName,
  addTopic,
  updateTopic,
  deleteTopic
};
