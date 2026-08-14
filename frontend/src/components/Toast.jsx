import React, { useState } from 'react'

export const Toast = React.createContext(null)

export function useToast() {
  return React.useContext(Toast)
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const show = (msg, type = 'success') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, msg, type }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600)
  }

  return (
    <Toast.Provider value={show}>
      {children}
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type === 'error' ? 'error' : ''}`}>{t.msg}</div>
      ))}
    </Toast.Provider>
  )
}
