import React, { useState, useEffect } from 'react'
import axios from 'axios'

function App() {
  const [topic, setTopic] = useState('')
  const [category, setCategory] = useState('general') // general / major
  const [loading, setLoading] = useState(false)
  const [story, setStory] = useState(null)
  const [error, setError] = useState('')
  const [availableTopics, setAvailableTopics] = useState([])
  const [view, setView] = useState('input')
  const [exportingMD, setExportingMD] = useState(false)
  const [exportingPDF, setExportingPDF] = useState(false)

  // 动态生成状态
  const [generating, setGenerating] = useState(false)
  const [generateStage, setGenerateStage] = useState(0)
  const [generateMessage, setGenerateMessage] = useState('')

  // 提取难度等级（只取 "——" 之前的部分）
  const getDifficultyLabel = (difficulty) => {
    if (!difficulty) return null
    const level = String(difficulty).split(' —— ')[0].trim()
    return level
  }

  // 通用文件下载逻辑
  const downloadFile = (blob, contentDisposition, defaultFilename) => {
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    let filename = defaultFilename
    if (contentDisposition) {
      const matches = contentDisposition.match(/filename\*?=(?:UTF-8'')?"?([^;"]+)"?/i)
      if (matches && matches[1]) {
        filename = decodeURIComponent(matches[1])
      }
    }
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  // 导出 Markdown 文件
  const handleExportMarkdown = async () => {
    if (!story || !story.slug) return
    setExportingMD(true)
    try {
      const response = await axios.post('/api/export-markdown', {
        slug: story.slug,
        topic: story.topic
      }, {
        responseType: 'arraybuffer',
        transformResponse: [(data) => data]
      })
      const blob = new Blob([response.data], { type: 'text/markdown;charset=utf-8' })
      const filename = `${story.slug || story.topic}-故事脑.md`
      downloadFile(blob, response.headers['content-disposition'], filename)
    } catch (err) {
      console.error('导出 Markdown 失败:', err)
      alert('导出失败，请重试')
    } finally {
      setExportingMD(false)
    }
  }

  // 导出 PDF 文件
  const handleExportPDF = async () => {
    if (!story || !story.slug) return
    setExportingPDF(true)
    try {
      const response = await axios.post('/api/export-pdf', {
        slug: story.slug,
        topic: story.topic
      }, {
        responseType: 'arraybuffer',
        transformResponse: [(data) => data],
        timeout: 120000 // PDF 渲染较慢，给予 2 分钟超时
      })
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const filename = `${story.slug || story.topic}-故事脑.pdf`
      downloadFile(blob, response.headers['content-disposition'], filename)
    } catch (err) {
      console.error('导出 PDF 失败:', err)
      let msg = '导出失败，请重试'
      if (err.response && err.response.data && err.response.data.error) {
        msg = err.response.data.error
      } else if (err.message) {
        msg = '导出失败：' + err.message
      }
      alert(msg)
    } finally {
      setExportingPDF(false)
    }
  }

  useEffect(() => {
    axios.get('/api/topics')
      .then(response => {
        setAvailableTopics(response.data.topics)
      })
      .catch(err => {
        console.error('加载主题失败:', err)
      })
  }, [])

  // 动态生成阶段提示（用于前端显示进度）
  const stageMessages = [
    '正在检索知识库...',
    '正在构思寓言故事...',
    '正在追溯历史脉络...',
    '正在进行横向对比...',
    '正在提炼核心洞察...',
    '正在整理核心概念...',
    '正在生成分类标签...',
    '整理最终成果...'
  ]

  const handleGenerate = async (inputTopic, slug) => {
    if (!inputTopic && !slug) {
      setError('请提供学习主题')
      return
    }

    setLoading(true)
    setGenerating(true)
    setError('')
    setStory(null)
    setGenerateStage(0)
    setGenerateMessage(stageMessages[0])

    // 进度提示轮询 - 每2秒推进一个阶段
    const progressInterval = setInterval(() => {
      setGenerateStage(prev => {
        const next = Math.min(prev + 1, stageMessages.length - 1)
        setGenerateMessage(stageMessages[next])
        return next
      })
    }, 2000)

    try {
      const response = await axios.post('/api/generate-story', {
        topic: inputTopic,
        slug: slug,
        category: category
      }, {
        timeout: 180000 // 3分钟超时，给AI足够的时间
      })

      clearInterval(progressInterval)
      setStory(response.data)
      setView('story')
    } catch (err) {
      clearInterval(progressInterval)
      setError('生成失败，请重试')
      console.error(err)
    } finally {
      clearInterval(progressInterval)
      setGenerating(false)
      setLoading(false)
    }
  }

  const handleTopicClick = (t) => {
    setTopic(t.name)
    handleGenerate(t.name, t.slug)
  }

  const handleBack = () => {
    setView('input')
    setStory(null)
    setTopic('')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50">
      {/* 头部 */}
      <header className="bg-white border-b border-indigo-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-2xl shadow-md">
                📚
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800 leading-tight">故事脑</h1>
                <p className="text-sm text-slate-500">用故事把新知识装进脑子里</p>
              </div>
            </div>
            {view === 'story' && (
              <button
                onClick={handleBack}
                className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors font-medium"
              >
                <span>←</span>
                <span>返回首页</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 主内容 */}
      <main className="max-w-5xl mx-auto px-6 py-10">
        {view === 'input' && (
          <div className="space-y-8">
            {/* 输入区域 / 生成中动画 */}
            {generating ? (
              <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 rounded-2xl shadow-xl border border-indigo-200 p-12">
                <div className="text-center">
                  {/* 动画图标 */}
                  <div className="relative w-24 h-24 mx-auto mb-8">
                    <div className="absolute inset-0 rounded-full border-4 border-indigo-200"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
                    <div className="absolute inset-2 rounded-full border-2 border-purple-300 border-b-transparent animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
                    <div className="absolute inset-0 flex items-center justify-center text-4xl">
                      🔬
                    </div>
                  </div>

                  <h2 className="text-2xl font-bold text-slate-800 mb-3">
                    正在研究「{topic}」...
                  </h2>
                  <p className="text-slate-500 mb-8 text-lg">
                    {generateMessage}
                  </p>

                  {/* 进度条 */}
                  <div className="w-full max-w-lg mx-auto bg-slate-200 rounded-full h-3 overflow-hidden shadow-inner">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${((generateStage + 1) / stageMessages.length) * 100}%` }}
                    ></div>
                  </div>
                  <p className="mt-4 text-sm text-slate-400">
                    AI正在进行深度研究，可能需要30-90秒。研究结果会自动保存。
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-10">
                <div className="text-center mb-8">
                  <div className="inline-block px-4 py-1.5 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium mb-4">
                    ✨ 纵横分析法 · 深度研究
                  </div>
                  <h2 className="text-3xl font-bold text-slate-800 mb-3">
                    你想学习什么？
                  </h2>
                  <p className="text-slate-500 text-lg">
                    输入一个概念或主题，让故事帮你理解它
                  </p>
                </div>
                {/* 分类选择 */}
                <div className="flex items-center justify-center gap-3 mb-6">
                  <button
                    onClick={() => setCategory('general')}
                    className={`px-6 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                      category === 'general'
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    🌐 通用
                  </button>
                  <button
                    onClick={() => setCategory('major')}
                    className={`px-6 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                      category === 'major'
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    🎓 大学专业
                  </button>
                </div>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="例如：区块链、量子计算、复利效应..."
                    className="flex-1 px-5 py-4 border-2 border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800 text-base transition-all"
                    onKeyPress={(e) => e.key === 'Enter' && handleGenerate(topic)}
                  />
                  <button
                    onClick={() => handleGenerate(topic)}
                    disabled={loading}
                    className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold text-base shadow-lg hover:shadow-xl"
                  >
                    {loading ? '研究中...' : '生成故事 →'}
                  </button>
                </div>
                {error && (
                  <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 text-sm">
                    ⚠️ {error}
                  </div>
                )}
              </div>
            )}

            {/* 推荐主题 */}
            {availableTopics.length > 0 && (
              <div>
                <h3 className="text-xl font-bold text-slate-800 mb-5 px-2">
                  <span className="text-indigo-500 mr-2">📖</span> 推荐主题
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {availableTopics.map((t) => (
                    <button
                      key={t.slug}
                      onClick={() => handleTopicClick(t)}
                      className="group relative p-7 bg-white border-2 border-slate-200 rounded-2xl hover:border-indigo-400 hover:shadow-xl transition-all text-left overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-100/50 to-purple-100/50 rounded-full -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-500" />
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-xl font-bold text-slate-800 group-hover:text-indigo-700 transition-colors">
                            {t.name}
                          </h4>
                          <span className="text-2xl opacity-60 group-hover:opacity-100 transition-opacity">→</span>
                        </div>
                        <p className="text-sm text-slate-500 mb-3">
                          点击开始深度研究
                        </p>
                        {/* 分类标签 */}
                        {t.category && (
                          <p className="text-xs text-slate-400 mb-3">
                            📚 {t.category} {t.difficulty ? `· ${getDifficultyLabel(t.difficulty)}` : ''}
                          </p>
                        )}
                        <div className="flex gap-2 flex-wrap">
                          {t.hasFable && (
                            <span className="bg-amber-100 text-amber-700 px-2.5 py-1 rounded-lg text-xs font-medium">
                              📖 有故事
                            </span>
                          )}
                          <span className="bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-lg text-xs font-medium">
                            {t.concepts} 个核心概念
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 使用说明 */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-10">
              <h3 className="text-xl font-bold text-slate-800 mb-8 text-center">
                <span className="text-indigo-500 mr-2">💡</span> 学习流程
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                  { step: 1, title: '概念寓言', desc: '用一个故事理解核心概念', emoji: '📖', color: 'from-amber-400 to-orange-500' },
                  { step: 2, title: '纵向分析', desc: '了解概念的起源与发展脉络', emoji: '🕰️', color: 'from-blue-400 to-cyan-500' },
                  { step: 3, title: '横向对比', desc: '与相关概念进行对比分析', emoji: '🔍', color: 'from-green-400 to-emerald-500' },
                  { step: 4, title: '知识图谱', desc: '建立概念间的连接关系', emoji: '🕸️', color: 'from-purple-400 to-pink-500' }
                ].map((item) => (
                  <div key={item.step} className="relative text-center group">
                    <div className={`w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center text-4xl shadow-lg group-hover:scale-110 transition-transform`}>
                      {item.emoji}
                    </div>
                    <p className="text-3xl font-bold text-slate-300 mb-1">{item.step}</p>
                    <h4 className="font-bold text-slate-800 mb-2">{item.title}</h4>
                    <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 故事展示 */}
        {view === 'story' && story && (
          <div className="space-y-6">
            {/* 知识标签 & 导出按钮 - 顶部信息栏 */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-3 flex-wrap mb-1">
                    <h2 className="text-2xl font-bold text-slate-800">{story.topic}</h2>
                    {story.quality && (
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                        story.quality.quality === 'high'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : story.quality.quality === 'medium'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {story.quality.quality === 'high' && '✅ 高品质'}
                        {story.quality.quality === 'medium' && '⚠️ 一般'}
                        {story.quality.quality === 'low' && '❌ 低质量'}
                        <span className="ml-1 opacity-75">{story.quality.score}分</span>
                      </span>
                    )}
                  </div>
                  {story.tags && (
                    <p className="text-sm text-slate-500">
                      {story.tags.category} · {story.tags.subCategory} · 难度：{getDifficultyLabel(story.tags.difficulty)}
                    </p>
                  )}
                  {story.quality && story.quality.warnings && story.quality.warnings.length > 0 && (
                    <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                      <span className="font-bold">⚠️ 内容提示：</span>
                      <span className="ml-2">{story.quality.warnings.join('；')}</span>
                    </div>
                  )}
                  {story.quality && story.quality.quality === 'low' && story.quality.issues && story.quality.issues.length > 0 && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
                      <span className="font-bold">ℹ️ 此内容为通用模板。</span>
                      <span className="ml-2">如需高质量专属内容，请在 backend/.env 中配置 LLM_API_KEY 后重启服务，或把主题加入知识库 TOPIC_KNOWLEDGE。</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    onClick={handleExportMarkdown}
                    disabled={exportingMD || !story.slug}
                    className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl font-semibold text-sm shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    <span className="text-lg">📝</span>
                    <span>{exportingMD ? '导出中...' : '导出 Markdown'}</span>
                  </button>
                  <button
                    onClick={handleExportPDF}
                    disabled={exportingPDF || !story.slug}
                    className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600 text-white rounded-xl font-semibold text-sm shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    <span className="text-lg">📄</span>
                    <span>{exportingPDF ? '导出中...' : '导出 PDF'}</span>
                  </button>
                </div>
              </div>
              {story.tags && (
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <div className="flex flex-wrap gap-2">
                    <span className="text-sm font-semibold text-slate-600 min-w-[80px]">💡 核心概念</span>
                    {story.tags.coreConcepts.slice(0, 5).map((c, i) => (
                      <span key={i} className="bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-medium border border-indigo-200">
                        {c}
                      </span>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-sm font-semibold text-slate-600 min-w-[80px]">🚀 应用领域</span>
                    {story.tags.applicationDomains.slice(0, 4).map((c, i) => (
                      <span key={i} className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg text-xs font-medium border border-emerald-200">
                        {c}
                      </span>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-sm font-semibold text-slate-600 min-w-[80px]">🏷️ 关键词</span>
                    {story.tags.customTags.slice(0, 5).map((c, i) => (
                      <span key={i} className="bg-purple-100 text-purple-700 px-3 py-1.5 rounded-lg text-xs font-medium border border-purple-200">
                        {c}
                      </span>
                    ))}
                  </div>
                  {story.tags.learningPath && story.tags.learningPath.length > 0 && (
                    <div className="flex flex-wrap gap-2 items-start pt-2">
                      <span className="text-sm font-semibold text-slate-600 min-w-[80px] mt-1">📚 学习路径</span>
                      <div className="flex flex-wrap gap-2 text-xs">
                        {story.tags.learningPath.map((c, i) => (
                          <span key={i} className="flex items-center">
                            {i > 0 && <span className="text-slate-400 mx-1">→</span>}
                            <span className="bg-slate-100 text-slate-700 px-2.5 py-1.5 rounded-lg border border-slate-200">{c}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 学科分类信息 - 大学专业模式 */}
              {story.majorInfo && (
                <div className="mt-6 p-6 bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 rounded-2xl border border-amber-200 shadow-sm">
                  <h3 className="text-lg font-bold text-amber-800 mb-4 flex items-center gap-2">
                    <span>🎓</span>
                    学科分类信息
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {story.majorInfo.subjectCategory && (
                      <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-800 px-3 py-1.5 rounded-xl border border-amber-200 text-xs font-medium shadow-sm">
                        <span>📚</span>
                        <span>{story.majorInfo.subjectCategory}</span>
                      </span>
                    )}
                    {story.majorInfo.subCategory && (
                      <span className="inline-flex items-center gap-1.5 bg-orange-100 text-orange-800 px-3 py-1.5 rounded-xl border border-orange-200 text-xs font-medium shadow-sm">
                        <span>🔬</span>
                        <span>{story.majorInfo.subCategory}</span>
                      </span>
                    )}
                    {story.majorInfo.difficulty && (
                      <span className="inline-flex items-center gap-1.5 bg-purple-100 text-purple-800 px-3 py-1.5 rounded-xl border border-purple-200 text-xs font-medium shadow-sm">
                        <span>⚖️</span>
                        <span>{getDifficultyLabel(story.majorInfo.difficulty)}</span>
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 寓言故事 - 核心亮点 */}
            {story.fable && (
              <div className="bg-gradient-to-br from-amber-50 via-white to-orange-50 rounded-2xl shadow-lg border border-amber-200 overflow-hidden">
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-1">
                  <div className="bg-white px-8 py-6">
                    <h2 className="text-2xl font-bold text-amber-700 flex items-center gap-3">
                      <span className="text-3xl">📖</span>
                      {story.fable.title}
                    </h2>
                  </div>
                </div>
                <div className="p-8">
                  <div className="prose prose-lg max-w-none">
                    <div className="text-slate-700 leading-loose text-lg whitespace-pre-line italic border-l-4 border-amber-400 pl-6 bg-white/60 py-4 rounded-r-xl">
                      {story.fable.story}
                    </div>
                  </div>
                </div>

                {/* 故事解释 */}
                {story.fable.explanation && (
                  <div className="border-t border-amber-200 bg-white/50">
                    <div className="p-8">
                      <h3 className="text-lg font-bold text-amber-700 mb-5 flex items-center gap-2">
                        <span className="w-1 h-6 bg-amber-500 rounded-full" />
                        {story.fable.explanation.conceptName} 解读
                      </h3>
                      <div className="space-y-5 text-slate-700">
                        <div>
                          <p className="text-sm font-semibold text-amber-600 uppercase tracking-wide mb-2">一句话定义</p>
                          <p className="leading-relaxed">{story.fable.explanation.oneSentence}</p>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-amber-600 uppercase tracking-wide mb-2">为什么重要</p>
                          <p className="leading-relaxed">{story.fable.explanation.whyItMatters}</p>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-amber-600 uppercase tracking-wide mb-2">核心要点</p>
                          <ul className="space-y-2">
                            {story.fable.explanation.keyPoints.map((point, i) => (
                              <li key={i} className="leading-relaxed pl-4 border-l-2 border-amber-300">
                                {point}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* 映射表 */}
                        {story.fable.explanation.mapping && story.fable.explanation.mapping.length > 0 && (
                          <div className="mt-8">
                            <p className="text-sm font-semibold text-amber-600 uppercase tracking-wide mb-4">
                              🗺️ 故事元素 → 概念映射
                            </p>
                            <div className="overflow-hidden rounded-xl border border-amber-200 shadow-sm">
                              <table className="w-full">
                                <thead>
                                  <tr className="bg-gradient-to-r from-amber-100 to-orange-100">
                                    <th className="text-left p-4 text-amber-800 font-semibold text-sm w-1/2">故事中的元素</th>
                                    <th className="text-left p-4 text-amber-800 font-semibold text-sm w-1/2">对应的概念</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {story.fable.explanation.mapping.map((m, i) => (
                                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-amber-50/30'}>
                                      <td className="p-4 text-slate-700 text-sm border-r border-amber-100">{m.storyElement}</td>
                                      <td className="p-4 text-slate-700 text-sm font-medium">{m.conceptMapping}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* 思考问题 */}
                        {story.fable.explanation.foodForThought && (
                          <div className="mt-6 p-5 bg-gradient-to-r from-amber-100/80 to-orange-100/80 rounded-xl border border-amber-200">
                            <p className="text-sm font-semibold text-amber-700 mb-2">🤔 值得思考</p>
                            <p className="text-slate-700 italic">{story.fable.explanation.foodForThought}</p>
                          </div>
                        )}

                        {/* 相关概念 */}
                        {story.fable.explanation.relatedConcept && (
                          <div className="mt-6 p-5 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200">
                            <p className="text-sm font-semibold text-indigo-700 mb-3">🔗 延伸：相关概念</p>
                            <p className="text-sm text-slate-700 mb-3 leading-relaxed">{story.fable.explanation.relatedConcept.storyContinuation}</p>
                            <p className="text-sm text-indigo-700 bg-white/60 px-3 py-2 rounded-lg inline-block">
                              {story.fable.explanation.relatedConcept.conceptIntro}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 分隔线标题 */}
            <div className="text-center py-4">
              <div className="inline-flex items-center gap-4">
                <div className="w-16 h-px bg-gradient-to-r from-transparent to-slate-300" />
                <span className="text-slate-500 font-medium text-sm">深入研究</span>
                <div className="w-16 h-px bg-gradient-to-l from-transparent to-slate-300" />
              </div>
            </div>

            {/* 章节内容 */}
            {story.chapters && story.chapters.map((chapter, idx) => (
              <div key={idx} className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
                <div className={`px-8 py-5 border-b ${idx === 0 ? 'bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200' : idx === 1 ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200' : 'bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200'}`}>
                  <h3 className={`text-lg font-bold ${idx === 0 ? 'text-blue-700' : idx === 1 ? 'text-green-700' : 'text-purple-700'} flex items-center gap-2`}>
                    <span>{idx === 0 ? '🕰️' : idx === 1 ? '🔍' : '🔮'}</span>
                    {chapter.title}
                  </h3>
                </div>
                <div className="p-8">
                  <div className="text-slate-700 leading-loose whitespace-pre-line text-base">
                    {chapter.content}
                  </div>
                </div>
              </div>
            ))}

            {/* 知识卡片 */}
            {story.knowledgeCard && story.knowledgeCard.concepts && story.knowledgeCard.concepts.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
                <div className="px-8 py-5 border-b bg-gradient-to-r from-rose-50 to-pink-50 border-rose-200">
                  <h3 className="text-lg font-bold text-rose-700 flex items-center gap-2">
                    📝 核心概念
                  </h3>
                </div>
                <div className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    {story.knowledgeCard.concepts.map((concept, idx) => (
                      <div key={idx} className="bg-gradient-to-br from-rose-50/50 to-white rounded-xl p-5 border border-rose-100 hover:border-rose-300 transition-colors group">
                        <h4 className="font-bold text-rose-700 mb-3 text-base group-hover:text-rose-800 transition-colors">
                          💡 {typeof concept === 'string' ? concept : concept.name}
                        </h4>
                        <p className="text-sm text-slate-600 leading-relaxed">
                          {typeof concept === 'string' ? (story.knowledgeCard.definitions ? story.knowledgeCard.definitions[idx] : '') : concept.definition}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* 延伸主题 */}
                  {story.knowledgeCard.relatedTopics && story.knowledgeCard.relatedTopics.length > 0 && (
                    <div className="pt-6 border-t border-slate-100">
                      <p className="text-sm font-semibold text-slate-600 mb-4">🔍 延伸学习主题</p>
                      <div className="flex flex-wrap gap-2">
                        {story.knowledgeCard.relatedTopics.map((topic, idx) => (
                          <span key={idx} className="bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 px-4 py-2 rounded-xl text-sm font-medium hover:from-indigo-200 hover:to-purple-200 transition-colors cursor-default border border-indigo-200">
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 返回按钮 */}
            <div className="text-center pt-6 pb-12">
              <button
                onClick={handleBack}
                className="px-10 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl hover:from-indigo-700 hover:to-purple-700 transition-all font-semibold text-base shadow-lg hover:shadow-xl"
              >
                🔄 学习其他主题
              </button>
            </div>
          </div>
        )}
      </main>

      {/* 页脚 */}
      <footer className="bg-white border-t border-slate-200 mt-8">
        <div className="max-w-5xl mx-auto px-6 py-6 text-center text-slate-500 text-sm">
          <p className="font-medium">故事脑 © 2024 - 让学习变得有趣</p>
          <p className="text-slate-400 text-xs mt-2">基于 concept-fable 方法论 & 纵横分析法</p>
        </div>
      </footer>
    </div>
  )
}

export default App
