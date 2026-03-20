import { useState, useCallback, useEffect, useRef } from 'react'

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
    @keyframes timerFlash {
      0%,100% { opacity: 1; transform: scale(1); }
      50%     { opacity: 0.4; transform: scale(1.08); }
    }
    @keyframes selectedPulse {
      0%,100% { opacity: 1; }
      50%     { opacity: 0.45; }
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

// Board padding inside the play field
const BOARD_PAD_X = 28
const BOARD_PAD_Y = 24
const DESKTOP_BREAKPOINT = 1024
const SIDEBAR_WIDTH = 336

function computeSize(viewportW: number, viewportH: number): number {
  const isDesktop = viewportW >= DESKTOP_BREAKPOINT
  const maxSize = isDesktop ? 88 : viewportW >= 640 ? 68 : 48
  const minSize = viewportW < 420 ? 28 : 34
  const boardWidthBudget = isDesktop
    ? Math.max(620, viewportW - SIDEBAR_WIDTH - 156)
    : Math.max(320, Math.min(viewportW - 44, 760))
  const boardHeightBudget = isDesktop
    ? Math.max(480, viewportH - 112)
    : Math.max(420, viewportH - 330)
  const widthSize = (boardWidthBudget - 2 * BOARD_PAD_X - 8) / (Math.sqrt(3) * (COLS + 0.5))
  const heightSize = (boardHeightBudget - 2 * BOARD_PAD_Y - 4) / 8
  const size = Math.min(widthSize, heightSize)
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
  // Shuffle all letters then take exactly ROWS×COLS — no duplicates possible
  const shuffled = [...ARABIC_LETTERS].sort(() => Math.random() - 0.5).slice(0, ROWS * COLS)
  return Array.from({ length: ROWS }, (_, r) =>
    Array.from({ length: COLS }, (_, c) => ({
      row: r, col: c,
      letter: shuffled[r * COLS + c],
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

function TeamScoreBadge({ team, score }: { team: Team; score: number }) {
  const isYellow = team === 'yellow'
  const fill = isYellow ? YELLOW_MAIN : BLUE_MAIN
  const textColor = isYellow ? '#1a1200' : '#ffffff'
  const label = isYellow ? 'الأصفر' : 'الأزرق'

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="relative"
        style={{
          width: 88,
          height: 98,
          filter: `drop-shadow(0 10px 22px ${fill}40)`,
        }}
      >
        <div className="absolute inset-0" style={{ clipPath: CLIP, background: BORDER_COLOR }} />
        <div
          className="absolute inset-[5px] flex items-center justify-center"
          style={{ clipPath: CLIP, background: fill }}
        >
          <span
            className="text-4xl font-black"
            style={{ fontFamily: 'Tajawal, serif', color: textColor, lineHeight: 1 }}
          >
            {score}
          </span>
        </div>
      </div>
      <span className="text-sm font-bold text-white/70" style={{ fontFamily: 'Tajawal, serif' }}>
        {label}
      </span>
    </div>
  )
}

function ScoreBoard({ yellow, blue, onReset }: { yellow: number; blue: number; onReset: () => void }) {
  return (
    <div
      className="w-full rounded-[30px] px-5 py-5"
      style={{
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.12)',
        fontFamily: 'Tajawal, serif',
      }}
    >
      <div className="mb-4 flex items-center justify-center gap-5">
        <TeamScoreBadge team="yellow" score={yellow} />
        <TeamScoreBadge team="blue" score={blue} />
      </div>
      <button
        onClick={onReset}
        className="w-full rounded-full px-4 py-2 text-sm font-bold text-white/70 transition-colors hover:text-white"
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
  align?: 'center' | 'left' | 'right'
}

function ColorPopup({ onSelect, onCancel, openBelow, align = 'center' }: PopupProps) {
  const pos = openBelow
    ? { top: '115%', bottom: 'auto' }
    : { bottom: '115%', top: 'auto' }
  const anchor = align === 'left'
    ? { left: 0, right: 'auto', transform: 'none' }
    : align === 'right'
      ? { right: 0, left: 'auto', transform: 'none' }
      : { left: '50%', right: 'auto', transform: 'translateX(-50%)' }

  return (
    <div
      className="absolute z-50 flex flex-col gap-2 rounded-2xl p-3 shadow-2xl"
      style={{
        ...pos,
        ...anchor,
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
          <img
            src="/winner.png"
            alt="winner"
            style={{
              width: 110,
              height: 110,
              objectFit: 'cover',
              borderRadius: '50%',
              border: ` ${winColor}`,
              boxShadow: `0 0 18px ${winColor}88`,
              margin: '6px auto',
              display: 'block',
            }}
          />
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

// ─── CountdownTimer ───────────────────────────────────────────────────────────

function CountdownTimer({ panel = false }: { panel?: boolean }) {
  const TOTAL = 10
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const start = () => {
    // If already running or done, reset and restart
    if (intervalRef.current) clearInterval(intervalRef.current)
    setTimeLeft(TOTAL)
    intervalRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t === null || t <= 1) {
          clearInterval(intervalRef.current!)
          intervalRef.current = null
          return 0
        }
        return t - 1
      })
    }, 1000)
  }

  const reset = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = null
    setTimeLeft(null)
  }

  // Clean up on unmount
  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current) }, [])

  const isRunning = timeLeft !== null && timeLeft > 0
  const isDone    = timeLeft === 0

  // Color shifts: green → yellow → red as time runs out
  const color = isDone ? '#ef4444'
    : timeLeft !== null && timeLeft <= 3 ? '#f97316'
    : timeLeft !== null && timeLeft <= 6 ? '#facc15'
    : '#4ade80'

  return (
    <div
      className={panel ? 'flex w-full flex-col items-stretch gap-2' : 'flex items-center gap-3'}
      style={{ fontFamily: 'Tajawal, serif' }}
    >
      <button
        onClick={isRunning ? reset : start}
        className={`flex items-center rounded-[26px] px-7 py-3.5 transition-all active:scale-95 ${
          panel ? 'w-full justify-center gap-4' : 'gap-3'
        }`}
        style={{
          background: 'rgba(255,255,255,0.06)',
          border: `1.5px solid ${timeLeft !== null ? color : 'rgba(255,255,255,0.15)'}`,
          boxShadow: timeLeft !== null ? `0 0 14px ${color}44` : 'none',
          animation: isDone ? 'timerFlash 1.5s ease-in-out infinite' : 'none',
        }}
      >
        <span style={{ fontSize: 22, lineHeight: 1, color: '#ffffff' }}>⏳</span>

        <span
          className="font-black min-w-[28px] text-center"
          style={{
            fontSize: timeLeft !== null ? 32 : 22,
            color: timeLeft !== null ? color : '#ffffff',
            textShadow: timeLeft !== null ? `0 0 16px ${color}` : 'none',
            transition: 'color 0.4s, font-size 0.2s',
            lineHeight: 1,
          }}
        >
          {isDone ? 'مفتوح للكل' : timeLeft !== null ? timeLeft : '١٠'}
        </span>
      </button>

      {timeLeft !== null && (
        <button
          onClick={reset}
          className={panel
            ? 'text-sm font-bold text-white/40 transition-colors hover:text-white/75'
            : 'text-[11px] text-white/35 hover:text-white/60 transition-colors'}
          style={{ fontFamily: 'Tajawal, serif' }}
        >
          إعادة
        </button>
      )}
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
  const [viewport, setViewport] = useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }))

  useEffect(() => {
    const onResize = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Compute hex dimensions reactively
  const viewportW = viewport.width
  const viewportH = viewport.height
  const SIZE   = computeSize(viewportW, viewportH)
  const HEX_W  = SIZE * Math.sqrt(3)
  const HEX_H  = SIZE * 2
  const H_STEP = HEX_W
  const V_STEP = SIZE * 1.5

  const totalW = COLS * H_STEP + HEX_W / 2 + 4
  const totalH = (ROWS - 1) * V_STEP + HEX_H + 4
  // ───────────────────────────────────────────────────────────────────────────

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

  const isDesktop = viewportW >= DESKTOP_BREAKPOINT
  const isShortDesktop = isDesktop && viewportH < 860

  // Allow page scrolling on compact or short desktop layouts to avoid clipping.
  useEffect(() => {
    const isCompact = viewportW < DESKTOP_BREAKPOINT
    document.body.style.overflow = isCompact || isShortDesktop ? 'auto' : 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [isShortDesktop, viewportW])

  return (
    <div
      className="min-h-screen select-none"
      style={{
        background: 'linear-gradient(160deg, #080808 0%, #111111 50%, #0d0d0d 100%)',
        fontFamily: 'Tajawal, serif',
      }}
      onClick={handleCancel}
      dir="rtl"
    >
      <div
        className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col gap-4 p-3 md:p-4 lg:flex-row lg:gap-6 lg:p-6"
        style={{
          minHeight: isDesktop ? 'calc(100vh - 12px)' : undefined,
          gap: isShortDesktop ? 16 : undefined,
          paddingTop: isShortDesktop ? 16 : undefined,
          paddingBottom: isShortDesktop ? 16 : undefined,
        }}
      >
        <aside
          className="relative w-full overflow-x-hidden overflow-y-auto rounded-[34px] px-4 py-5 lg:max-w-[336px] lg:px-6 lg:py-7"
          style={{
            background: 'linear-gradient(180deg, rgba(17,24,39,0.98) 0%, rgba(8,12,24,0.98) 100%)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 24px 50px rgba(0,0,0,0.35)',
            maxHeight: isDesktop ? 'calc(100vh - 48px)' : undefined,
            paddingTop: isShortDesktop ? 20 : undefined,
            paddingBottom: isShortDesktop ? 20 : undefined,
          }}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-80"
            style={{
              background: [
                'radial-gradient(circle at top, rgba(250,204,21,0.16), transparent 34%)',
                'radial-gradient(circle at bottom, rgba(56,189,248,0.14), transparent 36%)',
              ].join(','),
            }}
          />

          <div className="relative flex h-full flex-col gap-5" style={{ gap: isShortDesktop ? 16 : undefined }}>
            <button
              onClick={reset}
              className="mx-auto rounded-full px-8 py-3 text-base font-black text-slate-900 transition-transform hover:scale-[1.02] active:scale-95"
              style={{
                background: 'rgba(255,255,255,0.94)',
                minWidth: 172,
                boxShadow: '0 10px 22px rgba(0,0,0,0.18)',
                fontFamily: 'Tajawal, serif',
              }}
            >
              لعبة جديدة
            </button>

            <div className="text-center leading-[0.88]">
              <span
                className="block font-black"
                style={{
                  fontSize: isShortDesktop ? 'clamp(2.15rem,6vw,3.5rem)' : 'clamp(2.7rem,8vw,4.6rem)',
                  color: YELLOW_MAIN,
                  textShadow: `4px 4px 0 ${YELLOW_DARK}, 0 0 22px ${YELLOW_MAIN}44`,
                }}
              >
                حروف
              </span>
              <span
                className="block font-black"
                style={{
                  fontSize: isShortDesktop ? 'clamp(1.8rem,5.2vw,3rem)' : 'clamp(2.2rem,7vw,3.9rem)',
                  color: BLUE_MAIN,
                  textShadow: `4px 4px 0 ${BLUE_DARK}, 0 0 22px ${BLUE_MAIN}44`,
                }}
              >
                مع بوحميد
              </span>
            </div>

            <ScoreBoard
              yellow={score.yellow}
              blue={score.blue}
              onReset={() => setScore({ yellow: 0, blue: 0 })}
            />

            <div
              className="rounded-[28px] px-4 py-4 text-center"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <span className="block text-[11px] font-bold tracking-[0.25em] text-white/40">حركات</span>
              <span className="mt-2 block text-4xl font-black text-white">
                {moveCount}
              </span>
            </div>

            <div
              className="rounded-[30px] px-5 py-5"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div className="mb-3 text-center text-xs font-bold tracking-[0.35em] text-white/35">
                المؤقت
              </div>
              <CountdownTimer panel />
            </div>
          </div>
        </aside>

        <section
          className="relative flex min-h-[540px] flex-1 items-center justify-center overflow-hidden rounded-[36px] p-3 sm:p-4 lg:p-8"
          style={{
            background: BLUE_MAIN,
            boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
            minHeight: isShortDesktop ? 460 : undefined,
            padding: isShortDesktop ? 20 : undefined,
          }}
          onClick={e => e.stopPropagation()}
        >
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: YELLOW_MAIN,
              clipPath: 'polygon(12% 0%, 88% 0%, 66% 28%, 34% 28%)',
            }}
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: YELLOW_MAIN,
              clipPath: 'polygon(34% 72%, 66% 72%, 88% 100%, 12% 100%)',
            }}
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: [
                'linear-gradient(145deg, rgba(255,255,255,0.14), transparent 36%)',
                'linear-gradient(325deg, rgba(255,255,255,0.1), transparent 34%)',
              ].join(','),
            }}
          />

          <div
            className="relative flex items-center justify-center rounded-[30px]"
            style={{
              padding: `${BOARD_PAD_Y}px ${BOARD_PAD_X}px`,
              background: 'rgba(7,10,18,0.1)',
              boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.12)',
            }}
          >
            <div className="relative overflow-visible" style={{ width: totalW, height: totalH }}>
              {grid.flat().map(cell => {
                const x = cell.col * H_STEP + (cell.row % 2 === 1 ? HEX_W / 2 : 0) + 2
                const y = cell.row * V_STEP + 2
                const isSel      = selected?.[0] === cell.row && selected?.[1] === cell.col
                const justPlaced = lastPlaced === `${cell.row},${cell.col}`
                const isWinCell  = winPath.has(`${cell.row},${cell.col}`)
                const openBelow = cell.row < 2 || (isShortDesktop && cell.row < 3)
                const popupAlign = x < HEX_W * 0.7
                  ? 'left'
                  : x + HEX_W > totalW - HEX_W * 0.7
                    ? 'right'
                    : 'center'

                return (
                  <div
                    key={`${cell.row}-${cell.col}`}
                    className="absolute"
                    style={{ left: x, top: y, width: HEX_W, height: HEX_H }}
                  >
                    <div
                      className="absolute inset-0"
                      style={{
                        clipPath: CLIP,
                        background: isWinCell ? '#ffffff' : isSel ? '#ffffff' : BORDER_COLOR,
                        animation: isSel ? 'selectedPulse 0.7s ease-in-out infinite' : 'none',
                      }}
                    />

                    <div
                      className="absolute flex cursor-pointer items-center justify-center"
                      style={{
                        top: 4,
                        left: 4,
                        right: 4,
                        bottom: 4,
                        clipPath: CLIP,
                        background: isSel ? '#1e293b' : hexFill(cell.color, false),
                        filter: isSel
                          ? 'drop-shadow(0 0 14px rgba(255,255,255,1))'
                          : hexGlow(cell.color),
                        transition: 'background 0.2s ease, filter 0.2s ease, transform 0.15s ease',
                        transform: isSel ? 'scale(0.92)' : justPlaced ? 'scale(1.1)' : 'scale(1)',
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
                          color: isSel ? '#ffffff'
                            : cell.color === 'neutral' ? '#111111'
                            : cell.color === 'yellow' ? '#1a1200' : '#ffffff',
                          textShadow: isSel ? 'none'
                            : cell.color !== 'neutral' ? '0 1px 4px rgba(0,0,0,0.4)' : 'none',
                          transition: 'color 0.2s',
                        }}
                      >
                        {cell.letter}
                      </span>
                    </div>

                    {isSel && (
                      <ColorPopup
                        onSelect={handleColorSelect}
                        onCancel={handleCancel}
                        openBelow={openBelow}
                        align={popupAlign}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      </div>

      {/* ── Win Overlay ── */}
      {winner && <WinOverlay winner={winner} moveCount={moveCount} onReset={reset} />}
    </div>
  )
}
