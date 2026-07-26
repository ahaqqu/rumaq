import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppProvider } from "../context/AppContext.jsx";
import { AppShell } from "./AppShell.jsx";

vi.mock("../data/mock.js", async () => {
  const actual = await vi.importActual("../data/mock.js");
  return {
    ...actual,
    usageState: () => ({ pct: 85, remaining: 3, warn: true, danger: false }),
  };
});

vi.mock("../lib/queries/me.js", () => ({
  useMe: () => ({
    data: {
      user: { id: "u1", email: "a@b.com", name: "Alice", picture: null },
    },
    isLoading: false,
  }),
  useLogout: () => ({ mutate: vi.fn(), data: null }),
}));

function renderWithProviders(ui) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(AppProvider, null, ui),
    ),
  );
}

describe("AppShell", () => {
  it("renders app shell", () => {
    const { container } = renderWithProviders(
      React.createElement(AppShell, null, React.createElement("div", null, "content")),
    );
    expect(container.querySelector(".app")).toBeTruthy();
  });

  it("renders rail navigation", () => {
    const { container } = renderWithProviders(
      React.createElement(AppShell, null, React.createElement("div", null, "content")),
    );
    expect(container.querySelector(".rail")).toBeTruthy();
  });

  it("renders children", () => {
    const { container } = renderWithProviders(
      React.createElement(AppShell, null, React.createElement("div", { id: "test-child" })),
    );
    expect(container.querySelector("#test-child")).toBeTruthy();
  });

  it("renders bottom bar navigation", () => {
    const { container } = renderWithProviders(
      React.createElement(AppShell, null, React.createElement("div", null, "content")),
    );
    expect(container.querySelector(".bottombar")).toBeTruthy();
  });

  it("renders topbar", () => {
    const { container } = renderWithProviders(
      React.createElement(AppShell, null, React.createElement("div", null, "content")),
    );
    expect(container.querySelector(".topbar")).toBeTruthy();
  });
});
