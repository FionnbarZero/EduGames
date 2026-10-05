import assert from 'node:assert/strict'
import { createLearningSession, EMPTY_PROGRESS, readLearningProgress, updateLearningSession } from '../src/gameCatalog/progress.ts'

const session = createLearningSession('speller-bee', '2026-10-04T12:00:00.000Z')
let progress = { ...EMPTY_PROGRESS, sessions: [session] }
progress = updateLearningSession(progress, session.id, (current) => ({
  ...current,
  status: 'exited',
  attempts: [{ gameId: 'speller-bee', promptId: 'cat', targetId: 'cat', correct: false, response: 'dog', assessmentMode: 'automatic' }],
}))

assert.equal(progress.sessions[0].status, 'exited')
assert.equal(progress.sessions[0].attempts.length, 1)
assert.deepEqual(readLearningProgress(JSON.stringify(progress)), progress)
assert.deepEqual(readLearningProgress('not-json'), EMPTY_PROGRESS)
assert.deepEqual(readLearningProgress('{"version":2,"sessions":[]}'), EMPTY_PROGRESS)

console.log('Durable progress store passed.')
