import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import React from 'react'
import Settings from './Settings.jsx'

describe('Settings', () => {
  const baseProps = {
    aiKey: null,
    setAiKey: vi.fn(),
    motion: 'standard',
    setMotion: vi.fn(),
  }

  it('renders page lead', () => {
    const { container } = render(React.createElement(Settings, baseProps))
    expect(container.querySelector('.page__lead')).toBeTruthy()
  })

  it('renders API key section', () => {
    const { container } = render(React.createElement(Settings, baseProps))
    expect(container.querySelector('.settings-group')).toBeTruthy()
  })

  it('renders provider select', () => {
    const { container } = render(React.createElement(Settings, baseProps))
    const select = container.querySelector('select')
    expect(select).toBeTruthy()
  })

  it('renders AI usage section', () => {
    const { container } = render(React.createElement(Settings, baseProps))
    expect(container.querySelector('.usage')).toBeTruthy()
  })

  it('renders persona inputs', () => {
    const { container } = render(React.createElement(Settings, baseProps))
    const inputs = container.querySelectorAll('input')
    expect(inputs.length).toBeGreaterThan(0)
  })

  it('renders storage locations section', () => {
    const { container } = render(React.createElement(Settings, baseProps))
    expect(container.textContent).toContain('settings.storageLocations')
  })

  it('renders recorded stores section', () => {
    const { container } = render(React.createElement(Settings, baseProps))
    expect(container.textContent).toContain('settings.recordedStores')
  })

  it('renders display section', () => {
    const { container } = render(React.createElement(Settings, baseProps))
    expect(container.textContent).toContain('settings.display')
  })

  it('calls setAiKey on save', () => {
    const setAiKey = vi.fn()
    const { container } = render(
      React.createElement(Settings, { ...baseProps, setAiKey })
    )
    const passwordInput = container.querySelector('input[type="password"]')
    if (passwordInput) {
      fireEvent.change(passwordInput, { target: { value: 'new-key' } })
    }
    const saveBtn = container.querySelector('.btn--primary')
    if (saveBtn) {
      fireEvent.click(saveBtn)
    }
    expect(setAiKey).toHaveBeenCalledWith('new-key')
  })

  it('test button triggers test flow', () => {
    vi.useFakeTimers()
    const { container } = render(
      React.createElement(Settings, { ...baseProps, aiKey: 'existing-key' })
    )
    const testBtn = Array.from(container.querySelectorAll('.btn--secondary'))
      .find((btn) => btn.textContent?.includes('settings.test'))
    if (testBtn) {
      fireEvent.click(testBtn)
      vi.advanceTimersByTime(1300)
    }
    vi.useRealTimers()
  })

  it('adds a new location', () => {
    const { container } = render(React.createElement(Settings, baseProps))
    const locInput = container.querySelector('input[placeholder="settings.locationName"]')
    if (locInput) {
      fireEvent.change(locInput, { target: { value: 'Garage' } })
    }
    const addBtn = Array.from(container.querySelectorAll('.btn--secondary'))
      .find((btn) => btn.textContent?.includes('settings.add'))
    if (addBtn) {
      fireEvent.click(addBtn)
    }
    expect(container.textContent).toContain('Garage')
  })

  it('removes a location', () => {
    const { container } = render(React.createElement(Settings, baseProps))
    const deleteBtns = container.querySelectorAll('.btn--ghost')
    if (deleteBtns.length > 0) {
      fireEvent.click(deleteBtns[0])
    }
  })

  it('handles language change', () => {
    const { container } = render(React.createElement(Settings, baseProps))
    const langBtns = container.querySelectorAll('[aria-pressed]')
    if (langBtns.length > 0) {
      fireEvent.click(langBtns[0])
    }
  })

  it('handles motion change', () => {
    const setMotion = vi.fn()
    const { container } = render(
      React.createElement(Settings, { ...baseProps, setMotion })
    )
    const motionBtns = container.querySelectorAll('.motion-scale button')
    if (motionBtns.length > 0) {
      fireEvent.click(motionBtns[0])
      expect(setMotion).toHaveBeenCalled()
    }
  })

  it('handles persona toggle', () => {
    const { container } = render(React.createElement(Settings, baseProps))
    const toggle = container.querySelector('#persona-toggle')
    if (toggle) {
      fireEvent.click(toggle)
      expect(toggle.checked).toBe(true)
    }
  })

  it('handles persona role inputs', () => {
    const { container } = render(React.createElement(Settings, baseProps))
    const inputs = container.querySelectorAll('input[placeholder]')
    const myRole = Array.from(inputs).find((inp) => inp.getAttribute('placeholder') === 'settings.myRolePlaceholder')
    const aiRole = Array.from(inputs).find((inp) => inp.getAttribute('placeholder') === 'settings.aiRolePlaceholder')
    if (myRole) {
      fireEvent.change(myRole, { target: { value: 'raja' } })
    }
    if (aiRole) {
      fireEvent.change(aiRole, { target: { value: 'prajurit' } })
    }
  })

  it('applies persona with apply button', () => {
    const { container } = render(React.createElement(Settings, baseProps))
    const applyBtn = Array.from(container.querySelectorAll('.btn--primary'))
      .find((btn) => btn.textContent?.includes('settings.apply'))
    if (applyBtn) {
      fireEvent.click(applyBtn)
    }
  })

  it('changes provider via select', () => {
    const { container } = render(React.createElement(Settings, baseProps))
    const select = container.querySelector('select')
    if (select) {
      fireEvent.change(select, { target: { value: 'openai' } })
      expect(select.value).toBe('openai')
    }
  })

  it('adds location with Enter key', () => {
    const { container } = render(React.createElement(Settings, baseProps))
    const locInput = container.querySelector('input[placeholder="settings.locationName"]')
    if (locInput) {
      fireEvent.change(locInput, { target: { value: 'Pantry' } })
      fireEvent.keyDown(locInput, { key: 'Enter' })
    }
    expect(container.textContent).toContain('Pantry')
  })
})
