import React, { useEffect, useMemo, useState } from 'react'
import { api } from '../api.js'
import Chart, { pieOption, barOption } from '../components/Chart.jsx'
import EmptyChart from '../components/EmptyChart.jsx'
import Icon from '../components/Icon.jsx'
import { useToast } from '../components/Toast.jsx'

const FIELDS = {
  students: [
    { key: 'student_id', label: '学号' },
    { key: 'name', label: '姓名', required: true },
    { key: 'gender', label: '性别' },
    { key: 'major', label: '专业' },
    { key: 'class_name', label: '班级' },
    { key: 'grade', label: '年级' },
    { key: 'phone', label: '手机号' },
    { key: 'email', label: '邮箱' },
    { key: 'dormitory', label: '宿舍' },
    { key: 'political_status', label: '政治面貌' },
    { key: 'hometown', label: '生源地' },
    { key: 'birth_date', label: '出生日期' },
    { key: 'guardian_name', label: '监护人' },
    { key: 'guardian_phone', label: '监护人电话' },
    { key: 'special_info', label: '特殊说明', full: true },
  ],
  employment: [
    { key: 'student_id', label: '学号' },
    { key: 'name', label: '姓名', required: true },
    { key: 'class_name', label: '班级' },
    { key: 'status', label: '就业状态', type: 'select', options: ['已就业', '待就业', '考研', '考公', '出国', '自主创业', '灵活就业', '参军'] },
    { key: 'company', label: '就业单位' },
    { key: 'position', label: '岗位' },
    { key: 'salary', label: '薪资' },
    { key: 'offer_date', label: '签约日期' },
    { key: 'contract_type', label: '合同类型' },
    { key: 'region', label: '地区' },
    { key: 'remarks', label: '备注', full: true },
  ],
  psychology: [
    { key: 'student_id', label: '学号' },
    { key: 'name', label: '姓名', required: true },
    { key: 'class_name', label: '班级' },
    { key: 'assess_date', label: '评估日期' },
    { key: 'level', label: '预警等级', type: 'select', options: ['正常', '关注', '预警', '危机'] },
    { key: 'category', label: '问题类别' },
    { key: 'symptoms', label: '表现描述', full: true },
    { key: 'intervention', label: '干预措施', full: true },
    { key: 'counselor', label: '负责人' },
    { key: 'next_follow_up', label: '下次跟进' },
    { key: 'remarks', label: '备注', full: true },
  ],
  talks: [
    { key: 'student_id', label: '学号' },
    { key: 'name', label: '姓名', required: true },
    { key: 'class_name', label: '班级' },
    { key: 'talk_date', label: '谈话日期' },
    { key: 'talk_type', label: '谈话类型', type: 'select', options: ['入学谈话', '日常谈心', '学业帮扶', '心理疏导', '危机干预', '家长沟通', '就业指导', '其他'] },
    { key: 'topic', label: '主题', full: true },
    { key: 'content', label: '谈话内容', full: true },
    { key: 'conclusion', label: '结论与成效', full: true },
    { key: 'counselor', label: '谈话人' },
  ],
  grades: [
    { key: 'student_id', label: '学号' },
    { key: 'name', label: '姓名', required: true },
    { key: 'class_name', label: '班级' },
    { key: 'semester', label: '学期', type: 'select', options: ['2023-2024-1', '2023-2024-2', '2024-2025-1', '2024-2025-2', '2025-2026-1', '2025-2026-2'] },
    { key: 'course_name', label: '课程名称', required: true },
    { key: 'course_code', label: '课程代码' },
    { key: 'credits', label: '学分', type: 'number' },
    { key: 'score', label: '成绩', type: 'number' },
    { key: 'grade_point', label: '绩点', type: 'number' },
    { key: 'rank', label: '排名', type: 'number' },
    { key: 'make_up_score', label: '补考成绩', type: 'number' },
  ],
  attendance: [
    { key: 'student_id', label: '学号' },
    { key: 'name', label: '姓名', required: true },
    { key: 'class_name', label: '班级' },
    { key: 'course_name', label: '课程' },
    { key: 'date', label: '日期' },
    { key: 'period', label: '节次' },
    { key: 'status', label: '状态', type: 'select', options: ['出勤', '迟到', '早退', '请假', '旷课'] },
    { key: 'reason', label: '原因', full: true },
    { key: 'recorder', label: '记录人' },
  ],
}

