import { describe, it, expect, beforeAll } from 'vitest'

describe('main entry', () => {
  beforeAll(() => {
    const root = document.createElement('div')
    root.id = 'root'
    document.body.appendChild(root)
  })

  it('renders App into #root', async () => {
    await import('./main.jsx')
    const rootEl = document.getElementById('root')
    expect(rootEl).toBeTruthy()
    await new Promise((r) => setTimeout(r, 100))
    expect(rootEl?.children.length).toBeGreaterThan(0)
  })
})
