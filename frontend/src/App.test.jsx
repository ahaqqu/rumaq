import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import React from "react";
import { App } from "./App.jsx";

const mockGetMe = vi.fn();

vi.mock("./lib/api.js", () => ({
  getMe: (...args) => mockGetMe(...args),
  getSettings: vi.fn().mockResolvedValue({
    motion_preference: "standard",
    language: null,
    ai_provider: null,
    persona_user_role: null,
    persona_ai_role: null,
    persona_enabled: false,
    has_ai_key: false,
  }),
  getAiUsage: vi.fn().mockResolvedValue({
    used: 0,
    daily_limit: 20,
    provider: null,
  }),
  getPlans: vi.fn().mockResolvedValue({ plans: [] }),
  getPurchases: vi.fn().mockResolvedValue({
    purchases: [],
    next_cursor: null,
    month_totals: [],
    avg_per_month: 0,
  }),
  getPurchasePatterns: vi.fn().mockResolvedValue({ patterns: [] }),
  getStores: vi.fn().mockResolvedValue({ stores: [] }),
  patchSettings: vi.fn().mockResolvedValue({}),
  logout: vi.fn().mockResolvedValue({ ok: true }),
  login: vi.fn(),
  isAuthenticated: vi.fn().mockResolvedValue(true),
  emailAuthStatus: vi.fn().mockResolvedValue({ enabled: false }),
  emailLogin: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock("./data/mock.js", async () => {
  const actual = await vi.importActual("./data/mock.js");
  return {
    ...actual,
    AI_USAGE: { provider: "Gemini", used: 5, limit: 20 },
    usageState: () => ({ pct: 25, remaining: 15, warn: false, danger: false }),
  };
});

describe("App", () => {
  beforeEach(() => {
    mockGetMe.mockResolvedValue({
      user: { id: "u1", email: "a@b.com", name: "Alice", picture: null },
    });
  });

  it("renders without crashing", async () => {
    const { container } = render(React.createElement(App));
    await waitFor(() => expect(container.querySelector(".app")).toBeTruthy());
    expect(container.querySelector(".app")).toBeTruthy();
  });

  it("sets motion on document", async () => {
    render(React.createElement(App));
    await waitFor(() => expect(document.documentElement.dataset.motion).toBe("standard"));
  });
});