const STATUS_BADGE = {
  students: (r) => (r.special_info ? <span className="badge badge-amber">备注</span> : null),
  employment: (r) => {
    const map = { 已就业: 'badge-green', 自主创业: 'badge-green', 灵活就业: 'badge-green', 参军: 'badge-green', 待就业: 'badge-red', 考研: 'badge-blue', 考公: 'badge-purple', 出国: 'badge-purple' }
    return r.status ? <span className={`badge ${map[r.status] || 'badge-gray'}`}>{r.status}</span> : null
  },
  psychology: (r) => {
    const map = { 正常: 'badge-green', 关注: 'badge-amber', 预警: 'badge-purple', 危机: 'badge-red' }
    return r.level ? <span className={`badge ${map[r.level] || 'badge-gray'}`}>{r.level}</span> : null
  },
  talks: (r) => <span className="badge badge-blue">{r.talk_type || '-'}</span>,
  grades: (r) => {
    const s = r.score
    if (s == null || s === '') return null
    const cls = s >= 90 ? 'badge-green' : s >= 60 ? 'badge-blue' : 'badge-red'
    return <span className={`badge ${cls}`}>{s}</span>
  },
  attendance: (r) => {
    const map = { 出勤: 'badge-green', 迟到: 'badge-amber', 早退: 'badge-amber', 请假: 'badge-blue', 旷课: 'badge-red' }
    return r.status ? <span className={`badge ${map[r.status] || 'badge-gray'}`}>{r.status}</span> : null
  },
}

const CHART_OPTIONS = {
  students: null,
  employment: (d) => [
    { title: '就业去向分布', opt: pieOption('就业去向', d.status_distribution.labels.map((l, i) => ({ name: l, value: d.status_distribution.values[i] }))) },
    ...(d.region_distribution?.labels?.length ? [{ title: '就业地区分布', opt: barOption(d.region_distribution.labels, d.region_distribution.values) }] : []),
  ],
  psychology: (d) => [
    { title: '预警等级分布', opt: pieOption('预警等级', d.level_distribution.labels.map((l, i) => ({ name: l, value: d.level_distribution.values[i] }))) },
    ...(d.category_distribution?.labels?.length ? [{ title: '问题类别分布', opt: barOption(d.category_distribution.labels, d.category_distribution.values) }] : []),
  ],
  talks: (d) => [{ title: '谈话类型分布', opt: pieOption('谈话类型', d.talk_type_distribution.labels.map((l, i) => ({ name: l, value: d.talk_type_distribution.values[i] }))) }],
  grades: (d) => [{ title: '成绩分段分布', opt: barOption(d.score_distribution.labels, d.score_distribution.values, '人数') }],
  attendance: (d) => [{ title: '考勤状态分布', opt: pieOption('考勤状态', d.status_distribution.labels.map((l, i) => ({ name: l, value: d.status_distribution.values[i] }))) }],
}

