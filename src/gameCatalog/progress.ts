import type { LearningGameAttempt, LearningGameId, LearningGameSummary } from './contracts'

export const PROGRESS_STORAGE_KEY = 'edugames-progress-v1'

export type LearningSessionStatus = 'in-progress' | 'exited' | 'completed'

export type LearningSession = {
  readonly id: string
  readonly gameId: LearningGameId
  readonly status: LearningSessionStatus
  readonly startedAt: string
  readonly updatedAt: string
  readonly attempts: readonly LearningGameAttempt[]
  readonly summary?: LearningGameSummary
  readonly resumedFrom?: string
}

export type LearningProgress = {
  readonly version: 1
  readonly sessions: readonly LearningSession[]
}

export const EMPTY_PROGRESS: LearningProgress = { version: 1, sessions: [] }

export function readLearningProgress(serialized: string | null): LearningProgress {
  if (!serialized) return EMPTY_PROGRESS
  try {
    const parsed = JSON.parse(serialized) as Partial<LearningProgress>
    if (parsed.version !== 1 || !Array.isArray(parsed.sessions)) return EMPTY_PROGRESS
    return { version: 1, sessions: parsed.sessions.filter(validSession).slice(-100) }
  } catch {
    return EMPTY_PROGRESS
  }
}

function validSession(value: unknown): value is LearningSession {
  if (!value || typeof value !== 'object') return false
  const session = value as Partial<LearningSession>
  return typeof session.id === 'string'
    && typeof session.gameId === 'string'
    && ['in-progress', 'exited', 'completed'].includes(session.status || '')
    && typeof session.startedAt === 'string'
    && typeof session.updatedAt === 'string'
    && Array.isArray(session.attempts)
}

export function createLearningSession(gameId: LearningGameId, now: string, resumedFrom?: string): LearningSession {
  const randomId = globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)
  const session = { id: `${now}:${randomId}`, gameId, status: 'in-progress', startedAt: now, updatedAt: now, attempts: [] } as const
  return resumedFrom ? { ...session, resumedFrom } : session
}

export function updateLearningSession(
  progress: LearningProgress,
  sessionId: string,
  update: (session: LearningSession) => LearningSession,
): LearningProgress {
  return {
    version: 1,
    sessions: progress.sessions.map((session) => session.id === sessionId ? update(session) : session).slice(-100),
  }
}
