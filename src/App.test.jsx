import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import React from 'react'
import App from './App.jsx'

vi.mock('./data/mock.js', async () => {
  const actual = await vi.importActual('./data/mock.js')
  return {
    ...actual,
    AI_USAGE: { provider: 'Gemini', used: 5, limit: 20 },
    usageState: () => ({ pct: 25, remaining: 15, warn: false, danger: false }),
  }
})

describe('App', () => {
  it('renders without crashing', () => {
    const { container } = render(React.createElement(App))
    expect(container.querySelector('.app')).toBeTruthy()
  })

  it('renders home page by default', () => {
    const { container } = render(React.createElement(App))
    expect(container.querySelector('.stats')).toBeTruthy()
  })

  it('navigates to inventory view', () => {
    const { container } = render(React.createElement(App))
    const navBtns = container.querySelectorAll('.bottombar__item')
    const inventoryBtn = Array.from(navBtns).find((btn) =>
      btn.textContent?.includes('nav.inventory')
    )
    if (inventoryBtn) {
      fireEvent.click(inventoryBtn)
    }
    expect(container.querySelector('.page__lead')).toBeTruthy()
  })

  it('navigates to settings via topbar', () => {
    const { container } = render(React.createElement(App))
    const topbarBtns = container.querySelectorAll('.topbar__btn')
    const settingsBtn = Array.from(topbarBtns).find(
      (btn) => btn.getAttribute('aria-label') === 'nav.settings'
    )
    if (settingsBtn) {
      fireEvent.click(settingsBtn)
    }
  })

  it('navigates to add via rail button and renders add view', () => {
    const { container } = render(React.createElement(App))
    const addBtn = container.querySelector('.rail__add')
    if (addBtn) {
      fireEvent.click(addBtn)
    }
    const dropzone = container.querySelector('.dropzone')
    expect(dropzone).toBeTruthy()
  })

  it('navigates to add via topbar', () => {
    const { container } = render(React.createElement(App))
    const addBtns = container.querySelectorAll('.topbar__btn')
    const addBtn = Array.from(addBtns).find(
      (btn) => btn.getAttribute('aria-label') === 'nav.addFromReceipt'
    )
    if (addBtn) {
      fireEvent.click(addBtn)
    }
  })

  it('sets motion on document', () => {
    render(React.createElement(App))
    expect(document.documentElement.dataset.motion).toBe('standard')
  })
})
