import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const gameTitles = [
  'Shuriken Match',
  'Shadow Strike Dojo',
  'Lily-Pad Path',
  'Memory Lanterns',
  'Context Gap Dash',
  'Sushi Scramble',
  'Challenge of the Whispering Scrolls',
  'Rainbow Reading',
  'Dictation Streak',
  'SpellerBee',
  'Stroke-order Slay',
] as const

async function openGame(page: Page, title: string) {
  const card = page.locator('.game-card').filter({ has: page.getByRole('heading', { name: title }) })
  await card.getByRole('button', { name: /Play game|Open safety preview/ }).click()
  await expect(page.getByRole('button', { name: 'Exit game' })).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear())
  await page.goto('/')
})

test.describe('desktop learning reliability', () => {
  test.skip(({ isMobile }) => Boolean(isMobile), 'Desktop behavior is covered once.')

  test('all games load without browser errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })

    for (const title of gameTitles) {
      await openGame(page, title)
      await page.getByRole('button', { name: 'Exit game' }).click()
      await expect(page.getByRole('heading', { name: 'Choose your challenge' })).toBeVisible()
    }
    expect(errors).toEqual([])
  })

  test('problem reports are available on the library and game screens', async ({ page }) => {
    const reportButton = page.getByRole('button', { name: 'Report a problem', exact: true })
    await expect(reportButton).toBeVisible()
    await reportButton.click()
    await expect(page.getByRole('dialog', { name: 'Report a problem' })).toContainText('Game library')
    await page.getByLabel('What happened?').fill('The test game stopped after I clicked an answer.')
    await page.getByRole('button', { name: 'Submit report' }).click()
    await expect(page.getByRole('heading', { name: 'Problem reported' })).toBeVisible()
    await page.getByRole('button', { name: 'Done' }).click()

    const reports = await page.evaluate(() => JSON.parse(localStorage.getItem('edugames.problemReports.v1') || '[]'))
    expect(reports).toHaveLength(1)
    expect(reports[0]).toMatchObject({ game: 'Game library', category: 'Something is broken' })

    await openGame(page, 'Rainbow Reading')
    await expect(reportButton).toBeVisible()
    await reportButton.click()
    await expect(page.getByRole('dialog', { name: 'Report a problem' })).toContainText('Rainbow Reading')
  })

  test('SpellerBee rejects a false positive and saves exit progress', async ({ page }) => {
    await openGame(page, 'SpellerBee')
    const input = page.getByLabel('Your spelling')
    await input.fill('dog')
    await page.getByRole('button', { name: 'Check spelling' }).click()
    await expect(page.getByText('Correct spelling', { exact: true })).toBeVisible()
    await expect(page.locator('.lg-progress')).toContainText('0/4')

    await expect(input).toBeVisible({ timeout: 5_000 })
    await input.fill('air')
    await page.getByRole('button', { name: 'Check spelling' }).click()
    await expect(page.locator('.lg-progress')).toContainText('1/4')
    await page.getByRole('button', { name: 'Exit game' }).click()

    const recent = page.locator('.practice-history li').first()
    await expect(recent).toContainText('Exited early · progress saved')
    await expect(recent).toContainText('2 attempts')
    await recent.getByRole('button', { name: 'Continue practice' }).click()
    await expect(page.getByText('Prompt 1 of 4')).toBeVisible()
  })

  test('correct answers, a retry, and completion produce a completed summary', async ({ page }) => {
    await openGame(page, 'Shadow Strike Dojo')
    await page.getByRole('button', { name: '狗' }).click({ force: true })
    await expect(page.getByText(/Correct target:/)).toBeVisible()
    await expect(page.getByRole('button', { name: '猫' })).toBeEnabled()

    for (const [index, answer] of ['猫', '水', '大', '日', '口', '山', '月', '一', '人', '好'].entries()) {
      await page.getByRole('button', { name: answer, exact: true }).click({ force: true })
      if (index < 9) await expect(page.getByText(`Training strike ${index + 2} of 10`)).toBeVisible()
    }
    await expect(page.getByRole('heading', { name: 'Master rank reached!' })).toBeVisible()
    await page.getByRole('button', { name: 'Celebrate and return' }).click()
    await expect(page.locator('.last-result')).toContainText('10 correct from 11 attempts')
    await expect(page.locator('.practice-history li').first()).toContainText('Completed')
  })

  test('keyboard choices work and serious accessibility violations are absent', async ({ page }) => {
    const homeResults = await new AxeBuilder({ page }).disableRules(['color-contrast']).analyze()
    expect(homeResults.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact || ''))).toEqual([])

    await openGame(page, 'Lily-Pad Path')
    await expect(page.locator('.lg-phaser-stage canvas')).toBeVisible()
    await page.waitForTimeout(3_000)
    await page.locator('.lg-canvas-access button').first().focus()
    await page.keyboard.press('Enter')
    await expect(page.locator('.lg-canvas-access [role="status"]')).not.toHaveText('')
  })

  test('recorded pronunciation fixtures identify their target words', async ({ page }) => {
    const scores = await page.evaluate(async () => {
      const { scoreRecordedWord } = await import('/src/gameModules/whispering-scrolls/runtime/readAloudScoring.ts')
      const fixtures = [
        ['你好', '/src/gameModules/whispering-scrolls/assets/hello.wav'],
        ['谢谢', '/src/gameModules/whispering-scrolls/assets/thanks.wav'],
        ['再见', '/src/gameModules/whispering-scrolls/assets/goodbye.wav'],
      ] as const
      const models = fixtures.map(([text, url]) => ({ text, url }))
      return Promise.all(fixtures.map(async ([target, url]) => {
        const recording = await fetch(url).then((response) => response.blob())
        return { target, score: await scoreRecordedWord(recording, target, models) }
      }))
    })
    for (const { target, score } of scores) {
      expect(score?.matchedText).toBe(target)
      expect(score?.bestDistance).toBeLessThan(.05)
    }
  })

  test('Rainbow Reading fixtures identify all six English words', async ({ page }) => {
    const scores = await page.evaluate(async () => {
      const { scoreRecordedWord } = await import('/src/gameModules/rainbow-reading/runtime/readAloudScoring.ts')
      const words = ['air', 'means', 'years', 'here', 'eager', 'change'] as const
      const fixtures = words.map((word) => [word, `/src/gameModules/rainbow-reading/assets/${word}.wav`] as const)
      const models = fixtures.map(([text, url]) => ({ text, url }))
      return Promise.all(fixtures.map(async ([target, url]) => {
        const recording = await fetch(url).then((response) => response.blob())
        return { target, score: await scoreRecordedWord(recording, target, models) }
      }))
    })
    for (const { target, score } of scores) {
      expect(score?.matchedText).toBe(target)
      expect(score?.bestDistance).toBeLessThan(.05)
    }
  })

  test('speech privacy appears before permission and microphone failure has a fallback', async ({ page }) => {
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'mediaDevices', {
        configurable: true,
        value: { getUserMedia: () => Promise.reject(Object.assign(new Error('Denied for test'), { name: 'NotAllowedError' })) },
      })
    })
    await openGame(page, 'Challenge of the Whispering Scrolls')
    await expect(page.getByRole('note')).toContainText('Browser speech recognition may use your browser provider')
    await page.getByRole('button', { name: 'Unroll the first scroll' }).click()
    await page.getByRole('button', { name: 'Continue without a microphone' }).click()
    await expect(page.getByRole('heading', { name: 'Listen, read, and check your own attempt' })).toBeVisible()
    await expect(page.getByText('not an automatic pronunciation score')).toBeVisible()
  })

  test('Rainbow Reading waits for a jewel click and keeps the no-microphone fallback', async ({ page }) => {
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'mediaDevices', {
        configurable: true,
        value: { getUserMedia: () => Promise.reject(Object.assign(new Error('Denied for test'), { name: 'NotAllowedError' })) },
      })
    })
    await openGame(page, 'Rainbow Reading')
    await expect(page.getByRole('note')).toContainText('Browser speech recognition may use your browser provider')
    await page.getByRole('button', { name: 'Show the jewel rainbow' }).click()
    await page.getByRole('button', { name: 'Crack jewel 1' }).click()
    await page.getByRole('button', { name: 'Continue without a microphone' }).click()
    await expect(page.getByRole('heading', { name: 'Listen, read, and check your own attempt' })).toBeVisible()
    await expect(page.getByText('air', { exact: true })).toBeVisible()
    await expect(page.getByText('not an automatic pronunciation score')).toBeVisible()
    await expect(page.getByRole('button', { name: 'I read it right anyway' })).toBeVisible()
  })

  test('Rainbow Reading can skip the recording timer', async ({ page }) => {
    await page.evaluate(() => {
      class FakeMediaRecorder extends EventTarget {
        state = 'inactive'
        mimeType = 'audio/webm'
        start() { this.state = 'recording' }
        stop() {
          if (this.state !== 'recording') return
          this.state = 'inactive'
          this.dispatchEvent(new BlobEvent('dataavailable', { data: new Blob([new Uint8Array(512)], { type: this.mimeType }) }))
          this.dispatchEvent(new Event('stop'))
        }
      }
      Object.defineProperty(window, 'MediaRecorder', { configurable: true, value: FakeMediaRecorder })
      Object.defineProperty(navigator, 'mediaDevices', {
        configurable: true,
        value: {
          getUserMedia: () => Promise.resolve({
            getAudioTracks: () => [{ label: 'Test microphone' }],
            getTracks: () => [{ stop: () => undefined }],
          }),
        },
      })
    })
    await openGame(page, 'Rainbow Reading')
    await page.getByRole('button', { name: 'Show the jewel rainbow' }).click()
    await page.getByRole('button', { name: 'Crack jewel 1' }).click()
    await expect(page.getByRole('button', { name: 'Skip timer' })).toBeVisible()
    await page.getByRole('button', { name: 'Skip timer' }).click()
    await expect(page.getByRole('heading', { name: 'Your reading first, then the rainbow model' })).toBeVisible()
  })
})

test.describe('390px mobile baseline', () => {
  test.skip(({ isMobile }) => !isMobile, 'Mobile behavior is covered once.')

  test('layout has no horizontal overflow or duplicate Phaser controls', async ({ page }) => {
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await openGame(page, 'Lily-Pad Path')
    await expect(page.locator('.lg-mobile-pad-choices button')).toHaveCount(3)
    await expect(page.locator('.lg-canvas-access')).toHaveCSS('display', 'none')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  })
})
