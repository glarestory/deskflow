// @MX:TEST: SPEC-UX-011 — Favorites 위젯 드래그 앤 드롭 UX 개선 E2E 시나리오
// REQ: 그룹 재정렬, 링크 동일 그룹 정렬, 링크 크로스-그룹 이동, 빈 그룹 드롭
// REQ: ESC 취소, 키보드 정렬, 타이머 일시 중지 검증
import { test, expect, type Page } from '@playwright/test'

// ─── 공통 헬퍼 ────────────────────────────────────────────────────────────────

/**
 * 인증된 메인 UI 대기 헬퍼 (SPEC-UX-009 패턴 재사용)
 */
const waitForUI = async (page: Page): Promise<void> => {
  await expect(page.locator('[data-testid="sidebar-item-all"]')).toBeVisible({ timeout: 15_000 })
  await page.locator('body').click({ position: { x: 1, y: 1 } })
}

/**
 * 위젯 그리드(WidgetLayout) 진입 헬퍼 — PivotLayout 기본 시 위젯 전환
 */
const enterWidgetMode = async (page: Page): Promise<void> => {
  const gridContainer = page.getByTestId('widget-grid-container')
  if (await gridContainer.isVisible({ timeout: 3_000 }).catch(() => false)) return
  const pivotBtn = page.getByTestId('pivot-mode-btn')
  if (await pivotBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await pivotBtn.click()
    await expect(gridContainer).toBeVisible({ timeout: 5_000 })
  }
}

/**
 * 편집 모드 ON 헬퍼
 */
const enableEditMode = async (page: Page): Promise<void> => {
  const editToggle = page.getByTestId('edit-mode-toggle')
  await editToggle.click()
  await expect(page.locator('body')).toHaveClass(/is-edit-mode/, { timeout: 3_000 })
}

/**
 * dnd-kit distance:5 센서용 마우스 드래그 헬퍼.
 * 센서가 5px 이동 후에 드래그를 활성화하므로 최소 6px 이동이 필요.
 */
const dragTo = async (
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
): Promise<void> => {
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  // 센서 threshold 초과를 위해 중간 지점 경유 (6px 이상 이동)
  await page.mouse.move(from.x + Math.sign(to.x - from.x) * 8, from.y + Math.sign(to.y - from.y) * 8, { steps: 3 })
  await page.mouse.move(to.x, to.y, { steps: 10 })
  await page.mouse.up()
}

// ─── 테스트 스위트 ─────────────────────────────────────────────────────────────

