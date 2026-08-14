import React from 'react'
import Icon from './Icon.jsx'

export default function EmptyChart({ title, hint, ledger, onImport }) {
  return (
    <div className="chart-card empty-chart">
      <h3>{title}</h3>
      <div className="empty-chart-inner">
        <svg viewBox="0 0 160 100" className="empty-chart-svg">
          <circle cx="80" cy="50" r="36" fill="none" stroke="rgba(91,140,255,0.18)" strokeWidth="8" strokeDasharray="40 60" />
          <circle cx="80" cy="50" r="22" fill="none" stroke="rgba(157,123,255,0.18)" strokeWidth="6" strokeDasharray="20 30" />
          <circle cx="80" cy="50" r="8" fill="rgba(91,140,255,0.22)" />
        </svg>
        <div className="empty-chart-text">{hint || '暂无数据，AI 助手会如实告知"无记录"'}</div>
        {onImport && (
          <button className="btn btn-sm empty-chart-cta" onClick={onImport}>
            <Icon name="import" size={12} /> 上传数据
          </button>
        )}
      </div>
    </div>
  )
}