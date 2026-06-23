import { useEffect, useRef, useState, useCallback } from 'react'
import { createStompClient, subscribeBlueprint } from './lib/stompClient.js'
import { createSocket } from './lib/socketIoClient.js'

const API = import.meta.env.VITE_API_BASE ?? 'http://localhost:8080'
const IO  = import.meta.env.VITE_IO_BASE  ?? 'http://localhost:3001'

export default function App() {
  const [tech, setTech]         = useState('stomp')
  const [author, setAuthor]     = useState('juan')
  const [bpName, setBpName]     = useState('')
  const [blueprints, setBlueprints] = useState([])
  const [points, setPoints]     = useState([])
  const [selected, setSelected] = useState(null)
  const [status, setStatus]     = useState('')

  const canvasRef = useRef(null)
  const stompRef  = useRef(null)
  const unsubRef  = useRef(null)
  const socketRef = useRef(null)

  const loadAuthor = useCallback(async () => {
    if (!author.trim()) return
    setStatus('Cargando...')
    try {
      const r = await fetch(`${API}/api/blueprints?author=${encodeURIComponent(author)}`)
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      setBlueprints(await r.json())
      setStatus('')
    } catch (e) {
      setStatus(`Error al cargar: ${e.message}`)
    }
  }, [author])

  const selectBp = useCallback((bp) => {
    setSelected({ author: bp.author, name: bp.name })
    setBpName(bp.name)
    setPoints(bp.points ?? [])
  }, [])

  const createBp = useCallback(async () => {
    if (!bpName.trim()) { setStatus('Ingresa un nombre para el plano'); return }
    setStatus('Creando...')
    try {
      const r = await fetch(`${API}/api/blueprints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author, name: bpName, points: [] }),
      })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const created = await r.json()
      setSelected({ author: created.author, name: created.name })
      setPoints([])
      await loadAuthor()
      setStatus(`Plano "${bpName}" creado`)
    } catch (e) {
      setStatus(`Error al crear: ${e.message}`)
    }
  }, [author, bpName, loadAuthor])

  const saveBp = useCallback(async () => {
    if (!selected) return
    setStatus('Guardando...')
    try {
      const r = await fetch(`${API}/api/blueprints/${selected.author}/${selected.name}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points }),
      })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      await loadAuthor()
      setStatus('Guardado correctamente')
    } catch (e) {
      setStatus(`Error al guardar: ${e.message}`)
    }
  }, [selected, points, loadAuthor])

  const deleteBp = useCallback(async () => {
    if (!selected) return
    if (!confirm(`¿Eliminar "${selected.name}"?`)) return
    setStatus('Eliminando...')
    try {
      const r = await fetch(`${API}/api/blueprints/${selected.author}/${selected.name}`, {
        method: 'DELETE',
      })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      setSelected(null)
      setPoints([])
      setBpName('')
      await loadAuthor()
      setStatus('Plano eliminado')
    } catch (e) {
      setStatus(`Error al eliminar: ${e.message}`)
    }
  }, [selected, loadAuthor])

  useEffect(() => {
    unsubRef.current?.()
    unsubRef.current = null
    stompRef.current?.deactivate?.()
    stompRef.current = null
    socketRef.current?.disconnect?.()
    socketRef.current = null

    if (!selected || tech === 'none') return

    if (tech === 'stomp') {
      const client = createStompClient(API)
      stompRef.current = client
      client.onConnect = () => {
        unsubRef.current = subscribeBlueprint(client, selected.author, selected.name, (upd) => {
          setPoints(upd.points ?? [])
        })
      }
      client.activate()
    } else {
      const s = createSocket(IO)
      socketRef.current = s
      const room = `blueprints.${selected.author}.${selected.name}`
      s.on('connect', () => {
        s.emit('join-room', room)
      })
      s.on('blueprint-update', (upd) => setPoints(upd.points ?? []))
    }

    return () => {
      unsubRef.current?.()
      stompRef.current?.deactivate?.()
      socketRef.current?.disconnect?.()
    }
  }, [tech, selected])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (points.length === 0) return

    ctx.strokeStyle = '#1a73e8'
    ctx.lineWidth = 2
    ctx.beginPath()
    points.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y)
      else ctx.lineTo(p.x, p.y)
    })
    ctx.stroke()

    ctx.fillStyle = '#1a73e8'
    points.forEach(p => {
      ctx.beginPath()
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2)
      ctx.fill()
    })
  }, [points])

  function onCanvasClick(e) {
    if (!selected) {
      setStatus('Selecciona o crea un plano primero')
      return
    }
    const rect = e.target.getBoundingClientRect()
    const point = {
      x: Math.round(e.clientX - rect.left),
      y: Math.round(e.clientY - rect.top),
    }

    if (tech === 'none') {
      setPoints(prev => [...prev, point])
      return
    }

    // Actualización optimista: el punto aparece de inmediato localmente
    setPoints(prev => [...prev, point])

    if (tech === 'stomp' && stompRef.current?.connected) {
      stompRef.current.publish({
        destination: '/app/draw',
        body: JSON.stringify({ author: selected.author, name: selected.name, point }),
      })
    } else if (tech === 'socketio' && socketRef.current?.connected) {
      const room = `blueprints.${selected.author}.${selected.name}`
      socketRef.current.emit('draw-event', { room, author: selected.author, name: selected.name, point })
    } else {
      setStatus('RT no conectado — punto solo local')
    }
  }

  const totalPoints = blueprints.reduce((acc, bp) => acc + (bp.points?.length ?? 0), 0)
  const rtLabel = tech === 'stomp' ? 'STOMP activo' : tech === 'socketio' ? 'Socket.IO activo' : 'Solo local'

  return (
    <div style={S.root}>
      <h2 style={S.title}>BluePrints RT — Colaboración en tiempo real</h2>

      <div style={S.topBar}>
        <label style={S.label}>Autor:</label>
        <input
          value={author}
          onChange={e => setAuthor(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && loadAuthor()}
          style={S.input}
          placeholder="ej. juan"
        />
        <button onClick={loadAuthor} style={S.btnSec}>Cargar</button>

        <span style={{ marginLeft: 20, ...S.label }}>Tecnología RT:</span>
        <select value={tech} onChange={e => setTech(e.target.value)} style={S.select}>
          <option value="none">Ninguna (local)</option>
          <option value="stomp">STOMP (Spring Boot)</option>
          <option value="socketio">Socket.IO (Node.js)</option>
        </select>

        <span style={S.rtBadge(tech)}>{rtLabel}</span>
      </div>

      <div style={S.body}>

        <div style={S.panel}>
          <p style={S.panelTitle}>Planos de <strong>"{author}"</strong></p>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Nombre</th>
                <th style={S.th}>Puntos</th>
              </tr>
            </thead>
            <tbody>
              {blueprints.length === 0 && (
                <tr>
                  <td colSpan={2} style={{ padding: 10, textAlign: 'center', color: '#999' }}>
                    Sin planos — carga un autor
                  </td>
                </tr>
              )}
              {blueprints.map(bp => (
                <tr
                  key={bp.name}
                  onClick={() => selectBp(bp)}
                  style={{
                    cursor: 'pointer',
                    background: selected?.name === bp.name ? '#e8f0fe' : 'transparent',
                    transition: 'background .15s',
                  }}
                >
                  <td style={S.td}>{bp.name}</td>
                  <td style={{ ...S.td, textAlign: 'center' }}>{bp.points?.length ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={S.total}>
            Total puntos: <strong>{totalPoints}</strong>
          </p>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <canvas
            ref={canvasRef}
            width={680}
            height={440}
            style={S.canvas}
            onClick={onCanvasClick}
          />

          {/* Barra de acciones */}
          <div style={S.actions}>
            <input
              value={bpName}
              onChange={e => setBpName(e.target.value)}
              placeholder="nombre del plano"
              style={{ ...S.input, width: 180 }}
            />
            <button onClick={createBp} style={S.btnPrimary}>+ Crear</button>
            <button onClick={saveBp} style={S.btnPrimary} disabled={!selected}>
              Guardar / Update
            </button>
            <button onClick={deleteBp} style={S.btnDanger} disabled={!selected}>
              Eliminar
            </button>
            {selected && (
              <span style={{ marginLeft: 8, color: '#555', fontSize: 13 }}>
                Editando: <strong>{selected.author}/{selected.name}</strong>
                {' '}— {points.length} pts
              </span>
            )}
          </div>

          {status && <p style={S.statusBar}>{status}</p>}

          <p style={{ opacity: .6, fontSize: 12, marginTop: 6 }}>
            Haz clic en el canvas para agregar puntos.
            {tech !== 'none' && ' Abre 2 pestañas con el mismo plano para ver la colaboración en vivo.'}
          </p>
        </div>
      </div>
    </div>
  )
}

const S = {
  root:       { fontFamily: 'Inter, system-ui, sans-serif', padding: 20, maxWidth: 1100, color: '#1a1a1a' },
  title:      { margin: '0 0 14px', fontSize: 22, fontWeight: 600 },
  topBar:     { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' },
  label:      { fontSize: 14, color: '#444' },
  input:      { padding: '6px 10px', border: '1px solid #ccc', borderRadius: 6, fontSize: 14, outline: 'none' },
  select:     { padding: '6px 10px', border: '1px solid #ccc', borderRadius: 6, fontSize: 14 },
  btnPrimary: { padding: '6px 14px', background: '#1a73e8', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14 },
  btnSec:     { padding: '6px 14px', background: '#f1f3f4', color: '#333', border: '1px solid #ccc', borderRadius: 6, cursor: 'pointer', fontSize: 14 },
  btnDanger:  { padding: '6px 14px', background: '#d93025', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14 },
  body:       { display: 'flex', gap: 16, alignItems: 'flex-start' },
  panel:      { width: 210, flexShrink: 0, border: '1px solid #e0e0e0', borderRadius: 8, padding: 12, background: '#fafafa' },
  panelTitle: { margin: '0 0 8px', fontSize: 14, color: '#333' },
  table:      { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th:         { textAlign: 'left', padding: '5px 8px', background: '#f1f3f4', fontWeight: 600, borderBottom: '1px solid #ddd' },
  td:         { padding: '6px 8px', borderBottom: '1px solid #f0f0f0' },
  total:      { margin: '10px 0 0', fontSize: 13, color: '#555' },
  canvas:     { border: '1px solid #ccc', borderRadius: 10, cursor: 'crosshair', display: 'block', background: '#fff' },
  actions:    { display: 'flex', gap: 8, marginTop: 10, alignItems: 'center', flexWrap: 'wrap' },
  statusBar:  { margin: '6px 0 0', fontSize: 13, color: '#555', background: '#fffde7', border: '1px solid #ffe082', borderRadius: 4, padding: '4px 10px' },
  rtBadge: (tech) => ({
    marginLeft: 8, fontSize: 12, padding: '3px 10px', borderRadius: 12,
    background: tech === 'none' ? '#e0e0e0' : '#e8f5e9',
    color: tech === 'none' ? '#555' : '#2e7d32',
    fontWeight: 600,
  }),
}
