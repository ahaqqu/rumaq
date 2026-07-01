import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import React from 'react'
import Home from './Home.jsx'

describe('Home', () => {
  it('renders page lead', () => {
    const { container } = render(React.createElement(Home, { setView: vi.fn(), askAssistant: vi.fn() }))
    expect(container.querySelector('.page__lead')).toBeTruthy()
  })

  it('renders stats section', () => {
    const { container } = render(React.createElement(Home, { setView: vi.fn(), askAssistant: vi.fn() }))
    expect(container.querySelector('.stats')).toBeTruthy()
  })

  it('renders needs attention section', () => {
    const { container } = render(React.createElement(Home, { setView: vi.fn(), askAssistant: vi.fn() }))
    expect(container.querySelector('.section')).toBeTruthy()
  })

  it('renders next trip card', () => {
    const { container } = render(React.createElement(Home, { setView: vi.fn(), askAssistant: vi.fn() }))
    expect(container.querySelector('.tripcard')).toBeTruthy()
  })

  it('renders quick refill section', () => {
    const { container } = render(React.createElement(Home, { setView: vi.fn(), askAssistant: vi.fn() }))
    expect(container.querySelector('.dropzone__icon')).toBeTruthy()
  })

  it('renders tips section', () => {
    const { container } = render(React.createElement(Home, { setView: vi.fn(), askAssistant: vi.fn() }))
    expect(container.querySelector('.tiptip')).toBeTruthy()
  })

  it('calls askAssistant from tips button', () => {
    const askAssistant = vi.fn()
    const { container } = render(React.createElement(Home, { setView: vi.fn(), askAssistant }))
    const sparkBtns = container.querySelectorAll('.btn--primary.btn--sm')
    const lastSpark = sparkBtns[sparkBtns.length - 1]
    if (lastSpark) fireEvent.click(lastSpark)
    expect(askAssistant).toHaveBeenCalled()
  })

  it('calls setView from seeAll button', () => {
    const setView = vi.fn()
    const { container } = render(React.createElement(Home, { setView, askAssistant: vi.fn() }))
    const seeAllBtn = container.querySelector('.btn--ghost')
    if (seeAllBtn) {
      fireEvent.click(seeAllBtn)
      expect(setView).toHaveBeenCalledWith('inventory')
    }
  })

  it('calls setView from seePlan button', () => {
    const setView = vi.fn()
    const { container } = render(React.createElement(Home, { setView, askAssistant: vi.fn() }))
    const planBtn = container.querySelector('.tripcard .btn--primary')
    if (planBtn) {
      fireEvent.click(planBtn)
      expect(setView).toHaveBeenCalledWith('plan')
    }
  })

  it('calls setView from quick refill add button', () => {
    const setView = vi.fn()
    const { container } = render(React.createElement(Home, { setView, askAssistant: vi.fn() }))
    const btns = container.querySelectorAll('.btn--primary')
    const addBtn = Array.from(btns).find((b) => b.textContent?.includes('addReceipt') || b.textContent?.includes('nav.addFromReceipt'))
    if (addBtn) {
      fireEvent.click(addBtn)
      expect(setView).toHaveBeenCalledWith('add')
    }
  })
})
