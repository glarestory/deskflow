// @MX:TEST: SPEC-E2E-AUTH-BYPASS-001 — 인증 우회 활성화 후 메인 UI 스모크.
// 실행: npm run test:e2e
// 사전 조건: playwright.config.ts 의 webServer env 가 VITE_E2E_TEST_MODE=true 로 설정되어
// authStore 가 mock user 를 즉시 주입한다. 프로덕션 빌드에는 이 분기가 정적으로 평가되어
// 트리쉐이킹된다.
import { test, expect, type Page } from '@playwright/test'

/**
 * 메인 UI 안정화 헬퍼 — sidebar-item-all 이 visible 할 때까지 대기.
 * 이후 body 에 명시 click 으로 keyboard focus 가 root document 에 머무르도록 보장.
 */
const waitForAuthenticatedUI = async (page: Page): Promise<void> => {
  await expect(page.getByTestId('sidebar-item-all')).toBeVisible({ timeout: 15_000 })
  // RAG/embedding 백그라운드 작업이 키 이벤트를 방해하지 않도록 짧게 안정화 대기
  await page.locator('body').click({ position: { x: 1, y: 1 } })
}

test.describe('Deskflow 웹 빌드 — 부팅', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.goto('/')
  })

  test('루트 페이지 로딩 후 React 가 #root 에 마운트된다', async ({ page }) => {
    const root = page.locator('#root')
    await expect(root).not.toBeEmpty({ timeout: 10_000 })
  })

  test('JS 콘솔에서 치명적 boot 에러가 발생하지 않는다', async ({ page }) => {
    const fatal: string[] = []
    page.on('pageerror', (err) => {
      if (/ReferenceError|TypeError|SyntaxError/.test(err.message)) fatal.push(err.message)
    })

    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    await waitForAuthenticatedUI(page)
    expect(fatal).toEqual([])
  })
})

test.describe('Deskflow 웹 빌드 — E2E 우회 인증 (SPEC-E2E-AUTH-BYPASS-001)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.goto('/')
  })

  test('LoginScreen 대신 메인 UI(PivotLayout)에 진입하고 mock user 가 노출된다', async ({
    page,
  }) => {
    await waitForAuthenticatedUI(page)

    // mock user 의 displayName 이 사이드바에 표시되는지 확인
    await expect(page.getByText('E2E Test User')).toBeVisible()

    // LoginScreen 의 OAuth 버튼은 더 이상 노출되지 않아야 한다
    await expect(page.getByRole('button', { name: /Google로 로그인/ })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /GitHub로 로그인/ })).toHaveCount(0)
  })

  test('Cmd+K (Meta) 단축키로 Command Palette 가 열린다', async ({ page }) => {
    await waitForAuthenticatedUI(page)

    await page.keyboard.press('Meta+k')
    await expect(page.getByTestId('command-palette-overlay')).toBeVisible({ timeout: 5_000 })
  })

  test('Ctrl+K 단축키로 Command Palette 가 열린다 (Windows/Linux)', async ({ page }) => {
    await waitForAuthenticatedUI(page)

    await page.keyboard.press('Control+k')
    await expect(page.getByTestId('command-palette-overlay')).toBeVisible({ timeout: 5_000 })
  })

  test('Command Palette 가 열린 상태에서 Escape 입력 시 닫힌다', async ({ page }) => {
    await waitForAuthenticatedUI(page)

    await page.keyboard.press('Control+k')
    await expect(page.getByTestId('command-palette-overlay')).toBeVisible({ timeout: 5_000 })

    await page.keyboard.press('Escape')
    await expect(page.getByTestId('command-palette-overlay')).toHaveCount(0, {
      timeout: 5_000,
    })
  })

  test('Command Palette 검색어 입력 시 결과가 갱신된다', async ({ page }) => {
    await waitForAuthenticatedUI(page)

    await page.keyboard.press('Control+k')
    await expect(page.getByTestId('command-palette-overlay')).toBeVisible({ timeout: 5_000 })

    await page.keyboard.type('GitHub')

    // 결과 영역 — 매칭 결과 또는 empty 상태 둘 중 하나는 노출되어야 한다
    const palette = page.getByTestId('command-palette-overlay')
    const hasMatch = await palette
      .getByText('GitHub', { exact: false })
      .first()
      .isVisible({ timeout: 3_000 })
      .catch(() => false)
    const hasEmpty = await page
      .getByTestId('command-palette-empty')
      .isVisible()
      .catch(() => false)

    expect(hasMatch || hasEmpty).toBe(true)
  })
})