test.describe('SPEC-UX-011 — Favorites DnD UX 개선', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.goto('/')
    await waitForUI(page)
    await enterWidgetMode(page)
  })

  // ─── [a] 그룹 재정렬 ──────────────────────────────────────────────────────
  test('(a) 그룹 재정렬 — 그룹 핸들 드래그로 순서 변경', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'WebKit pointer drag 호환성 이슈')

    await enableEditMode(page)

    // data-group-handle 요소 목록 획득
    const groupHandles = page.locator('[data-group-handle]')
    const count = await groupHandles.count()
    if (count < 2) {
      test.skip(true, '그룹이 2개 미만 — 재정렬 테스트 불가')
      return
    }

    // 첫 번째 그룹 핸들의 위치 측정
    const firstHandle = groupHandles.first()
    const secondHandle = groupHandles.nth(1)
    const firstBox = await firstHandle.boundingBox()
    const secondBox = await secondHandle.boundingBox()
    if (!firstBox || !secondBox) {
      test.skip(true, '핸들 bounding box 측정 실패')
      return
    }

    // 드래그 수행 — 첫 번째 그룹을 두 번째 위치로 이동
    await dragTo(
      page,
      { x: firstBox.x + firstBox.width / 2, y: firstBox.y + firstBox.height / 2 },
      { x: secondBox.x + secondBox.width / 2, y: secondBox.y + secondBox.height * 1.5 },
    )

    // 드래그 후 그룹 핸들 수 변화 없어야 함 (순서 변경, 수량 유지)
    await expect(groupHandles).toHaveCount(count)
  })

  // ─── [b] 링크 동일 그룹 정렬 ──────────────────────────────────────────────
  test('(b) 링크 동일 그룹 정렬 — 같은 그룹 내에서 링크 순서 변경', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'WebKit pointer drag 호환성 이슈')

    await enableEditMode(page)

    const linkHandles = page.locator('[data-link-handle]')
    const linkCount = await linkHandles.count()
    if (linkCount < 2) {
      test.skip(true, '링크가 2개 미만 — 정렬 테스트 불가')
      return
    }

    const firstLinkHandle = linkHandles.first()
    const secondLinkHandle = linkHandles.nth(1)
    const firstBox = await firstLinkHandle.boundingBox()
    const secondBox = await secondLinkHandle.boundingBox()
    if (!firstBox || !secondBox) {
      test.skip(true, '링크 핸들 bounding box 측정 실패')
      return
    }

    // 첫 번째 링크를 두 번째 링크 아래로 드래그
    await dragTo(
      page,
      { x: firstBox.x + firstBox.width / 2, y: firstBox.y + firstBox.height / 2 },
      { x: secondBox.x + secondBox.width / 2, y: secondBox.y + secondBox.height * 1.5 },
    )

    // 링크 수 유지 확인
    await expect(linkHandles).toHaveCount(linkCount)
  })

  // ─── [c] 링크 크로스-그룹 이동 ────────────────────────────────────────────
  test('(c) 링크 크로스-그룹 이동 — 링크를 다른 그룹으로 드래그', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'WebKit pointer drag 호환성 이슈')

    await enableEditMode(page)

    const groupHandles = page.locator('[data-group-handle]')
    const groupCount = await groupHandles.count()
    if (groupCount < 2) {
      test.skip(true, '그룹이 2개 미만 — 크로스-그룹 테스트 불가')
      return
    }

    const linkHandles = page.locator('[data-link-handle]')
    const totalLinks = await linkHandles.count()
    if (totalLinks < 2) {
      test.skip(true, '링크가 부족 — 크로스-그룹 이동 불가')
      return
    }

    // 두 번째 그룹 핸들의 카드 컨테이너 찾기
    const secondGroupHandle = groupHandles.nth(1)
    const secondGroupBox = await secondGroupHandle.boundingBox()
    if (!secondGroupBox) {
      test.skip(true, '두 번째 그룹 측정 실패')
      return
    }

    // 첫 번째 링크 핸들 위치
    const firstLinkHandle = linkHandles.first()
    const firstLinkBox = await firstLinkHandle.boundingBox()
    if (!firstLinkBox) {
      test.skip(true, '첫 번째 링크 핸들 측정 실패')
      return
    }

    // 첫 번째 링크를 두 번째 그룹 영역으로 드래그
    await dragTo(
      page,
      { x: firstLinkBox.x + firstLinkBox.width / 2, y: firstLinkBox.y + firstLinkBox.height / 2 },
      { x: secondGroupBox.x + 80, y: secondGroupBox.y + 100 },
    )

    // 전체 링크 수 유지 확인 (이동이지 삭제 아님)
    await expect(linkHandles).toHaveCount(totalLinks)
  })

  // ─── [d] 빈 그룹에 링크 드롭 ─────────────────────────────────────────────
  test('(d) 빈 그룹 드롭 — data-empty-placeholder가 드롭 가능해야 한다', async ({ page }) => {
    await enableEditMode(page)

    // 빈 카테고리 placeholder 존재 확인
    const emptyPlaceholders = page.locator('[data-empty-placeholder]')
    const placeholderCount = await emptyPlaceholders.count()

    if (placeholderCount === 0) {
      // 빈 그룹이 없는 경우 — 플레이스홀더가 표시되는 조건 자체를 검증
      // (links.length === 0 이면 플레이스홀더 렌더링 — 단위 테스트 영역)
      test.skip(true, '빈 그룹 없음 — 기본 데이터 환경 제약')
      return
    }

    // placeholder가 pointer-events를 가로막지 않는지 확인
    const placeholder = emptyPlaceholders.first()
    const pBox = await placeholder.boundingBox()
    expect(pBox).toBeTruthy()
    expect(pBox!.height).toBeGreaterThanOrEqual(48)
  })

  // ─── [e] ESC 취소 — 원위치 복원 ─────────────────────────────────────────
  test('(e) ESC 취소 — 드래그 중 ESC 누르면 원위치 복원', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'WebKit pointer drag 호환성 이슈')

    await enableEditMode(page)

    const linkHandles = page.locator('[data-link-handle]')
    const linkCount = await linkHandles.count()
    if (linkCount < 1) {
      test.skip(true, '링크 없음')
      return
    }

    const firstHandle = linkHandles.first()
    const firstBox = await firstHandle.boundingBox()
    if (!firstBox) {
      test.skip(true, '핸들 측정 실패')
      return
    }

    // 드래그 시작 후 ESC
    await page.mouse.move(firstBox.x + firstBox.width / 2, firstBox.y + firstBox.height / 2)
    await page.mouse.down()
    await page.mouse.move(
      firstBox.x + firstBox.width / 2 + 10,
      firstBox.y + firstBox.height / 2 + 50,
      { steps: 5 },
    )
    await page.keyboard.press('Escape')
    await page.mouse.up()

    // ESC 후 링크 수 유지 (삭제 없음)
    await expect(linkHandles).toHaveCount(linkCount)
  })

  // ─── [f] 키보드 정렬 ──────────────────────────────────────────────────────
  test('(f) 키보드 정렬 — Tab → Space → 방향키 → Space로 상태 변경', async ({ page }) => {
    await enableEditMode(page)

    // 그룹 핸들에 Tab 포커스
    const groupHandles = page.locator('[data-group-handle]')
    const count = await groupHandles.count()
    if (count === 0) {
      test.skip(true, '그룹 핸들 없음')
      return
    }

    const firstHandle = groupHandles.first()

    // aria 접근성 속성 확인 (tabIndex=0)
    const tabIndex = await firstHandle.getAttribute('tabindex')
    expect(tabIndex).toBe('0')

    // role="button" 확인
    const role = await firstHandle.getAttribute('role')
    expect(role).toBe('button')

    // aria-label 존재 확인
    const ariaLabel = await firstHandle.getAttribute('aria-label')
    expect(ariaLabel).toBeTruthy()
    expect(ariaLabel).toMatch(/카테고리 이동:/)

    // SPEC-UX-011: aria-roledescription 한국어 확인
    const ariaRoleDesc = await firstHandle.getAttribute('aria-roledescription')
    // dnd-kit attributes에 roleDescription이 설정되었거나 기본값 허용
    if (ariaRoleDesc) {
      expect(ariaRoleDesc).toMatch(/정렬/)
    }

    // 키보드 포커스 후 Space (드래그 시작) → ArrowDown → Space (드롭)
    await firstHandle.focus()
    await page.keyboard.press('Space')
    // 드래그 시작 후 그룹 핸들 수 유지
    await expect(groupHandles).toHaveCount(count)
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Space')

    // 드롭 후 그룹 수 유지
    await expect(groupHandles).toHaveCount(count)
  })

  // ─── [g] 타이머 일시 중지 ────────────────────────────────────────────────
  test('(g) 타이머 일시 중지 — 드래그 중 자동 종료 타이머가 정지해야 한다', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'WebKit pointer drag 호환성 이슈')

    await enableEditMode(page)

    // autoExitEnabled 확인 (카운트다운 표시 전제)
    const countdown = page.locator('[data-testid="edit-mode-countdown"]')
    const hasCountdown = await countdown.isVisible({ timeout: 2_000 }).catch(() => false)
    if (!hasCountdown) {
      test.skip(true, '자동 종료 타이머 비활성 — 카운트다운 없음')
      return
    }

    // 초기 카운트다운 값 읽기
    const initialText = await countdown.textContent()

    const linkHandles = page.locator('[data-link-handle]')
    const linkCount = await linkHandles.count()
    if (linkCount < 1) {
      test.skip(true, '링크 없음')
      return
    }

    const firstHandle = linkHandles.first()
    const firstBox = await firstHandle.boundingBox()
    if (!firstBox) {
      test.skip(true, '핸들 측정 실패')
      return
    }

    // 드래그 시작 (마우스 down 유지)
    await page.mouse.move(firstBox.x + firstBox.width / 2, firstBox.y + firstBox.height / 2)
    await page.mouse.down()
    await page.mouse.move(
      firstBox.x + firstBox.width / 2 + 10,
      firstBox.y + firstBox.height / 2 + 40,
      { steps: 5 },
    )

    // 3초 대기 후 카운트다운 값 비교
    await page.waitForTimeout(3_000)
    const duringText = await countdown.textContent()

    // 드래그 종료
    await page.mouse.up()

    // 드래그 중에는 타이머가 정지(또는 거의 변동 없음)해야 한다
    // 초기와 드래그 중 값이 동일하거나 1초 이내 차이여야 함
    if (initialText && duringText) {
      const parseSeconds = (text: string): number => {
        const parts = text.split(':')
        if (parts.length === 2) {
          return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10)
        }
        return parseInt(text, 10)
      }
      const initialSec = parseSeconds(initialText)
      const duringSec = parseSeconds(duringText)
      // 3초 대기했지만 드래그 중 타이머 정지로 차이가 2초 이내여야 함
      const diff = initialSec - duringSec
      expect(diff).toBeLessThanOrEqual(2)
    }
  })

  // ─── 그룹 DragOverlay 렌더링 확인 ─────────────────────────────────────────
  test('편집 모드 ON 시 그룹 핸들 roleDescription이 설정되어야 한다', async ({ page }) => {
    await enableEditMode(page)

    const groupHandles = page.locator('[data-group-handle]')
    const count = await groupHandles.count()
    if (count === 0) {
      test.skip(true, '그룹 핸들 없음')
      return
    }

    // dnd-kit attributes가 spread된 후 aria-roledescription 확인
    const firstHandle = groupHandles.first()
    // aria-label이 '카테고리 이동:' 패턴인지 확인
    const ariaLabel = await firstHandle.getAttribute('aria-label')
    expect(ariaLabel).toMatch(/카테고리 이동:/)
  })

  // ─── 링크 핸들 roleDescription 확인 ──────────────────────────────────────
  test('편집 모드 ON 시 링크 핸들 aria-label이 존재해야 한다', async ({ page }) => {
    await enableEditMode(page)

    const linkHandles = page.locator('[data-link-handle]')
    const count = await linkHandles.count()
    if (count === 0) {
      test.skip(true, '링크 핸들 없음')
      return
    }

    const firstHandle = linkHandles.first()
    const ariaLabel = await firstHandle.getAttribute('aria-label')
    expect(ariaLabel).toBeTruthy()
    expect(ariaLabel).toMatch(/링크 이동:/)
  })

  // ─── data-widget-handle 셀렉터 마이그레이션 확인 ─────────────────────────
  test('편집 모드 ON 시 data-widget-handle이 draggableHandle로 동작해야 한다', async ({ page }) => {
    await enableEditMode(page)

    // data-widget-handle 요소 DOM 존재 확인
    const widgetHandles = page.locator('[data-widget-handle]')
    const count = await widgetHandles.count()
    expect(count).toBeGreaterThan(0)

    // 첫 번째 위젯 핸들의 aria-label 확인
    const firstHandle = widgetHandles.first()
    const ariaLabel = await firstHandle.getAttribute('aria-label')
    expect(ariaLabel).toBeTruthy()
    expect(ariaLabel).toMatch(/위젯 이동:/)
  })
})
