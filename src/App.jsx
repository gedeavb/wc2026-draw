import { useState, useCallback, useEffect, useRef } from 'react'
import { supabase } from './supabase'
import './App.css'

const DEFAULT_CLUBS = {
  S: ['Argentina', 'Prancis', 'Brasil', 'Inggris', 'Portugal', 'Spanyol', 'Jerman', 'Belanda'],
  A: ['Italia', 'Belgia', 'Kroasia', 'Senegal', 'Maroko', 'Amerika Serikat', 'Meksiko', 'Jepang'],
  B: ['Australia', 'Korea Selatan', 'Ghana', 'Ekuador', 'Kamerun', 'Tunisia', 'Iran', 'Swiss'],
}

const DEFAULT_STATE = {
  clubs: { S: [...DEFAULT_CLUBS.S], A: [...DEFAULT_CLUBS.A], B: [...DEFAULT_CLUBS.B] },
  names: [],
  results: [],
  used_clubs: { S: [], A: [], B: [] },
  draw_done: false,
}

const POT_META = {
  S: { label: 'Unggulan Utama', color: 'pot-s' },
  A: { label: 'Pot Menengah', color: 'pot-a' },
  B: { label: 'Pot Underdog', color: 'pot-b' },
}

function arraysToSets(obj) {
  return { S: new Set(obj.S), A: new Set(obj.A), B: new Set(obj.B) }
}
function setsToArrays(obj) {
  return { S: [...obj.S], A: [...obj.A], B: [...obj.B] }
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function PotCard({ pot, clubs, usedClubs, onAdd, onRemove }) {
  const [input, setInput] = useState('')
  const meta = POT_META[pot]
  const handleAdd = () => {
    const v = input.trim()
    if (!v) return
    onAdd(pot, v)
    setInput('')
  }
  return (
    <div className={`pot-card ${meta.color}`}>
      <div className="pot-header">
        <span className="pot-letter">{pot}</span>
        <span className="pot-label">{meta.label}</span>
        <span className="pot-count">{clubs.length} klub</span>
      </div>
      <div className="pot-body">
        <ul className="club-list">
          {clubs.map((c, i) => (
            <li key={c} className={`club-item ${usedClubs.has(c) ? 'used' : ''}`}>
              <span className="club-dot" />
              <span className="club-name">{c}</span>
              {usedClubs.has(c) && <span className="used-badge">terpakai</span>}
              <button className="remove-btn" onClick={() => onRemove(pot, i)}>x</button>
            </li>
          ))}
          {clubs.length === 0 && <li className="empty-club">Belum ada klub</li>}
        </ul>
        <div className="pot-input-row">
          <input
            type="text"
            placeholder="Tambah klub..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <button onClick={handleAdd}>+</button>
        </div>
      </div>
    </div>
  )
}

function ResultCard({ result, index, isNew }) {
  return (
    <div className={`result-card ${isNew ? 'result-new' : ''}`}>
      <div className="result-index">{index + 1}</div>
      <div className="result-content">
        <div className="result-name">{result.name}</div>
        <div className="result-clubs">
          {['S', 'A', 'B'].map(pot => (
            <span key={pot} className={`club-badge badge-${pot.toLowerCase()}`}>
              <span className="badge-pot">{pot}</span>
              {result.clubs[pot]}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [tab, setTab] = useState('setup')
  const [clubs, setClubs] = useState(DEFAULT_STATE.clubs)
  const [names, setNames] = useState([])
  const [results, setResults] = useState([])
  const [drawDone, setDrawDone] = useState(false)
  const [usedClubsRaw, setUsedClubsRaw] = useState({ S: [], A: [], B: [] })
  const usedClubs = arraysToSets(usedClubsRaw)

  const [nameInput, setNameInput] = useState('')
  const [newResultNames, setNewResultNames] = useState(new Set())
  const [warning, setWarning] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const saveTimer = useRef(null)

  // Load data dari Supabase saat pertama buka
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('draw_data')
        .select('*')
        .eq('id', 'session')
        .single()

      if (!error && data) {
        setClubs(data.clubs || DEFAULT_STATE.clubs)
        setNames(data.names || [])
        setResults(data.results || [])
        setUsedClubsRaw(data.used_clubs || { S: [], A: [], B: [] })
        setDrawDone(data.draw_done || false)
      }
      setLoading(false)
    }
    loadData()

    // Realtime: sync ke semua device yang buka app
    const channel = supabase
      .channel('draw_data_changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'draw_data' }, payload => {
        const d = payload.new
        setClubs(d.clubs || DEFAULT_STATE.clubs)
        setNames(d.names || [])
        setResults(d.results || [])
        setUsedClubsRaw(d.used_clubs || { S: [], A: [], B: [] })
        setDrawDone(d.draw_done || false)
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  // Simpan ke Supabase dengan debounce 600ms
  const saveToSupabase = useCallback((patch) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaving(true)
      await supabase.from('draw_data').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', 'session')
      setSaving(false)
    }, 600)
  }, [])

  const updateClubs = (next) => { setClubs(next); saveToSupabase({ clubs: next }) }
  const updateNames = (fn) => { setNames(prev => { const next = typeof fn === 'function' ? fn(prev) : fn; saveToSupabase({ names: next }); return next }) }
  const updateResults = (fn) => { setResults(prev => { const next = typeof fn === 'function' ? fn(prev) : fn; return next }) }
  const updateUsed = (next) => { const arr = setsToArrays(next); setUsedClubsRaw(arr); return arr }

  const addClub = (pot, name) => {
    if (clubs[pot].includes(name)) return
    const next = { ...clubs, [pot]: [...clubs[pot], name] }
    updateClubs(next)
  }

  const removeClub = (pot, idx) => {
    const next = { ...clubs, [pot]: clubs[pot].filter((_, i) => i !== idx) }
    updateClubs(next)
  }

  const addName = () => {
    const v = nameInput.trim()
    if (!v || names.includes(v)) return
    updateNames(prev => [...prev, v])
    setNameInput('')
  }

  const removeName = idx => updateNames(prev => prev.filter((_, i) => i !== idx))

  const loadDefaults = () => updateClubs({ S: [...DEFAULT_CLUBS.S], A: [...DEFAULT_CLUBS.A], B: [...DEFAULT_CLUBS.B] })
  const clearClubs = () => updateClubs({ S: [], A: [], B: [] })

  const runDraw = () => {
    setWarning('')
    if (names.length === 0) { setWarning('Tambahkan peserta terlebih dahulu.'); return }

    const avail = pot => clubs[pot].filter(c => !usedClubs[pot].has(c))
    const undone = names.filter(n => !results.find(r => r.name === n))
    if (undone.length === 0) { setWarning('Semua peserta sudah di-draw. Reset untuk mengulang.'); return }

    for (const pot of ['S', 'A', 'B']) {
      if (avail(pot).length < undone.length) {
        setWarning(`Klub di pot ${pot} tidak cukup (tersedia ${avail(pot).length}, butuh ${undone.length}).`)
        return
      }
    }

    const newUsed = { S: new Set(usedClubs.S), A: new Set(usedClubs.A), B: new Set(usedClubs.B) }
    const picked = { S: shuffle(avail('S')), A: shuffle(avail('A')), B: shuffle(avail('B')) }
    const newResults = []
    const newNames = new Set()

    undone.forEach((name, i) => {
      const r = { name, clubs: { S: picked.S[i], A: picked.A[i], B: picked.B[i] } }
      newResults.push(r)
      newNames.add(name)
      newUsed.S.add(picked.S[i])
      newUsed.A.add(picked.A[i])
      newUsed.B.add(picked.B[i])
    })

    const usedArr = updateUsed(newUsed)
    const nextResults = [...results, ...newResults]
    setResults(nextResults)
    setDrawDone(true)
    setNewResultNames(newNames)
    setTimeout(() => setNewResultNames(new Set()), 1500)

    saveToSupabase({ results: nextResults, used_clubs: usedArr, draw_done: true })
  }

  const resetDraw = () => {
    setResults([])
    setUsedClubsRaw({ S: [], A: [], B: [] })
    setDrawDone(false)
    setWarning('')
    setNewResultNames(new Set())
    saveToSupabase({ results: [], used_clubs: { S: [], A: [], B: [] }, draw_done: false })
  }

  const handleResetAll = async () => {
    if (!window.confirm('Hapus semua data dan mulai dari awal?')) return
    const fresh = { clubs: DEFAULT_STATE.clubs, names: [], results: [], used_clubs: { S: [], A: [], B: [] }, draw_done: false }
    await supabase.from('draw_data').update({ ...fresh, updated_at: new Date().toISOString() }).eq('id', 'session')
    setClubs(fresh.clubs)
    setNames([])
    setResults([])
    setUsedClubsRaw(fresh.used_clubs)
    setDrawDone(false)
    setWarning('')
  }

  const undone = names.filter(n => !results.find(r => r.name === n))

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: '12px' }}>
      <div className="spinner" />
      <p style={{ color: 'var(--text2)', fontSize: '14px' }}>Memuat data...</p>
    </div>
  )

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <div className="trophy">🏆</div>
          <div>
            <h1 className="app-title">Drawing Club</h1>
            <p className="app-sub">Piala Dunia 2026</p>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
            {saving && <span className="saving-badge">menyimpan...</span>}
            {!saving && <span className="saved-badge">tersimpan</span>}
            <button className="reset-all-btn" onClick={handleResetAll}>Reset Semua</button>
          </div>
        </div>
      </header>

      <div className="tab-bar">
        {['setup', 'peserta', 'draw'].map(t => (
          <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t === 'setup' ? 'Setup Klub' : t === 'peserta' ? 'Peserta' : 'Draw & Hasil'}
          </button>
        ))}
      </div>

      <main className="main-content">
        {tab === 'setup' && (
          <div className="tab-view">
            <div className="stats-row">
              {['S', 'A', 'B'].map(pot => (
                <div key={pot} className={`stat-pill stat-${pot.toLowerCase()}`}>
                  <span className="stat-pot">{pot}</span>
                  <span className="stat-num">{clubs[pot].length}</span>
                  <span className="stat-unit">klub</span>
                </div>
              ))}
            </div>
            <div className="pots-grid">
              {['S', 'A', 'B'].map(pot => (
                <PotCard key={pot} pot={pot} clubs={clubs[pot]} usedClubs={usedClubs[pot]} onAdd={addClub} onRemove={removeClub} />
              ))}
            </div>
            <div className="actions-row">
              <button onClick={loadDefaults}>Klub default WC 2026</button>
              <button className="danger" onClick={clearClubs}>Kosongkan semua</button>
            </div>
          </div>
        )}

        {tab === 'peserta' && (
          <div className="tab-view">
            <div className="section-label">Tambah peserta</div>
            <div className="name-input-row">
              <input
                type="text"
                placeholder="Nama peserta..."
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addName()}
              />
              <button className="primary" onClick={addName}>+ Tambah</button>
            </div>
            <div className="names-wrap">
              {names.map((n, i) => (
                <span key={n} className="name-tag">
                  {n}
                  <button className="tag-remove" onClick={() => removeName(i)}>x</button>
                </span>
              ))}
              {names.length === 0 && <p className="empty-hint">Belum ada peserta.</p>}
            </div>
            {names.length > 0 && <p className="names-count">{names.length} peserta terdaftar</p>}
          </div>
        )}

        {tab === 'draw' && (
          <div className="tab-view">
            <div className="draw-stats">
              <div className="draw-stat"><span className="ds-val">{names.length}</span><span className="ds-label">Total peserta</span></div>
              <div className="draw-stat"><span className="ds-val">{results.length}</span><span className="ds-label">Sudah di-draw</span></div>
              <div className="draw-stat"><span className="ds-val ds-remain">{undone.length}</span><span className="ds-label">Belum di-draw</span></div>
            </div>
            {warning && <div className="warning-box">{warning}</div>}
            <div className="draw-actions">
              <button className="primary" onClick={runDraw} disabled={drawDone && undone.length === 0}>
                {results.length === 0 ? 'Mulai Draw' : undone.length > 0 ? `Draw ${undone.length} peserta` : 'Semua sudah di-draw'}
              </button>
              <button className="danger" onClick={resetDraw}>Reset Draw</button>
            </div>
            {results.length > 0 && (
              <>
                <div className="section-label" style={{ marginTop: '1.5rem' }}>Hasil draw</div>
                <div className="results-list">
                  {results.map((r, i) => <ResultCard key={r.name} result={r} index={i} isNew={newResultNames.has(r.name)} />)}
                </div>
              </>
            )}
            {results.length === 0 && (
              <div className="draw-empty">
                <div className="draw-empty-icon">🎯</div>
                <p>Klik "Mulai Draw" untuk membagikan klub secara acak ke setiap peserta.</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
