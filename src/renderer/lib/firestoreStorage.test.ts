// @MX:TEST: SPEC-AUTH-001
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSnap = {
  exists: vi.fn(() => false),
  data: vi.fn(() => ({ value: '' })),
}

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => 'mock-doc-ref'),
  getDoc: vi.fn(() => Promise.resolve(mockSnap)),
  setDoc: vi.fn(() => Promise.resolve()),
}))

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
}))

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({})),
  GoogleAuthProvider: vi.fn(),
  GithubAuthProvider: vi.fn(),
}))

vi.mock('./firebase', () => ({
  db: {},
  auth: {},
  googleProvider: {},
  githubProvider: {},
}))

import { firestoreStorage } from './firestoreStorage'

describe('firestoreStorage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSnap.exists.mockReturnValue(false)
    mockSnap.data.mockReturnValue({ value: '' })
  })

  it('문서가 없으면 value: null을 반환한다', async () => {
    mockSnap.exists.mockReturnValue(false)
    const result = await firestoreStorage.get('uid-1', 'hub-bookmarks')
    expect(result).toEqual({ value: null })
  })

  it('문서가 존재하면 value를 반환한다', async () => {
    mockSnap.exists.mockReturnValue(true)
    mockSnap.data.mockReturnValue({ value: '["bookmark1"]' })
    const result = await firestoreStorage.get('uid-1', 'hub-bookmarks')
    expect(result).toEqual({ value: '["bookmark1"]' })
  })

  it('set은 올바른 경로로 setDoc을 호출한다', async () => {
    const { setDoc, doc } = await import('firebase/firestore')
    await firestoreStorage.set('uid-1', 'hub-todos', '["todo1"]')
    expect(doc).toHaveBeenCalledWith({}, 'users', 'uid-1', 'data', 'hub-todos')
    expect(setDoc).toHaveBeenCalledWith('mock-doc-ref', { value: '["todo1"]' })
  })

  it('get은 올바른 경로로 getDoc을 호출한다', async () => {
    const { getDoc, doc } = await import('firebase/firestore')
    mockSnap.exists.mockReturnValue(false)
    await firestoreStorage.get('uid-2', 'hub-theme')
    expect(doc).toHaveBeenCalledWith({}, 'users', 'uid-2', 'data', 'hub-theme')
    expect(getDoc).toHaveBeenCalled()
  })
})
