// @MX:NOTE: [AUTO] weatherStore — OpenWeatherMap API 날씨 상태 관리 (Zustand)
// @MX:SPEC: SPEC-WIDGET-002
import { create } from 'zustand'

// 로컬스토리지 캐시 키
const WEATHER_CACHE_KEY = 'weather-cache'

// 30분 자동 갱신 인터벌 (밀리초)
const AUTO_REFRESH_INTERVAL = 30 * 60 * 1000

// OpenWeatherMap API 응답 타입
interface OpenWeatherResponse {
  name: string
  main: {
    temp: number
    feels_like: number
    humidity: number
  }
  weather: Array<{
    description: string
    icon: string
  }>
}

// 캐시 데이터 타입
interface WeatherCache {
  city: string
  temp: number
  feelsLike: number
  humidity: number
  description: string
  icon: string
  lastUpdated: string
}

// 날씨 위젯 상태 인터페이스
interface WeatherState {
  city: string | null
  temp: number | null
  feelsLike: number | null
  humidity: number | null
  description: string
  icon: string
  lastUpdated: string | null
  loading: boolean
  error: string | null
  // API 호출 (위도/경도 또는 도시명)
  fetchWeather: (lat?: number, lon?: number, city?: string) => Promise<void>
  // 도시명 설정 후 날씨 가져오기
  setCity: (city: string) => Promise<void>
  // 30분 자동 갱신 시작
  startAutoRefresh: () => void
  // 자동 갱신 정지
  stopAutoRefresh: () => void
}

// 자동 갱신 인터벌 ID (스토어 외부에 저장)
let autoRefreshInterval: ReturnType<typeof setInterval> | null = null

// @MX:NOTE: [AUTO] 버그 수정 — 모듈 로드 시 localStorage 캐시에서 초기 state 복원
// 기존엔 fetchWeather 실패 시에만 캐시를 복원해 앱 재시작 시 사용자 도시/날씨가 사라짐
function loadCachedWeather(): Partial<WeatherCache> | null {
  try {
    const raw = localStorage.getItem(WEATHER_CACHE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as WeatherCache
  } catch {
    // EDGE: 손상된 캐시는 무시하고 빈 초기 state로 시작
    return null
  }
}

const cachedWeather = loadCachedWeather()

export const useWeatherStore = create<WeatherState>((set, get) => ({
  city: cachedWeather?.city ?? null,
  temp: cachedWeather?.temp ?? null,
  feelsLike: cachedWeather?.feelsLike ?? null,
  humidity: cachedWeather?.humidity ?? null,
  description: cachedWeather?.description ?? '',
  icon: cachedWeather?.icon ?? '',
  lastUpdated: cachedWeather?.lastUpdated ?? null,
  loading: false,
  error: null,

  fetchWeather: async (lat?: number, lon?: number, city?: string) => {
    set({ loading: true, error: null })

    try {
      // API 엔드포인트 구성 (위도/경도 또는 도시명)
      const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY as string
      let url: string

      if (lat !== undefined && lon !== undefined) {
        url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=kr`
      } else if (city !== undefined) {
        url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric&lang=kr`
      } else {
        throw new Error('위치 또는 도시명이 필요합니다')
      }

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`API 오류: ${response.status}`)
      }

      const data = (await response.json()) as OpenWeatherResponse

      const weatherData = {
        city: data.name,
        temp: data.main.temp,
        feelsLike: data.main.feels_like,
        humidity: data.main.humidity,
        description: data.weather[0]?.description ?? '',
        icon: data.weather[0]?.icon ?? '',
        lastUpdated: new Date().toISOString(),
      }

      // 성공 응답을 localStorage에 캐시
      try {
        localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(weatherData))
      } catch {
        // localStorage 오류 무시
      }

      set({
        ...weatherData,
        loading: false,
        error: null,
      })
    } catch (err) {
      // 실패 시 캐시 데이터 복원
      try {
        const cached = localStorage.getItem(WEATHER_CACHE_KEY)
        if (cached !== null) {
          const cachedData = JSON.parse(cached) as WeatherCache
          set({
            city: cachedData.city,
            temp: cachedData.temp,
            feelsLike: cachedData.feelsLike,
            humidity: cachedData.humidity,
            description: cachedData.description,
            icon: cachedData.icon,
            lastUpdated: cachedData.lastUpdated,
            loading: false,
            error: err instanceof Error ? err.message : '날씨 정보를 불러올 수 없습니다',
          })
          return
        }
      } catch {
        // 캐시 파싱 오류 무시
      }

      set({
        loading: false,
        error: err instanceof Error ? err.message : '날씨 정보를 불러올 수 없습니다',
      })
    }
  },

  setCity: async (city: string) => {
    set({ city })
    await get().fetchWeather(undefined, undefined, city)
  },

  startAutoRefresh: () => {
    // 기존 인터벌 정리
    if (autoRefreshInterval !== null) {
      clearInterval(autoRefreshInterval)
    }

    // 30분마다 날씨 갱신
    autoRefreshInterval = setInterval(() => {
      const { city, fetchWeather } = get()
      if (city !== null) {
        void fetchWeather(undefined, undefined, city)
      }
    }, AUTO_REFRESH_INTERVAL)
  },

  stopAutoRefresh: () => {
    if (autoRefreshInterval !== null) {
      clearInterval(autoRefreshInterval)
      autoRefreshInterval = null
    }
  },
}))
