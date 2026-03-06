import { useState, useCallback, useEffect } from 'react'

// ─── Google Font ──────────────────────────────────────────────────────────────
if (!document.querySelector('link[data-tajawal]')) {
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = 'https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;800;900&display=swap'
  link.setAttribute('data-tajawal', '1')
  document.head.appendChild(link)
}

// ─── Keyframe animations ──────────────────────────────────────────────────────
if (!document.querySelector('style[data-huroof]')) {
  const style = document.createElement('style')
  style.setAttribute('data-huroof', '1')
  style.textContent = `
    @keyframes popIn {
      from { opacity: 0; transform: translateY(8px) scale(0.95); }
      to   { opacity: 1; transform: translateY(0)   scale(1);    }
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    @keyframes winPulse {
      0%,100% { transform: scale(1);    filter: brightness(1);   }
      50%     { transform: scale(1.08); filter: brightness(1.35); }
    }
    * { -webkit-tap-highlight-color: transparent; }
  `
  document.head.appendChild(style)
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ARABIC_LETTERS = [
  'أ', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ذ', 'ر',
  'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ع', 'غ', 'ف',
  'ق', 'ك', 'ل', 'م', 'ن', 'هـ', 'و', 'ي',
]

const ROWS = 5
const COLS = 5
const CLIP = 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'

// Board horizontal padding (left + right inside the mat)
const BOARD_PAD_X = 24   // px each side
const BOARD_PAD_Y = 20   // px each side

/**
 * Compute the hex SIZE that fits inside `availableWidth`.
 * totalW = COLS * SIZE*√3 + SIZE*√3/2 + 4  (grid) + 2*BOARD_PAD_X (mat)
 * Solve for SIZE:  SIZE = (availW - 4 - 2*BOARD_PAD_X) / (√3 * (COLS + 0.5))
 */
function computeSize(viewportW: number): number {
  const maxSize = 54
  const minSize = 28
  const available = Math.min(viewportW, 600) - 2 * BOARD_PAD_X - 8  // 8 = grid offset
  const size = available / (Math.sqrt(3) * (COLS + 0.5))
  return Math.max(minSize, Math.min(maxSize, Math.floor(size)))
}

// ─── Color Palette ────────────────────────────────────────────────────────────

const YELLOW_MAIN  = '#facc15'
const YELLOW_DARK  = '#a16207'
const BLUE_MAIN    = '#38bdf8'
const BLUE_DARK    = '#0369a1'
const BORDER_COLOR = '#3d4a5c'

// ─── Types ────────────────────────────────────────────────────────────────────

type Team      = 'yellow' | 'blue'
type CellColor = 'neutral' | 'yellow' | 'blue'

interface Cell { row: number; col: number; letter: string; color: CellColor }
type Grid = Cell[][]

// ─── Pure Helpers ─────────────────────────────────────────────────────────────

function makeGrid(): Grid {
  return Array.from({ length: ROWS }, (_, r) =>
    Array.from({ length: COLS }, (_, c) => ({
      row: r, col: c,
      letter: ARABIC_LETTERS[Math.floor(Math.random() * ARABIC_LETTERS.length)],
      color: 'neutral' as CellColor,
    }))
  )
}

function getNeighbours(r: number, c: number): [number, number][] {
  const odd = r % 2 === 1
  const dirs: [number, number][] = odd
    ? [[-1, 0], [-1, 1], [0, -1], [0, 1], [1, 0], [1, 1]]
    : [[-1, -1], [-1, 0], [0, -1], [0, 1], [1, -1], [1, 0]]
  return dirs
    .map(([dr, dc]): [number, number] => [r + dr, c + dc])
    .filter(([nr, nc]) => nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS)
}

function findWinPath(grid: Grid, color: Team): Set<string> | null {
  const visited = new Map<string, string | null>()
  const queue: [number, number][] = []
  const key = (r: number, c: number) => `${r},${c}`

  if (color === 'yellow') {
    for (let c = 0; c < COLS; c++) {
      if (grid[0][c].color === 'yellow') { visited.set(key(0, c), null); queue.push([0, c]) }
    }
    while (queue.length) {
      const [r, c] = queue.shift()!
      if (r === ROWS - 1) {
        const path = new Set<string>()
        let cur: string | null = key(r, c)
        while (cur !== null) { path.add(cur); cur = visited.get(cur) ?? null }
        return path
      }
      for (const [nr, nc] of getNeighbours(r, c)) {
        const k = key(nr, nc)
        if (!visited.has(k) && grid[nr][nc].color === 'yellow') { visited.set(k, key(r, c)); queue.push([nr, nc]) }
      }
    }
  } else {
    for (let r = 0; r < ROWS; r++) {
      if (grid[r][0].color === 'blue') { visited.set(key(r, 0), null); queue.push([r, 0]) }
    }
    while (queue.length) {
      const [r, c] = queue.shift()!
      if (c === COLS - 1) {
        const path = new Set<string>()
        let cur: string | null = key(r, c)
        while (cur !== null) { path.add(cur); cur = visited.get(cur) ?? null }
        return path
      }
      for (const [nr, nc] of getNeighbours(r, c)) {
        const k = key(nr, nc)
        if (!visited.has(k) && grid[nr][nc].color === 'blue') { visited.set(k, key(r, c)); queue.push([nr, nc]) }
      }
    }
  }
  return null
}

// ─── ScoreBoard ───────────────────────────────────────────────────────────────

function ScoreBoard({ yellow, blue, onReset }: { yellow: number; blue: number; onReset: () => void }) {
  return (
    <div
      className="flex flex-col items-center gap-1.5 rounded-2xl px-4 pt-2.5 pb-2"
      style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        fontFamily: 'Tajawal, serif',
      }}
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: YELLOW_MAIN, boxShadow: `0 0 6px ${YELLOW_MAIN}` }} />
          <span className="text-yellow-300 text-sm font-bold">الأصفر</span>
          <span className="text-xl font-black text-yellow-300 min-w-[24px] text-center"
                style={{ textShadow: `0 0 12px ${YELLOW_MAIN}` }}>{yellow}</span>
        </div>
        <span className="text-white/20 font-thin">—</span>
        <div className="flex items-center gap-1.5">
          <span className="text-xl font-black text-sky-300 min-w-[24px] text-center"
                style={{ textShadow: `0 0 12px ${BLUE_MAIN}` }}>{blue}</span>
          <span className="text-sky-300 text-sm font-bold">الأزرق</span>
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: BLUE_MAIN, boxShadow: `0 0 6px ${BLUE_MAIN}` }} />
        </div>
      </div>
      <button
        onClick={onReset}
        className="text-[11px] text-white/45 hover:text-white/80 transition-colors tracking-wider hover:underline"
        style={{ fontFamily: 'Tajawal, serif' }}
      >
        تصفير النتائج
      </button>
    </div>
  )
}

