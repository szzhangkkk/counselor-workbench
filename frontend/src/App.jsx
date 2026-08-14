import React, { useEffect, useState } from 'react'
import Dashboard from './pages/Dashboard.jsx'
import LedgerPage from './pages/LedgerPage.jsx'
import ImportPage from './pages/ImportPage.jsx'
import ChatPage from './pages/ChatPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import StudentAccountsPage from './pages/StudentAccountsPage.jsx'
import CounselorsPage from './pages/CounselorsPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import PublicPage from './pages/PublicPage.jsx'
import StudentLoginPage from './pages/StudentLoginPage.jsx'
import StudentPage from './pages/StudentPage.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import Icon from './components/Icon.jsx'
import AlertBell from './components/AlertBell.jsx'
import ProfileModal, { applyTheme } from './components/ProfileModal.jsx'
import Avatar from './components/Avatar.jsx'
import { ToastProvider } from './components/Toast.jsx'
import { api, getCounselorAccount, getCounselorToken, getStudentToken, setStudentToken,
  setCounselorToken, setCounselorAccount } from './api.js'

const NAV = [
  { id: 'dashboard', label: '工作台总览', icon: 'dashboard' },
  { section: '学生管理' },
  { id: 'students', label: '学生信息', icon: 'students' },
  { id: 'grades', label: '学业成绩', icon: 'grades' },
  { id: 'attendance', label: '课程考勤', icon: 'attendance' },
  { section: '事务台账' },
  { id: 'employment', label: '就业台账', icon: 'employment' },
  { id: 'psychology', label: '心理台账', icon: 'psychology' },
  { id: 'talks', label: '谈心谈话', icon: 'talks' },
  { section: '工具' },
  { id: 'student-accounts', label: '学生账号', icon: 'student' },
  { id: 'import', label: '文件导入', icon: 'import' },
  { id: 'chat', label: 'AI 助手', icon: 'chat' },
  { id: 'counselors', label: '辅导员管理', icon: 'students' },
  { id: 'settings', label: '设置', icon: 'settings' },
]

function useHash() {
  const [hash, setHash] = useState(window.location.hash)
  useEffect(() => {
    const on = () => setHash(window.location.hash)
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return hash
}

export default function App() {
  const hash = useHash()
  const [page, setPage] = useState('dashboard')
  const [authState, setAuthState] = useState('loading')
  const [studentAuth, setStudentAuth] = useState(!!getStudentToken())
  const [profileOpen, setProfileOpen] = useState(false)
  const [acc, setAcc] = useState(getCounselorAccount())

  // 应用主题
  useEffect(() => { if (acc?.theme) applyTheme(acc.theme) }, [acc])

  // 检查登录状态
  useEffect(() => {
    api.counselorStatus().then((s) => {
      if (!s.need_setup && !getCounselorToken()) {
        setAuthState('locked')
      } else if (s.logged_in) {
        setAcc(s.account); setAuthState('authed')
      } else if (getCounselorToken()) {
        // 本地有 token 但服务端没记录，验证一次
        setAuthState('locked')
      } else if (s.need_setup) {
        setAuthState('locked')  // 注册第一个
      } else {
        setAuthState('locked')
      }
    }).catch(() => setAuthState('locked'))
  }, [])

  // 对外咨询页
  if (hash === '#/public') {
    return (
      <ToastProvider>
        <ErrorBoundary><PublicPage /></ErrorBoundary>
      </ToastProvider>
    )
  }

  // 学生入口
  if (hash === '#/student' || hash === '#/student-login') {
    if (!studentAuth) {
      return (
        <ToastProvider>
          <ErrorBoundary><StudentLoginPage onLogin={() => setStudentAuth(true)} /></ErrorBoundary>
        </ToastProvider>
      )
    }
    return (
      <ToastProvider>
        <ErrorBoundary>
          <StudentPage onLogout={() => { setStudentToken(''); setStudentAuth(false); window.location.hash = '#/' }} />
        </ErrorBoundary>
      </ToastProvider>
    )
  }

  if (authState === 'loading') {
    return <div className="boot-screen"><div className="boot-logo">辅</div></div>
  }
  if (authState === 'locked') {
    return (
      <ToastProvider>
        <LoginPage onLogin={(a) => { setAcc(a); setAuthState('authed') }} />
      </ToastProvider>
    )
  }

  const render = () => {
    if (page === 'dashboard') return <Dashboard go={setPage} />
    if (page === 'import') return <ImportPage />
    if (page === 'chat') return <ChatPage />
    if (page === 'settings') return <SettingsPage />
    if (page === 'student-accounts') return <StudentAccountsPage />
    if (page === 'counselors') return <CounselorsPage />
    return <LedgerPage ledgerType={page} />
  }

  const title = NAV.find((n) => n.id === page)?.label || ''
  const logout = () => {
    api.counselorLogout().catch(() => {})
    setCounselorToken(''); setCounselorAccount(null)
    setAuthState('locked'); setAcc(null)
  }

  return (
    <ToastProvider>
      <div className="app">
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-logo" style={{ background: 'transparent', boxShadow: 'none', padding: 0 }}>
              <Avatar avatar={acc?.avatar || '辅'} color={acc?.avatar_color} name={acc?.name} size={32} />
            </div>
            <div>
              <div className="brand-name">{acc?.name || '辅导员'}</div>
              <div className="brand-sub">Counselor Agent</div>
            </div>
          </div>
          <nav>
            {NAV.map((item, i) =>
              item.section ? (
                <div key={i} className="nav-section">{item.section}</div>
              ) : (
                <div key={item.id}
                  className={`nav-item ${page === item.id ? 'active' : ''}`}
                  onClick={() => setPage(item.id)}>
                  <Icon name={item.icon} size={16} />
                  <span>{item.label}</span>
                </div>
              )
            )}
          </nav>
          <div className="sidebar-footer">
            <span className="status-dot" />
            <span className="grow">本地运行</span>
          </div>
        </aside>

        <main className="main">
          <header className="topbar">
            <div className="topbar-title">{title || '辅导员 Agent 工作台'}</div>
            <div className="topbar-actions">
              <AlertBell />
              <a className="btn topbar-student-entry" href="#/student" target="_blank" rel="noreferrer" title="学生陪伴入口">
                <Icon name="student" size={14} /> 学生
              </a>
              <a className="btn" href="#/public" target="_blank" rel="noreferrer" title="对外公共咨询">
                <Icon name="globe" size={14} /> 公共
              </a>
              <button className="btn profile-btn" onClick={() => setProfileOpen(true)} title="个人资料 / 主题 / 退出">
                <Avatar avatar={acc?.avatar || '辅'} color={acc?.avatar_color} name={acc?.name} size={26} />
                <Icon name="chevron" size={11} />
              </button>
            </div>
          </header>
          <div className="content">
            <ErrorBoundary>{render()}</ErrorBoundary>
          </div>
        </main>
      </div>
      <ProfileModal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        onLogout={() => { setProfileOpen(false); logout() }}
      />
    </ToastProvider>
  )
}