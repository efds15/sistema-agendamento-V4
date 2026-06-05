import { useState, useRef } from 'react'
import api from '../services/api'
import { toast } from './UI'

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001'

// Retorna a URL completa da imagem
export function imageUrl(path) {
  if (!path) return null
  if (path.startsWith('http')) return path
  return `${API_BASE}${path}`
}

// Avatar com imagem ou iniciais
export function UserAvatar({ name='?', imageUrl: img, size=36, color='brand' }) {
  const [err, setErr] = useState(false)
  const initials = name.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase()
  const gradients = {
    brand: 'linear-gradient(135deg,#6366F1,#465FFF)',
    teal:  'linear-gradient(135deg,#14B8A6,#0891B2)',
    amber: 'linear-gradient(135deg,#F59E0B,#EF4444)',
    green: 'linear-gradient(135deg,#22C55E,#16A34A)',
  }
  const full = img && !err ? (img.startsWith('http') ? img : `${API_BASE}${img}`) : null

  if (full) {
    return (
      <div style={{ width:`${size}px`, height:`${size}px`, borderRadius:'50%', overflow:'hidden', flexShrink:0, border:'2px solid var(--border)' }}>
        <img src={full} alt={name} onError={()=>setErr(true)}
          style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
      </div>
    )
  }
  return (
    <div style={{ width:`${size}px`, height:`${size}px`, borderRadius:'50%', background: gradients[color]||gradients.brand, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:`${Math.floor(size*0.35)}px`, color:'#fff', flexShrink:0, letterSpacing:'-.5px' }}>
      {initials}
    </div>
  )
}

// Equipamento avatar — ícone ou imagem
export function EquipmentAvatar({ name, imageUrl: img, type, size=38 }) {
  const [err, setErr] = useState(false)
  const eqIcon = { projetor:'📽', computador:'💻', kit_didatico:'🤖', camera:'📷', audio:'🔊', outro:'📦' }
  const full = img && !err ? (img.startsWith('http') ? img : `${API_BASE}${img}`) : null

  if (full) {
    return (
      <div style={{ width:`${size}px`, height:`${size}px`, borderRadius:'var(--radius)', overflow:'hidden', flexShrink:0, border:'1px solid var(--border)' }}>
        <img src={full} alt={name} onError={()=>setErr(true)}
          style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
      </div>
    )
  }
  return (
    <div style={{ width:`${size}px`, height:`${size}px`, borderRadius:'var(--radius)', background:'var(--brand-50)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:`${Math.floor(size*0.45)}px`, flexShrink:0 }}>
      {eqIcon[type] || '📦'}
    </div>
  )
}

// Botão de upload de imagem — integrado nos modais de edição
export function ImageUploadField({ entityType, entityId, currentImage, onUploaded, label='Foto' }) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview]     = useState(currentImage || null)
  const inputRef = useRef(null)

  const endpointMap = { teacher: 'teachers', user: 'users', equipment: 'equipments' }
  const endpoint = endpointMap[entityType]

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return

    // Preview local imediato
    const reader = new FileReader()
    reader.onload = ev => setPreview(ev.target.result)
    reader.readAsDataURL(file)

    if (!entityId) {
      // Sem ID ainda (criação nova) — apenas preview, upload depois do save
      onUploaded?.({ file, preview: URL.createObjectURL(file) })
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('image', file)
      const r = await api.post(`/${endpoint}/${entityId}/image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setPreview(r.data.image_url)
      onUploaded?.(r.data.image_url)
      toast('Imagem atualizada!')
    } catch {
      toast('Erro ao enviar imagem', 'error')
      setPreview(currentImage || null)
    } finally {
      setUploading(false)
    }
  }

  async function handleRemove() {
    if (!entityId) { setPreview(null); onUploaded?.(null); return }
    try {
      await api.delete(`/image/${entityType}/${entityId}`)
      setPreview(null)
      onUploaded?.(null)
      toast('Imagem removida', 'warning')
    } catch { toast('Erro ao remover', 'error') }
  }

  const fullPreview = preview
    ? (preview.startsWith('data:') || preview.startsWith('http') ? preview : `${API_BASE}${preview}`)
    : null

  return (
    <div style={{ display:'flex', alignItems:'center', gap:'14px' }}>
      {/* Avatar preview */}
      <div style={{ position:'relative', flexShrink:0 }}>
        <div style={{ width:'64px', height:'64px', borderRadius: entityType==='equipment'?'var(--radius-lg)':'50%', background: fullPreview?'transparent':'var(--surface-3)', border:'2px dashed var(--border-2)', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', cursor:'pointer', transition:'border-color .15s' }}
          onClick={() => inputRef.current?.click()}
          onMouseEnter={e=>e.currentTarget.style.borderColor='var(--brand)'}
          onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border-2)'}>
          {fullPreview ? (
            <img src={fullPreview} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
          ) : (
            <span style={{ fontSize:'24px', opacity:.5 }}>{entityType==='equipment'?'📦':'👤'}</span>
          )}
          {uploading && (
            <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,.5)', display:'flex', alignItems:'center', justifyContent:'center', borderRadius:'inherit' }}>
              <div style={{ width:'18px', height:'18px', border:'2px solid rgba(255,255,255,.4)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin .6s linear infinite' }} />
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          )}
        </div>
        {/* Botão câmera */}
        <div onClick={() => inputRef.current?.click()}
          style={{ position:'absolute', bottom:'-2px', right:'-2px', width:'22px', height:'22px', background:'var(--brand)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontSize:'11px', border:'2px solid var(--surface)', boxShadow:'0 1px 4px rgba(0,0,0,.2)' }}>
          📷
        </div>
      </div>

      {/* Ações */}
      <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
        <div style={{ fontSize:'12px', fontWeight:600, color:'var(--text-2)' }}>{label}</div>
        <div style={{ display:'flex', gap:'6px' }}>
          <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
            style={{ padding:'5px 12px', background:'var(--brand-50)', color:'var(--brand)', border:'1px solid var(--brand-100)', borderRadius:'var(--radius-sm)', cursor:'pointer', fontSize:'12px', fontWeight:600 }}>
            {uploading ? 'Enviando...' : fullPreview ? 'Alterar' : 'Adicionar'}
          </button>
          {fullPreview && (
            <button type="button" onClick={handleRemove}
              style={{ padding:'5px 10px', background:'var(--danger-bg)', color:'var(--danger)', border:'none', borderRadius:'var(--radius-sm)', cursor:'pointer', fontSize:'12px', fontWeight:600 }}>
              Remover
            </button>
          )}
        </div>
        <div style={{ fontSize:'11px', color:'var(--text-4)' }}>JPG, PNG ou WEBP · máx 5MB</div>
      </div>

      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} style={{ display:'none' }} />
    </div>
  )
}
