import React, { useEffect, useState } from 'react'
import { api } from '../api.js'
import Icon from './Icon.jsx'

const SEVERITY_BADGE = {
  关注: 'badge-amber',
  预警: 'badge-purple',
  危机: 'badge-red',
}

const DISTRESS_ICON = {
  学业压力: 'grades',
  家庭压力: 'students',
  经济压力: 'employment',
  心理压力: 'psychology',
  选课困惑: 'grades',
  人际困扰: 'talks',
}

export default function AlertBell() {
  const [count, setCount] = useState(0)
  const [open, setOpen] = useState(false)
  const [alerts, setAlerts] = useState([])
  const [pulse, setPulse] = useState(false)

  const refreshCount = async () => {
    try {
      const r = await api.unreadCount()
      const n = r.count || 0
      if (n > count) { setPulse(true); setTimeout(() => setPulse(false), 800) }
      setCount(n)
    } catch (e) { /* 401 已被 api 层处理 */ }
  }

  const loadAll = async () => {
    try {
      const r = await api.alerts('all')
      setAlerts(r || [])
    } catch (e) {}
  }

  useEffect(() => {
    refreshCount()
    const id = setInterval(refreshCount, 10000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (open) { loadAll(); refreshCount() }
  }, [open])

  const markRead = async (id) => {
    try { await api.markAlertRead(id) } catch (e) {}
    loadAll(); refreshCount()
  }
  const markAll = async () => {
    try { await api.markAllAlertsRead() } catch (e) {}
    loadAll(); refreshCount()
  }

  return (
    <>
      <button
        className={`bell ${pulse ? 'pulse' : ''} ${count > 0 ? 'has-unread' : ''}`}
        onClick={() => setOpen(true)}
        title="学生预警通知"
      >
        <Icon name="bell" size={16} />
        {count > 0 && <span className="bell-badge">{count > 9 ? '9+' : count}</span>}
      </button>

      {open && (
        <>
          <div className="drawer-mask" onClick={() => setOpen(false)} />
          <aside className="alert-drawer">
            <header className="drawer-head">
              <div className="flex">
                <Icon name="bell" size={16} />
                <b>学生预警</b>
                <span className="badge badge-red">{count} 未读</span>
              </div>
              <button className="btn btn-sm" onClick={markAll}>全部已读</button>
            </header>

            <div className="drawer-body">
              {alerts.length === 0 && (
                <div className="empty-state" style={{ paddingTop: 60 }}>
                  <div className="big">🔕</div>
                  当前没有预警。学生压力较大时这里会自动报上来。
                </div>
              )}
              {alerts.map((a) => (
                <div key={a.id} className={`alert-card ${a.read ? 'read' : 'unread'}`}>
                  <div className="alert-card-head">
                    <Icon name={DISTRESS_ICON[a.distress_type] || 'heart'} size={14} />
                    <b>{a.student_name}（{a.student_id}）</b>
                    <span className={`badge ${SEVERITY_BADGE[a.severity] || 'badge-gray'}`}>{a.severity}</span>
                    <span className="alert-type">{a.distress_type}</span>
                    <span className="grow" />
                    <span className="alert-time">{a.created_at}</span>
                  </div>
                  {a.evidence && (
                    <div className="alert-evidence">「{a.evidence}」</div>
                  )}
                  {a.suggestion && (
                    <div className="alert-suggestion">
                      <Icon name="spark" size={11} /> 建议处置：{a.suggestion}
                    </div>
                  )}
                  {!a.read && (
                    <button className="btn btn-sm alert-mark" onClick={() => markRead(a.id)}>
                      标为已跟进
                    </button>
                  )}
                </div>
              ))}
            </div>
          </aside>
        </>
      )}
    </>
  )
}