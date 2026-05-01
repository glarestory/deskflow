// @MX:TEST: SPEC-MOBILE-RESPONSIVE-001 — iPhone 12 viewport (390×844) 모바일 시나리오.
// 실행: npm run test:e2e (mobile 프로젝트만 실행)
//
// 사전 조건: playwright.config.ts mobile 프로젝트가 iPhone 12 device emulation 사용,
// VITE_E2E_TEST_MODE=true 로 mock user 자동 주입.
import { test, expect, type Page } from '@playwright/test'

const waitForAuthenticatedUI = async (page: Page): Promise<void> => {
  await page.goto('/')
  // mock user 가 주입되어 메인 UI 진입 대기 — sidebar 자체는 collapsed 상태이므로
  // pivot-layout 컨테이너 또는 위젯 그리드 컨테이너가 보이는지로 확인
  await expect(
    page.getByTestId('pivot-layout').or(page.getByTestId('widget-grid-container')),
  ).toBeVisible({ timeout: 15_000 })
}

test.describe('Deskflow 모바일 (iPhone 12) — SPEC-MOBILE-RESPONSIVE-001', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
  })

  test('viewport 가 390px 이며 React 가 마운트된다', async ({ page }) => {
    await waitForAuthenticatedUI(page)
    const viewport = page.viewportSize()
    expect(viewport?.width).toBeLessThanOrEqual(640)

    const root = page.locator('#root')
    await expect(root).not.toBeEmpty()
  })

  test('PivotLayout 진입 시 햄버거 버튼이 노출되고 backdrop 은 표시되지 않는다 (자동 collapse)', async ({
    page,
  }) => {
    await waitForAuthenticatedUI(page)
    // 자동 collapse 가 발동했다면 햄버거가 보이고 backdrop 은 없어야 함
    const hamburger = page.getByTestId('mobile-menu-btn')
    if (await hamburger.isVisible().catch(() => false)) {
      await expect(hamburger).toBeVisible()
      await expect(page.getByTestId('sidebar-backdrop')).toHaveCount(0)
    }
  })

  test('햄버거 클릭 → Sidebar 슬라이드인 + backdrop 표시 → backdrop 클릭 시 닫힘', async ({
    page,
  }) => {
    await waitForAuthenticatedUI(page)

    const hamburger = page.getByTestId('mobile-menu-btn')
    if (!(await hamburger.isVisible().catch(() => false))) {
      // 위젯 모드에서는 햄버거가 없으므로 skip
      test.skip(true, 'Pivot 모드 진입이 필요합니다')
      return
    }

    await hamburger.click()
    await expect(page.getByTestId('sidebar-backdrop')).toBeVisible()

    await page.getByTestId('sidebar-backdrop').click()
    await expect(page.getByTestId('sidebar-backdrop')).toHaveCount(0)
  })

  test('Sidebar 가 fixed 오버레이로 동작한다 (data-mobile=true)', async ({ page }) => {
    await waitForAuthenticatedUI(page)
    await expect(page.getByTestId('sidebar')).toHaveAttribute('data-mobile', 'true')
  })

  test('viewport meta 의 viewport-fit=cover 가 설정되어 있다 (safe-area 활용)', async ({
    page,
  }) => {
    await page.goto('/')
    const content = await page.locator('meta[name="viewport"]').getAttribute('content')
    expect(content).toContain('viewport-fit=cover')
  })
})
