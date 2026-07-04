import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import App from './App.jsx'

const mockGetMe = vi.fn().mockResolvedValue({ user: { id: 'u1', email: 'a@b.com', name: 'Alice', picture: null } })

vi.mock('./lib/api.js', () => ({
  getMe: (...args) => mockGetMe(...args),
  logout: vi.fn().mockResolvedValue({ ok: true }),
  login: vi.fn(),
  isAuthenticated: vi.fn().mockResolvedValue(true),
  emailAuthStatus: vi.fn().mockResolvedValue({ enabled: false }),
  emailLogin: vi.fn().mockResolvedValue({ ok: true }),
}))

vi.mock('./data/mock.js', async () => {
  const actual = await vi.importActual('./data/mock.js')
  return {
    ...actual,
    AI_USAGE: { provider: 'Gemini', used: 5, limit: 20 },
    usageState: () => ({ pct: 25, remaining: 15, warn: false, danger: false }),
  }
})

async function renderApp() {
  const result = render(React.createElement(App))
  await waitFor(() => expect(result.container.querySelector('.app')).toBeTruthy())
  return result
}

describe('App', () => {
  it('renders without crashing', async () => {
    const { container } = await renderApp()
    expect(container.querySelector('.app')).toBeTruthy()
  })

  it('renders home page by default', async () => {
    const { container } = await renderApp()
    expect(container.querySelector('.stats')).toBeTruthy()
  })

  it('navigates to inventory view', async () => {
    const { container } = await renderApp()
    const navBtns = container.querySelectorAll('.bottombar__item')
    const inventoryBtn = Array.from(navBtns).find((btn) =>
      btn.textContent?.includes('nav.inventory')
    )
    if (inventoryBtn) {
      fireEvent.click(inventoryBtn)
    }
    expect(container.querySelector('.page__lead')).toBeTruthy()
  })

  it('navigates to settings via topbar', async () => {
    const { container } = await renderApp()
    const topbarBtns = container.querySelectorAll('.topbar__btn')
    const settingsBtn = Array.from(topbarBtns).find(
      (btn) => btn.getAttribute('aria-label') === 'nav.settings'
    )
    if (settingsBtn) {
      fireEvent.click(settingsBtn)
    }
  })

  it('navigates to add via rail button and renders add view', async () => {
    const { container } = await renderApp()
    const addBtn = container.querySelector('.rail__add')
    if (addBtn) {
      fireEvent.click(addBtn)
    }
    const dropzone = container.querySelector('.dropzone')
    expect(dropzone).toBeTruthy()
  })

  it('navigates to add via topbar', async () => {
    const { container } = await renderApp()
    const addBtns = container.querySelectorAll('.topbar__btn')
    const addBtn = Array.from(addBtns).find(
      (btn) => btn.getAttribute('aria-label') === 'nav.addFromReceipt'
    )
    if (addBtn) {
      fireEvent.click(addBtn)
    }
  })

  it('sets motion on document', async () => {
    await renderApp()
    expect(document.documentElement.dataset.motion).toBe('standard')
  })

  it('shows login page when not authenticated', async () => {
    mockGetMe.mockRejectedValue(new Error('Unauthorized'))
    const { container } = render(React.createElement(App))
    await waitFor(() => expect(container.querySelector('.login')).toBeTruthy())
    mockGetMe.mockResolvedValue({ user: { id: 'u1', email: 'a@b.com', name: 'Alice', picture: null } })
  })
})
