// @MX:NOTE: Playwright 웹 빌드 대상 E2E 설정.
// Electron Main 프로세스 검증은 별도 spawn 패턴이 필요하며, 1차 도입은 web 빌드 스모크 위주.
// 실행 전 의존성 설치 필요: npm install -D @playwright/test && npx playwright install --with-deps chromium
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }], ['list']],

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      // mobile.spec.ts 는 mobile 프로젝트에서만 실행
      testIgnore: '**/mobile.spec.ts',
    },
    // SPEC-MOBILE-RESPONSIVE-001: 모바일 viewport (chromium 기반, iPhone 12 크기)
    // iPhone 12 device emulation 은 webkit 의존이라 chromium 환경에서 사용 불가 →
    // chromium 에서 모바일 viewport + touch 만 시뮬레이션
    {
      name: 'mobile',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
        userAgent:
          'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        hasTouch: true,
        isMobile: true,
        deviceScaleFactor: 3,
      },
      testMatch: '**/mobile.spec.ts',
    },
  ],

  webServer: {
    // @MX:NOTE: --host 127.0.0.1 — 일부 샌드박스 환경에서 Vite 기본 host 가 외부 연결을 거부하여 명시 필요
    // @MX:NOTE: VITE_E2E_TEST_MODE=true — authStore initAuth 분기로 Firebase 구독 우회 (SPEC-E2E-AUTH-BYPASS-001)
    command: 'npm run dev:web -- --host 127.0.0.1',
    env: {
      VITE_E2E_TEST_MODE: 'true',
    },
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
