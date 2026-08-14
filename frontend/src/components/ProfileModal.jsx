import React, { useRef, useState } from 'react'
import { api, getCounselorAccount, setCounselorAccount } from '../api.js'
import { useToast } from './Toast.jsx'
import Icon from './Icon.jsx'
import Avatar from './Avatar.jsx'

const AVATAR_COLORS = ['#5b8cff', '#ff7e5f', '#34d399', '#a78bfa', '#fbbf24', '#38bdf8', '#fb7185', '#94a3b8']
const PRESET_CHARS = ['辅', '师', '张', '李', '王', '✦', '★']

const THEMES = [
  { id: 'dark', label: '深邃夜', preview: ['#0a0c11', '#5b8cff'] },
  { id: 'warm', label: '暖夕阳', preview: ['#15100c', '#ff7e5f'] },
  { id: 'green', label: '青森林', preview: ['#0c1410', '#34d399'] },
  { id: 'purple', label: '紫罗兰', preview: ['#120c18', '#a78bfa'] },
  { id: 'light', label: '明亮日', preview: ['#f5f7fa', '#5b8cff'] },
]

const THEME_VARS = {
  dark: { bg: '#0a0c11', elev: '#10131a', hover: '#181c26' },
  warm: { bg: '#15100c', elev: '#1c1410', hover: '#241914' },
  green: { bg: '#0c1410', elev: '#10180f', hover: '#142014' },
  purple: { bg: '#120c18', elev: '#1a1226', hover: '#221830' },
  light: { bg: '#f5f7fa', elev: '#ffffff', hover: '#eef2f7' },
}

export function applyTheme(theme) {
  const t = THEME_VARS[theme] || THEME_VARS.dark
  const root = document.documentElement
  root.style.setProperty('--bg', t.bg)
  root.style.setProperty('--bg-elev', t.elev)
  root.style.setProperty('--bg-hover', t.hover)
  root.style.setProperty('--bg-input', t.bg)
  if (theme === 'light') {
    root.style.setProperty('--text', '#0f172a')
    root.style.setProperty('--text-dim', '#475569')
    root.style.setProperty('--text-faint', '#94a3b8')
    root.style.setProperty('--border', 'rgba(0,0,0,0.08)')
    root.style.setProperty('--border-strong', 'rgba(0,0,0,0.15)')
  } else {
    root.style.setProperty('--text', '#e7eaf1')
    root.style.setProperty('--text-dim', '#9aa4b8')
    root.style.setProperty('--text-faint', '#67708a')
    root.style.setProperty('--border', 'rgba(255,255,255,0.06)')
    root.style.setProperty('--border-strong', 'rgba(255,255,255,0.1)')
  }
}

