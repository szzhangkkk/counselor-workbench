import React, { useEffect, useState } from 'react'
import { api } from '../api.js'
import { useToast } from '../components/Toast.jsx'
import Icon from '../components/Icon.jsx'

export default function StudentAccountsPage() {
  const toast = useToast()
  const [rows, setRows] = useState([])
  const [imports, setImports] = useState([])
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({})
  const [batch, setBatch] = useState({ class_name: '', grade: '' })

  const load = () => {
    api.listStudentAccounts().then(setRows).catch(() => {})
    api.list('students').then(setImports).catch(() => {})
  }
  useEffect(() => { load() }, [])

  const classes = Array.from(new Set(imports.map((s) => s.class_name).filter(Boolean)))
  const grades = Array.from(new Set(imports.map((s) => s.grade).filter(Boolean)))

  const createOne = async () => {
    if (!form.student_id || !form.name) {
      toast('学号和姓名必填', 'error'); return
    }
    try {
      const r = await api.createStudentAccount({
        ...form,
        password: form.password || form.student_id,
        enabled: form.enabled !== false,
      })
      toast(`已创建，默认密码：${r.password || form.student_id}`)
      setModal(null); setForm({}); load()
    } catch (e) { toast(e.message, 'error') }
  }

  const save = async (row) => {
    try {
      await api.updateStudentAccount(row.id, {
        name: row.name, password: row.password, class_name: row.class_name,
        major: row.major, grade: row.grade, enabled: row.enabled,
      })
      toast('已保存'); load()
    } catch (e) { toast(e.message, 'error') }
  }

  const remove = async (row) => {
    if (!confirm(`确定删除「${row.name}」的账号？`)) return
    try { await api.deleteStudentAccount(row.id); toast('已删除'); load() }
    catch (e) { toast(e.message, 'error') }
  }

  const doBatch = async (e) => {
    e.preventDefault()
    const payload = batch.class_name ? { class_name: batch.class_name }
      : batch.grade ? { grade: batch.grade } : null
    if (!payload) { toast('请选择班级或年级', 'error'); return }
    try {
      const r = await api.batchCreateStudentAccounts(payload)
      toast(`已生成 ${r.created} 个账号（默认密码＝学号）`)
      load()
    } catch (e) { toast(e.message, 'error') }
  }

  const field = (key, label) => (
    <div key={key} className="field">
      <label>{label}</label>
      <input value={form[key] || ''} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
    </div>
  )

  return (
    <div>
      <div className="panel" style={{ marginBottom: 14 }}>
        <div className="modal-body">
          <form onSubmit={doBatch} className="batch-form">
            <div className="batch-form-title">
              <Icon name="spark" size={15} />
              <b>按学生信息台账批量发账号</b>
              <span className="text-dim">选一个就行，重复学号自动跳过，默认密码＝学号</span>
            </div>
            <div className="flex" style={{ gap: 10, flexWrap: 'wrap' }}>
              <select className="search-input" value={batch.class_name}
                onChange={(e) => setBatch({ ...batch, class_name: e.target.value, grade: '' })}>
                <option value="">按班级发账号…</option>
                {classes.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <span className="text-dim" style={{ alignSelf: 'center' }}>或</span>
              <select className="search-input" value={batch.grade}
                onChange={(e) => setBatch({ ...batch, grade: e.target.value, class_name: '' })}>
                <option value="">按年级发账号…</option>
                {grades.length === 0
                  ? <option value="" disabled>暂无年级字段，请用班级</option>
                  : grades.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
              <button className="btn btn-primary" type="submit"><Icon name="plus" size={13} /> 一键全发</button>
              <span className="grow" />
              <button className="btn" type="button" onClick={() => setModal('add')}><Icon name="plus" size={13} /> 单个新增</button>
              <a className="btn topbar-student-entry" href="#/student" target="_blank" rel="noreferrer">
                <Icon name="student" size={13} /> 打开学生入口
              </a>
            </div>
          </form>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <b>学生账号列表</b>
          <span className="text-dim" style={{ fontSize: 12 }}>分享给学生：http://你的IP:8321/#/student（默认密码 = 学号）</span>
          <span className="grow" />
          <span className="badge badge-red">{rows.filter(r => r.distressed).length} 关注中</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>学号</th><th>姓名</th><th>班级</th><th>专业</th><th>密码</th>
                <th>爱好/兴趣</th><th>状态</th><th>启用</th><th>操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan="9"><div className="empty-state">还没有学生账号。先在「学生信息」台账录入数据，再回来批量生成。</div></td></tr>
              )}
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="mono">{r.student_id}</td>
                  <td><input className="cell-input" value={r.name || ''} onChange={(e) => setRows(rows.map(x => x.id === r.id ? { ...x, name: e.target.value } : x))} /></td>
                  <td><input className="cell-input" style={{ width: 100 }} value={r.class_name || ''} onChange={(e) => setRows(rows.map(x => x.id === r.id ? { ...x, class_name: e.target.value } : x))} /></td>
                  <td><input className="cell-input" style={{ width: 100 }} value={r.major || ''} onChange={(e) => setRows(rows.map(x => x.id === r.id ? { ...x, major: e.target.value } : x))} /></td>
                  <td><input className="cell-input mono" style={{ width: 110 }} type="text" value={r.password || ''} onChange={(e) => setRows(rows.map(x => x.id === r.id ? { ...x, password: e.target.value } : x))} /></td>
                  <td className="text-dim" style={{ fontSize: 11.5, maxWidth: 200 }}>
                    {r.hobbies || r.interests ? <>{r.hobbies} {r.interests && `· ${r.interests}`}</> : '—'}
                  </td>
                  <td>
                    {r.distressed
                      ? <span className="badge badge-red">⚠ {r.last_distress_type || '困难'}</span>
                      : <span className="badge badge-green">正常</span>}
                  </td>
                  <td>
                    <input type="checkbox" checked={!!r.enabled} onChange={(e) => setRows(rows.map(x => x.id === r.id ? { ...x, enabled: e.target.checked ? 1 : 0 } : x))} />
                  </td>
                  <td>
                    <div className="flex">
                      <button className="btn btn-sm" onClick={() => save(r)}>保存</button>
                      <button className="btn btn-sm btn-danger" onClick={() => remove(r)}>删除</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal === 'add' && (
        <div className="modal-mask" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              新增学生账号
              <button onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                {field('student_id', '学号 *')}
                {field('name', '姓名 *')}
                {field('password', '密码（留空=学号）')}
                {field('class_name', '班级')}
                {field('major', '专业')}
                {field('grade', '年级')}
              </div>
              <p className="text-dim mt-12" style={{ fontSize: 12 }}>
                备注：若学生信息台账已有此学号，班级/专业/年级会自动填充。
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setModal(null)}>取消</button>
              <button className="btn btn-primary" onClick={createOne}>创建</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}