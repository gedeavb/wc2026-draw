import { useState, useCallback } from 'react'
import './App.css'

const DEFAULT_CLUBS = {
  S: ['Argentina', 'Prancis', 'Brasil', 'Inggris', 'Portugal', 'Spanyol', 'Jerman', 'Belanda'],
  A: ['Italia', 'Belgia', 'Kroasia', 'Senegal', 'Maroko', 'Amerika Serikat', 'Meksiko', 'Jepang'],
  B: ['Australia', 'Korea Selatan', 'Ghana', 'Ekuador', 'Kamerun', 'Tunisia', 'Iran', 'Swiss'],
}

const POT_META = {
  S: { label: 'Unggulan Utama', color: 'pot-s' },
  A: { label: 'Pot Menengah', color: 'pot-a' },
  B: { label: 'Pot Underdog', color: 'pot-b' },
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
              <button className="remove-btn" onClick={() => onRemove(pot, i)} title="Hapus">×</button>
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
  const [clubs, setClubs] = useState({ S: [...DEFAULT_CLUBS.S], A: [...DEFAULT_CLUBS.A], B: [...DEFAULT_CLUBS.B] })
  const [names, setNames] = useState([])
  const [nameInput, setNameInput] = useState('')
  const [results, setResults] = useState([])
  const [usedClubs, setUsedClubs] = useState({ S: new Set(), A: new Set(), B: new Set() })
  const [newResultNames, setNewResultNames] = useState(new Set())
  const [warning, setWarning] = useState('')
  const [drawDone, setDrawDone] = useState(false)

  const addClub = (pot, name) => {
    if (clubs[pot].includes(name)) return
    setClubs(prev => ({ ...prev, [pot]: [...prev[pot], name] }))
  }

  const removeClub = (pot, idx) => {
    setClubs(prev => ({ ...prev, [pot]: prev[pot].filter((_, i) => i !== idx) }))
  }

  const addName = () => {
    const v = nameInput.trim()
    if (!v || names.includes(v)) return
    setNames(prev => [...prev, v])
    setNameInput('')
  }

  const removeName = idx => setNames(prev => prev.filter((_, i) => i !== idx))

  const loadDefaults = () => setClubs({ S: [...DEFAULT_CLUBS.S], A: [...DEFAULT_CLUBS.A], B: [...DEFAULT_CLUBS.B] })
  const clearClubs = () => setClubs({ S: [], A: [], B: [] })

  const runDraw = useCallback(() => {
    setWarning('')
    if (names.length === 0) { setWarning('Tambahkan peserta terlebih dahulu.'); return }

    const avail = pot => clubs[pot].filter(c => !usedClubs[pot].has(c))
    const undone = names.filter(n => !results.find(r => r.name === n))
    if (undone.length === 0) { setWarning('Semua peserta sudah di-draw. Reset untuk mengulang.'); setDrawDone(true); return }

    for (const pot of ['S', 'A', 'B']) {
      if (avail(pot).length < undone.length) {
        setWarning(`Klub di pot ${pot} tidak cukup untuk semua peserta (tersedia ${avail(pot).length}, butuh ${undone.length}). Tambah lebih banyak klub.`)
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

    setUsedClubs(newUsed)
    setResults(prev => [...prev, ...newResults])
    setNewResultNames(newNames)
    setDrawDone(true)
    setTimeout(() => setNewResultNames(new Set()), 1500)
  }, [clubs, names, results, usedClubs])

  const resetDraw = () => {
    setResults([])
    setUsedClubs({ S: new Set(), A: new Set(), B: new Set() })
    setWarning('')
    setDrawDone(false)
    setNewResultNames(new Set())
  }

  const undone = names.filter(n => !results.find(r => r.name === n))

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <div className="trophy">🏆</div>
          <div>
            <h1 className="app-title">Drawing Club</h1>
            <p className="app-sub">Piala Dunia 2026</p>
          </div>
        </div>
      </header>

      <div className="tab-bar">
        {['setup', 'peserta', 'draw'].map(t => (
          <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t === 'setup' ? '⚙ Setup Klub' : t === 'peserta' ? '👥 Peserta' : '🎲 Draw & Hasil'}
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
              <button onClick={loadDefaults}>↺ Klub default WC 2026</button>
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
                  <button className="tag-remove" onClick={() => removeName(i)}>×</button>
                </span>
              ))}
              {names.length === 0 && <p className="empty-hint">Belum ada peserta. Tambahkan nama di atas.</p>}
            </div>
            {names.length > 0 && (
              <p className="names-count">{names.length} peserta terdaftar</p>
            )}
          </div>
        )}

        {tab === 'draw' && (
          <div className="tab-view">
            <div className="draw-stats">
              <div className="draw-stat">
                <span className="ds-val">{names.length}</span>
                <span className="ds-label">Total peserta</span>
              </div>
              <div className="draw-stat">
                <span className="ds-val">{results.length}</span>
                <span className="ds-label">Sudah di-draw</span>
              </div>
              <div className="draw-stat">
                <span className="ds-val ds-remain">{undone.length}</span>
                <span className="ds-label">Belum di-draw</span>
              </div>
            </div>

            {warning && <div className="warning-box">{warning}</div>}

            <div className="draw-actions">
              <button className="primary" onClick={runDraw} disabled={drawDone && undone.length === 0}>
                🎲 {results.length === 0 ? 'Mulai Draw' : undone.length > 0 ? `Draw ${undone.length} peserta` : 'Semua sudah di-draw'}
              </button>
              <button className="danger" onClick={resetDraw}>Reset Draw</button>
            </div>

            {results.length > 0 && (
              <>
                <div className="section-label" style={{ marginTop: '1.5rem' }}>Hasil draw</div>
                <div className="results-list">
                  {results.map((r, i) => (
                    <ResultCard key={r.name} result={r} index={i} isNew={newResultNames.has(r.name)} />
                  ))}
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
