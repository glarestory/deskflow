// @MX:TEST: 웹 빌드 인증 게이트 + 기본 부팅 스모크 (Electron 비의존).
// 실행: npm run test:e2e
//
// dev:web 빌드는 Firebase 인증 게이트를 거쳐야 메인 UI 에 진입한다. 인증을 우회할 수 있는
// 게스트 모드/테스트 플래그가 없어, 이 스모크는 LoginScreen 단계에서 검증 가능한 것만
// 다룬다. 인증 후 시나리오(Command Palette, 캡슐 등)는 별도 SPEC 으로 e2e 인증 우회
// 메커니즘을 추가한 뒤 확장한다.
import { test, expect } from '@playwright/test'

test.describe('Deskflow 웹 빌드 스모크', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // 이전 세션 누수 방지
    await page.evaluate(() => localStorage.clear())
  })

  test('루트 페이지 로딩 후 React 가 #root 에 마운트된다', async ({ page }) => {
    await page.goto('/')
    const root = page.locator('#root')
    await expect(root).not.toBeEmpty({ timeout: 10_000 })
  })

  test('미인증 상태에서 LoginScreen 이 표시된다', async ({ page }) => {
    await page.goto('/')

    // h1 으로 노출되지 않을 수도 있어, 텍스트 기반 단언을 사용
    await expect(page.getByText('Deskflow', { exact: false })).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByText('계속하려면 로그인하세요')).toBeVisible()
  })

  test('LoginScreen 에 Google/GitHub 로그인 버튼이 노출된다 (a11y name 확인)', async ({
    page,
  }) => {
    await page.goto('/')

    await expect(page.getByRole('button', { name: /Google로 로그인/ })).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByRole('button', { name: /GitHub로 로그인/ })).toBeVisible()
  })

  test('JS 콘솔에서 치명적 boot 에러가 발생하지 않는다 (Firebase placeholder 환경)', async ({
    page,
  }) => {
    const fatalErrors: string[] = []

    page.on('pageerror', (err) => {
      fatalErrors.push(err.message)
    })

    await page.goto('/')
    // React 마운트 + 초기 useEffect 처리 시간 확보
    await page.waitForLoadState('networkidle')

    // Firebase 인증 실패는 정상 흐름이지만, ReferenceError/TypeError 같은 코드 결함은 없어야 한다
    const fatal = fatalErrors.filter(
      (msg) => /ReferenceError|TypeError|SyntaxError/.test(msg),
    )
    expect(fatal).toEqual([])
  })

  test.fixme(
    '인증 후 Cmd+K 로 Command Palette 가 열린다 (인증 우회 메커니즘 추가 후 활성화)',
    async () => {},
  )
})
