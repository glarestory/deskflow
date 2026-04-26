// @MX:TEST: 웹 빌드 핵심 스모크 시나리오 — Electron 비의존 검증.
// 실행: npm install -D @playwright/test && npx playwright install chromium && npx playwright test
import { test, expect } from '@playwright/test'

test.describe('Deskflow 웹 빌드 스모크', () => {
  test.beforeEach(async ({ page }) => {
    // 웹 빌드는 Firebase 설정이 없으면 LoginScreen 또는 게스트 흐름으로 진입.
    // 테스트마다 localStorage 초기화로 이전 상태 누수 방지.
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
  })

  test('루트 페이지 로딩 후 #root 가 비어 있지 않다 (React 마운트 확인)', async ({ page }) => {
    await page.goto('/')
    const root = page.locator('#root')
    await expect(root).not.toBeEmpty()
  })

  test('Cmd+K 단축키로 Command Palette 가 열린다', async ({ page }) => {
    await page.goto('/')

    // 인증 게이트 통과 대기 — LoginScreen 이 나오면 게스트 진입 시도
    const loginVisible = await page
      .getByRole('button', { name: /게스트|guest/i })
      .isVisible()
      .catch(() => false)
    if (loginVisible) {
      await page.getByRole('button', { name: /게스트|guest/i }).click()
    }

    await page.keyboard.press('Meta+K').catch(() => null)
    // macOS 가 아닌 환경 폴백
    await page.keyboard.press('Control+K').catch(() => null)

    const palette = page.getByTestId('command-palette-overlay')
    await expect(palette).toBeVisible({ timeout: 5000 })
  })

  test('Command Palette 에서 Escape 입력 시 닫힌다', async ({ page }) => {
    await page.goto('/')

    const loginVisible = await page
      .getByRole('button', { name: /게스트|guest/i })
      .isVisible()
      .catch(() => false)
    if (loginVisible) {
      await page.getByRole('button', { name: /게스트|guest/i }).click()
    }

    await page.keyboard.press('Control+K')
    await expect(page.getByTestId('command-palette-overlay')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('command-palette-overlay')).not.toBeVisible()
  })
})
