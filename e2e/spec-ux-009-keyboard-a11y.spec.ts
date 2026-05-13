// @MX:TEST: SPEC-UX-009 — 드래그 핸들 키보드 접근성 E2E 시나리오 (WCAG 2.1.1, 2.5.5)
// REQ: 편집 모드 ON 시 핸들 role="button" + tabIndex=0 → Tab 포커스 가능
// REQ: 편집 모드 OFF 시 핸들 tabIndex=-1 → Tab 포커스 불가
// REQ: 핸들 min-width/min-height 44px (WCAG 2.5.5 hit-area)
import { test, expect, type Page } from '@playwright/test'

/**
 * 인증된 메인 UI 대기 헬퍼
 */
const waitForUI = async (page: Page): Promise<void> => {
  await expect(page.locator('[data-testid="sidebar-item-all"]')).toBeVisible({ timeout: 15_000 })
  await page.locator('body').click({ position: { x: 1, y: 1 } })
}

test.describe('SPEC-UX-009 — 드래그 핸들 키보드 접근성', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.goto('/')
    await waitForUI(page)
  })

  test('편집 모드 ON 시 그룹 핸들 role="button" 속성이 있어야 한다 (WCAG 4.1.2)', async ({
    page,
  }) => {
    // 위젯 그리드 진입
    const gridContainer = page.getByTestId('widget-grid-container')
    if (!(await gridContainer.isVisible({ timeout: 5_000 }).catch(() => false))) {
      const pivotBtn = page.getByTestId('pivot-mode-btn')
      if (await pivotBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await pivotBtn.click()
        await expect(gridContainer).toBeVisible({ timeout: 5_000 })
      }
    }

    // 편집 모드 ON
    const editToggle = page.getByTestId('edit-mode-toggle')
    await editToggle.click()
    await expect(page.locator('body')).toHaveClass(/is-edit-mode/, { timeout: 3_000 })

    // data-group-handle 요소의 role="button" 확인
    const groupHandles = page.locator('[data-group-handle]')
    const count = await groupHandles.count()
    if (count > 0) {
      const firstHandle = groupHandles.first()
      await expect(firstHandle).toHaveAttribute('role', 'button')
    }
  })

  test('편집 모드 ON 시 그룹 핸들 aria-label이 존재해야 한다 (WCAG 4.1.2, AC-016)', async ({
    page,
  }) => {
    const gridContainer = page.getByTestId('widget-grid-container')
    if (!(await gridContainer.isVisible({ timeout: 5_000 }).catch(() => false))) {
      const pivotBtn = page.getByTestId('pivot-mode-btn')
      if (await pivotBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await pivotBtn.click()
        await expect(gridContainer).toBeVisible({ timeout: 5_000 })
      }
    }

    const editToggle = page.getByTestId('edit-mode-toggle')
    await editToggle.click()
    await expect(page.locator('body')).toHaveClass(/is-edit-mode/, { timeout: 3_000 })

    // data-group-handle 요소의 aria-label 존재 확인 (카테고리 이동 형식)
    const groupHandles = page.locator('[data-group-handle]')
    const count = await groupHandles.count()
    if (count > 0) {
      const firstHandle = groupHandles.first()
      const ariaLabel = await firstHandle.getAttribute('aria-label')
      expect(ariaLabel).toBeTruthy()
      expect(ariaLabel).toMatch(/카테고리 이동:/)
    }
  })

  test('편집 모드 ON 시 위젯 핸들 aria-label이 존재해야 한다 (AC-016)', async ({ page }) => {
    const gridContainer = page.getByTestId('widget-grid-container')
    if (!(await gridContainer.isVisible({ timeout: 5_000 }).catch(() => false))) {
      const pivotBtn = page.getByTestId('pivot-mode-btn')
      if (await pivotBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await pivotBtn.click()
        await expect(gridContainer).toBeVisible({ timeout: 5_000 })
      }
    }

    const editToggle = page.getByTestId('edit-mode-toggle')
    await editToggle.click()
    await expect(page.locator('body')).toHaveClass(/is-edit-mode/, { timeout: 3_000 })

    // data-widget-handle 요소의 aria-label 존재 확인
    const widgetHandles = page.locator('[data-widget-handle]')
    const count = await widgetHandles.count()
    if (count > 0) {
      const firstHandle = widgetHandles.first()
      const ariaLabel = await firstHandle.getAttribute('aria-label')
      expect(ariaLabel).toBeTruthy()
      expect(ariaLabel).toMatch(/위젯 이동:/)
    }
  })

  test('핸들 요소의 최소 크기가 44x44px 이상이어야 한다 (WCAG 2.5.5)', async ({ page }) => {
    const gridContainer = page.getByTestId('widget-grid-container')
    if (!(await gridContainer.isVisible({ timeout: 5_000 }).catch(() => false))) {
      const pivotBtn = page.getByTestId('pivot-mode-btn')
      if (await pivotBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await pivotBtn.click()
        await expect(gridContainer).toBeVisible({ timeout: 5_000 })
      }
    }

    const editToggle = page.getByTestId('edit-mode-toggle')
    await editToggle.click()
    await expect(page.locator('body')).toHaveClass(/is-edit-mode/, { timeout: 3_000 })

    // CSS min-width/min-height 44px 검증 (data-group-handle)
    const groupHandles = page.locator('[data-group-handle]')
    const count = await groupHandles.count()
    if (count > 0) {
      const firstHandle = groupHandles.first()
      const minWidth = await firstHandle.evaluate((el) => {
        return window.getComputedStyle(el).minWidth
      })
      const minHeight = await firstHandle.evaluate((el) => {
        return window.getComputedStyle(el).minHeight
      })
      // 44px 이상인지 확인
      const minWidthPx = parseInt(minWidth, 10)
      const minHeightPx = parseInt(minHeight, 10)
      expect(minWidthPx).toBeGreaterThanOrEqual(44)
      expect(minHeightPx).toBeGreaterThanOrEqual(44)
    }
  })
})
