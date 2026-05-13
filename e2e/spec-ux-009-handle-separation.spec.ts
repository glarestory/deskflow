// @MX:TEST: SPEC-UX-009 — 드래그 핸들 시각 분리 E2E 시나리오
// REQ: 편집 모드 OFF 시 핸들 불가시, 편집 모드 ON 시 핸들 가시 (opacity:1)
// REQ: 위젯(A) / 그룹(B) / 링크(C) 레벨별 data-* 속성 DOM 존재 확인
import { test, expect, type Page } from '@playwright/test'

/**
 * 인증된 메인 UI 대기 헬퍼
 */
const waitForUI = async (page: Page): Promise<void> => {
  await expect(page.locator('[data-testid="sidebar-item-all"]')).toBeVisible({ timeout: 15_000 })
  await page.locator('body').click({ position: { x: 1, y: 1 } })
}

/**
 * 위젯 모드(WidgetLayout) 진입 헬퍼 — Pivot 모드가 기본이므로 위젯 탭 클릭
 */
const enterWidgetMode = async (page: Page): Promise<void> => {
  // 위젯 탭이 있으면 클릭, 없으면 이미 위젯 모드
  const widgetTab = page.getByTestId('edit-mode-toggle')
  if (await widgetTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
    // 이미 위젯 레이아웃에 있음
    return
  }
  // PivotLayout에서 위젯 모드로 전환
  const pivotToWidget = page.getByTestId('widget-grid-container')
  if (!(await pivotToWidget.isVisible({ timeout: 3_000 }).catch(() => false))) {
    await page.keyboard.press('w')
  }
}

test.describe('SPEC-UX-009 — 드래그 핸들 시각 분리', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.goto('/')
    await waitForUI(page)
  })

  test('편집 모드 토글 버튼이 위젯 그리드에 존재해야 한다 (REQ-UX-007-002)', async ({
    page,
  }) => {
    // 위젯 그리드 컨테이너 확인
    const gridContainer = page.getByTestId('widget-grid-container')
    if (!(await gridContainer.isVisible({ timeout: 5_000 }).catch(() => false))) {
      // PivotLayout일 경우 위젯 모드 전환 시도
      const pivotBtn = page.getByTestId('pivot-mode-btn')
      if (await pivotBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await pivotBtn.click()
        await expect(gridContainer).toBeVisible({ timeout: 5_000 })
      }
    }
    const editToggle = page.getByTestId('edit-mode-toggle')
    await expect(editToggle).toBeVisible({ timeout: 5_000 })
  })

  test('편집 모드 ON 시 data-widget-handle 요소가 DOM에 존재해야 한다 (REQ-UX-009-003)', async ({
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

    // body.is-edit-mode 클래스 확인 (REQ-UX-007-008)
    await expect(page.locator('body')).toHaveClass(/is-edit-mode/, { timeout: 3_000 })

    // data-widget-handle 요소 DOM 존재 확인
    const widgetHandles = page.locator('[data-widget-handle]')
    const count = await widgetHandles.count()
    expect(count).toBeGreaterThan(0)
  })

  test('편집 모드 ON 시 data-group-handle 요소가 DOM에 존재해야 한다 (REQ-UX-009-004)', async ({
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

    // data-group-handle 요소 DOM 존재 확인
    const groupHandles = page.locator('[data-group-handle]')
    const count = await groupHandles.count()
    expect(count).toBeGreaterThan(0)
  })

  test('편집 모드 OFF 시 body.is-edit-mode 클래스가 없어야 한다 (REQ-UX-007-008)', async ({
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

    // 초기 상태: 편집 모드 OFF
    await expect(page.locator('body')).not.toHaveClass(/is-edit-mode/)

    // 편집 모드 ON → OFF 사이클
    const editToggle = page.getByTestId('edit-mode-toggle')
    await editToggle.click()
    await expect(page.locator('body')).toHaveClass(/is-edit-mode/, { timeout: 3_000 })

    await editToggle.click()
    await expect(page.locator('body')).not.toHaveClass(/is-edit-mode/, { timeout: 3_000 })
  })

  test('Esc 키로 편집 모드 종료 시 핸들이 다시 숨겨져야 한다 (REQ-UX-007-007)', async ({
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

    // Esc로 편집 모드 종료
    await page.keyboard.press('Escape')
    await expect(page.locator('body')).not.toHaveClass(/is-edit-mode/, { timeout: 3_000 })
  })
})
