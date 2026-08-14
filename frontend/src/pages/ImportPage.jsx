import React, { useEffect, useRef, useState } from 'react'
import { api } from '../api.js'
import { useToast } from '../components/Toast.jsx'

const TARGETS = [
  { id: 'students', label: '学生信息' },
  { id: 'employment', label: '就业台账' },
  { id: 'psychology', label: '心理台账' },
  { id: 'talks', label: '谈心谈话' },
  { id: 'grades', label: '学业成绩' },
  { id: 'attendance', label: '课程考勤' },
]

const FORMATS = ['.xlsx', '.xls', '.md', '.tex', '.pdf', '.docx', '.pptx']

const COLUMN_REF = {
  students: ['学号', '姓名', '性别', '专业', '班级', '年级', '手机号', '宿舍', '政治面貌', '生源地'],
  employment: ['学号', '姓名', '班级', '就业状态', '单位', '岗位', '薪资', '地区'],
  psychology: ['学号', '姓名', '班级', '评估日期', '预警等级', '类别', '表现', '干预措施', '下次跟进'],
  talks: ['学号', '姓名', '班级', '谈话日期', '谈话类型', '主题', '内容', '结论', '谈话人'],
  grades: ['学号', '姓名', '班级', '学期', '课程名称', '学分', '成绩', '绩点', '排名'],
  attendance: ['学号', '姓名', '班级', '课程', '日期', '节次', '状态', '原因', '记录人'],
}

export default function ImportPage() {
  const toast = useToast()
  const [target, setTarget] = useState('students')
  const [dragging, setDragging] = useState(false)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [history, setHistory] = useState([])
  const fileRef = useRef(null)

  useEffect(() => { api.importHistory().then(setHistory).catch(() => {}) }, [])

  const doImport = async (file) => {
    if (!file) return
    const ext = '.' + (file.name.split('.').pop() || '').toLowerCase()
    if (!FORMATS.includes(ext)) {
      toast(`不支持的文件格式 ${ext}`, 'error')
      return
    }
    setImporting(true); setResult(null); setError(null)
    try {
      const res = await api.importFile(target, file)
      setResult(res)
      toast(`导入成功：${res.imported} 条`)
      api.importHistory().then(setHistory).catch(() => {})
    } catch (e) {
      setError(e.message)
      toast(e.message, 'error')
    } finally {
      setImporting(false)
    }
  }

  const targetLabel = TARGETS.find((t) => t.id === target)?.label

  return (
    <div>
      <div className="import-main">
        <div>
          <div className="panel" style={{ marginBottom: 14 }}>
            <div className="panel-header"><b>导入目标</b><span className="text-dim">选择本次数据要写入的台账</span></div>
            <div className="modal-body">
              <div className="mode-tabs" style={{ flexWrap: 'wrap' }}>
                {TARGETS.map((t) => (
                  <div key={t.id} className={`mode-tab ${target === t.id ? 'active' : ''}`} onClick={() => setTarget(t.id)}>
                    {t.label}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div
            className={`drop-zone ${dragging ? 'dragging' : ''}`}
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); doImport(e.dataTransfer.files[0]) }}
          >
            <div className="dz-icon">{importing ? '⏳' : '⬆'}</div>
            <h3>{importing ? '正在解析并导入…' : `将文件导入「${targetLabel}」`}</h3>
            <p>点击选择文件，或将文件拖拽到此处</p>
            <div className="file-formats">
              {FORMATS.map((f) => <span key={f} className="format-tag">{f}</span>)}
            </div>
            <input
              ref={fileRef} type="file" style={{ display: 'none' }}
              accept={FORMATS.join(',')}
              onChange={(e) => { doImport(e.target.files[0]); e.target.value = '' }}
            />
          </div>

          <p className="text-dim mt-12" style={{ fontSize: 12.5, lineHeight: 1.8 }}>
            💡 表头列名支持中文智能匹配，例如：学号、姓名、班级、就业状态、预警等级、课程、成绩、状态等。
            首行为列标题，姓名（及课程名）为必填，缺少的行会自动跳过。
          </p>
        </div>

        <div>
          {error ? (
            <div className="result-card" style={{ borderColor: 'rgba(248,113,113,0.4)' }}>
              <h3 style={{ color: 'var(--red)' }}>导入失败</h3>
              <div className="mt-12 text-dim" style={{ fontSize: 12.5, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{error}</div>
              <div className="mt-12 text-dim" style={{ fontSize: 12.5, lineHeight: 1.8 }}>
                表头列名参考：<span className="mono">{COLUMN_REF[target]?.join('、')}</span>
              </div>
            </div>
          ) : result ? (
            <div className="result-card">
              <h3>导入结果 · {result.filename}</h3>
              <div className="result-row">
                <div>
                  <div className="result-num" style={{ color: 'var(--green)' }}>{result.imported}</div>
                  <div className="result-label">成功导入</div>
                </div>
                <div>
                  <div className="result-num" style={{ color: result.skipped ? 'var(--amber)' : 'var(--text-dim)' }}>{result.skipped}</div>
                  <div className="result-label">跳过行</div>
                </div>
              </div>
              {result.sample?.length > 0 && (
                <div className="sample-table">
                  <div className="text-dim" style={{ marginBottom: 6 }}>解析样例（前 3 条）</div>
                  <table>
                    <tbody>
                      {result.sample.map((r, i) => (
                        <tr key={i}>{Object.entries(r).slice(0, 6).map(([k, v]) => (
                          <td key={k} className="ellipsis" title={`${k}: ${v}`}>{v || '-'}</td>
                        ))}</tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="result-card">
              <h3>导入历史</h3>
              {history.length === 0 ? (
                <div className="empty-state">暂无导入记录</div>
              ) : (
                <table>
                  <thead>
                    <tr><th>时间</th><th>台账</th><th>文件</th><th>成功</th><th>跳过</th></tr>
                  </thead>
                  <tbody>
                    {history.map((h) => (
                      <tr key={h.id}>
                        <td className="mono">{h.created_at}</td>
                        <td>{TARGETS.find((t) => t.id === h.ledger_type)?.label || h.ledger_type}</td>
                        <td className="ellipsis" title={h.filename}>{h.filename}</td>
                        <td className="text-green">{h.rows_imported}</td>
                        <td className={h.rows_skipped ? 'text-amber' : ''}>{h.rows_skipped}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
