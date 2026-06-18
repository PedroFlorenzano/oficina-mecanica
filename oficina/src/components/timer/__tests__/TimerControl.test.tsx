/**
 * @jest-environment jsdom
 *
 * Component tests for TimerControl
 * Validates: Requirements 8.1, 8.3, 8.4, 8.6, 8.7
 */

import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ─── Mock next/navigation ──────────────────────────────────────────────────────
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
  usePathname: () => "/dashboard/orders/order-1",
}));

// ─── Mock lucide-react icons (avoid SVG issues in jsdom) ─────────────────────
jest.mock("lucide-react", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require("react");
  const icon = (name: string) =>
    // eslint-disable-next-line react/display-name
    ({ size, className }: { size?: number; className?: string }) =>
      React.createElement("span", { "data-testid": `icon-${name}`, className });
  return {
    Play: icon("play"),
    Pause: icon("pause"),
    RotateCcw: icon("rotate-ccw"),
    CheckSquare: icon("check-square"),
    Clock: icon("clock"),
    ChevronDown: icon("chevron-down"),
    ChevronUp: icon("chevron-up"),
    X: icon("x"),
    Loader2: icon("loader2"),
  };
});

// ─── Mock @/components/ui ─────────────────────────────────────────────────────
// Modal uses document.body manipulation; we mock it for test simplicity.
jest.mock("@/components/ui", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require("react");

  const Button = ({
    children,
    onClick,
    disabled,
    loading,
    icon,
    ...rest
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    loading?: boolean;
    icon?: React.ReactNode;
    [key: string]: unknown;
  }) =>
    React.createElement(
      "button",
      { onClick, disabled: disabled || loading, ...rest },
      children
    );
  Button.displayName = "Button";

  const Badge = ({
    children,
    variant,
  }: {
    children: React.ReactNode;
    variant?: string;
  }) =>
    React.createElement(
      "span",
      { "data-testid": "badge", "data-variant": variant },
      children
    );

  const Card = ({ children, className }: { children?: React.ReactNode; className?: string }) =>
    React.createElement("div", { "data-testid": "card", className }, children);

  const Modal = ({
    isOpen,
    children,
    title,
    onClose,
  }: {
    isOpen: boolean;
    children?: React.ReactNode;
    title?: string;
    onClose?: () => void;
  }) => {
    if (!isOpen) return null;
    return React.createElement(
      "div",
      { role: "dialog", "aria-label": title },
      React.createElement("h2", null, title),
      children
    );
  };

  return { Button, Badge, Card, Modal };
});

// ─── Import component under test ──────────────────────────────────────────────
import TimerControl from "@/components/timer/TimerControl";
import type { GetTimersByServiceResult, TimerLogData } from "@/components/timer/TimerControl";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeLog = (overrides: Partial<TimerLogData> = {}): TimerLogData => ({
  id: "log-1",
  startedAt: new Date("2025-01-01T10:00:00Z").toISOString(),
  pausedAt: null,
  finishedAt: null,
  pauseReason: null,
  totalSeconds: 0,
  orderServiceId: "svc-1",
  userId: "mech-1",
  createdAt: new Date("2025-01-01T10:00:00Z").toISOString(),
  ...overrides,
});

const noSessionResponse: GetTimersByServiceResult = {
  logs: [],
  netSeconds: 0,
  status: "sem sessão",
};

const activeLog = makeLog();
const activeResponse: GetTimersByServiceResult = {
  logs: [activeLog],
  netSeconds: 0,
  status: "ativa",
};

const defaultProps = {
  orderServiceId: "svc-1",
  userId: "mech-1",
  serviceDescription: "Troca de óleo",
};

/**
 * Set up global.fetch mock.
 * @param getResponse - what to return for GET requests
 * @param postResponse - what to return for POST/PATCH requests (optional)
 */
