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
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontSize: 18,
          fontWeight: 600,
          color: 'var(--text-primary)',
          marginBottom: 4,
        }}
      >
        {greeting} 👋
      </div>
      <div
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 48,
          fontWeight: 700,
          letterSpacing: -2,
          color: 'var(--text-primary)',
          lineHeight: 1,
        }}
      >
        {time}
        <span
          data-testid="clock-seconds"
          style={{ fontSize: 20, opacity: 0.4, marginLeft: 4 }}
        >
          {secs}
        </span>
      </div>
      <div
        data-testid="clock-date"
        style={{
          fontSize: 13,
          color: 'var(--text-muted)',
          marginTop: 6,
        }}
      >
        {date}
      </div>
    </div>
  )
}
