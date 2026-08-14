import React, { useEffect, useState } from 'react'
import { api, setCounselorToken, setCounselorAccount } from '../api.js'
import { useToast } from '../components/Toast.jsx'
import Icon from '../components/Icon.jsx'

export default function LoginPage({ onLogin }) {
  const toast = useToast()
  const [mode, setMode] = useState('login')  // login | register
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [needsSetup, setNeedsSetup] = useState(false)

  useEffect(() => {
    api.counselorStatus().then((s) => {
      if (s.need_setup) {
        setNeedsSetup(true); setMode('register')
      }
    }).catch(() => {})
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      let r
      if (mode === 'login') {
        r = await api.counselorLogin(username, password)
        if (r.token) { setCounselorToken(r.token); setCounselorAccount(r.account) }
        toast('欢迎回来，' + r.account.name)
        onLogin()
      } else {
        r = await api.counselorRegister({ username, password, name, email })
        if (r.token) { setCounselorToken(r.token); setCounselorAccount(r.account) }
        toast('注册成功，已自动登录')
        onLogin()
      }
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const quickLogin = async () => {
    setUsername('1403946941'); setPassword('1403946941')
    setLoading(true)
    try {
      const r = await api.counselorLogin('1403946941', '1403946941')
      setCounselorToken(r.token); setCounselorAccount(r.account)
      toast('已用测试账号登录')
      onLogin()
    } catch (e) { toast(e.message, 'error') }
    finally { setLoading(false) }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-brand">
          <div className="brand-logo" style={{ width: 46, height: 46, fontSize: 22 }}>辅</div>
          <h1>辅导员 Agent 工作台</h1>
          <p>
            {needsSetup ? '首次使用，请注册首个辅导员（自动成为管理员）'
              : mode === 'login' ? 'Counselor Workbench · 欢迎回来'
              : '注册新辅导员账号'}
          </p>
        </div>

        <div className="mode-tabs" style={{ marginBottom: 18 }}>
          <div className={`mode-tab ${mode === 'login' ? 'active' : ''}`} onClick={() => setMode('login')}>
            <Icon name="lock" size={13} /> 登录
          </div>
          <div className={`mode-tab ${mode === 'register' ? 'active' : ''}`} onClick={() => setMode('register')}>
            <Icon name="plus" size={13} /> 注册
          </div>
        </div>

        <form onSubmit={submit}>
          <div className="login-field">
            <Icon name="student" size={16} />
            <input type="text" placeholder="账号" value={username} autoFocus
              onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div className="login-field">
            <Icon name="lock" size={16} />
            <input type="password" placeholder="密码" value={password}
              onChange={(e) => setPassword(e.target.value)} />
          </div>
          {mode === 'register' && (
            <>
              <div className="login-field">
                <Icon name="students" size={16} />
                <input type="text" placeholder="姓名（如：张辅导）" value={name}
                  onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="login-field">
                <Icon name="globe" size={16} />
                <input type="email" placeholder="邮箱（可选，用于绑定与找回）" value={email}
                  onChange={(e) => setEmail(e.target.value)} />
              </div>
            </>
          )}
          <button className="btn btn-primary login-btn" type="submit" disabled={loading}>
            {loading ? '验证中…' : mode === 'login' ? '进入工作台' : '注册并进入'}
          </button>
        </form>

        {!needsSetup && mode === 'login' && (
          <button className="btn mt-12" style={{ width: '100%', justifyContent: 'center' }}
                  onClick={quickLogin} disabled={loading}>
            一键体验测试账号（1403946941）
          </button>
        )}

        <div className="login-links" style={{ display: 'flex', justifyContent: 'center' }}>
          <a href="#/student"><Icon name="student" size={13} /> 学生入口</a>
          <span style={{ color: 'var(--text-faint)' }}>·</span>
          <a href="#/public"><Icon name="globe" size={13} /> 公共咨询</a>
        </div>
      </div>
    </div>
  )
}