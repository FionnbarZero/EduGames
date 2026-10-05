import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Bug, CheckCircle2, X } from 'lucide-react'

const PROBLEM_REPORTS_STORAGE_KEY = 'edugames.problemReports.v1'

type SavedProblemReport = {
  readonly id: string
  readonly createdAt: string
  readonly game: string
  readonly screen: string
  readonly category: string
  readonly details: string
  readonly url: string
}

function readSavedReports() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(PROBLEM_REPORTS_STORAGE_KEY) || '[]')
    return Array.isArray(saved) ? saved as SavedProblemReport[] : []
  } catch {
    return []
  }
}

export function ProblemReporter({ game }: { readonly game: string }) {
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState('Something is broken')
  const [details, setDetails] = useState('')
  const [saved, setSaved] = useState(false)
  const detailsRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!open) return
    detailsRef.current?.focus()
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [open])

  function openReporter() {
    setSaved(false)
    setOpen(true)
  }

  function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const visibleScreenHeading = document.querySelector('main h2')?.textContent?.trim()
      || document.querySelector('main h1')?.textContent?.trim()
      || game
    const report: SavedProblemReport = {
      id: window.crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      game,
      screen: visibleScreenHeading,
      category,
      details: details.trim(),
      url: window.location.href,
    }
    const reports = readSavedReports()
    window.localStorage.setItem(PROBLEM_REPORTS_STORAGE_KEY, JSON.stringify([...reports, report].slice(-100)))
    setSaved(true)
    setDetails('')
  }

  return <>
    <button className="problem-report-trigger" type="button" onClick={openReporter}><Bug size={18} /> Report a problem</button>
    {open && <div className="problem-report-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.currentTarget === event.target) setOpen(false)
    }}>
      <section className="problem-report-dialog" role="dialog" aria-modal="true" aria-labelledby="problem-report-title">
        <button className="problem-report-close" type="button" aria-label="Close problem report" onClick={() => setOpen(false)}><X size={20} /></button>
        {saved ? <div className="problem-report-success" role="status">
          <CheckCircle2 size={42} aria-hidden="true" />
          <h2 id="problem-report-title">Problem reported</h2>
          <p>Thank you. The report and its game-screen details were saved on this device.</p>
          <button type="button" onClick={() => setOpen(false)}>Done</button>
        </div> : <form onSubmit={submitReport}>
          <span className="problem-report-mark"><Bug size={21} /></span>
          <p className="problem-report-eyebrow">Help us fix the games</p>
          <h2 id="problem-report-title">Report a problem</h2>
          <p className="problem-report-context">Reporting from <strong>{game}</strong>. This screen and the current page are attached automatically.</p>
          <label>
            What kind of problem?
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              <option>Something is broken</option>
              <option>The directions are confusing</option>
              <option>The sound or microphone is not working</option>
              <option>The words or answers are wrong</option>
              <option>The screen does not look right</option>
              <option>Something else</option>
            </select>
          </label>
          <label>
            What happened?
            <textarea ref={detailsRef} value={details} onChange={(event) => setDetails(event.target.value)} required rows={4} placeholder="Tell us what you clicked and what went wrong…" />
          </label>
          <button className="problem-report-submit" type="submit" disabled={!details.trim()}><Bug size={17} /> Submit report</button>
        </form>}
      </section>
    </div>}
  </>
}
