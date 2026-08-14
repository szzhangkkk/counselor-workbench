import React, { useEffect, useState } from 'react'
import { api } from '../api.js'
import Chart, { pieOption, barOption, barTopOption } from '../components/Chart.jsx'
import Icon from '../components/Icon.jsx'
import EmptyChart from '../components/EmptyChart.jsx'

const LEDGER_META = {
  students: { label: '学生信息', color: '#4f7cff', icon: 'students' },
  employment: { label: '就业台账', color: '#34d399', icon: 'employment' },
  psychology: { label: '心理台账', color: '#f87171', icon: 'psychology' },
  talks: { label: '谈心谈话', color: '#a78bfa', icon: 'talks' },
  grades: { label: '学业成绩', color: '#38bdf8', icon: 'grades' },
  attendance: { label: '课程考勤', color: '#fbbf24', icon: 'attendance' },
}

export default function Dashboard({ go }) {
  const [overview, setOverview] = useState(null)
  const [charts, setCharts] = useState(null)

  useEffect(() => {
    api.chartsAll().then(setCharts).catch(console.error)
  }, [])

  if (!charts) {
    return <div className="empty-state"><div className="big">◈</div>正在加载工作台数据…</div>
  }

  const stats = [
    { key: 'students', label: '学生总数', color: 'var(--accent)' },
    { key: 'employment', label: '就业记录', color: 'var(--green)' },
    { key: 'psychology', label: '心理关注', color: 'var(--red)' },
    { key: 'talks', label: '谈话记录', color: 'var(--purple)' },
    { key: 'grades', label: '成绩记录', color: '#38bdf8' },
    { key: 'attendance', label: '考勤记录', color: 'var(--amber)' },
  ]

  const empStatus = charts.employment.status_distribution
  const psyLevel = charts.psychology.level_distribution
  const attStatus = charts.attendance.status_distribution
  const gradeDist = charts.grades.score_distribution

  return (
    <div>
      <div className="stat-grid">
        {stats.map((s) => (
          <div key={s.key} className="stat-card" onClick={() => go(s.key)}>
            <div className="stat-label">
              <Icon name={LEDGER_META[s.key].icon} size={13} /> {s.label}
            </div>
            <div className="stat-value" style={{ color: s.color }}>
              {charts.overview[s.key] ?? 0}
            </div>
            <div className="stat-sub">{LEDGER_META[s.key].label} · 点击查看</div>
          </div>
        ))}
      </div>

      <div className="chart-grid">
        {empStatus.labels.length === 0 ? (
          <EmptyChart title="就业去向分布" hint="导入就业台账后将自动生成去向饼图与就业率" onImport={() => go('import')} />
        ) : (
          <div className="chart-card">
            <h3>就业去向分布（就业率 {charts.employment.employment_rate}%）</h3>
            <Chart option={pieOption('就业去向', empStatus.labels.map((l, i) => ({ name: l, value: empStatus.values[i] })))} />
          </div>
        )}
        {psyLevel.labels.length === 0 ? (
          <EmptyChart title="心理预警等级" hint="心理台账录入后将显示关注/预警/危机分布" onImport={() => go('import')} />
        ) : (
          <div className="chart-card">
            <h3>心理预警等级（需跟进 {charts.psychology.follow_up_pending} 人）</h3>
            <Chart option={pieOption('预警等级', psyLevel.labels.map((l, i) => ({ name: l, value: psyLevel.values[i] })))} />
          </div>
        )}
        {attStatus.labels.length === 0 ? (
          <EmptyChart title="课程考勤状态" hint="导入考勤后将自动统计出勤/迟到/旷课占比" onImport={() => go('import')} />
        ) : (
          <div className="chart-card">
            <h3>课程考勤状态（旷课率 {charts.attendance.absence_rate}%）</h3>
            <Chart option={pieOption('考勤状态', attStatus.labels.map((l, i) => ({ name: l, value: attStatus.values[i] })))} />
          </div>
        )}
        {gradeDist.values.every((v) => v === 0) ? (
          <EmptyChart title="学业成绩分布" hint="导入成绩后将显示分段直方图与及格率" onImport={() => go('import')} />
        ) : (
          <div className="chart-card">
            <h3>学业成绩分布（平均分 {charts.grades.average} · 及格率 {charts.grades.pass_rate}%）</h3>
            <Chart option={barOption(gradeDist.labels, gradeDist.values, '人数')} />
          </div>
        )}
        {charts.attendance.top_absentees?.length > 0 && (
          <div className="chart-card">
            <h3>旷课/迟到频次 Top</h3>
            <Chart option={barTopOption(
              charts.attendance.top_absentees.map((a) => `${a.name}`),
              charts.attendance.top_absentees.map((a) => a.count)
            )} />
          </div>
        )}
        {charts.employment.region_distribution?.labels?.length > 0 && (
          <div className="chart-card">
            <h3>就业地区分布</h3>
            <Chart option={barTopOption(
              charts.employment.region_distribution.labels,
              charts.employment.region_distribution.values
            )} />
          </div>
        )}
      </div>
    </div>
  )
}
