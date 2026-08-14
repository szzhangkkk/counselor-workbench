import React, { useEffect, useState } from 'react'
import { api } from '../api.js'
import { useToast } from '../components/Toast.jsx'
import Icon from '../components/Icon.jsx'

export default function SettingsPage() {
  const toast = useToast()
  const [cfg, setCfg] = useState({ api_base: '', api_key: '', model: '', school_name: '', counselor_name: '', admin_password: '' })
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)

  useEffect(() => {
    api.getConfig().then(setCfg).catch(() => {})
  }, [])

  const save = async () => {
    try {
      await api.saveConfig(cfg)
      toast('设置已保存')
    } catch (e) { toast(e.message, 'error') }
  }

  const test = async () => {
    setTesting(true); setTestResult(null)
    try {
      await api.saveConfig(cfg)
      const res = await api.testConnection()
      setTestResult({ ok: true, reply: res.reply || '连接成功' })
      toast('连接成功')
    } catch (e) { setTestResult({ ok: false, reply: e.message }); toast(e.message, 'error') }
    finally { setTesting(false) }
  }

  const field = (key, label, ph, type = 'text') => (
    <div className="settings-field">
      <label>{label}</label>
      <input type={type} placeholder={ph} value={cfg[key] ?? ''}
        onChange={(e) => setCfg({ ...cfg, [key]: e.target.value })} />
    </div>
  )

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16, alignItems: 'start' }}>
      <div className="settings-card">
        <h3><Icon name="spark" size={15} /> AI 助手配置</h3>
        <div className="settings-desc">
          对接 OpenAI 兼容的大模型接口（DeepSeek / 通义 / Kimi / OpenAI），用于对内台账问答与对外学校事务咨询。
        </div>
        {field('api_base', 'API 地址', 'https://api.deepseek.com/v1')}
        {field('api_key', 'API Key', 'sk-…', 'password')}
        {field('model', '模型名称', 'deepseek-chat')}
        {field('school_name', '学校名称', '示例大学')}
        {field('counselor_name', '辅导员姓名', '辅导员')}
        <div className="flex mt-20">
          <button className="btn" onClick={test} disabled={testing}>
            <Icon name="check" size={13} /> {testing ? '测试中…' : '测试连接'}
          </button>
          <button className="btn btn-primary" onClick={save}>保存设置</button>
        </div>
        {testResult && (
          <div className={`test-result ${testResult.ok ? 'ok' : 'fail'}`}>
            {testResult.ok ? '✓ ' : '✕ '}{testResult.reply}
          </div>
        )}
      </div>

      <div className="settings-card">
        <h3><Icon name="lock" size={15} /> 访问安全</h3>
        <div className="settings-desc">
          设置访问密码后，内部台账与对内问答将需要密码登录；对外咨询入口（#/public）无需密码，且永远无法访问内部数据。
        </div>
        {field('admin_password', '访问密码（留空 = 不设密码，全部开放）', '设置内部访问密码', 'password')}
        <p className="settings-note">
          提示：对外分享时请务必设置密码。对外入口链接为：<span className="mono">http://你的IP:8321/#/public</span>
        </p>
        <button className="btn btn-primary mt-20" onClick={save}>保存安全设置</button>
      </div>

      <div className="settings-card">
        <h3><Icon name="globe" size={15} /> 局域网分享</h3>
        <div className="settings-desc">
          服务监听 0.0.0.0:8321，同一局域网内设备可通过本机 IP 访问（命令行运行 <span className="mono">ipconfig</span> 查看 IP）。
        </div>
        <ul className="settings-list">
          <li><b>内部入口</b> http://你的IP:8321 —— 需密码，可管理台账、导入数据</li>
          <li><b>对外入口</b> http://你的IP:8321/#/public —— 免密咨询，仅学校事务问答</li>
        </ul>
        <p className="settings-note">对外入口不加载、不暴露任何台账数据接口，内外完全隔离。</p>
      </div>
    </div>
  )
}
