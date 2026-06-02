// @MX:NOTE: [AUTO] Clock 위젯 — 1초 interval로 현재 시간 표시, 마운트 해제 시 cleanup
// @MX:SPEC: SPEC-UI-001
import { useState, useEffect } from 'react'

function getGreeting(hour: number): string {
  if (hour >= 5 && hour < 12) return 'Good Morning'
  if (hour >= 12 && hour < 18) return 'Good Afternoon'
  if (hour >= 18 && hour <= 20) return 'Good Evening'
  return 'Good Night'
}

export default function Clock(): JSX.Element {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const time = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const secs = now.getSeconds().toString().padStart(2, '0')
  const date = now.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })
  const greeting = getGreeting(now.getHours())

  return (
    // w3 컴팩트 셀(약 25% 폭)에서도 시간·날짜가 오버플로우 없이 중앙 정렬되도록
    // clamp 상한을 3rem으로 낮추고, greeting은 작은 폰트로 한 줄 유지
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        overflow: 'hidden',
        padding: '0 8px',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: 'var(--text-muted)',
          marginBottom: 2,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          width: '100%',
        }}
      >
        {greeting}
      </div>
      <div
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          // w3 셀 폭에서 vw 기반 폰트가 너무 커지지 않도록 상한 3rem으로 조정
          fontSize: 'clamp(1.5rem, 4vw, 3rem)',
          fontWeight: 700,
          letterSpacing: -1,
          color: 'var(--text-primary)',
          lineHeight: 1,
          whiteSpace: 'nowrap',
        }}
      >
        {time}
        <span
          data-testid="clock-seconds"
          style={{ fontSize: '0.45em', opacity: 0.4, marginLeft: 3 }}
        >
          {secs}
        </span>
      </div>
      <div
        data-testid="clock-date"
        style={{
          fontSize: 11,
          color: 'var(--text-muted)',
          marginTop: 4,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          width: '100%',
        }}
      >
        {date}
      </div>
    </div>
  )
}
