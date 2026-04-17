# SPEC-WIDGET-002: 날씨 위젯

---
id: SPEC-WIDGET-002
version: 1.0.0
status: Planned
created: 2026-04-12
updated: 2026-04-12
author: ZeroJuneK
priority: Medium
depends_on: SPEC-LAYOUT-001
---

## HISTORY

| 버전 | 날짜 | 변경 내용 |
|------|------|-----------|
| 1.0.0 | 2026-04-12 | 초기 SPEC 작성 |

## 개요

OpenWeatherMap API를 활용하여 현재 위치 또는 설정된 도시의 날씨를 표시하는 위젯을 추가한다.
온도, 날씨 아이콘, 체감온도, 습도를 표시하며 30분마다 자동 갱신한다.

## 요구사항

### REQ-001 [Event-Driven]
**When** 앱이 처음 실행되면, **the** 시스템은 브라우저 Geolocation API로 현재 위치를 **shall** 요청해야 한다.

### REQ-002 [Event-Driven]
**When** 위치 권한이 허용되면, **the** 시스템은 해당 위치의 날씨 데이터를 **shall** 가져와야 한다.

### REQ-003 [Unwanted]
**If** 위치 권한이 거부되면, **then** **the** 시스템은 도시 이름 수동 입력 UI를 **shall** 표시해야 한다.

### REQ-004 [State-Driven]
**While** 날씨 데이터를 불러오는 동안, **the** 시스템은 로딩 인디케이터를 **shall** 표시해야 한다.

### REQ-005 [Ubiquitous]
**The** 위젯은 현재 온도(°C), 날씨 설명, 날씨 아이콘, 체감온도, 습도를 **shall** 표시해야 한다.

### REQ-006 [State-Driven]
**While** 앱이 실행 중이면, **the** 시스템은 30분마다 날씨 데이터를 자동으로 **shall** 갱신해야 한다.

### REQ-007 [Event-Driven]
**When** 사용자가 도시 이름을 설정하면, **the** 시스템은 해당 도시의 날씨를 **shall** 표시해야 한다.

### REQ-008 [Unwanted]
**If** API 호출이 실패하면, **then** **the** 시스템은 마지막으로 성공한 데이터와 갱신 시각을 **shall** 표시해야 한다.

## 비기능 요구사항

### NFR-001: API 키 보안
API 키는 환경변수(`VITE_OPENWEATHER_API_KEY`)로 관리. `.env.example`에 추가.

### NFR-002: 캐싱
마지막 성공 응답을 localStorage에 캐싱하여 오프라인 시 표시.

### NFR-003: 타입 안전성
OpenWeatherMap 응답 타입 정의 필수.

## 아키텍처 결정

### API
- OpenWeatherMap Current Weather API (무료 티어)
- 엔드포인트: `https://api.openweathermap.org/data/2.5/weather`
- 단위: `metric` (섭씨)

### 상태 관리
- `weatherStore.ts` (Zustand) 신규 생성
- 상태: `{ city, temp, feelsLike, humidity, description, icon, lastUpdated, loading, error }`

### 컴포넌트
- `src/renderer/components/WeatherWidget/WeatherWidget.tsx`
- `src/renderer/components/WeatherWidget/WeatherWidget.test.tsx`

### 환경 변수
```
VITE_OPENWEATHER_API_KEY=your_api_key_here
```

## Exclusions

- 시간별/주간 예보
- 강수 확률
- 지도 시각화
