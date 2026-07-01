import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent, act } from '@testing-library/react'
import React from 'react'
import AddFromReceipt from './AddFromReceipt.jsx'

describe('AddFromReceipt', () => {
  it('renders capture phase by default', () => {
    const { container } = render(React.createElement(AddFromReceipt, { onDone: vi.fn() }))
    expect(container.querySelector('.dropzone')).toBeTruthy()
  })

  it('renders page lead', () => {
    const { container } = render(React.createElement(AddFromReceipt, { onDone: vi.fn() }))
    expect(container.querySelector('.page__lead')).toBeTruthy()
  })

  it('transitions to scanning phase on capture click', () => {
    const { container } = render(React.createElement(AddFromReceipt, { onDone: vi.fn() }))
    const scanBtn = container.querySelector('.btn--primary')
    if (scanBtn) {
      fireEvent.click(scanBtn)
    }
    expect(container.textContent).toContain('addReceipt.scanningTitle')
  })

  it('shows review phase after timer', () => {
    vi.useFakeTimers()
    const { container } = render(React.createElement(AddFromReceipt, { onDone: vi.fn() }))
    const scanBtn = container.querySelector('.btn--primary')
    if (scanBtn) fireEvent.click(scanBtn)
    act(() => { vi.runAllTimers() })
    expect(container.querySelector('.parsed-row')).toBeTruthy()
    vi.useRealTimers()
  })

  it('allows editing item fields in review phase', () => {
    vi.useFakeTimers()
    const { container } = render(React.createElement(AddFromReceipt, { onDone: vi.fn() }))
    const scanBtn = container.querySelector('.btn--primary')
    if (scanBtn) fireEvent.click(scanBtn)
    act(() => { vi.runAllTimers() })
    const inputs = container.querySelectorAll('input')
    if (inputs.length > 0) {
      fireEvent.change(inputs[0], { target: { value: 'edited name' } })
      expect(inputs[0].value).toBe('edited name')
    }
    vi.useRealTimers()
  })

  it('shows done state after confirm', () => {
    vi.useFakeTimers()
    const { container } = render(React.createElement(AddFromReceipt, { onDone: vi.fn() }))
    const scanBtn = container.querySelector('.btn--primary')
    if (scanBtn) fireEvent.click(scanBtn)
    act(() => { vi.runAllTimers() })
    const confirmBtn = container.querySelector('.btn--primary')
    if (confirmBtn) fireEvent.click(confirmBtn)
    expect(container.textContent).toContain('addReceipt.stockAdded')
    vi.useRealTimers()
  })

  it('trigger scan with Enter key on dropzone', () => {
    const { container } = render(React.createElement(AddFromReceipt, { onDone: vi.fn() }))
    const dropzone = container.querySelector('.dropzone')
    if (dropzone) {
      fireEvent.keyDown(dropzone, { key: 'Enter' })
    }
    expect(container.textContent).toContain('addReceipt.scanningTitle')
  })
})
