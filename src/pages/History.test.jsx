import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import React from 'react'
import History from './History.jsx'

describe('History', () => {
  it('renders page lead', () => {
    const { container } = render(React.createElement(History, { askAssistant: vi.fn() }))
    expect(container.querySelector('.page__lead')).toBeTruthy()
  })

  it('renders table', () => {
    const { container } = render(React.createElement(History, { askAssistant: vi.fn() }))
    expect(container.querySelector('.table')).toBeTruthy()
  })

  it('renders month groups', () => {
    const { container } = render(React.createElement(History, { askAssistant: vi.fn() }))
    const rows = container.querySelectorAll('tbody tr')
    expect(rows.length).toBeGreaterThan(0)
  })

  it('renders month separators', () => {
    const { container } = render(React.createElement(History, { askAssistant: vi.fn() }))
    const monthSep = container.querySelector('.month-sep')
    expect(monthSep).toBeTruthy()
  })

  it('renders assistant prompt section', () => {
    const { container } = render(React.createElement(History, { askAssistant: vi.fn() }))
    expect(container.textContent).toContain('history.patternDetected')
  })
})