export default function LedgerPage({ ledgerType }) {
  const toast = useToast()
  const fields = FIELDS[ledgerType]
  const [rows, setRows] = useState([])
  const [keyword, setKeyword] = useState('')
  const [chartData, setChartData] = useState(null)
  const [showChart, setShowChart] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({})

  const load = () => api.list(ledgerType, keyword).then(setRows).catch((e) => toast(e.message, 'error'))
  useEffect(() => { load(); api.chart(ledgerType).then(setChartData).catch(() => setChartData(null)) }, [ledgerType])

  const cols = useMemo(() => fields.filter((f) => !f.full), [fields])
  const visibleCols = cols.slice(0, 8)
  const extraCols = cols.slice(8)

  const openAdd = () => { setForm({}); setModal('add') }
  const openEdit = (row) => { setForm({ ...row }); setModal('edit') }

  const save = async () => {
    try {
      if (modal === 'add') { await api.create(ledgerType, form); toast('已添加记录') }
      else { await api.update(ledgerType, form.id, form); toast('已更新记录') }
      setModal(null); load()
    } catch (e) { toast(e.message, 'error') }
  }

  const remove = async (row) => {
    if (!confirm(`确定删除「${row.name}」这条记录？`)) return
    try { await api.remove(ledgerType, row.id); toast('已删除'); load() }
    catch (e) { toast(e.message, 'error') }
  }

  const fieldInput = (f) => {
    const val = form[f.key] ?? ''
    if (f.type === 'select') {
      return (
        <select value={val} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}>
          <option value="">请选择</option>
          {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      )
    }
    if (f.type === 'number') {
      return <input type="number" step="any" value={val} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
    }
    if (f.full) {
      return <textarea value={val} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
    }
    return <input value={val} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
  }

  const charts = useMemo(() => {
    if (!chartData) return []
    const fn = CHART_OPTIONS[ledgerType]
    if (!fn) return []
    try {
      const list = fn(chartData)
      return Array.isArray(list) ? list : []
    } catch (e) {
      console.error('图表数据异常:', e)
      return []
    }
  }, [chartData, ledgerType])

  const hasChartData = useMemo(() => {
    if (!chartData) return false
    // 简单判断：图表选项里 series 是否有非零值
    try {
      return charts.some((c) => {
        const opt = c.opt
        const series = opt?.series || []
        return series.some((s) => (s.data || []).some((d) => {
          const v = typeof d === 'object' ? d.value : d
          return v && Number(v) > 0
        }))
      })
    } catch (e) {
      return false
    }
  }, [charts, chartData])

  return (
    <div>
      {chartData && (
        <div className="chart-grid" style={{ marginBottom: 16 }}>
          {charts.map((c, i) =>
            hasChartData ? (
              <div key={i} className="chart-card">
                <h3>{c.title}</h3>
                <Chart option={c.opt} height={220} />
              </div>
            ) : (
              <EmptyChart key={i} title={c.title} hint="数据已准备，录入内容后将自动出图" onImport={null} />
            )
          )}
        </div>
      )}

      <div className="panel">
        <div className="panel-header">
          <div className="grow" />
          <input
            className="search-input"
            placeholder="搜索姓名 / 学号 / 班级…"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
          />
          <button className="btn" onClick={load}><Icon name="search" size={13} /> 搜索</button>
          <button className="btn btn-primary" onClick={openAdd}><Icon name="plus" size={13} /> 新增</button>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {visibleCols.map((c) => <th key={c.key}>{c.label}</th>)}
                {extraCols.length > 0 && <th>更多</th>}
                <th style={{ width: 110 }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={visibleCols.length + 2}><div className="empty-state">暂无数据，点击右上角「新增」或在「文件导入」页批量导入</div></td></tr>
              )}
              {rows.map((r) => (
                <tr key={r.id}>
                  {visibleCols.map((c) => (
                    <td key={c.key} className="ellipsis">
                      {c.key === 'status' || c.key === 'level' || c.key === 'talk_type' || c.key === 'score' || (c.key === 'name' && ledgerType === 'students')
                        ? (STATUS_BADGE[ledgerType]?.(r) || r[c.key] || '-')
                        : (r[c.key] || '-')}
                    </td>
                  ))}
                  {extraCols.length > 0 && <td className="text-dim">…</td>}
                  <td>
                    <div className="flex">
                      <button className="btn btn-sm" onClick={() => openEdit(r)}><Icon name="edit" size={11} /> 编辑</button>
                      <button className="btn btn-sm btn-danger" onClick={() => remove(r)}><Icon name="trash" size={11} /> 删除</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="modal-mask" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              {modal === 'add' ? '新增记录' : '编辑记录'}
              <button onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                {fields.map((f) => (
                  <div key={f.key} className={`field ${f.full ? 'full' : ''}`}>
                    <label>{f.label}{f.required ? ' *' : ''}</label>
                    {fieldInput(f)}
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setModal(null)}>取消</button>
              <button className="btn btn-primary" onClick={save}>保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
