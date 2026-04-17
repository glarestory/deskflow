// @MX:NOTE: [AUTO] weatherStore 테스트 — OpenWeatherMap API 상태 관리 테스트
// @MX:SPEC: SPEC-WIDGET-002
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// localStorage 모킹
const mockLocalStorage = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()

// fetch 모킹
const mockFetch = vi.fn()

describe('weatherStore', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
    vi.stubGlobal('fetch', mockFetch)
    vi.stubGlobal('localStorage', mockLocalStorage)
    mockLocalStorage.clear()
    // import.meta.env 모킹
    vi.stubGlobal('import', {
      meta: {
        env: {
          VITE_OPENWEATHER_API_KEY: 'test-api-key',
        },
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('초기 상태가 올바르게 설정되어야 한다', async () => {
    const { useWeatherStore } = await import('./weatherStore')
    const state = useWeatherStore.getState()

    expect(state.city).toBeNull()
    expect(state.temp).toBeNull()
    expect(state.feelsLike).toBeNull()
    expect(state.humidity).toBeNull()
    expect(state.description).toBe('')
    expect(state.icon).toBe('')
    expect(state.lastUpdated).toBeNull()
    expect(state.loading).toBe(false)
    expect(state.error).toBeNull()
  })

  it('fetchWeather가 성공 시 상태를 업데이트해야 한다', async () => {
    // OpenWeatherMap API 응답 형태 모킹
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        name: '서울',
        main: {
          temp: 23.5,
          feels_like: 22.1,
          humidity: 65,
        },
        weather: [
          {
            description: '맑음',
            icon: '01d',
          },
        ],
      }),
    })

    const { useWeatherStore } = await import('./weatherStore')
    await useWeatherStore.getState().fetchWeather(37.5665, 126.9780)

    const state = useWeatherStore.getState()
    expect(state.temp).toBe(23.5)
    expect(state.feelsLike).toBe(22.1)
    expect(state.humidity).toBe(65)
    expect(state.description).toBe('맑음')
    expect(state.icon).toBe('01d')
    expect(state.city).toBe('서울')
    expect(state.lastUpdated).not.toBeNull()
    expect(state.loading).toBe(false)
    expect(state.error).toBeNull()
  })

  it('fetchWeather가 API 실패 시 에러 상태를 설정해야 한다', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
    })

    const { useWeatherStore } = await import('./weatherStore')
    await useWeatherStore.getState().fetchWeather(37.5665, 126.9780)

    const state = useWeatherStore.getState()
    expect(state.error).not.toBeNull()
    expect(state.loading).toBe(false)
  })

  it('API 실패 시 캐시된 데이터를 표시해야 한다', async () => {
    // 캐시 데이터 설정
    const cachedData = {
      city: '부산',
      temp: 25,
      feelsLike: 24,
      humidity: 70,
      description: '흐림',
      icon: '02d',
      lastUpdated: '2026-04-12T10:00:00',
    }
    mockLocalStorage.getItem.mockReturnValue(JSON.stringify(cachedData))

    // API 실패 모킹
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const { useWeatherStore } = await import('./weatherStore')
    await useWeatherStore.getState().fetchWeather(37.5665, 126.9780)

    const state = useWeatherStore.getState()
    // 캐시 데이터가 복원되어야 함
    expect(state.temp).toBe(25)
    expect(state.city).toBe('부산')
    expect(state.description).toBe('흐림')
  })

  it('setCity가 도시명을 설정하고 fetchWeather를 트리거해야 한다', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        name: '인천',
        main: {
          temp: 20,
          feels_like: 19,
          humidity: 60,
        },
        weather: [{ description: '구름 많음', icon: '03d' }],
      }),
    })

    const { useWeatherStore } = await import('./weatherStore')
    await useWeatherStore.getState().setCity('인천')

    // fetch가 도시명 파라미터로 호출되어야 함
    expect(mockFetch).toHaveBeenCalledTimes(1)
    const callUrl = mockFetch.mock.calls[0][0] as string
    expect(callUrl).toContain('q=인천')

    const state = useWeatherStore.getState()
    expect(state.city).toBe('인천')
  })

  it('startAutoRefresh가 30분 인터벌을 생성해야 한다', async () => {
    vi.useFakeTimers()
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        name: '서울',
        main: { temp: 20, feels_like: 19, humidity: 60 },
        weather: [{ description: '맑음', icon: '01d' }],
      }),
    })

    const { useWeatherStore } = await import('./weatherStore')

    // 도시 설정 후 자동 갱신 시작 (city가 있어야 인터벌에서 fetch가 호출됨)
    useWeatherStore.setState({ city: '서울' })
    useWeatherStore.getState().startAutoRefresh()

    // 30분 후 자동으로 갱신되어야 함
    await vi.advanceTimersByTimeAsync(30 * 60 * 1000)
    expect(mockFetch).toHaveBeenCalled()

    useWeatherStore.getState().stopAutoRefresh()
    vi.useRealTimers()
  })

  it('stopAutoRefresh가 인터벌을 정리해야 한다', async () => {
    vi.useFakeTimers()
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval')

    const { useWeatherStore } = await import('./weatherStore')
    useWeatherStore.getState().startAutoRefresh()
    useWeatherStore.getState().stopAutoRefresh()

    expect(clearIntervalSpy).toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('fetchWeather 실행 중 loading 상태가 true여야 한다', async () => {
    let resolveFetch!: (value: unknown) => void
    const fetchPromise = new Promise((resolve) => {
      resolveFetch = resolve
    })
    mockFetch.mockReturnValueOnce(fetchPromise)

    const { useWeatherStore } = await import('./weatherStore')
    const fetchCall = useWeatherStore.getState().fetchWeather(37.5665, 126.9780)

    // 비동기 처리 시작 후 loading이 true여야 함
    expect(useWeatherStore.getState().loading).toBe(true)

    // fetch 완료 처리
    resolveFetch({
      ok: true,
      json: async () => ({
        name: '서울',
        main: { temp: 20, feels_like: 19, humidity: 60 },
        weather: [{ description: '맑음', icon: '01d' }],
      }),
    })

    await fetchCall
    expect(useWeatherStore.getState().loading).toBe(false)
  })
})
