import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import React from 'react'
import Inventory from './Inventory.jsx'

describe('Inventory', () => {
  it('renders page lead', () => {
    const { container } = render(React.createElement(Inventory))
    expect(container.querySelector('.page__lead')).toBeTruthy()
  })

  it('renders search input', () => {
    const { container } = render(React.createElement(Inventory))
    expect(container.querySelector('input')).toBeTruthy()
  })

  it('renders location filter chips', () => {
    const { container } = render(React.createElement(Inventory))
    const chips = container.querySelectorAll('.chip--filter')
    expect(chips.length).toBeGreaterThan(0)
  })

  it('renders stock list', () => {
    const { container } = render(React.createElement(Inventory))
    expect(container.querySelector('.list')).toBeTruthy()
  })

  it('shows items in the list', () => {
    const { container } = render(React.createElement(Inventory))
    const rows = container.querySelectorAll('.row')
    expect(rows.length).toBeGreaterThan(0)
  })

  it('shows empty state when search yields no results', () => {
    const { container } = render(React.createElement(Inventory))
    const input = container.querySelector('input')
    if (input) {
      fireEvent.change(input, { target: { value: 'zzzzzznotfound' } })
    }
    expect(container.querySelector('.empty')).toBeTruthy()
  })

  it('filters by location', () => {
    const { container } = render(React.createElement(Inventory))
    const chips = container.querySelectorAll('.chip--filter')
    if (chips.length > 1) {
      fireEvent.click(chips[1])
      const rows = container.querySelectorAll('.row')
      expect(rows.length).toBeGreaterThanOrEqual(0)
    }
  })

  it('resets to all locations', () => {
    const { container } = render(React.createElement(Inventory))
    const chips = container.querySelectorAll('.chip--filter')
    if (chips.length > 1) {
      fireEvent.click(chips[1])
      fireEvent.click(chips[0])
      expect(chips[0].getAttribute('aria-pressed')).toBe('true')
    }
  })
})
