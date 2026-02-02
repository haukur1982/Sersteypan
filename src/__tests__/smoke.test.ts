import { describe, it, expect } from 'vitest'

describe('Smoke Tests', () => {
  it('testing framework works', () => {
    expect(true).toBe(true)
  })

  it('can perform basic math', () => {
    expect(1 + 1).toBe(2)
  })

  it('can work with strings', () => {
    expect('Sérsteypan'.toLowerCase()).toBe('sérsteypan')
  })

  it('can work with arrays', () => {
    const statuses = ['planned', 'rebar', 'cast', 'curing', 'ready', 'loaded', 'delivered']
    expect(statuses).toHaveLength(7)
    expect(statuses).toContain('ready')
  })

  it('can work with objects', () => {
    const element = {
      id: '123',
      name: 'Wall-A1',
      status: 'ready',
    }
    expect(element).toHaveProperty('id')
    expect(element.status).toBe('ready')
  })
})
