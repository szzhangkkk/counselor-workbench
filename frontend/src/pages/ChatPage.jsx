import React, { useEffect, useRef, useState } from 'react'
import { api } from '../api.js'
import { useToast } from '../components/Toast.jsx'
import Icon from '../components/Icon.jsx'

const SUGGESTIONS = [
  '我们班有多少学生？',
  '还有几个学生没落实就业？',
  '心理预警和危机名单有哪些？',
  '哪些同学旷课次数最多？',
  '上学期的平均成绩怎么样？',
]

export default function ChatPage() {
  const toast = useToast()
  const [mode, setMode] = useState('internal')
  const [sessions, setSessions] = useState([])
  const [sessionId, setSessionId] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [config, setConfig] = useState(null)
  const listRef = useRef(null)

  const loadSessions = () => api.listSessions().then(setSessions).catch(() => {})
  useEffect(() => { loadSessions(); api.getConfig().then(setConfig).catch(() => {}) }, [])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  // 打开会话
  const openSession = async (id) => {
    setSessionId(id)
    setMessages(await api.getSessionMessages(id).catch(() => []))
  }

  // 新建会话
  const newSession = async () => {
    const s = await api.createSession('新会话', mode)
    setSessionId(s.id); setMessages([]); loadSessions()
  }

  // 首次进入：自动打开最近一个会话
  useEffect(() => {
    if (sessions.length > 0 && !sessionId) openSession(sessions[0].id)
  }, [sessions])

  const persist = (id, role, content, title) =>
    api.saveMessage(id, role, content, title).catch(() => {})

  const send = async (text) => {
    const content = (text ?? input).trim()
    if (!content || loading) return
    let sid = sessionId
    if (!sid) {
      const s = await api.createSession(content.slice(0, 18), mode)
      sid = s.id; setSessionId(sid); loadSessions()
    }
    const next = [...messages, { role: 'user', content: `[模式：${mode}]\n${content}` }]
    setMessages(next); setInput(''); setLoading(true)
    persist(sid, 'user', content)
    try {
      const res = await api.chat(next, mode)
      const withReply = [...next, { role: 'assistant', content: res.reply }]
      setMessages(withReply)
      persist(sid, 'assistant', res.reply)
      loadSessions()
    } catch (e) {
      setMessages([...next, { role: 'assistant', content: `⚠️ ${e.message}` }])
      toast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const delSession = async (id) => {
    if (!confirm('删除该会话？此操作不可恢复')) return
    await api.deleteSession(id).catch(() => {})
    if (id === sessionId) { setSessionId(null); setMessages([]) }
    loadSessions()
  }

  return (
    <div className="chat-page" style={{ margin: -22, height: 'calc(100vh - 52px)' }}>
      <div className="chat-side">
        <div className="nav-section">模式</div>
        <div className="mode-tabs" style={{ flexDirection: 'column', alignItems: 'stretch', background: 'none', border: 'none', padding: 0 }}>
          <div className={`mode-tab ${mode === 'internal' ? 'active' : ''}`} onClick={() => setMode('internal')}>
            <Icon name="database" size={13} /> 对内 · 台账问答
          </div>
          <div className={`mode-tab ${mode === 'external' ? 'active' : ''}`} onClick={() => setMode('external')}>
            <Icon name="globe" size={13} /> 对外 · 学校事务
          </div>
        </div>

        <div className="nav-section" style={{ marginTop: 18 }}>快捷提问</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {SUGGESTIONS.map((s) => (
            <button key={s} className="btn" style={{ justifyContent: 'flex-start' }} onClick={() => send(s)}>{s}</button>
          ))}
        </div>

        <div className="nav-section" style={{ marginTop: 18 }}>历史会话
          <button className="btn btn-sm" style={{ float: 'right' }} onClick={newSession}><Icon name="plus" size={12} /> 新建</button>
        </div>
        <div className="session-list">
          {sessions.length === 0 && <div className="text-dim" style={{ fontSize: 12, padding: 6 }}>暂无会话</div>}
          {sessions.map((s) => (
            <div key={s.id} className={`session-item ${s.id === sessionId ? 'active' : ''}`} onClick={() => openSession(s.id)}>
              <Icon name="history" size={13} />
              <span className="grow session-title" title={s.title}>{s.title}</span>
              <span className="session-time">{s.updated_at}</span>
              <button className="session-del" onClick={(e) => { e.stopPropagation(); delSession(s.id) }}>✕</button>
            </div>
          ))}
        </div>

        <div className="sidebar-footer" style={{ marginTop: 'auto' }}>
          <span className="status-dot" style={{ background: config?.api_key ? 'var(--green)' : 'var(--amber)' }} />
          <span>{config?.api_key ? '已接入 ' + (config?.model || 'LLM') : '未配置 API，请到设置中填写'}</span>
        </div>
      </div>

      <div className="chat-main">
        <div className="chat-messages" ref={listRef}>
          {messages.length === 0 && (
            <div className="empty-state" style={{ paddingTop: 90 }}>
              <div className="big">✦</div>
              <div style={{ fontSize: 15, color: 'var(--text-dim)' }}>
                {mode === 'internal'
                  ? '对内模式：可查询本地台账数据（就业 / 心理 / 成绩 / 考勤等）'
                  : '对外模式：可解答学生关于学校日常事务的咨询'}
              </div>
              <div className="mt-12" style={{ color: 'var(--text-faint)', fontSize: 13 }}>选择左侧模式，输入问题开始对话，历史记录自动保存（长对话已自动压缩，支持 50+ 轮）</div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`msg-row ${m.role === 'user' ? 'msg-user' : 'msg-assistant'}`}>
              <div className="msg-avatar">{m.role === 'user' ? <Icon name="students" size={14} /> : <Icon name="spark" size={14} />}</div>
              <div className="msg-content">{m.content.replace(/^\[模式：\w+\]\s*/, '')}</div>
            </div>
          ))}
          {loading && (
            <div className="msg-row msg-assistant">
              <div className="msg-avatar"><Icon name="spark" size={14} /></div>
              <div className="msg-content msg-typing">正在思考…</div>
            </div>
          )}
        </div>

        <div className="chat-input-bar">
          <div className="chat-input-box">
            <textarea
              rows={1}
              placeholder={mode === 'internal' ? '询问台账数据，例如：心理预警名单有哪些？' : '询问学校事宜，例如：奖学金申请条件是什么？'}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
              }}
            />
            <button className="btn btn-primary" disabled={loading} onClick={() => send()}>
              <Icon name="send" size={13} /> 发送
            </button>
          </div>
          <div className="chat-hint">Enter 发送 · Shift+Enter 换行 · 对话支持 50+ 轮长上下文（旧对话会被自动摘要）</div>
        </div>
      </div>
    </div>
  )
}