// ─── ColorPopup ───────────────────────────────────────────────────────────────

interface PopupProps {
  onSelect: (color: Team) => void
  onCancel: () => void
  /** Whether to open below the cell instead of above (for top-edge cells) */
  openBelow?: boolean
}

function ColorPopup({ onSelect, onCancel, openBelow }: PopupProps) {
  const pos = openBelow
    ? { top: '115%', bottom: 'auto' }
    : { bottom: '115%', top: 'auto' }

  return (
    <div
      className="absolute z-50 flex flex-col gap-2 rounded-2xl p-3 shadow-2xl"
      style={{
        ...pos,
        left: '50%',
        transform: 'translateX(-50%)',
        minWidth: 138,
        background: 'rgba(10,12,20,0.97)',
        border: '1px solid rgba(255,255,255,0.12)',
        backdropFilter: 'blur(16px)',
        animation: 'popIn 0.15s ease-out',
      }}
      onClick={e => e.stopPropagation()}
    >
      <p className="text-center text-[10px] text-white/40 tracking-widest uppercase mb-0.5"
         style={{ fontFamily: 'Tajawal, serif' }}>اختر اللون</p>

      <button
        onClick={() => onSelect('yellow')}
        className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition-all hover:brightness-110 active:scale-95"
        style={{
          background: `linear-gradient(135deg, ${YELLOW_MAIN}, ${YELLOW_DARK})`,
          border: `1.5px solid ${YELLOW_MAIN}`,
          fontFamily: 'Tajawal, serif',
          color: '#1a1200',
        }}
      >
        <span className="h-3 w-3 rounded-full flex-shrink-0 bg-white/50" />
        الأصفر
      </button>

      <button
        onClick={() => onSelect('blue')}
        className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-white transition-all hover:brightness-110 active:scale-95"
        style={{
          background: `linear-gradient(135deg, ${BLUE_MAIN}, ${BLUE_DARK})`,
          border: `1.5px solid ${BLUE_MAIN}`,
          fontFamily: 'Tajawal, serif',
        }}
      >
        <span className="h-3 w-3 rounded-full flex-shrink-0 bg-white/50" />
        الأزرق
      </button>

      <div className="h-px bg-white/10 my-0.5" />

      <button
        onClick={onCancel}
        className="rounded-xl px-3 py-1.5 text-sm text-white/50 hover:text-white/80 transition-colors text-center"
        style={{ fontFamily: 'Tajawal, serif' }}
      >
        إلغاء
      </button>

      {/* Arrow — flipped based on position */}
      {!openBelow && (
        <div className="absolute -bottom-[9px] left-1/2 -translate-x-1/2 rotate-45 h-[14px] w-[14px]"
             style={{ background: 'rgba(10,12,20,0.97)', borderRight: '1px solid rgba(255,255,255,0.12)', borderBottom: '1px solid rgba(255,255,255,0.12)' }} />
      )}
      {openBelow && (
        <div className="absolute -top-[9px] left-1/2 -translate-x-1/2 rotate-45 h-[14px] w-[14px]"
             style={{ background: 'rgba(10,12,20,0.97)', borderLeft: '1px solid rgba(255,255,255,0.12)', borderTop: '1px solid rgba(255,255,255,0.12)' }} />
      )}
    </div>
  )
}

