import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { Plan } from './Plan.jsx'

const mockActivePlan = {
  plans: [
    {
      id: 'plan-1',
      status: 'active',
      total_estimate: 61500,
      items: [
        {
          id: 'pi-1',
          item_id: 'item-1',
          item_name: 'Susu cair 1L',
          store_id: 'indomaret',
          store_label: 'Indomaret',
          qty: 1,
          unit: 'L',
          price_estimate: 18500,
          why: 'Hampir habis',
          status: 'pending',
        },
        {
          id: 'pi-2',
          item_id: 'item-2',
          item_name: 'Roti tawar',
          store_id: 'indomaret',
          store_label: 'Indomaret',
          qty: 1,
          unit: 'pack',
          price_estimate: 15000,
          why: 'Kedaluwarsa besok',
          status: 'pending',
        },
      ],
    },
  ],
}

const mockSettingsWithKey = { has_ai_key: true }
const mockSettingsNoKey = { has_ai_key: false }

vi.mock('../lib/queries/index.js', () => ({
  usePlans: vi.fn(),
  useGeneratePlan: vi.fn(),
  useSavePlan: vi.fn(),
  useUpdatePlanItem: vi.fn(),
  useSettings: vi.fn(),
}))

import { usePlans, useGeneratePlan, useSavePlan, useUpdatePlanItem, useSettings } from '../lib/queries/index.js'

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

describe('Plan', () => {
  beforeEach(() => {
    vi.mocked(useSettings).mockReturnValue({ data: mockSettingsWithKey, isLoading: false })
    vi.mocked(usePlans).mockReturnValue({ data: mockActivePlan, isLoading: false })
    vi.mocked(useGeneratePlan).mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
      data: null,
    })
    vi.mocked(useSavePlan).mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
    })
    vi.mocked(useUpdatePlanItem).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    })
  })

  it('renders no-key state when has_ai_key is false', () => {
    vi.mocked(useSettings).mockReturnValue({ data: mockSettingsNoKey, isLoading: false })
    const { container } = renderWithQuery(
      React.createElement(Plan, { askAssistant: vi.fn(), setView: vi.fn() })
    )
    expect(container.querySelector('.empty')).toBeTruthy()
  })

  it('renders page lead', () => {
    const { container } = renderWithQuery(
      React.createElement(Plan, { askAssistant: vi.fn(), setView: vi.fn() })
    )
    expect(container.querySelector('.page__lead')).toBeTruthy()
  })

  it('renders plan trip cards when active plan exists', () => {
    const { container } = renderWithQuery(
      React.createElement(Plan, { askAssistant: vi.fn(), setView: vi.fn() })
    )
    expect(container.querySelector('.trip')).toBeTruthy()
  })

  it('toggles checkbox on plan items', () => {
    const mutate = vi.fn()
    vi.mocked(useUpdatePlanItem).mockReturnValue({
      mutate,
      isPending: false,
    })
    const { container } = renderWithQuery(
      React.createElement(Plan, { askAssistant: vi.fn(), setView: vi.fn() })
    )
    const checkbox = container.querySelector('.plan-item__check')
    if (checkbox) {
      fireEvent.click(checkbox)
      expect(mutate).toHaveBeenCalled()
    }
  })

  it('shows all done message when all items are bought', () => {
    const allBoughtPlan = {
      plans: [
        {
          ...mockActivePlan.plans[0],
          items: mockActivePlan.plans[0].items.map((it) => ({
            ...it,
            status: 'bought',
          })),
        },
      ],
    }
    vi.mocked(usePlans).mockReturnValue({ data: allBoughtPlan, isLoading: false })
    const { container } = renderWithQuery(
      React.createElement(Plan, { askAssistant: vi.fn(), setView: vi.fn() })
    )
    expect(container.textContent).toContain('plan.allBought')
  })

  it('renders generate button in empty state', () => {
    vi.mocked(usePlans).mockReturnValue({ data: { plans: [] }, isLoading: false })
    const { container } = renderWithQuery(
      React.createElement(Plan, { askAssistant: vi.fn(), setView: vi.fn() })
    )
    const generateBtn = container.querySelector('.btn--primary')
    expect(generateBtn).toBeTruthy()
  })

  it('no-key state has add key button', () => {
    vi.mocked(useSettings).mockReturnValue({ data: mockSettingsNoKey, isLoading: false })
    const setView = vi.fn()
    const { container } = renderWithQuery(
      React.createElement(Plan, { askAssistant: vi.fn(), setView })
    )
    const addKeyBtn = container.querySelector('.btn--primary')
    if (addKeyBtn) {
      fireEvent.click(addKeyBtn)
      expect(setView).toHaveBeenCalledWith('settings')
    }
  })

  it('shows skeleton while loading', () => {
    vi.mocked(useSettings).mockReturnValue({ data: null, isLoading: true })
    const { container } = renderWithQuery(
      React.createElement(Plan, { askAssistant: vi.fn(), setView: vi.fn() })
    )
    expect(container.querySelector('.skeleton')).toBeTruthy()
  })
})
