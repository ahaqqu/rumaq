import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { AddFromReceipt } from "./AddFromReceipt.jsx";
import * as api from "../lib/api.js";

vi.mock("../lib/api.js", () => ({
  scanReceipt: vi.fn(),
  createPurchase: vi.fn(),
  getReceiptUrl: vi.fn(() => "/api/purchases/123/receipt"),
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
}));

const MOCK_STORES = { stores: [{ id: "s1", label: "Indomaret" }] };

function createFile(name, type, size) {
  const blob = new Blob(["x".repeat(size)], { type });
  return new File([blob], name, { type });
}

function selectFile(container, file) {
  const input = container.querySelector('input[data-testid="file-input"]');
  if (!input) throw new Error("File input not found");
  Object.defineProperty(input, "files", { value: [file] });
  fireEvent.change(input);
}

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn();
});

describe("AddFromReceipt", () => {
  it("renders capture phase by default", () => {
    const { container } = render(React.createElement(AddFromReceipt, { onDone: vi.fn() }));
    expect(container.querySelector(".dropzone")).toBeTruthy();
  });

  it("renders page lead", () => {
    const { container } = render(React.createElement(AddFromReceipt, { onDone: vi.fn() }));
    expect(container.querySelector(".page__lead")).toBeTruthy();
  });

  it("shows error for unsupported file type", async () => {
    const { container } = render(React.createElement(AddFromReceipt, { onDone: vi.fn() }));
    const file = createFile("test.gif", "image/gif", 100);
    selectFile(container, file);

    await waitFor(() => {
      expect(container.textContent).toContain("Unsupported file type");
    });
  });

  it("shows error for oversized file", async () => {
    const { container } = render(React.createElement(AddFromReceipt, { onDone: vi.fn() }));
    const file = createFile("test.jpg", "image/jpeg", 6 * 1024 * 1024);
    selectFile(container, file);

    await waitFor(() => {
      expect(container.textContent).toContain("File too large");
    });
  });

  it("transitions to scanning phase on valid file upload", async () => {
    const { container } = render(React.createElement(AddFromReceipt, { onDone: vi.fn() }));

    api.scanReceipt.mockResolvedValueOnce({
      items: [{ name: "Milk", qty: 1, unit: "L", price: 20000 }],
      imageKey: "key-123",
      imageUrl: null,
      storeGuess: null,
      dateGuess: null,
    });

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(MOCK_STORES),
    });

    const file = createFile("test.jpg", "image/jpeg", 1000);
    selectFile(container, file);

    await waitFor(() => {
      expect(container.textContent).toContain("addReceipt.scanningTitle");
    });
  });

  it("shows review phase after successful scan", async () => {
    const { container } = render(React.createElement(AddFromReceipt, { onDone: vi.fn() }));

    api.scanReceipt.mockResolvedValueOnce({
      items: [{ name: "Milk", qty: 1, unit: "L", price: 20000 }],
      imageKey: "key-123",
      imageUrl: null,
      storeGuess: null,
      dateGuess: null,
    });

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(MOCK_STORES),
    });

    const file = createFile("test.jpg", "image/jpeg", 1000);
    selectFile(container, file);

    await waitFor(() => {
      expect(container.querySelector(".parsed-row")).toBeTruthy();
    });
  });

  it("shows done state after confirm", async () => {
    const { container } = render(React.createElement(AddFromReceipt, { onDone: vi.fn() }));

    api.scanReceipt.mockResolvedValueOnce({
      items: [{ name: "Milk", qty: 1, unit: "L", price: 20000 }],
      imageKey: "key-123",
      imageUrl: null,
      storeGuess: null,
      dateGuess: null,
    });

    api.createPurchase.mockResolvedValueOnce({
      purchase: { id: "p1" },
      items: [],
      stock: [],
    });

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(MOCK_STORES),
    });

    const file = createFile("test.jpg", "image/jpeg", 1000);
    selectFile(container, file);

    await waitFor(() => {
      expect(container.querySelector(".parsed-row")).toBeTruthy();
    });

    const confirmBtn = container.querySelector(".btn--primary");
    if (confirmBtn) {
      fireEvent.click(confirmBtn);
    }

    await waitFor(() => {
      expect(container.textContent).toContain("addReceipt.stockAdded");
    });
  });

  it("shows error when scan fails", async () => {
    const { container } = render(React.createElement(AddFromReceipt, { onDone: vi.fn() }));

    api.scanReceipt.mockRejectedValueOnce(new Error("Scan failed"));

    const file = createFile("test.jpg", "image/jpeg", 1000);
    selectFile(container, file);

    await waitFor(() => {
      expect(container.textContent).toContain("Scan failed");
    });
  });
});