// ─── WinOverlay ───────────────────────────────────────────────────────────────

function WinOverlay({ winner, moveCount, onReset }: { winner: Team; moveCount: number; onReset: () => void }) {
  const isYellow = winner === 'yellow'
  const winColor = isYellow ? YELLOW_MAIN : BLUE_MAIN
  const winDark  = isYellow ? YELLOW_DARK  : BLUE_DARK

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(14px)', animation: 'fadeIn 0.3s ease' }}
      onClick={onReset}
    >
      <div
        className="relative flex flex-col items-center gap-5 rounded-3xl px-8 py-10 text-center w-full"
        style={{
          background: isYellow ? 'rgba(20,15,0,0.97)' : 'rgba(0,8,20,0.97)',
          border: `3px solid ${winColor}`,
          boxShadow: `0 0 60px ${winColor}55`,
          animation: 'popIn 0.3s ease',
          maxWidth: 340,
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="absolute inset-0 rounded-3xl -z-10 blur-3xl opacity-25" style={{ background: winColor }} />

        <div>
          <p className="text-white font-bold text-2xl mb-1"
             style={{ fontFamily: 'Tajawal, serif', textShadow: '0 0 30px rgba(255,255,255,0.8)' }}>
            الفائز
          </p>
          <h2 className="text-4xl font-black"
              style={{ fontFamily: 'Tajawal, serif', color: winColor, textShadow: `0 0 30px ${winColor}cc` }}>
            الفريق {isYellow ? 'الأصفر' : 'الأزرق'}
          </h2>
        </div>

        <div className="flex items-center gap-3 rounded-2xl px-6 py-3"
             style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <span className="text-white/40 text-sm" style={{ fontFamily: 'Tajawal, serif' }}>في</span>
          <span className="text-2xl font-black text-white" style={{ fontFamily: 'Tajawal, serif' }}>{moveCount}</span>
          <span className="text-white/40 text-sm" style={{ fontFamily: 'Tajawal, serif' }}>حركة</span>
        </div>

        <button
          onClick={onReset}
          className="w-full rounded-2xl py-3.5 text-lg font-bold transition-all hover:brightness-110 active:scale-95"
          style={{
            background: `linear-gradient(135deg, ${winColor}, ${winDark})`,
            boxShadow: `0 4px 20px ${winColor}50`,
            fontFamily: 'Tajawal, serif',
            color: isYellow ? '#1a1200' : '#ffffff',
          }}
        >
          لعبة جديدة
        </button>
      </div>
    </div>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [grid, setGrid]             = useState<Grid>(makeGrid)
  const [selected, setSelected]     = useState<[number, number] | null>(null)
  const [winner, setWinner]         = useState<Team | null>(null)
  const [moveCount, setMoveCount]   = useState(0)
  const [lastPlaced, setLastPlaced] = useState<string | null>(null)
  const [winPath, setWinPath]       = useState<Set<string>>(new Set())
  const [score, setScore]           = useState({ yellow: 0, blue: 0 })

  // ── Dynamic sizing from viewport width ──────────────────────────────────────
  const [viewportW, setViewportW] = useState(() => window.innerWidth)

  useEffect(() => {
    const onResize = () => setViewportW(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Compute hex dimensions reactively
  const SIZE   = computeSize(viewportW)
  const HEX_W  = SIZE * Math.sqrt(3)
  const HEX_H  = SIZE * 2
  const H_STEP = HEX_W
  const V_STEP = SIZE * 1.5

  const totalW = COLS * H_STEP + HEX_W / 2 + 4
  const totalH = (ROWS - 1) * V_STEP + HEX_H + 4
  // ───────────────────────────────────────────────────────────────────────────

  // On mobile, allow scrolling (game might be taller than viewport)
  useEffect(() => {
    const isMobile = viewportW < 600
    document.body.style.overflow = isMobile ? 'auto' : 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [viewportW])

  const handleCellClick = useCallback((r: number, c: number) => {
    if (winner) return
    if (grid[r][c].color === 'neutral') { setSelected([r, c]); return }
    // Colored → undo
    const newGrid: Grid = grid.map(row => row.map(cell => ({ ...cell })))
    newGrid[r][c].color = 'neutral'
    setGrid(newGrid)
    setSelected(null)
    setMoveCount(m => Math.max(0, m - 1))
  }, [grid, winner])

  const handleColorSelect = useCallback((color: Team) => {
    if (!selected) return
    const [r, c] = selected
    const newGrid: Grid = grid.map(row => row.map(cell => ({ ...cell })))
    newGrid[r][c].color = color
    setGrid(newGrid)
    setSelected(null)
    setMoveCount(m => m + 1)
    setLastPlaced(`${r},${c}`)
    setTimeout(() => setLastPlaced(null), 400)
    const path = findWinPath(newGrid, color)
    if (path) { setWinner(color); setWinPath(path); setScore(s => ({ ...s, [color]: s[color] + 1 })) }
  }, [grid, selected])

  const handleCancel = useCallback(() => setSelected(null), [])

  const reset = useCallback(() => {
    setGrid(makeGrid()); setSelected(null); setWinner(null)
    setMoveCount(0); setLastPlaced(null); setWinPath(new Set())
  }, [])

  const hexFill = (color: CellColor, isSel: boolean): string => {
    if (color === 'yellow') return isSel ? '#fef08a' : YELLOW_MAIN
    if (color === 'blue')   return isSel ? '#bae6fd' : BLUE_MAIN
    return isSel ? '#e8e8f0' : '#ffffff'
  }

  const hexGlow = (color: CellColor): string => {
    if (color === 'yellow') return `drop-shadow(0 0 8px ${YELLOW_MAIN}cc)`
    if (color === 'blue')   return `drop-shadow(0 0 8px ${BLUE_MAIN}cc)`
    return 'drop-shadow(0 2px 4px rgba(0,0,0,0.25))'
  }

  const isMobile = viewportW < 600

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-start gap-4 py-6 px-3 select-none"
      style={{
        background: 'linear-gradient(160deg, #0a0a12 0%, #10101e 50%, #0d0d18 100%)',
        fontFamily: 'Tajawal, serif',
      }}
      onClick={handleCancel}
      dir="rtl"
    >
      {/* ── Header ── */}
      <h1
        className="text-3xl font-black"
        style={{
          color: '#ffffff',
          fontFamily: 'Tajawal, serif',
          letterSpacing: '0.04em',
          textShadow: '0 2px 20px rgba(255,255,255,0.15)',
        }}
      >
        حروف مع بوحميد
      </h1>

      {/* ── Score Board ── */}
      <ScoreBoard yellow={score.yellow} blue={score.blue} onReset={() => setScore({ yellow: 0, blue: 0 })} />

      {/* ── Move Counter ── */}
      {!winner && moveCount > 0 && (
        <div className="flex flex-col items-center -mt-1">
          <span className="text-2xl font-black text-white/60" style={{ fontFamily: 'Tajawal, serif' }}>{moveCount}</span>
          <span className="text-[10px] text-white/25 tracking-widest">حركات</span>
        </div>
      )}

      {/* ── Board ── */}
      <div
        style={{
          padding: `${BOARD_PAD_Y}px ${BOARD_PAD_X}px`,
          borderRadius: 18,
          background: [
            'conic-gradient(from -45deg at 50% 50%,',
            `  ${YELLOW_MAIN} 0deg 90deg,`,
            `  ${BLUE_MAIN}   90deg 180deg,`,
            `  ${YELLOW_MAIN} 180deg 270deg,`,
            `  ${BLUE_MAIN}   270deg 360deg)`,
          ].join(''),
          boxShadow: '0 10px 36px rgba(0,0,0,0.5), inset 0 0 0 2px rgba(255,255,255,0.1)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="relative overflow-visible" style={{ width: totalW, height: totalH }}>
          {grid.flat().map(cell => {
            const x = cell.col * H_STEP + (cell.row % 2 === 1 ? HEX_W / 2 : 0) + 2
            const y = cell.row * V_STEP + 2
            const isSel      = selected?.[0] === cell.row && selected?.[1] === cell.col
            const justPlaced = lastPlaced === `${cell.row},${cell.col}`
            const isWinCell  = winPath.has(`${cell.row},${cell.col}`)
            // Popup opens below for top 2 rows on mobile to avoid clipping
            const openBelow  = isMobile && cell.row < 2

            return (
              <div
                key={`${cell.row}-${cell.col}`}
                className="absolute"
                style={{ left: x, top: y, width: HEX_W, height: HEX_H }}
              >
                {/* Border */}
                <div className="absolute inset-0"
                     style={{ clipPath: CLIP, background: isWinCell ? '#ffffff' : BORDER_COLOR }} />

                {/* Fill */}
                <div
                  className="absolute flex cursor-pointer items-center justify-center"
                  style={{
                    top: 4, left: 4, right: 4, bottom: 4,
                    clipPath: CLIP,
                    background: hexFill(cell.color, isSel),
                    filter: hexGlow(cell.color),
                    transition: 'background 0.2s ease, filter 0.2s ease, transform 0.15s ease',
                    transform: isSel ? 'scale(0.88)' : justPlaced ? 'scale(1.1)' : 'scale(1)',
                    animation: isWinCell ? 'winPulse 0.8s ease-in-out infinite' : 'none',
                  }}
                  onClick={() => handleCellClick(cell.row, cell.col)}
                >
                  <span
                    style={{
                      fontWeight: 900,
                      fontSize: SIZE * 0.56,
                      fontFamily: 'Tajawal, serif',
                      lineHeight: 1,
                      color: cell.color === 'neutral' ? '#111111'
                           : cell.color === 'yellow'  ? '#1a1200' : '#ffffff',
                      textShadow: cell.color !== 'neutral' ? '0 1px 4px rgba(0,0,0,0.4)' : 'none',
                      transition: 'color 0.2s',
                    }}
                  >
                    {cell.letter}
                  </span>
                </div>

                {/* Popup */}
                {isSel && (
                  <ColorPopup
                    onSelect={handleColorSelect}
                    onCancel={handleCancel}
                    openBelow={openBelow}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Reset ── */}
      <button
        onClick={reset}
        className="rounded-2xl px-6 py-2.5 text-base font-bold text-white transition-all hover:scale-105 active:scale-95"
        style={{
          background: 'rgba(255,255,255,0.07)',
          border: '1.5px solid rgba(255,255,255,0.14)',
          backdropFilter: 'blur(8px)',
          fontFamily: 'Tajawal, serif',
          boxShadow: '0 2px 16px rgba(0,0,0,0.3)',
        }}
      >
        لعبة جديدة
      </button>

      {/* ── Quick rules ── */}
      <div
        className="flex gap-4 text-xs text-white/30 rounded-2xl px-4 py-2"
        style={{ fontFamily: 'Tajawal, serif', background: 'rgba(255,255,255,0.04)' }}
      >
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: YELLOW_MAIN }} />
          الأصفر: أعلى ↕ أسفل
        </span>
        <span className="text-white/15">•</span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: BLUE_MAIN }} />
          الأزرق: يسار ↔ يمين
        </span>
      </div>

      {/* ── Win Overlay ── */}
      {winner && <WinOverlay winner={winner} moveCount={moveCount} onReset={reset} />}
    </div>
  )
}
