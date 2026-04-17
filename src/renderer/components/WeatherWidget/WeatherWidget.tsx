// @MX:NOTE: [AUTO] WeatherWidget — 날씨 위젯 컴포넌트 (OpenWeatherMap API)
// @MX:SPEC: SPEC-WIDGET-002
import { useState, useEffect, FormEvent } from 'react'
import { useWeatherStore } from '../../stores/weatherStore'

export default function WeatherWidget(): JSX.Element {
  const {
    city,
    temp,
    feelsLike,
    humidity,
    description,
    icon,
    lastUpdated,
    loading,
    error,
    fetchWeather,
    setCity,
    startAutoRefresh,
    stopAutoRefresh,
  } = useWeatherStore()

  const [cityInput, setCityInput] = useState('')

  useEffect(() => {
    // 앱 시작 시 Geolocation 요청
    if (navigator.geolocation !== undefined) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          void fetchWeather(position.coords.latitude, position.coords.longitude)
        },
        () => {
          // 위치 권한 거부 시 도시 입력 UI 표시 (아무것도 하지 않음)
        },
      )
    }

    // 자동 갱신 시작
    startAutoRefresh()

    return () => {
      // 언마운트 시 인터벌 정리
      stopAutoRefresh()
    }
  }, [fetchWeather, startAutoRefresh, stopAutoRefresh])

  // 도시 입력 폼 제출 핸들러
  const handleCitySubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault()
    if (cityInput.trim() !== '') {
      void setCity(cityInput.trim())
      setCityInput('')
    }
  }

  // 재시도 핸들러
  const handleRetry = (): void => {
    if (city !== null) {
      void fetchWeather(undefined, undefined, city)
    } else {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          void fetchWeather(position.coords.latitude, position.coords.longitude)
        },
        () => {
          // 위치 거부 시 무시
        },
      )
    }
  }

  // 마지막 업데이트 시간 포맷
  const formatLastUpdated = (iso: string): string => {
    const date = new Date(iso)
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // 로딩 상태
  if (loading) {
    return (
      <div
        data-testid="weather-loading"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          color: 'var(--text-muted)',
          fontSize: 14,
        }}
      >
        날씨 정보를 불러오는 중...
      </div>
    )
  }

  // 에러 상태
  if (error !== null) {
    return (
      <div
        data-testid="weather-error"
        style={{
          padding: '16px',
          textAlign: 'center',
        }}
      >
        {/* 캐시 데이터가 있으면 함께 표시 */}
        {temp !== null && (
          <div style={{ marginBottom: 12 }}>
            <WeatherInfo
              city={city}
              temp={temp}
              feelsLike={feelsLike}
              humidity={humidity}
              description={description}
              icon={icon}
              lastUpdated={lastUpdated}
              formatLastUpdated={formatLastUpdated}
            />
          </div>
        )}
        <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 8 }}>
          {error}
        </p>
        <button
          data-testid="weather-retry-btn"
          onClick={handleRetry}
          style={{
            padding: '6px 14px',
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'var(--card-bg)',
            color: 'var(--text-muted)',
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          다시 시도
        </button>
      </div>
    )
  }

  // 데이터 없음 + 도시 미설정: 도시 입력 폼 표시
  if (temp === null) {
    return (
      <div style={{ padding: '16px' }}>
        <p
          style={{
            color: 'var(--text-muted)',
            fontSize: 13,
            marginBottom: 12,
            textAlign: 'center',
          }}
        >
          위치 권한이 없습니다. 도시명을 입력해주세요.
        </p>
        <form
          data-testid="city-input-form"
          onSubmit={handleCitySubmit}
          style={{ display: 'flex', gap: 8 }}
        >
          <input
            data-testid="city-input"
            type="text"
            value={cityInput}
            onChange={(e) => setCityInput(e.target.value)}
            placeholder="도시명 입력 (예: 서울)"
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--card-bg)',
              color: 'var(--text-primary)',
              fontSize: 13,
              outline: 'none',
            }}
          />
          <button
            type="submit"
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--accent)',
              color: '#fff',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            확인
          </button>
        </form>
      </div>
    )
  }

  // 날씨 데이터 표시
  return (
    <WeatherInfo
      city={city}
      temp={temp}
      feelsLike={feelsLike}
      humidity={humidity}
      description={description}
      icon={icon}
      lastUpdated={lastUpdated}
      formatLastUpdated={formatLastUpdated}
    />
  )
}

// 날씨 정보 표시 서브컴포넌트
interface WeatherInfoProps {
  city: string | null
  temp: number
  feelsLike: number | null
  humidity: number | null
  description: string
  icon: string
  lastUpdated: string | null
  formatLastUpdated: (iso: string) => string
}

function WeatherInfo({
  city,
  temp,
  feelsLike,
  humidity,
  description,
  icon,
  lastUpdated,
  formatLastUpdated,
}: WeatherInfoProps): JSX.Element {
  return (
    <div
      style={{
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      {/* 도시명 */}
      {city !== null && (
        <div
          data-testid="weather-city"
          style={{
            fontSize: 14,
            color: 'var(--text-muted)',
            fontWeight: 500,
          }}
        >
          {city}
        </div>
      )}

      {/* 메인 날씨 정보 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* 날씨 아이콘 */}
        {icon !== '' && (
          <img
            data-testid="weather-icon"
            src={`https://openweathermap.org/img/wn/${icon}@2x.png`}
            alt={description}
            style={{ width: 48, height: 48 }}
          />
        )}

        {/* 온도 */}
        <div
          data-testid="weather-temp"
          style={{
            fontSize: 32,
            fontWeight: 700,
            color: 'var(--text-primary)',
            lineHeight: 1,
          }}
        >
          {Math.round(temp)}°C
        </div>
      </div>

      {/* 날씨 설명 */}
      {description !== '' && (
        <div
          data-testid="weather-description"
          style={{
            fontSize: 13,
            color: 'var(--text-muted)',
            textTransform: 'capitalize',
          }}
        >
          {description}
        </div>
      )}

      {/* 체감온도 / 습도 */}
      <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-muted)' }}>
        {feelsLike !== null && (
          <span data-testid="weather-feels-like">
            체감 {Math.round(feelsLike)}°C
          </span>
        )}
        {humidity !== null && (
          <span data-testid="weather-humidity">
            습도 {humidity}%
          </span>
        )}
      </div>

      {/* 마지막 업데이트 시간 */}
      {lastUpdated !== null && (
        <div
          data-testid="weather-last-updated"
          style={{
            fontSize: 11,
            color: 'var(--text-muted)',
            opacity: 0.6,
            marginTop: 4,
          }}
        >
          업데이트: {formatLastUpdated(lastUpdated)}
        </div>
      )}
    </div>
  )
}
