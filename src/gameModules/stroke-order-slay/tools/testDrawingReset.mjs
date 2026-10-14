import assert from 'node:assert/strict'
import { chromium, expect } from '@playwright/test'
import { join } from 'node:path'

const baseURL = process.env.STROKE_ORDER_TEST_URL || 'http://127.0.0.1:5173/'
const browser = await chromium.launch({ channel: 'chrome', args: ['--mute-audio'] })
const errors = []
const grades = [
  ['Kinder', 'kinderRounds', 'KinderRounds', 'I did it!'],
  ['2nd', 'grade2Rounds', 'Grade2Rounds', 'I slayed it'],
  ['5th', 'grade5Rounds', 'Grade5Rounds', 'Order mastered'],
]

try {
  for (const [device, width, height] of [['desktop', 1366, 900], ['iPad', 768, 1024]]) {
    for (const [grade, file, exportName, correctLabel] of grades) {
      const page = await browser.newPage({ viewport: { width, height }, hasTouch: true, reducedMotion: 'reduce' })
      page.on('pageerror', error => errors.push(error.message))
      await page.addInitScript(() => {
        window.testStrokeBuzzes = 0
        const create = AudioContext.prototype.createOscillator
        AudioContext.prototype.createOscillator = function (...args) {
          const oscillator = create.apply(this, args)
          const start = oscillator.start.bind(oscillator)
          oscillator.start = (...args) => {
            if (oscillator.type === 'sawtooth') window.testStrokeBuzzes += 1
            return start(...args)
          }
          return oscillator
        }
      })
      await page.goto(baseURL)
      await page.locator('.game-card').filter({
        has: page.getByRole('heading', { name: `Stroke-order Slay - ${grade}`, exact: true }),
      }).getByRole('button', { name: 'Play game' }).click()
      const rounds = await page.evaluate(async ({ file, exportName }) => {
        const rounds = (await import(`/src/gameModules/stroke-order-slay/data/${file}.ts`))[exportName]
        const { getStrokeLayout } = await import('/src/gameModules/stroke-order-slay/runtime/strokeLayout.ts')
        return rounds.map(round => ({ ...round, layout: getStrokeLayout(round.strokes) }))
      }, { file, exportName })
      let roundIndex = 0
      let round = rounds[roundIndex]
      let stage = 1
      const svg = page.locator('.lg-stroke-pad.is-interactive svg')
      const ink = page.locator('.lg-student-ink path:not(.lg-active-ink)')
      const activeInk = page.locator('.lg-active-ink')
      const suppliedInk = page.locator('.lg-supplied-ink path')
      const retryInk = page.locator('.lg-stroke-retry-ink path')
      const status = page.locator('.lg-stroke-status')
      const clear = page.getByRole('button', { name: 'Clear pad', exact: true })
      const undo = page.getByRole('button', { name: 'Undo stroke', exact: true })
      const next = page.locator('.lg-stroke-actions .lg-primary')
      const cdp = await page.context().newCDPSession(page)

      async function assertBlank() {
        await expect(ink).toHaveCount(0)
        await expect(activeInk).not.toHaveAttribute('d', /.+/)
        await expect(retryInk).toHaveCount(0)
        await expect(suppliedInk).toHaveCount(round.strokes.length - stage)
        await expect(svg).toHaveAttribute('aria-label', new RegExp(`stage ${stage} of ${round.strokes.length}`))
        await expect(next).toBeDisabled()
        await expect(clear).toBeEnabled()
      }
      async function clientPoints(stroke) {
        const bounds = await svg.boundingBox()
        return stroke.map(([x, y]) => [
          bounds.x + (x * round.layout.scale + round.layout.offsetX) * bounds.width / 100,
          bounds.y + (y * round.layout.scale + round.layout.offsetY) * bounds.height / 100,
        ])
      }
      async function drawSource(strokes) {
        for (const stroke of strokes) {
          const points = await clientPoints(stroke)
          await page.mouse.move(...points[0])
          await page.mouse.down()
          for (const point of points.slice(1)) await page.mouse.move(...point)
          await page.mouse.up()
        }
      }
      async function startBadStroke() {
        const bounds = await svg.boundingBox()
        await page.mouse.move(bounds.x + bounds.width * .05, bounds.y + bounds.height * .03)
        await page.mouse.down()
        await page.mouse.move(bounds.x + bounds.width * .95, bounds.y + bounds.height * .03)
        await expect(activeInk).toHaveAttribute('d', /^M /)
        await expect(activeInk).toHaveCSS('stroke', 'rgb(18, 19, 26)')
      }
      async function drawRejectedStroke() {
        const before = await page.evaluate(() => window.testStrokeBuzzes)
        await startBadStroke()
        await page.mouse.up()
        await expect(retryInk).toHaveCSS('stroke', 'rgb(139, 21, 37)')
        await expect(status).toContainText('Retry stroke')
        assert.equal(await page.evaluate(() => window.testStrokeBuzzes), before + 2)
      }
      async function screenshot(name) {
        if (process.env.STROKE_ORDER_SCREENSHOT_DIR && grade === '2nd') {
          await page.screenshot({ path: join(process.env.STROKE_ORDER_SCREENSHOT_DIR, `${device}-${name}.png`), fullPage: true })
        }
      }

      await assertBlank()
      await expect(page.locator('.lg-vocabulary-word')).toHaveText(round.word)
      await screenshot('last-stroke')
      // Errors never advance a stage or erase the supplied prefix.
      await drawRejectedStroke()
      await expect(next).toBeDisabled()
      await expect(retryInk).toHaveCount(0)
      await expect(status).toContainText(`Retry stroke ${round.strokes.length}`)
      await assertBlank()
      await drawRejectedStroke()
      await undo.click()
      await assertBlank()
      await drawRejectedStroke()
      await drawSource([round.strokes.at(-1)])
      await expect(ink).toHaveCSS('stroke', 'rgb(22, 128, 61)')
      await expect(next).toBeEnabled()
      await page.waitForTimeout(800)
      await expect(ink).toHaveCount(1)
      await clear.click()
      await assertBlank()

      // Finger and pen releases retain the learner's final stroke.
      for (const pointerType of ['touch', 'pen']) {
        const points = (await clientPoints(round.strokes.at(-1))).map(([x, y]) => ({ x, y }))
        if (pointerType === 'touch') {
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...points[0], id: 1 }] })
          for (const point of points.slice(1)) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...point, id: 1 }] })
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
        } else {
          await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...points[0], pointerType, button: 'left', buttons: 1, clickCount: 1 })
          for (const point of points.slice(1)) await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point, pointerType, buttons: 1 })
          await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...points.at(-1), pointerType, button: 'left', buttons: 0, clickCount: 1 })
        }
        await expect(ink).toHaveCount(1)
        await expect(ink).toHaveCSS('stroke', 'rgb(22, 128, 61)')
        await clear.click()
        await assertBlank()
      }
      // Early capture release finalizes exactly once, before pointerup.
      await svg.evaluate(element => element.addEventListener('pointerdown', event => {
        element.dataset.testPointerId = String(event.pointerId)
      }, { once: true }))
      const points = await clientPoints(round.strokes.at(-1))
      await page.mouse.move(...points[0])
      await page.mouse.down()
      for (const point of points.slice(1)) await page.mouse.move(...point)
      await svg.evaluate((element, [x, y]) => element.dispatchEvent(new PointerEvent('lostpointercapture', {
        bubbles: true, pointerId: Number(element.dataset.testPointerId), pointerType: 'mouse', buttons: 0, clientX: x, clientY: y,
      })), points.at(-1))
      await expect(ink).toHaveCount(1)
      await page.mouse.up()
      await expect(ink).toHaveCount(1)

      // A one-stroke character has exactly one stage, then comparison.
      if (round.strokes.length === 1) {
        await next.click()
        await expect(page.getByLabel('Current step: compare')).toBeVisible()
        await page.getByRole('button', { name: correctLabel, exact: true }).click()
        round = rounds[++roundIndex]
        await expect(page.locator('.lg-round-label')).toContainText('Character 2 /')
        await assertBlank()
        await drawSource([round.strokes.at(-1)])
      }
      await next.click()
      stage = 2
      await assertBlank()
      await screenshot('last-two')
      // The previous final stroke is now wrong if drawn before the penultimate one.
      await drawSource([round.strokes.at(-1)])
      await expect(retryInk).toHaveCount(1)
      await expect(ink).toHaveCount(0)
      await expect(next).toBeDisabled()
      await clear.click()
      await assertBlank()

      // Clear removes live and saved learner ink, retaining supplied strokes.
      for (const withCompletedInk of [false, true]) {
        if (withCompletedInk) await drawSource([round.strokes.at(-2)])
        await startBadStroke()
        await clear.focus()
        await page.keyboard.press('Enter')
        await assertBlank()
        await page.mouse.up()
        await assertBlank()
      }
      await drawSource([round.strokes.at(-2)])
      await drawRejectedStroke()
      await undo.click()
      await expect(ink).toHaveCount(1)
      await expect(suppliedInk).toHaveCount(round.strokes.length - stage)
      await expect(retryInk).toHaveCount(0)
      const bounds = await svg.boundingBox()
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: bounds.x + 20, y: bounds.y + 20, id: 1 }] })
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: bounds.x + 60, y: bounds.y + 20, id: 1 }] })
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] })
      await expect(ink).toHaveCount(1)
      await expect(activeInk).not.toHaveAttribute('d', /.+/)
      await clear.click()
      await assertBlank()
      await svg.evaluate(element => element.addEventListener('pointerdown', event => {
        element.dataset.testPointerId = String(event.pointerId)
      }, { once: true }))
      await startBadStroke()
      await svg.evaluate(element => element.releasePointerCapture(Number(element.dataset.testPointerId)))
      await page.mouse.move(bounds.x + bounds.width + 20, bounds.y + 20)
      await page.mouse.up()
      await assertBlank()

      // Complete each suffix in normal order. Success unlocks one earlier stroke.
      for (; stage <= round.strokes.length; stage += 1) {
        await assertBlank()
        const prefix = round.strokes.length - stage
        const guided = prefix > 0 || grade === 'Kinder'
        await expect(page.locator('.lg-stroke-guide path')).toHaveCount(guided ? stage : 0)
        if (guided) assert.deepEqual(await page.locator('.lg-stroke-marker text').allTextContents(), Array.from({ length: stage }, (_, i) => String(prefix + i + 1)))
        if (!prefix) {
          await expect(page.getByLabel('Current step: write')).toBeVisible()
          await screenshot('whole-character')
        }
        for (let offset = 0; offset < stage; offset += 1) {
          await drawSource([round.strokes[prefix + offset]])
          await expect(ink).toHaveCount(offset + 1)
          if (offset + 1 < stage) await expect(next).toBeDisabled()
        }
        await expect(next).toBeEnabled()
        await undo.click()
        await expect(ink).toHaveCount(stage - 1)
        await expect(next).toBeDisabled()
        await drawSource([round.strokes.at(-1)])
        await expect(next).toBeEnabled()
        // Completed pads ignore extra input; a later lift cannot leak stages.
        await page.mouse.move(bounds.x + 20, bounds.y + 20)
        await page.mouse.down()
        await page.mouse.move(bounds.x + 60, bounds.y + 20)
        await expect(activeInk).not.toHaveAttribute('d', /.+/)
        await next.focus()
        await page.keyboard.press('Enter')
        await page.mouse.up()
      }
      await expect(page.getByLabel('Current step: compare')).toBeVisible()
      await expect(ink).toHaveCount(round.strokes.length)
      await expect(suppliedInk).toHaveCount(0)
      await page.getByRole('button', { name: correctLabel, exact: true }).click()
      round = rounds[++roundIndex]
      stage = 1
      await expect(page.locator('.lg-round-label')).toContainText(`Character ${roundIndex + 1} /`)
      await assertBlank()
      await expect(page.locator('.lg-vocabulary-word')).toHaveText(round.word)
      await expect(page.locator('.lg-vocabulary-word .is-current')).toHaveText(round.targetText)
      await page.getByRole('button', { name: 'Exit game', exact: true }).click()
      const attempts = await page.evaluate(() => JSON.parse(localStorage.getItem('edugames-progress-v1')).sessions.at(-1).attempts)
      assert.equal(attempts.length, roundIndex)
      assert.equal(attempts.at(-1).response.length, rounds[roundIndex - 1].strokes.length)
      console.log(`${device} ${grade}: backward chain, ordinal validation, whole-character writing, resets, input retention, colors, buzzer, and saved learner-only response passed.`)
      await page.close()
    }
  }
  assert.deepEqual(errors, [], 'No browser errors expected')
} finally {
  await browser.close()
}
