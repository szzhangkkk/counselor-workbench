import React, { useEffect, useRef, useState } from 'react'
import { api, setStudentToken } from '../api.js'
import { useToast } from '../components/Toast.jsx'
import Icon from '../components/Icon.jsx'

const SUGGESTS = [
  '最近选课好纠结，能帮我参谋一下吗？',
  '本月生活费有点紧，有什么勤工机会？',
  '和舍友闹了点别扭，心里堵得慌',
  '我妈身体不太好，我上课也集中不了',
]

export default function StudentPage() {
  const toast = useToast()
  const [profile, setProfile] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [alerted, setAlerted] = useState(false)
  const [info, setInfo] = useState({})
  const listRef = useRef(null)

  const loadProfile = () => api.studentProfile().then(setProfile).catch(() => {})
  const loadHistory = async () => {
    try {
      const r = await api.studentHistory()
      setMessages(r.messages || [])
    } catch (e) {}
  }

  useEffect(() => {
    api.publicInfo().then(setInfo).catch(() => {})
    loadProfile(); loadHistory()
  }, [])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  const send = async (text) => {
    const content = (text ?? input).trim()
    if (!content || loading) return
    const next = [...messages, { role: 'user', content }]
    setMessages(next); setInput(''); setLoading(true)
    try {
      const res = await api.studentChat(next)
      setMessages([...next, { role: 'assistant', content: res.reply }])
      if (res.alert_id) {
        setAlerted(true)
        setTimeout(() => setAlerted(false), 4000)
        toast('我已悄悄转告辅导员，稍后可能会主动找你聊聊', 'error')
      }
      loadProfile()  // 画像可能更新
    } catch (e) {
      setMessages([...next, { role: 'assistant', content: `抱歉，刚才出错了：${e.message}` }])
      toast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try { await api.studentLogout() } catch (e) {}
    setStudentToken('')
    window.location.hash = '#/'
    window.location.reload()
  }

  return (
    <div className="student-page">
      <header className="student-header">
        <div className="student-brand-row">
          <div className="brand-logo" style={{ width: 38, height: 38, fontSize: 18, background: 'linear-gradient(135deg, #ff7e5f, #feb47b)' }}>心</div>
          <div>
            <div className="student-title">{info.school_name || '校园'} · 学生陪伴助手</div>
            <div className="student-sub">
              {profile ? <>你好 <b>{profile.name}</b>，{profile.class_name} {profile.major}</> : '加载中…'}
              {profile?.hobbies && <span className="student-tag">爱好：{profile.hobbies}</span>}
            </div>
          </div>
        </div>
        <button className="btn" onClick={logout}><Icon name="logout" size={14} /> 退出</button>
      </header>

      {alerted && (
        <div className="student-banner">
          <Icon name="heart" size={14} /> 我把你接住的话悄悄告诉了辅导员，TA 可能会主动找你。如果不愿，可以直接告诉 TA 不需要。
        </div>
      )}

      <div className="student-chat" ref={listRef}>
        {messages.length === 0 && (
          <div className="student-welcome">
            <div className="student-welcome-icon"><Icon name="heart" size={26} /></div>
            <h3>嗨，{profile?.name || '同学'}，把你今天的喜怒哀乐告诉我吧</h3>
            <p className="text-dim">选课纠结、学业吃力、关系困扰、压力山大都可以聊。我会在你需要时悄悄帮你联系辅导员。</p>
            <div className="student-suggests">
              {SUGGESTS.map((s) => (
                <button key={s} className="suggest-chip-warm" onClick={() => send(s)}>{s}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`student-msg ${m.role === 'user' ? 'student-msg-user' : ''}`}>
            {m.role === 'assistant' && (
              <div className="student-ava"><Icon name="heart" size={14} /></div>
            )}
            <div className="student-bubble">{m.content}</div>
          </div>
        ))}
        {loading && (
          <div className="student-msg">
            <div className="student-ava"><Icon name="heart" size={14} /></div>
            <div className="student-bubble student-typing">在想怎么回你…</div>
          </div>
        )}
      </div>

      <div className="student-input-bar">
        <div className="student-input-box">
          <textarea
            rows={1}
            placeholder="想说什么都可以，我不会评判你。"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
            }}
          />
          <button className="btn warm-btn" disabled={loading} onClick={() => send()}>
            <Icon name="send" size={13} /> 说出来
          </button>
        </div>
        <div className="chat-hint">Enter 发送 · Shift+Enter 换行 · 对话内容只有你和辅导员可见</div>
      </div>
    </div>
  )
}