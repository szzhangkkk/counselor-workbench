import React, { useState, useEffect } from 'react'
import { api, setStudentToken } from '../api.js'
import { useToast } from '../components/Toast.jsx'
import Icon from '../components/Icon.jsx'

export default function StudentLoginPage({ onLogin }) {
  const toast = useToast()
  const [sid, setSid] = useState('')
  const [pwd, setPwd] = useState('')
  const [loading, setLoading] = useState(false)
  const [info, setInfo] = useState({ school_name: '', counselor_name: '' })

  useEffect(() => {
    api.publicInfo().then((i) => setInfo(i)).catch(() => {})
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await api.studentLogin(sid, pwd)
      setStudentToken(res.token)
      toast('欢迎回来，' + res.name)
      onLogin()
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="student-login-wrap">
      <div className="student-login-card">
        <div className="student-brand-row">
          <div className="brand-logo" style={{ width: 50, height: 50, fontSize: 24, background: 'linear-gradient(135deg, #ff7e5f, #feb47b)' }}>心</div>
          <div>
            <h1>{info.school_name || '校园'} · 学生陪伴助手</h1>
            <p>聊聊心事、问问选课、找找答案。这里是被认真倾听的地方。</p>
          </div>
        </div>
        <form onSubmit={submit}>
          <div className="login-field warm">
            <Icon name="students" size={16} />
            <input
              type="text"
              placeholder="学号"
              value={sid}
              autoFocus
              onChange={(e) => setSid(e.target.value)}
            />
          </div>
          <div className="login-field warm">
            <Icon name="lock" size={16} />
            <input
              type="password"
              placeholder="密码（学号即默认密码）"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
            />
          </div>
          <button className="btn btn-primary login-btn warm-btn" type="submit" disabled={loading}>
            {loading ? '正在握手…' : '进入对话'}
          </button>
        </form>
        <div className="login-links">
          <a href="#/public">
            <Icon name="globe" size={13} /> 我没拿到学号密码，去公共咨询
          </a>
        </div>
      </div>
    </div>
  )
}