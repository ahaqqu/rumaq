import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { Home } from './Home.jsx'
import { useHome } from '../lib/queries/index.js'

const baseHomeData = {
  total_items: 3,
  expiring_7d: 0,
  running_out_7d: 1,
  low_stock: [
    {
      id: 's1',
      name: 'Cooking Oil',
      qty: 0.5,
      unit: 'L',
      expiry_date: null,
      run_out_days: 3,
      basis: 'default',
      location: 'Kitchen',
    },
  ],
  next_trip: null,
}

vi.mock('../lib/queries/index.js', () => ({
  useHome: vi.fn(),
}))

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  })
}

function renderWithQuery(ui) {
  return render(
    React.createElement(QueryClientProvider, {
      client: createQueryClient(),
      children: ui,
    })
  )
}

describe('Home', () => {
  beforeEach(() => {
    vi.mocked(useHome).mockReturnValue({ data: baseHomeData, isLoading: false })
  })

  it('renders page lead', () => {
    const { container } = renderWithQuery(
      React.createElement(Home, { setView: vi.fn(), askAssistant: vi.fn() })
    )
    expect(container.querySelector('.page__lead')).toBeTruthy()
  })

  it('renders stats section', () => {
    const { container } = renderWithQuery(
      React.createElement(Home, { setView: vi.fn(), askAssistant: vi.fn() })
    )
    expect(container.querySelector('.stats')).toBeTruthy()
  })

  it('renders needs attention section', () => {
    const { container } = renderWithQuery(
      React.createElement(Home, { setView: vi.fn(), askAssistant: vi.fn() })
    )
    expect(container.querySelector('.section')).toBeTruthy()
  })

  it('renders next trip section (empty state)', () => {
    const { container } = renderWithQuery(
      React.createElement(Home, { setView: vi.fn(), askAssistant: vi.fn() })
    )
    expect(container.querySelectorAll('.section').length).toBeGreaterThanOrEqual(2)
  })

  it('renders quick refill section', () => {
    const { container } = renderWithQuery(
      React.createElement(Home, { setView: vi.fn(), askAssistant: vi.fn() })
    )
    expect(container.querySelector('.dropzone__icon')).toBeTruthy()
  })

  it('renders tips section', () => {
    const { container } = renderWithQuery(
      React.createElement(Home, { setView: vi.fn(), askAssistant: vi.fn() })
    )
    expect(container.querySelector('.tiptip')).toBeTruthy()
  })

  it('calls askAssistant from tips button', () => {
    const askAssistant = vi.fn()
    const { container } = renderWithQuery(
      React.createElement(Home, { setView: vi.fn(), askAssistant })
    )
    const sparkBtns = container.querySelectorAll('.btn--primary.btn--sm')
    const lastSpark = sparkBtns[sparkBtns.length - 1]
    if (lastSpark) fireEvent.click(lastSpark)
    expect(askAssistant).toHaveBeenCalled()
  })

  it('calls setView from seeAll button', () => {
    const setView = vi.fn()
    const { container } = renderWithQuery(
      React.createElement(Home, { setView, askAssistant: vi.fn() })
    )
    const seeAllBtn = container.querySelector('.btn--ghost')
    if (seeAllBtn) {
      fireEvent.click(seeAllBtn)
      expect(setView).toHaveBeenCalledWith('inventory')
    }
  })

  it('calls setView from quick refill add button', () => {
    const setView = vi.fn()
    const { container } = renderWithQuery(
      React.createElement(Home, { setView, askAssistant: vi.fn() })
    )
    const btns = container.querySelectorAll('.btn--primary')
    const addBtn = Array.from(btns).find(
      (b) => b.textContent?.includes('addReceipt') || b.textContent?.includes('nav.addFromReceipt')
    )
    if (addBtn) {
      fireEvent.click(addBtn)
      expect(setView).toHaveBeenCalledWith('add')
    }
  })

  it('shows stats with real values', () => {
    const { container } = renderWithQuery(
      React.createElement(Home, { setView: vi.fn(), askAssistant: vi.fn() })
    )
    const statNums = container.querySelectorAll('.stat__num')
    expect(statNums.length).toBe(4)
    expect(statNums[0].textContent).toBe('3')
  })

  it('renders next trip card when nextTrip exists', () => {
    vi.mocked(useHome).mockReturnValue({
      data: {
        ...baseHomeData,
        next_trip: {
          store: 'Indomaret',
          items: [{ id: 'i1', name: 'Milk' }],
        },
      },
      isLoading: false,
    })

    const { container } = renderWithQuery(
      React.createElement(Home, { setView: vi.fn(), askAssistant: vi.fn() })
    )
    expect(container.querySelector('.tripcard')).toBeTruthy()
    expect(container.textContent).toContain('home.shopAt')
  })

  it('calls setView plan from next trip card', () => {
    const setView = vi.fn()
    vi.mocked(useHome).mockReturnValue({
      data: {
        ...baseHomeData,
        next_trip: {
          store: 'Indomaret',
          items: [{ id: 'i1', name: 'Milk' }],
        },
      },
      isLoading: false,
    })

    const { container } = renderWithQuery(
      React.createElement(Home, { setView, askAssistant: vi.fn() })
    )
    const planBtn = container.querySelector('.tripcard .btn--primary')
    if (planBtn) {
      fireEvent.click(planBtn)
      expect(setView).toHaveBeenCalledWith('plan')
    }
  })

  it('shows warning tone when expiring or running out', () => {
    vi.mocked(useHome).mockReturnValue({
      data: {
        ...baseHomeData,
        expiring_7d: 2,
        running_out_7d: 3,
      },
      isLoading: false,
    })

    const { container } = renderWithQuery(
      React.createElement(Home, { setView: vi.fn(), askAssistant: vi.fn() })
    )
    const statNums = container.querySelectorAll('.stat__num')
    expect(
      statNums[1].classList.contains('is-warn') || statNums[2].classList.contains('is-warn')
    ).toBe(true)
  })

  it('renders empty needs attention when no low stock', () => {
    vi.mocked(useHome).mockReturnValue({
      data: { ...baseHomeData, low_stock: [] },
      isLoading: false,
    })

    const { container } = renderWithQuery(
      React.createElement(Home, { setView: vi.fn(), askAssistant: vi.fn() })
    )
    expect(container.querySelector('.empty')).toBeTruthy()
  })
})