function mockFetch(
  getResponse: GetTimersByServiceResult,
  postResponse?: object,
  secondGetResponse?: GetTimersByServiceResult
) {
  let getCallCount = 0;
  (global.fetch as jest.Mock) = jest.fn((url: string, options?: RequestInit) => {
    const method = options?.method?.toUpperCase() ?? "GET";

    if (method === "GET") {
      getCallCount++;
      const responseData =
        secondGetResponse && getCallCount > 1 ? secondGetResponse : getResponse;
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(responseData),
      });
    }

    // POST / PATCH
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(postResponse ?? {}),
    });
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("TimerControl", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  // ── Requirement 8.1 + 8.3 ────────────────────────────────────────────────────
  describe("estado 'sem sessão' para MECHANIC", () => {
    it("exibe badge 'Sem sessão' e botão 'Iniciar' quando não há logs", async () => {
      mockFetch(noSessionResponse);

      render(<TimerControl {...defaultProps} userRole="MECHANIC" />);

      // Aguarda o fetch inicial
      await waitFor(() => {
        expect(screen.getByTestId("badge")).toBeInTheDocument();
      });

      expect(screen.getByTestId("badge")).toHaveTextContent("Sem sessão");
      expect(screen.getByRole("button", { name: /iniciar/i })).toBeInTheDocument();
    });
  });

  // ── Requirement 8.1 + 8.3 ────────────────────────────────────────────────────
  describe("estado 'ativa' para MECHANIC", () => {
    it("exibe badge 'Em andamento' e botão 'Pausar' com sessão ativa", async () => {
      mockFetch(activeResponse);

      render(<TimerControl {...defaultProps} userRole="MECHANIC" />);

      await waitFor(() => {
        expect(screen.getByTestId("badge")).toBeInTheDocument();
      });

      expect(screen.getByTestId("badge")).toHaveTextContent("Em andamento");
      expect(screen.getByRole("button", { name: /pausar/i })).toBeInTheDocument();
    });
  });

  // ── Requirement 8.6 ──────────────────────────────────────────────────────────
  describe("modal de motivo ao clicar 'Pausar'", () => {
    it("abre modal com título 'Motivo da Pausa' ao clicar em Pausar", async () => {
      mockFetch(activeResponse);

      render(<TimerControl {...defaultProps} userRole="MECHANIC" />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /pausar/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /pausar/i }));

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Motivo da Pausa")).toBeInTheDocument();
    });

    it("botão Confirmar fica desabilitado com menos de 3 chars", async () => {
      mockFetch(activeResponse);

      render(<TimerControl {...defaultProps} userRole="MECHANIC" />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /pausar/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /pausar/i }));

      // Modal está aberto — digitar menos de 3 chars
      const textarea = screen.getByRole("textbox");
      fireEvent.change(textarea, { target: { value: "ab" } });

      const confirmarBtn = screen.getByRole("button", { name: /confirmar/i });
      expect(confirmarBtn).toBeDisabled();
    });

    it("botão Confirmar fica habilitado com 3 ou mais chars", async () => {
      mockFetch(activeResponse);

      render(<TimerControl {...defaultProps} userRole="MECHANIC" />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /pausar/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /pausar/i }));

      const textarea = screen.getByRole("textbox");
      fireEvent.change(textarea, { target: { value: "abc" } });

      const confirmarBtn = screen.getByRole("button", { name: /confirmar/i });
      expect(confirmarBtn).not.toBeDisabled();
    });

    it("botão Confirmar permanece desabilitado com texto só de espaços (< 3 chars trimmed)", async () => {
      mockFetch(activeResponse);

      render(<TimerControl {...defaultProps} userRole="MECHANIC" />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /pausar/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /pausar/i }));

      const textarea = screen.getByRole("textbox");
      // 3 espaços → trim() = "" → length < 3
      fireEvent.change(textarea, { target: { value: "   " } });

      const confirmarBtn = screen.getByRole("button", { name: /confirmar/i });
      expect(confirmarBtn).toBeDisabled();
    });
  });

  // ── Requirement 8.4 ──────────────────────────────────────────────────────────
  describe("ATTENDANT não vê botões de ação", () => {
    it("não exibe botões de controle para ATTENDANT com sessão 'sem sessão'", async () => {
      mockFetch(noSessionResponse);

      render(<TimerControl {...defaultProps} userRole="ATTENDANT" />);

      await waitFor(() => {
        expect(screen.getByTestId("badge")).toBeInTheDocument();
      });

      expect(screen.queryByRole("button", { name: /iniciar/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /pausar/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /retomar/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /finalizar/i })).not.toBeInTheDocument();
    });

    it("não exibe botões de controle para ATTENDANT com sessão 'ativa'", async () => {
      mockFetch(activeResponse);

      render(<TimerControl {...defaultProps} userRole="ATTENDANT" />);

      await waitFor(() => {
        expect(screen.getByTestId("badge")).toBeInTheDocument();
      });

      expect(screen.queryByRole("button", { name: /iniciar/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /pausar/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /retomar/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /finalizar/i })).not.toBeInTheDocument();
    });
  });

  // ── Requirement 8.7 ──────────────────────────────────────────────────────────
  describe("atualiza estado local sem reload após ação bem-sucedida", () => {
    it("exibe 'Em andamento' após clicar Iniciar sem recarregar a página", async () => {
      // After start POST, re-fetch GET returns "ativa"
      mockFetch(noSessionResponse, { id: "log-new" }, activeResponse);

      render(<TimerControl {...defaultProps} userRole="MECHANIC" />);

      // Aguarda estado inicial "sem sessão"
      await waitFor(() => {
        expect(screen.getByTestId("badge")).toHaveTextContent("Sem sessão");
      });

      const iniciarBtn = screen.getByRole("button", { name: /iniciar/i });
      fireEvent.click(iniciarBtn);

      // Após a ação e re-fetch, deve exibir "Em andamento"
      await waitFor(() => {
        expect(screen.getByTestId("badge")).toHaveTextContent("Em andamento");
      });

      // Verifica que fetch foi chamado (POST + GET re-fetch)
      const fetchMock = global.fetch as jest.Mock;
      const calls = fetchMock.mock.calls;

      // Deve ter chamado POST /api/timer-logs
      const postCall = calls.find(
        (c: [string, RequestInit?]) =>
          (c[1]?.method?.toUpperCase() ?? "GET") === "POST"
      );
      expect(postCall).toBeDefined();
      expect(postCall[0]).toContain("timer-logs");
    });
  });
});
