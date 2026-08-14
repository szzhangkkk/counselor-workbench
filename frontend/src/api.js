const BASE = '/api'

function getToken() { return localStorage.getItem('wb_token') || '' }
function setToken(t) { if (t) localStorage.setItem('wb_token', t); else localStorage.removeItem('wb_token') }
function getCounselorToken() { return localStorage.getItem('wb_counselor_token') || '' }
function setCounselorToken(t) { if (t) localStorage.setItem('wb_counselor_token', t); else localStorage.removeItem('wb_counselor_token') }
function getCounselorAccount() {
  try { return JSON.parse(localStorage.getItem('wb_counselor_acc') || 'null') } catch (e) { return null }
}
function setCounselorAccount(a) { if (a) localStorage.setItem('wb_counselor_acc', JSON.stringify(a)); else localStorage.removeItem('wb_counselor_acc') }
function getStudentToken() { return localStorage.getItem('wb_student_token') || '' }
function setStudentToken(t) { if (t) localStorage.setItem('wb_student_token', t); else localStorage.removeItem('wb_student_token') }

async function request(path, options = {}, authMode = 'counselor') {
  // authMode: 'counselor' 带双向 token；'student' 带 student；'none' 都不带
  const headers = { 'Content-Type': 'application/json' }
  if (authMode === 'counselor') {
    if (getToken()) headers['X-Auth-Token'] = getToken()
    if (getCounselorToken()) headers['X-Counselor-Token'] = getCounselorToken()
  } else if (authMode === 'student') {
    headers['X-Student-Token'] = getStudentToken()
  }
  const res = await fetch(`${BASE}${path}`, { headers, ...options })
  if (res.status === 401 && !path.includes('/counselors/') && !path.includes('/auth/')
      && !path.includes('/students/') && !path.includes('/public/')) {
    setCounselorToken(''); setCounselorAccount(null)
    window.location.hash = '#/login'
    window.location.reload()
  }
  if (!res.ok) {
    let msg = res.statusText
    try { const data = await res.json(); msg = data.detail || JSON.stringify(data) } catch (e) {}
    throw new Error(msg)
  }
  return res.json()
}

function post(path, body, authMode) { return request(path, { method: 'POST', body: JSON.stringify(body) }, authMode) }
function put(path, body, authMode) { return request(path, { method: 'PUT', body: JSON.stringify(body) }, authMode) }
function del(path, authMode) { return request(path, { method: 'DELETE' }, authMode) }

export const api = {
  // 台账
  list: (type, keyword = '') =>
    request(`/ledgers/${type}${keyword ? `?keyword=${encodeURIComponent(keyword)}` : ''}`),
  create: (type, data) => post(`/ledgers/${type}`, data),
  update: (type, id, data) => put(`/ledgers/${type}/${id}`, data),
  remove: (type, id) => del(`/ledgers/${type}/${id}`),
  bulk: (type, rows) => post(`/ledgers/${type}/bulk`, rows),
  chart: (type) => request(`/charts/${type}`),
  chartsAll: () => request('/charts'),
  importFile: (type, file) => {
    const fd = new FormData()
    fd.append('file', file)
    return fetch(`${BASE}/files/import/${type}`, { method: 'POST', body: fd, headers: { 'X-Auth-Token': getToken() } })
      .then(async (res) => {
        if (res.status === 401) { setToken(''); window.location.hash = '#/login'; window.location.reload(); throw new Error('登录已过期，请重新登录') }
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.detail || '导入失败')
        return data
      })
  },
  importHistory: () => request('/files/history'),

  // 认证（保留旧版， DESC: 兼容老 admin_password）
  authStatus: () => request('/auth/status'),
  login: (password) => post('/auth/login', { password }),
  logout: () => post('/auth/logout', {}),

  // 辅导员账号系统
  counselorStatus: () => request('/counselors/status', null, 'none'),
  counselorRegister: (data) => post('/counselors/register', data, 'none'),
  counselorLogin: (username, password) => post('/counselors/login', { username, password }, 'none'),
  counselorLogout: () => post('/counselors/logout', {}),
  counselorUpdateMe: (data) => put('/counselors/me', data),
  counselorUploadAvatar: (file) => {
    const fd = new FormData()
    fd.append('file', file)
    return fetch(`${BASE}/counselors/avatar`, { method: 'POST', body: fd,
      headers: { 'X-Counselor-Token': getCounselorToken() } })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.detail || '上传失败')
        return data
      })
  },
  counselorResetAvatar: (avatar) => post('/counselors/avatar/reset', { avatar }),
  counselorList: () => request('/counselors/list'),
  counselorToggle: (id) => put(`/counselors/${id}/toggle`, {}),
  counselorDelete: (id) => del(`/counselors/${id}`),

  // Agent
  chat: (messages, mode) => post('/agent/chat', { messages, mode }),
  publicChat: (messages) => post('/public/chat', { messages, mode: 'external' }, 'none'),
  publicInfo: () => request('/public/info', null, 'none'),
  getConfig: () => request('/agent/config'),
  saveConfig: (cfg) => post('/agent/config', cfg),
  testConnection: () => post('/agent/test', {}),

  // 会话记忆
  listSessions: () => request('/agent/sessions'),
  createSession: (title, mode) => post('/agent/sessions', { title, mode }),
  deleteSession: (id) => del(`/agent/sessions/${id}`),
  getSessionMessages: (id) => request(`/agent/sessions/${id}/messages`),
  saveMessage: (id, role, content) => post(`/agent/sessions/${id}/messages`, { role, content }),

  // 报警
  alerts: (read = 'all') => request(`/alerts?read=${read}`),
  unreadCount: () => request('/alerts/unread-count'),
  markAlertRead: (id) => post(`/alerts/${id}/read`),
  markAllAlertsRead: () => post('/alerts/read-all'),

  // 学生入口（带 student token）
  studentStatus: () => request('/students/status', null, 'student'),
  studentLogin: (sid, pwd) => post('/students/login', { student_id: sid, password: pwd }, 'none'),
  studentLogout: () => post('/students/logout', {}, 'student'),
  studentChat: (messages) => post('/students/chat', { messages }, 'student'),
  studentHistory: () => request('/students/history', null, 'student'),
  studentProfile: () => request('/students/profile', null, 'student'),

  // 辅导员管理学生账号
  listStudentAccounts: () => request('/student-accounts'),
  createStudentAccount: (data) => post('/student-accounts', data),
  updateStudentAccount: (id, data) => put(`/student-accounts/${id}`, data),
  deleteStudentAccount: (id) => del(`/student-accounts/${id}`),
  batchCreateStudentAccounts: (data) => post('/student-accounts/batch', data),
}

export { setToken, getToken, setStudentToken, getStudentToken,
  setCounselorToken, getCounselorToken, setCounselorAccount, getCounselorAccount }