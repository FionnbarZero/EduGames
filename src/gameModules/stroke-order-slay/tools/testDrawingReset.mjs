import assert from 'node:assert/strict'
import { chromium, expect } from '@playwright/test'

// Run against the local Vite preview. Each check uses an isolated browser context.
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
      page.on('pageerror', (error) => errors.push(error.message))
      await page.addInitScript(() => {
        window.testStrokeTones = []
        const createOscillator = AudioContext.prototype.createOscillator
        AudioContext.prototype.createOscillator = function (...args) {
          const oscillator = createOscillator.apply(this, args)
          const start = oscillator.start.bind(oscillator)
          oscillator.start = (...startArgs) => {
            window.testStrokeTones.push({ type: oscillator.type, frequency: oscillator.frequency.value })
            return start(...startArgs)
          }
          return oscillator
        }
      })
      await page.goto(baseURL)
      await page.locator('.game-card').filter({
        has: page.getByRole('heading', { name: `Stroke-order Slay - ${grade}`, exact: true }),
      }).getByRole('button', { name: 'Play game' }).click()

      const { round, layout } = await page.evaluate(async ({ file, exportName }) => {
        const round = (await import(`/src/gameModules/stroke-order-slay/data/${file}.ts`))[exportName][0]
        const { getStrokeLayout } = await import('/src/gameModules/stroke-order-slay/runtime/strokeLayout.ts')
        return { round, layout: getStrokeLayout(round.strokes) }
      }, { file, exportName })
      const svg = page.locator('.lg-stroke-pad.is-interactive svg')
      const ink = page.locator('.lg-student-ink path:not(.lg-active-ink)')
      const activeInk = page.locator('.lg-active-ink')
      const clear = page.getByRole('button', { name: 'Clear pad', exact: true })
      const next = page.locator('.lg-stroke-actions .lg-primary')
      const retryInk = page.locator('.lg-stroke-retry-ink path')
      const cdp = await page.context().newCDPSession(page)

      async function assertBlank() {
        await expect(ink).toHaveCount(0)
        await expect(activeInk).not.toHaveAttribute('d', /.+/)
        await expect(retryInk).toHaveCount(0)
        await expect(next).toBeDisabled()
        await expect(clear).toBeEnabled()
      }

      async function drawRejectedStroke() {
        const bounds = await svg.boundingBox()
        const buzzCount = await page.evaluate(() => window.testStrokeTones.filter((tone) => tone.type === 'sawtooth').length)
        await page.mouse.move(bounds.x + bounds.width * .15, bounds.y + bounds.height * .92)
        await page.mouse.down()
        await page.mouse.move(bounds.x + bounds.width * .8, bounds.y + bounds.height * .92)
        await expect(activeInk).toHaveAttribute('d', /^M /)
        await expect(activeInk).toHaveCSS('stroke', 'rgb(18, 19, 26)')
        await page.mouse.up()
        await expect(retryInk).toHaveCount(1)
        await expect(retryInk).toHaveCSS('stroke', 'rgb(139, 21, 37)')
        await expect(page.locator('.lg-stroke-status')).toContainText('Retry stroke')
        assert.equal(await page.evaluate(() => window.testStrokeTones.filter((tone) => tone.type === 'sawtooth').length), buzzCount + 2)
      }

      // Incorrect ink briefly turns dark red with a buzzer, then removes itself.
      await drawRejectedStroke()
      await expect(ink).toHaveCount(0)
      await expect(next).toBeDisabled()
      await expect(retryInk).toHaveCount(0)
      await expect(page.locator('.lg-stroke-status')).toContainText('Retry stroke 1')
      await expect(page.getByRole('button', { name: 'Undo stroke', exact: true })).toBeDisabled()

      // Undo, Clear, and a correct retry cancel pending incorrect-ink removal.
      await drawRejectedStroke()
      await expect(ink).toHaveCount(0)
      await expect(next).toBeDisabled()
      await expect(page.getByRole('button', { name: 'Undo stroke', exact: true })).toBeEnabled()
      await page.getByRole('button', { name: 'Undo stroke', exact: true }).click()
      await assertBlank()
      await drawRejectedStroke()
      await drawSource([round.strokes[0]])
      await expect(retryInk).toHaveCount(0)
      await expect(ink).toHaveCount(1)
      await expect(ink).toHaveCSS('stroke', 'rgb(22, 128, 61)')
      await page.waitForTimeout(800)
      await expect(ink).toHaveCount(1)
      await drawRejectedStroke()
      await page.getByRole('button', { name: 'Undo stroke', exact: true }).click()
      await expect(ink).toHaveCount(1)
      await expect(retryInk).toHaveCount(0)
      await drawRejectedStroke()
      await clear.click()
      await assertBlank()

      // Normal finger and pen lifts keep accepted strokes, unlike cancellation.
      for (const pointerType of ['touch', 'pen']) {
        const bounds = await svg.boundingBox()
        const points = round.strokes[0].map(([x, y]) => ({
          x: bounds.x + (x * layout.scale + layout.offsetX) * bounds.width / 100,
          y: bounds.y + (y * layout.scale + layout.offsetY) * bounds.height / 100,
        }))
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
        await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
        await expect(ink).toHaveCount(1)
        await clear.click()
        await assertBlank()
      }

      async function drawSource(strokes) {
        const bounds = await svg.boundingBox()
        for (const stroke of strokes) {
          const points = stroke.map(([x, y]) => [
            bounds.x + (x * layout.scale + layout.offsetX) * bounds.width / 100,
            bounds.y + (y * layout.scale + layout.offsetY) * bounds.height / 100,
          ])
          await page.mouse.move(...points[0])
          await page.mouse.down()
          for (const point of points.slice(1)) await page.mouse.move(...point)
          await page.mouse.up()
        }
      }

      // Ordinary Clear still resets accepted tracing and the continuation gate.
      await drawSource([round.strokes[0]])
      await expect(ink).toHaveCount(1)
      await clear.click()
      await assertBlank()

      // Embedded browsers may emit a released capture before pointerup.
      // Reproduce that ordering and ensure the later pointerup cannot duplicate ink.
      await svg.evaluate((element) => element.addEventListener('pointerdown', (event) => {
        element.dataset.testReleasePointerId = String(event.pointerId)
      }, { once: true }))
      const releaseBounds = await svg.boundingBox()
      const releasePoints = round.strokes[0].map(([x, y]) => [
        releaseBounds.x + (x * layout.scale + layout.offsetX) * releaseBounds.width / 100,
        releaseBounds.y + (y * layout.scale + layout.offsetY) * releaseBounds.height / 100,
      ])
      await page.mouse.move(...releasePoints[0])
      await page.mouse.down()
      for (const point of releasePoints.slice(1)) await page.mouse.move(...point)
      await svg.evaluate((element, [x, y]) => element.dispatchEvent(new PointerEvent('lostpointercapture', {
        bubbles: true,
        pointerId: Number(element.dataset.testReleasePointerId),
        pointerType: 'mouse',
        buttons: 0,
        clientX: x,
        clientY: y,
      })), releasePoints.at(-1))
      await expect(ink).toHaveCount(1)
      await page.mouse.up()
      await expect(ink).toHaveCount(1)
      await clear.click()
      await assertBlank()

      // Changing phases must not carry an unfinished pointer into the new pad.
      await drawSource(round.strokes)
      await expect(next).toBeEnabled()
      let bounds = await svg.boundingBox()
      await page.mouse.move(bounds.x + bounds.width * .3, bounds.y + bounds.height * .4)
      await page.mouse.down()
      await page.mouse.move(bounds.x + bounds.width * .65, bounds.y + bounds.height * .4)
      await next.focus()
      await page.keyboard.press('Enter')
      await expect(page.getByLabel('Current step: write')).toBeVisible()
      await page.mouse.up()
      await assertBlank()
      await drawSource([round.strokes[0]])
      await expect(ink).toHaveCSS('stroke', 'rgb(18, 19, 26)')
      await clear.click()
      await assertBlank()

      // Clear works with only live ink, and while there is also completed ink.
      for (const withCompletedInk of [false, true]) {
        if (withCompletedInk) await drawSource([round.strokes[0]])
        bounds = await svg.boundingBox()
        await page.mouse.move(bounds.x + bounds.width * .3, bounds.y + bounds.height * .4)
        await page.mouse.down()
        await page.mouse.move(bounds.x + bounds.width * .65, bounds.y + bounds.height * .4)
        await expect(activeInk).toHaveAttribute('d', /^M /)
        await clear.focus()
        await page.keyboard.press('Enter')
        await assertBlank()
        await page.mouse.up()
        // Allow queued paint callbacks and pointer-release events to finish.
        await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
        await assertBlank()
      }

      // Native canceled touches discard only the unfinished stroke.
      await drawSource([round.strokes[0]])
      bounds = await svg.boundingBox()
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchStart', touchPoints: [{ x: bounds.x + bounds.width * .3, y: bounds.y + bounds.height * .5, id: 1 }],
      })
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove', touchPoints: [{ x: bounds.x + bounds.width * .65, y: bounds.y + bounds.height * .5, id: 1 }],
      })
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] })
      await expect(ink).toHaveCount(1)
      await expect(activeInk).not.toHaveAttribute('d', /.+/)
      await clear.click()
      await assertBlank()

      // Losing pointer capture must leave no stranded ink or stuck controls.
      await svg.evaluate((element) => element.addEventListener('pointerdown', (event) => {
        element.dataset.testPointerId = String(event.pointerId)
      }, { once: true }))
      await page.mouse.move(bounds.x + bounds.width * .3, bounds.y + bounds.height * .4)
      await page.mouse.down()
      await page.mouse.move(bounds.x + bounds.width * .65, bounds.y + bounds.height * .4)
      await svg.evaluate((element) => element.releasePointerCapture(Number(element.dataset.testPointerId)))
      await page.mouse.move(bounds.x + bounds.width + 20, bounds.y + bounds.height * .4)
      await page.mouse.up()
      await assertBlank()

      // Undo and a normal post-clear writing/comparison cycle still work.
      await drawSource(round.strokes)
      await page.getByRole('button', { name: 'Undo stroke', exact: true }).click()
      await expect(ink).toHaveCount(round.strokes.length - 1)
      await drawSource([round.strokes.at(-1)])
      await expect(next).toBeEnabled()
      await next.click()
      await expect(page.getByLabel('Current step: compare')).toBeVisible()
      await page.getByRole('button', { name: correctLabel, exact: true }).click()
      await expect(page.locator('.lg-round-label')).toHaveText(/Character 2 \/ /)
      await assertBlank()
      await page.getByRole('button', { name: 'Exit game', exact: true }).click()
      const attempts = await page.evaluate(() => JSON.parse(localStorage.getItem('edugames-progress-v1')).sessions.at(-1).attempts)
      assert.equal(attempts.length, 1)
      console.log(`${device} ${grade}: black live ink, green accepted ink, dark-red errors with buzzer and automatic removal, early capture release, persistent mouse/touch/pen ink, clear, cancellation, undo, phase changes and saving passed.`)
      await page.close()
    }
  }
  assert.deepEqual(errors, [], 'No browser errors expected')
} finally {
  await browser.close()
}
