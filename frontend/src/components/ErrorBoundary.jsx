import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('页面渲染错误:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="empty-state" style={{ padding: '60px 20px' }}>
          <div className="big">⚠</div>
          <div style={{ fontSize: 15, color: 'var(--text-dim)' }}>页面加载出错了</div>
          <div className="mt-12 text-dim" style={{ fontSize: 12.5, maxWidth: 520, margin: '12px auto 0', lineHeight: 1.7 }}>
            {String(this.state.error.message || this.state.error)}
          </div>
          <button className="btn mt-20" onClick={() => this.setState({ error: null })}>重试</button>
        </div>
      )
    }
    return this.props.children
  }
}
