import { describe, expect, it } from 'vitest'
import axiosClient from '@/api/axiosClient'

describe('axiosClient smoke', () => {
  it('is defined and uses VITE_API_BASE_URL as baseURL', () => {
    expect(axiosClient).toBeDefined()
    expect(axiosClient.defaults.baseURL).toBe(import.meta.env.VITE_API_BASE_URL)
    expect(axiosClient.defaults.baseURL).toBe('http://localhost:test')
  })
})
