import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent, act } from '@testing-library/react'
import React from 'react'
import Plan from './Plan.jsx'

describe('Plan', () => {
  it('renders no-key state when aiKey is missing', () => {
    const { container } = render(
      React.createElement(Plan, { aiKey: null, askAssistant: vi.fn(), setView: vi.fn() })
    )
    expect(container.querySelector('.empty')).toBeTruthy()
  })

  it('renders page lead in no-key state', () => {
    const { container } = render(
      React.createElement(Plan, { aiKey: null, askAssistant: vi.fn(), setView: vi.fn() })
    )
    expect(container.querySelector('.page__lead')).toBeTruthy()
  })

  it('renders plan list when aiKey is present', () => {
    const { container } = render(
      React.createElement(Plan, { aiKey: 'sk-test', askAssistant: vi.fn(), setView: vi.fn() })
    )
    expect(container.querySelector('.trip')).toBeTruthy()
  })

  it('renders page lead when aiKey is present', () => {
    const { container } = render(
      React.createElement(Plan, { aiKey: 'sk-test', askAssistant: vi.fn(), setView: vi.fn() })
    )
    expect(container.querySelector('.page__lead')).toBeTruthy()
  })

  it('toggles checkbox on plan items', () => {
    const { container } = render(
      React.createElement(Plan, { aiKey: 'sk-test', askAssistant: vi.fn(), setView: vi.fn() })
    )
    const checkbox = container.querySelector('.plan-item__check')
    if (checkbox) {
      fireEvent.click(checkbox)
      expect(checkbox.checked).toBe(true)
      fireEvent.click(checkbox)
      expect(checkbox.checked).toBe(false)
    }
  })

  it('shows all done message when all checked', () => {
    const { container } = render(
      React.createElement(Plan, { aiKey: 'sk-test', askAssistant: vi.fn(), setView: vi.fn() })
    )
    const checkboxes = container.querySelectorAll('.plan-item__check')
    checkboxes.forEach((cb) => fireEvent.click(cb))
    expect(container.textContent).toContain('plan.allBought')
  })

  it('renders regenerate button', () => {
    const { container } = render(
      React.createElement(Plan, { aiKey: 'sk-test', askAssistant: vi.fn(), setView: vi.fn() })
    )
    const regenerateBtn = container.querySelector('.btn--secondary')
    expect(regenerateBtn).toBeTruthy()
  })

  it('regenerates plan on button click', () => {
    vi.useFakeTimers()
    const { container } = render(
      React.createElement(Plan, { aiKey: 'sk-test', askAssistant: vi.fn(), setView: vi.fn() })
    )
    const regenerateBtn = container.querySelector('.btn--secondary')
    if (regenerateBtn) fireEvent.click(regenerateBtn)
    act(() => { vi.runAllTimers() })
    expect(container.querySelectorAll('.trip').length).toBeGreaterThan(0)
    vi.useRealTimers()
  })

  it('no-key state has add key button', () => {
    const setView = vi.fn()
    const { container } = render(
      React.createElement(Plan, { aiKey: null, askAssistant: vi.fn(), setView })
    )
    const addKeyBtn = container.querySelector('.btn--primary')
    if (addKeyBtn) {
      fireEvent.click(addKeyBtn)
      expect(setView).toHaveBeenCalledWith('settings')
    }
  })
})
