import React, { useState, useEffect } from 'react'

/**
 * 通用头像：判断 avatar 字段是图片路径("/api/avatars/xxx" 或 "http") 还是单字/emoji
 * <Avatar avatar={acc.avatar} color={acc.avatar_color} name={acc.name} size={32} />
 */
export default function Avatar({ avatar, color = '#5b8cff', name = '', size = 32, rounded = '32%' }) {
  const [imgOk, setImgOk] = useState(true)
  useEffect(() => { setImgOk(true) }, [avatar])

  const isImage = avatar && (avatar.startsWith('/api/avatars/') ||
                             avatar.startsWith('http') ||
                             avatar.startsWith('data:'))
  const fontSize = Math.round(size * 0.5)

  if (isImage && imgOk) {
    return (
      <img
        src={avatar}
        alt={name}
        onError={() => setImgOk(false)}
        style={{
          width: size, height: size, borderRadius: rounded,
          objectFit: 'cover', flexShrink: 0,
          border: '1px solid var(--border-strong)',
        }}
      />
    )
  }
  // 文字头像
  const ch = avatar || (name ? name[0] : '辅')
  return (
    <div style={{
      width: size, height: size, borderRadius: rounded,
      background: `linear-gradient(135deg, ${color}, ${color}aa)`,
      color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize, fontWeight: 700, flexShrink: 0,
      boxShadow: `0 4px 14px ${color}55`,
    }}>{ch}</div>
  )
}