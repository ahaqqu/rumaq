import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { History } from "./History.jsx";

vi.mock("../lib/queries/index.js", () => ({
  useHistory: () => ({
    isLoading: false,
    isError: false,
    isFetching: false,
    data: {
      purchases: [
        {
          id: "p1",
          store_id: "s1",
          store_label: "Indomaret",
          date: "2026-07-15",
          total: 65500,
          receipt_image_key: null,
          has_receipt: false,
          created_at: "2026-07-15T00:00:00Z",
          items: [
            {
              id: "pi1",
              item_id: "i1",
              name: "Milk",
              qty: 2,
              unit: "L",
              price: 18500,
            },
          ],
        },
        {
          id: "p2",
          store_id: null,
          store_label: null,
          date: "2026-06-20",
          total: 20000,
          receipt_image_key: "r2",
          has_receipt: true,
          created_at: "2026-06-20T00:00:00Z",
          items: [
            {
              id: "pi2",
              item_id: "i2",
              name: "Bread",
              qty: 1,
              unit: "pack",
              price: 20000,
            },
          ],
        },
      ],
      next_cursor: null,
      month_totals: [
        { month: "2026-07", count: 1, total: 65500 },
        { month: "2026-06", count: 1, total: 20000 },
      ],
      avg_per_month: 42750,
    },
  }),
  usePurchasePatterns: () => ({
    isLoading: false,
    isError: false,
    data: {
      patterns: [
        {
          item_id: "i1",
          name: "Milk",
          avg_interval_days: 7,
          avg_qty: 2,
          last_purchase_date: "2026-07-15",
          pattern: "every 7 days",
          purchase_count: 4,
        },
      ],
    },
  }),
  useStores: () => ({ data: { stores: [] }, isLoading: false }),
}));

vi.mock("../lib/api.js", () => ({
  getReceiptUrl: (id) => `/api/purchases/${id}/receipt`,
}));

function renderWithProviders(ui) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(React.createElement(QueryClientProvider, { client: queryClient }, ui));
}

describe("History", () => {
  it("renders page lead", () => {
    const { container } = renderWithProviders(
      React.createElement(History, { askAssistant: vi.fn() }),
    );
    expect(container.querySelector(".page__lead")).toBeTruthy();
  });

  it("renders table", () => {
    const { container } = renderWithProviders(
      React.createElement(History, { askAssistant: vi.fn() }),
    );
    expect(container.querySelector(".table")).toBeTruthy();
  });

  it("renders month groups", () => {
    const { container } = renderWithProviders(
      React.createElement(History, { askAssistant: vi.fn() }),
    );
    const rows = container.querySelectorAll("tbody tr");
    expect(rows.length).toBeGreaterThan(0);
  });

  it("renders month separators", () => {
    const { container } = renderWithProviders(
      React.createElement(History, { askAssistant: vi.fn() }),
    );
    const monthSep = container.querySelector(".month-sep");
    expect(monthSep).toBeTruthy();
  });

  it("renders patterns section", () => {
    const { container } = renderWithProviders(
      React.createElement(History, { askAssistant: vi.fn() }),
    );
    expect(container.textContent).toContain("Milk");
  });

  it("renders make plan button that calls askAssistant", () => {
    const askAssistant = vi.fn();
    const { container } = renderWithProviders(React.createElement(History, { askAssistant }));
    const sectionBtn = container.querySelector("section.section button.btn--ghost");
    expect(sectionBtn).toBeTruthy();
    fireEvent.click(sectionBtn);
    expect(askAssistant).toHaveBeenCalled();
  });
});