export default function ProfileModal({ open, onClose, onLogout }) {
  const toast = useToast()
  const fileRef = useRef(null)
  const acc = getCounselorAccount() || {}
  const [form, setForm] = useState({
    name: acc.name || '',
    email: acc.email || '',
    avatar: acc.avatar || '辅',
    avatar_color: acc.avatar_color || '#5b8cff',
    theme: acc.theme || 'dark',
    old_password: '', new_password: '',
  })
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  if (!open) return null

  const isImageAvatar = form.avatar && (form.avatar.startsWith('/api/avatars/') ||
                                          form.avatar.startsWith('http'))

  const onPickFile = () => fileRef.current?.click()

  const onFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast('图片太大了，请控制在 5MB 以内', 'error'); return
    }
    setUploading(true)
    try {
      const r = await api.counselorUploadAvatar(file)
      setForm({ ...form, avatar: r.avatar })
      const newAcc = { ...acc, avatar: r.avatar }
      setCounselorAccount(newAcc)
      toast('头像已更新')
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const removePhoto = async () => {
    try {
      const r = await api.counselorResetAvatar(form.name?.[0] || '辅')
      setForm({ ...form, avatar: r.avatar })
      const newAcc = { ...acc, avatar: r.avatar }
      setCounselorAccount(newAcc)
      toast('已恢复为文字头像')
    } catch (e) { toast(e.message, 'error') }
  }

  const save = async () => {
    setSaving(true)
    try {
      const payload = {
        name: form.name, email: form.email,
        avatar_color: form.avatar_color, theme: form.theme,
      }
      // 如果当前是文字头像（非图片路径），通过 update 接口保存字符
      if (!isImageAvatar) payload.avatar = form.avatar
      if (form.new_password) {
        payload.old_password = form.old_password
        payload.new_password = form.new_password
      }
      const r = await api.counselorUpdateMe(payload)
      setCounselorAccount(r.account)
      applyTheme(r.account.theme)
      toast('已保存')
      setForm({ ...form, old_password: '', new_password: '' })
    } catch (e) { toast(e.message, 'error') }
    finally { setSaving(false) }
  }

  return (
    <div className="modal-mask" onClick={onClose}>
      <div className="modal" style={{ width: 560 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          个人资料与个性化
          <button onClick={onClose}><Icon name="close" size={14} /></button>
        </div>
        <div className="modal-body">
          {/* 头像预览 + 上传 */}
          <div className="avatar-section">
            <Avatar avatar={form.avatar} color={form.avatar_color} name={form.name} size={72} rounded="30%" />
            <div className="avatar-actions">
              <button className="btn btn-primary" onClick={onPickFile} disabled={uploading}>
                <Icon name="import" size={13} /> {uploading ? '上传中…' : '上传照片'}
              </button>
              {isImageAvatar && (
                <button className="btn" onClick={removePhoto} disabled={uploading}>恢复文字</button>
              )}
              <div className="text-dim" style={{ fontSize: 11.5, marginTop: 4 }}>
                支持 JPG/PNG/GIF/WebP/BMP，不超过 5MB
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onFileChange} />
            </div>
          </div>

          {/* 单字头像备选（仅在未上传图片时使用） */}
          {!isImageAvatar && (
            <div className="settings-field mt-20">
              <label>文字头像（上传照片后将自动切换为照片）</label>
              <div className="flex" style={{ flexWrap: 'wrap' }}>
                {PRESET_CHARS.map((a) => (
                  <button key={a} className={`avatar-opt ${form.avatar === a ? 'active' : ''}`}
                    onClick={() => setForm({ ...form, avatar: a })}>{a}</button>
                ))}
                <input maxLength={2} value={form.avatar || ''} style={{ width: 56 }}
                  onChange={(e) => setForm({ ...form, avatar: e.target.value })} />
              </div>
            </div>
          )}

          {/* 颜色（图片头像下也会作为品牌色用在侧边栏 logo 等） */}
          <div className="settings-field">
            <label>头像配色（侧边栏 Logo / 默认配色）</label>
            <div className="flex" style={{ flexWrap: 'wrap' }}>
              {AVATAR_COLORS.map((c) => (
                <div key={c} className={`color-dot ${form.avatar_color === c ? 'active' : ''}`}
                  style={{ background: c }} onClick={() => setForm({ ...form, avatar_color: c })} />
              ))}
            </div>
          </div>

          {/* 主题 */}
          <div className="settings-field">
            <label>主题配色</label>
            <div className="theme-grid">
              {THEMES.map((t) => (
                <button key={t.id} className={`theme-opt ${form.theme === t.id ? 'active' : ''}`}
                  onClick={() => { setForm({ ...form, theme: t.id }); applyTheme(t.id) }}>
                  <span className="theme-opt-preview"
                    style={{ background: `linear-gradient(135deg, ${t.preview[1]}, ${t.preview[0]})` }} />
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 姓名 / 邮箱 */}
          <div className="form-grid">
            <div className="field"><label>姓名</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="field"><label>邮箱</label>
              <input type="email" value={form.email} placeholder="可选"
                onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          </div>

          {/* 改密码 */}
          <div className="form-grid mt-12">
            <div className="field"><label>原密码（改密码时填写）</label>
              <input type="password" value={form.old_password}
                onChange={(e) => setForm({ ...form, old_password: e.target.value })} /></div>
            <div className="field"><label>新密码（不修改留空）</label>
              <input type="password" value={form.new_password}
                onChange={(e) => setForm({ ...form, new_password: e.target.value })} /></div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-danger" onClick={onLogout}><Icon name="logout" size={13} /> 退出登录</button>
          <span className="grow" />
          <button className="btn" onClick={onClose}>关闭</button>
          <button className="btn btn-primary" disabled={saving} onClick={save}>保存</button>
        </div>
      </div>
    </div>
  )
}