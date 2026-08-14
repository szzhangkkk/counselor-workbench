import React, { useEffect, useState } from 'react'
import { api, getCounselorAccount } from '../api.js'
import { useToast } from '../components/Toast.jsx'
import Icon from '../components/Icon.jsx'
import Avatar from '../components/Avatar.jsx'

export default function CounselorsPage() {
  const toast = useToast()
  const me = getCounselorAccount() || {}
  const [rows, setRows] = useState([])

  const load = () => api.counselorList().then(setRows).catch((e) => toast(e.message, 'error'))
  useEffect(() => { load() }, [])

  const toggle = async (r) => {
    if (r.id === me.id) { toast('不能停用自己', 'error'); return }
    try { await api.counselorToggle(r.id); toast(r.enabled ? '已停用' : '已启用'); load() }
    catch (e) { toast(e.message, 'error') }
  }
  const remove = async (r) => {
    if (r.id === me.id) { toast('不能删除自己', 'error'); return }
    if (!confirm(`确定删除辅导员「${r.name}」？`)) return
    try { await api.counselorDelete(r.id); toast('已删除'); load() }
    catch (e) { toast(e.message, 'error') }
  }

  return (
    <div>
      <div className="panel" style={{ marginBottom: 14 }}>
        <div className="modal-body">
          <div className="flex" style={{ gap: 8, flexWrap: 'wrap' }}>
            <Icon name="spark" size={15} />
            <b>辅导员账号管理</b>
            <span className="text-dim" style={{ fontSize: 12 }}>
              每个辅导员独立账号 + 密码 + 头像 + 主题；第一个注册的自动成为管理员，可启用/停用/删除其他辅导员。
            </span>
          </div>
          <p className="text-dim mt-12" style={{ fontSize: 12.5 }}>
            新辅导员可在登录页注册（无门槛），管理员可在此停用不合适的账号。
          </p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <b>账号列表</b>
          <span className="grow" />
          <a className="btn" href="#/login" target="_blank" rel="noreferrer">
            <Icon name="plus" size={13} /> 开注册页
          </a>
        </div>
        <table>
          <thead>
            <tr>
              <th>头像</th><th>账号</th><th>姓名</th><th>邮箱</th>
              <th>主题</th><th>身份</th><th>最近登录</th><th>状态</th><th>操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan="9"><div className="empty-state">暂无数据</div></td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  <Avatar avatar={r.avatar} color={r.avatar_color} name={r.name} size={28} />
                </td>
                <td className="mono">{r.username}</td>
                <td>{r.name}</td>
                <td className="text-dim">{r.email || '—'}</td>
                <td><span className="badge badge-gray">{r.theme}</span></td>
                <td>{r.is_admin ? <span className="badge badge-purple">管理员</span> : <span className="badge badge-gray">辅导员</span>}</td>
                <td className="mono text-dim">{r.last_login_at || '—'}</td>
                <td>{r.enabled ? <span className="badge badge-green">启用</span> : <span className="badge badge-red">停用</span>}</td>
                <td>
                  <div className="flex">
                    <button className="btn btn-sm" onClick={() => toggle(r)}>{r.enabled ? '停用' : '启用'}</button>
                    <button className="btn btn-sm btn-danger" onClick={() => remove(r)}><Icon name="trash" size={11} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}