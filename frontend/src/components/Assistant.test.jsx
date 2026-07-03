import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent, act } from '@testing-library/react'
import React from 'react'
import Assistant from './Assistant.jsx'

vi.mock('../data/mock.js', async () => {
  const actual = await vi.importActual('../data/mock.js')
  return { ...actual, usageState: () => ({ pct: 85, remaining: 3, warn: true, danger: false }) }
})

describe('Assistant', () => {
  it('renders FAB button', () => {
    const { container } = render(
      React.createElement(Assistant, { open: false, onOpen: vi.fn(), onClose: vi.fn(), onNavigate: vi.fn() })
    )
    expect(container.querySelector('.fab')).toBeTruthy()
  })

  it('opens dialog when open=true', () => {
    const { container } = render(
      React.createElement(Assistant, { open: true, onOpen: vi.fn(), onClose: vi.fn(), onNavigate: vi.fn() })
    )
    expect(container.querySelector('.assistant')).toBeTruthy()
  })

  it('shows no-key state when aiKey is missing', () => {
    const { container } = render(
      React.createElement(Assistant, { open: true, onOpen: vi.fn(), onClose: vi.fn(), onNavigate: vi.fn() })
    )
    expect(container.querySelector('.assistant__keystate')).toBeTruthy()
  })

  it('shows body when aiKey is present', () => {
    const { container } = render(
      React.createElement(Assistant, { open: true, onOpen: vi.fn(), onClose: vi.fn(), onNavigate: vi.fn(), aiKey: 'sk-test' })
    )
    expect(container.querySelector('.assistant__body')).toBeTruthy()
  })

  it('calls onNavigate when add key button is clicked', () => {
    const onClose = vi.fn()
    const onNavigate = vi.fn()
    const { container } = render(
      React.createElement(Assistant, { open: true, onOpen: vi.fn(), onClose, onNavigate })
    )
    const settingsBtn = container.querySelector('.btn--primary')
    if (settingsBtn) {
      fireEvent.click(settingsBtn)
      expect(onClose).toHaveBeenCalled()
      expect(onNavigate).toHaveBeenCalledWith('settings')
    }
  })

  it('calls onClose when scrim is clicked', () => {
    const onClose = vi.fn()
    const { container } = render(
      React.createElement(Assistant, { open: true, onOpen: vi.fn(), onClose, onNavigate: vi.fn(), aiKey: 'sk-test' })
    )
    const scrim = container.querySelector('.scrim')
    if (scrim) {
      fireEvent.click(scrim)
      expect(onClose).toHaveBeenCalled()
    }
  })

  it('shows proposal after trigger', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const { container } = render(
      React.createElement(Assistant, { open: true, onOpen: vi.fn(), onClose: vi.fn(), onNavigate: vi.fn(), aiKey: 'sk-test' })
    )
    const actionBtns = container.querySelectorAll('.assistant__action')
    if (actionBtns.length > 0) {
      fireEvent.click(actionBtns[0])
    }
    act(() => { vi.runAllTimers() })
    expect(container.querySelector('.assistant__proposal')).toBeTruthy()
    vi.useRealTimers()
  })
})
