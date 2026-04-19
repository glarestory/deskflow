// @MX:NOTE: [AUTO] Ollama HTTP 클라이언트 단위 테스트 — fetch mock 기반 health/embed/에러 분기
// @MX:SPEC: SPEC-SEARCH-RAG-001
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// 각 테스트가 독립적인 모듈 인스턴스를 갖도록 동적 import 사용
describe('ollamaClient', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // --- checkHealth ---

  describe('checkHealth', () => {
    it('200 응답이면 true를 반환한다', async () => {
      ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        new Response(JSON.stringify({ models: [] }), { status: 200 }),
      )
      const { checkHealth } = await import('./ollamaClient')
      expect(await checkHealth()).toBe(true)
    })

    it('500 응답이면 false를 반환한다', async () => {
      ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        new Response('Internal Server Error', { status: 500 }),
      )
      const { checkHealth } = await import('./ollamaClient')
      expect(await checkHealth()).toBe(false)
    })

    it('네트워크 오류(reject)이면 false를 반환하고 throw하지 않는다', async () => {
      ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new TypeError('Failed to fetch'),
      )
      const { checkHealth } = await import('./ollamaClient')
      const result = await checkHealth()
      expect(result).toBe(false)
    })

    it('2초 타임아웃 시 false를 반환한다', async () => {
      // AbortError를 흉내 — AbortController.abort() 시 발생하는 에러 타입
      const abortError = new DOMException('The user aborted a request.', 'AbortError')
      ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        abortError,
      )
      const { checkHealth } = await import('./ollamaClient')
      expect(await checkHealth()).toBe(false)
    })

    it('비표준 응답(201 등)이면 false를 반환한다', async () => {
      ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        new Response('', { status: 201 }),
      )
      const { checkHealth } = await import('./ollamaClient')
      expect(await checkHealth()).toBe(false)
    })
  })

  // --- listModels ---

  describe('listModels', () => {
    it('models 배열을 파싱하여 name 목록을 반환한다', async () => {
      const mockBody = {
        models: [
          { name: 'nomic-embed-text' },
          { name: 'llama3' },
        ],
      }
      ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        new Response(JSON.stringify(mockBody), { status: 200 }),
      )
      const { listModels } = await import('./ollamaClient')
      const result = await listModels()
      expect(result).toEqual(['nomic-embed-text', 'llama3'])
    })

    it('models가 빈 배열이면 빈 배열을 반환한다', async () => {
      ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        new Response(JSON.stringify({ models: [] }), { status: 200 }),
      )
      const { listModels } = await import('./ollamaClient')
      expect(await listModels()).toEqual([])
    })

    it('500 응답이면 OllamaError를 throw한다', async () => {
      ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        new Response('Internal Server Error', { status: 500 }),
      )
      const { listModels, OllamaError } = await import('./ollamaClient')
      await expect(listModels()).rejects.toBeInstanceOf(OllamaError)
    })

    it('404 응답이면 OllamaError를 throw한다', async () => {
      ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        new Response('Not Found', { status: 404 }),
      )
      const { listModels, OllamaError } = await import('./ollamaClient')
      await expect(listModels()).rejects.toBeInstanceOf(OllamaError)
    })
  })

  // --- embed ---

  describe('embed', () => {
    it('200 응답에서 embedding 배열을 반환한다', async () => {
      const embedding = Array.from({ length: 384 }, (_, i) => i * 0.001)
      ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        new Response(JSON.stringify({ embedding }), { status: 200 }),
      )
      const { embed } = await import('./ollamaClient')
      const result = await embed('test text')
      expect(result).toEqual(embedding)
      expect(result).toHaveLength(384)
    })

    it('model 파라미터를 지정하면 해당 모델로 요청한다', async () => {
      const embedding = [0.1, 0.2, 0.3]
      ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        new Response(JSON.stringify({ embedding }), { status: 200 }),
      )
      const { embed } = await import('./ollamaClient')
      await embed('test', 'custom-model')

      const call = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
      const body = JSON.parse(call[1].body as string)
      expect(body.model).toBe('custom-model')
      expect(body.prompt).toBe('test')
    })

    it('model 미지정 시 기본값 nomic-embed-text를 사용한다', async () => {
      ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        new Response(JSON.stringify({ embedding: [0.1] }), { status: 200 }),
      )
      const { embed } = await import('./ollamaClient')
      await embed('hello')

      const call = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
      const body = JSON.parse(call[1].body as string)
      expect(body.model).toBe('nomic-embed-text')
    })

    it('404 응답 (모델 없음)이면 OllamaError를 throw한다', async () => {
      ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        new Response('model not found', { status: 404 }),
      )
      const { embed, OllamaError } = await import('./ollamaClient')
      await expect(embed('test')).rejects.toBeInstanceOf(OllamaError)
    })

    it('404 응답이면 OllamaError.code가 HTTP_ERROR이다', async () => {
      ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        new Response('model not found', { status: 404 }),
      )
      const { embed, OllamaError } = await import('./ollamaClient')
      try {
        await embed('test')
        expect.fail('throw 하지 않음')
      } catch (err) {
        expect(err).toBeInstanceOf(OllamaError)
        expect((err as InstanceType<typeof OllamaError>).code).toBe('HTTP_ERROR')
      }
    })

    it('5초 타임아웃 시 OllamaError를 throw하고 code가 TIMEOUT이다', async () => {
      const abortError = new DOMException('The user aborted a request.', 'AbortError')
      ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        abortError,
      )
      const { embed, OllamaError } = await import('./ollamaClient')
      try {
        await embed('test')
        expect.fail('throw 하지 않음')
      } catch (err) {
        expect(err).toBeInstanceOf(OllamaError)
        expect((err as InstanceType<typeof OllamaError>).code).toBe('TIMEOUT')
      }
    })

    it('네트워크 오류이면 OllamaError(NETWORK_ERROR)를 throw한다', async () => {
      ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new TypeError('Failed to fetch'),
      )
      const { embed, OllamaError } = await import('./ollamaClient')
      try {
        await embed('test')
        expect.fail('throw 하지 않음')
      } catch (err) {
        expect(err).toBeInstanceOf(OllamaError)
        expect((err as InstanceType<typeof OllamaError>).code).toBe('NETWORK_ERROR')
      }
    })

    it('응답 body에 embedding 필드가 없으면 OllamaError를 throw한다', async () => {
      ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        new Response(JSON.stringify({ result: [] }), { status: 200 }),
      )
      const { embed, OllamaError } = await import('./ollamaClient')
      await expect(embed('test')).rejects.toBeInstanceOf(OllamaError)
    })
  })

  // --- OLLAMA_BASE_URL ---

  describe('OLLAMA_BASE_URL', () => {
    it('기본값은 http://localhost:11434이다', async () => {
      const { OLLAMA_BASE_URL } = await import('./ollamaClient')
      expect(OLLAMA_BASE_URL).toMatch(/localhost:11434/)
    })
  })
})
