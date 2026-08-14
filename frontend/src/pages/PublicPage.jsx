import React, { useEffect, useRef, useState } from 'react'
import { api } from '../api.js'
import { useToast } from '../components/Toast.jsx'
import Icon from '../components/Icon.jsx'

const SUGGESTIONS = [
  '学校的报到注册流程是怎样的？',
  '申请国家奖学金的流程和条件是什么？',
  '如何申请助学贷款和助学金？',
  '请假需要走什么流程？',
  '心理有压力可以找谁帮助？',
]

export default function PublicPage() {
  const toast = useToast()
  const [info, setInfo] = useState({ school_name: '', counselor_name: '', agent_ready: false })
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const listRef = useRef(null)

  useEffect(() => {
    api.publicInfo().then(setInfo).catch(() => {})
  }, [])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  const send = async (text) => {
    const content = (text ?? input).trim()
    if (!content || loading) return
    if (!info.agent_ready) {
      toast('咨询助手暂未开启，请稍后再试', 'error')
      return
    }
    const next = [...messages, { role: 'user', content }]
    setMessages(next)
    setInput('')
    setLoading(true)
    try {
      const res = await api.publicChat(next)
      setMessages([...next, { role: 'assistant', content: res.reply }])
    } catch (e) {
      setMessages([...next, { role: 'assistant', content: `⚠️ ${e.message}` }])
      toast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="public-wrap">
      <header className="public-header">
        <div className="public-brand">
          <div className="brand-logo">辅</div>
          <div>
            <div className="public-title">{info.school_name} · 智能咨询助手</div>
            <div className="public-sub">你好，我是 {info.counselor_name} 的 AI 助手，有什么可以帮你？</div>
          </div>
        </div>
        <a className="btn" href="#/">辅导员入口</a>
        <a className="btn topbar-student-entry" href="#/student">学生陪伴入口</a>
      </header>

      <div className="public-body">
        <div className="public-chat">
          <div className="public-msg-list" ref={listRef}>
            {messages.length === 0 && (
              <div className="public-welcome">
                <div className="public-welcome-icon"><Icon name="spark" size={28} /></div>
                <h3>你好！我可以解答学校日常事宜</h3>
                <p className="text-dim">报到注册 · 选课学籍 · 奖学金助学金 · 宿舍生活 · 请假流程 · 就业指导</p>
                <div className="public-suggests">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} className="suggest-chip" onClick={() => send(s)}>{s}</button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`public-msg ${m.role === 'user' ? 'public-msg-user' : ''}`}>
                {m.role === 'assistant' && <div className="public-ava"><Icon name="spark" size={15} /></div>}
                <div className="public-bubble">{m.content}</div>
              </div>
            ))}
            {loading && (
              <div className="public-msg">
                <div className="public-ava"><Icon name="spark" size={15} /></div>
                <div className="public-bubble public-typing">正在思考…</div>
              </div>
            )}
          </div>
          <div className="public-input-bar">
            <div className="public-input-box">
              <textarea
                rows={1}
                placeholder="输入你的问题，例如：如何申请助学金？"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
                }}
              />
              <button className="btn btn-primary" disabled={loading} onClick={() => send()}>
                <Icon name="send" size={14} /> 发送
              </button>
            </div>
            <div className="chat-hint">Enter 发送 · 咨询内容仅供参考，具体以学校官方通知为准</div>
          </div>
        </div>
      </div>
    </div>
  )
}
