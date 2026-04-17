// @MX:NOTE: [AUTO] WeatherWidget 테스트 — 날씨 위젯 UI 상태별 렌더링 테스트
// @MX:SPEC: SPEC-WIDGET-002
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

// weatherStore 모킹
const mockFetchWeather = vi.fn()
const mockSetCity = vi.fn()
const mockStartAutoRefresh = vi.fn()
const mockStopAutoRefresh = vi.fn()

// 기본 상태
const defaultState = {
  city: null,
  temp: null,
  feelsLike: null,
  humidity: null,
  description: '',
  icon: '',
  lastUpdated: null,
  loading: false,
  error: null,
  fetchWeather: mockFetchWeather,
  setCity: mockSetCity,
  startAutoRefresh: mockStartAutoRefresh,
  stopAutoRefresh: mockStopAutoRefresh,
}

let mockState = { ...defaultState }

vi.mock('../../stores/weatherStore', () => ({
  useWeatherStore: vi.fn((selector?: (state: typeof mockState) => unknown) => {
    if (typeof selector === 'function') {
      return selector(mockState)
    }
    return mockState
  }),
}))

describe('WeatherWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState = { ...defaultState }
    // Geolocation 모킹
    vi.stubGlobal('navigator', {
      ...navigator,
      geolocation: {
        getCurrentPosition: vi.fn(),
      },
    })
  })

  it('loading이 true일 때 로딩 스피너를 표시해야 한다', async () => {
    mockState = { ...defaultState, loading: true }

    const { default: WeatherWidget } = await import('./WeatherWidget')
    render(<WeatherWidget />)

    expect(screen.getByTestId('weather-loading')).toBeInTheDocument()
  })

  it('날씨 데이터가 로드되었을 때 온도를 표시해야 한다', async () => {
    mockState = {
      ...defaultState,
      city: '서울',
      temp: 23,
      feelsLike: 22,
      humidity: 65,
      description: '맑음',
      icon: '01d',
      lastUpdated: '2026-04-12T10:00:00',
    }

    const { default: WeatherWidget } = await import('./WeatherWidget')
    render(<WeatherWidget />)

    // 온도가 X°C 형식으로 표시되어야 함
    expect(screen.getByTestId('weather-temp')).toHaveTextContent('23°C')
  })

  it('날씨 데이터가 로드되었을 때 도시명을 표시해야 한다', async () => {
    mockState = {
      ...defaultState,
      city: '서울',
      temp: 23,
      feelsLike: 22,
      humidity: 65,
      description: '맑음',
      icon: '01d',
      lastUpdated: '2026-04-12T10:00:00',
    }

    const { default: WeatherWidget } = await import('./WeatherWidget')
    render(<WeatherWidget />)

    expect(screen.getByTestId('weather-city')).toHaveTextContent('서울')
  })

  it('날씨 데이터가 로드되었을 때 날씨 아이콘을 표시해야 한다', async () => {
    mockState = {
      ...defaultState,
      city: '서울',
      temp: 23,
      feelsLike: 22,
      humidity: 65,
      description: '맑음',
      icon: '01d',
      lastUpdated: '2026-04-12T10:00:00',
    }

    const { default: WeatherWidget } = await import('./WeatherWidget')
    render(<WeatherWidget />)

    const iconEl = screen.getByTestId('weather-icon')
    expect(iconEl).toBeInTheDocument()
    expect(iconEl).toHaveAttribute('src', 'https://openweathermap.org/img/wn/01d@2x.png')
  })

  it('날씨 데이터가 로드되었을 때 체감온도와 습도를 표시해야 한다', async () => {
    mockState = {
      ...defaultState,
      city: '서울',
      temp: 23,
      feelsLike: 22,
      humidity: 65,
      description: '맑음',
      icon: '01d',
      lastUpdated: '2026-04-12T10:00:00',
    }

    const { default: WeatherWidget } = await import('./WeatherWidget')
    render(<WeatherWidget />)

    expect(screen.getByTestId('weather-feels-like')).toBeInTheDocument()
    expect(screen.getByTestId('weather-humidity')).toBeInTheDocument()
  })

  it('데이터가 없고 도시도 없을 때 도시 입력 폼을 표시해야 한다', async () => {
    mockState = { ...defaultState }

    const { default: WeatherWidget } = await import('./WeatherWidget')
    render(<WeatherWidget />)

    // 도시 입력 폼이 표시되어야 함
    expect(screen.getByTestId('city-input-form')).toBeInTheDocument()
  })

  it('에러 상태일 때 에러 메시지와 재시도 버튼을 표시해야 한다', async () => {
    mockState = {
      ...defaultState,
      error: 'API 호출 실패',
    }

    const { default: WeatherWidget } = await import('./WeatherWidget')
    render(<WeatherWidget />)

    expect(screen.getByTestId('weather-error')).toBeInTheDocument()
    expect(screen.getByTestId('weather-retry-btn')).toBeInTheDocument()
  })

  it('재시도 버튼 클릭 시 fetchWeather를 호출해야 한다', async () => {
    mockState = {
      ...defaultState,
      city: '서울',
      error: 'API 호출 실패',
    }

    const { default: WeatherWidget } = await import('./WeatherWidget')
    render(<WeatherWidget />)

    fireEvent.click(screen.getByTestId('weather-retry-btn'))
    expect(mockFetchWeather).toHaveBeenCalled()
  })

  it('온도가 X°C 형식으로 표시되어야 한다', async () => {
    mockState = {
      ...defaultState,
      city: '서울',
      temp: 15,
      feelsLike: 14,
      humidity: 55,
      description: '흐림',
      icon: '04d',
      lastUpdated: '2026-04-12T10:00:00',
    }

    const { default: WeatherWidget } = await import('./WeatherWidget')
    render(<WeatherWidget />)

    const tempEl = screen.getByTestId('weather-temp')
    expect(tempEl.textContent).toMatch(/15°C/)
  })

  it('도시 입력 폼 제출 시 setCity를 호출해야 한다', async () => {
    mockState = { ...defaultState }
    mockSetCity.mockResolvedValueOnce(undefined)

    const { default: WeatherWidget } = await import('./WeatherWidget')
    render(<WeatherWidget />)

    const input = screen.getByTestId('city-input')
    const form = screen.getByTestId('city-input-form')

    fireEvent.change(input, { target: { value: '부산' } })
    fireEvent.submit(form)

    expect(mockSetCity).toHaveBeenCalledWith('부산')
  })

  it('마지막 업데이트 시간을 표시해야 한다', async () => {
    mockState = {
      ...defaultState,
      city: '서울',
      temp: 20,
      feelsLike: 19,
      humidity: 60,
      description: '맑음',
      icon: '01d',
      lastUpdated: '2026-04-12T10:00:00',
    }

    const { default: WeatherWidget } = await import('./WeatherWidget')
    render(<WeatherWidget />)

    expect(screen.getByTestId('weather-last-updated')).toBeInTheDocument()
  })
})
