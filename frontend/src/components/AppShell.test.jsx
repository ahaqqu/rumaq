import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import React from 'react'
import AppShell from './AppShell.jsx'

vi.mock('../data/mock.js', async () => {
  const actual = await vi.importActual('../data/mock.js')
  return { ...actual, usageState: () => ({ pct: 85, remaining: 3, warn: true, danger: false }) }
})

describe('AppShell', () => {
  const baseProps = {
    view: 'home',
    setView: vi.fn(),
    title: 'Home',
    aiKey: 'sk-test',
    assistantOpen: false,
    setAssistantOpen: vi.fn(),
  }

  it('renders app shell', () => {
    const { container } = render(
      React.createElement(AppShell, baseProps, React.createElement('div', null, 'content'))
    )
    expect(container.querySelector('.app')).toBeTruthy()
  })

  it('renders rail navigation', () => {
    const { container } = render(
      React.createElement(AppShell, baseProps, React.createElement('div', null, 'content'))
    )
    expect(container.querySelector('.rail')).toBeTruthy()
  })

  it('renders children', () => {
    const { container } = render(
      React.createElement(AppShell, baseProps, React.createElement('div', { id: 'test-child' }))
    )
    expect(container.querySelector('#test-child')).toBeTruthy()
  })

  it('shows usage bar when aiKey is present', () => {
    const { container } = render(
      React.createElement(AppShell, baseProps, React.createElement('div', null, 'content'))
    )
    expect(container.querySelector('.rail__usage')).toBeTruthy()
  })

  it('hides usage bar when no aiKey', () => {
    const { container } = render(
      React.createElement(AppShell, { ...baseProps, aiKey: null },
        React.createElement('div', null, 'content'))
    )
    expect(container.querySelector('.rail__usage')).toBeFalsy()
  })

  it('renders bottom bar navigation', () => {
    const { container } = render(
      React.createElement(AppShell, baseProps, React.createElement('div', null, 'content'))
    )
    expect(container.querySelector('.bottombar')).toBeTruthy()
  })

  it('renders topbar with title', () => {
    const { container } = render(
      React.createElement(AppShell, baseProps, React.createElement('div', null, 'content'))
    )
    expect(container.querySelector('.topbar')).toBeTruthy()
  })
})
