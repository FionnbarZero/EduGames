import assert from 'node:assert/strict'
import { strokeMatchesGuide } from '../src/gameModules/stroke-order-slay/runtime/strokeAssessment.ts'

const guide = [[18, 52], [32, 51], [48, 49], [66, 47], [82, 49]]
assert.equal(strokeMatchesGuide([[17, 53], [35, 51], [52, 48], [81, 50]], guide), true, 'a close left-to-right trace should pass')
assert.equal(strokeMatchesGuide([[82, 49], [50, 49], [18, 52]], guide), false, 'a reversed stroke should fail')
assert.equal(strokeMatchesGuide([[18, 20], [50, 20], [82, 20]], guide), false, 'a distant stroke should fail')
assert.equal(strokeMatchesGuide([[18, 52], [24, 52]], guide), false, 'an incomplete stroke should fail')

console.log('Stroke guide assessment passed.')
