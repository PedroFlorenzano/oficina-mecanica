"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

interface TurnstileWidgetProps {
  /** Recebe o token gerado pela Cloudflare (ou "" quando expira/falha) */
  onToken: (token: string) => void;
  /** Recebe o código de erro da Cloudflare (ex.: "110200") para exibição/diagnóstico */
  onError?: (code: string) => void;
  /**
   * Incremente este número para pedir um token novo.
   * Cada token só pode ser validado uma vez pela Cloudflare, então o formulário
   * precisa resetar o widget depois de um envio que falhou.
   */
  resetKey?: number;
}

interface TurnstileApi {
  render: (
    el: HTMLElement,
    options: {
      sitekey: string;
      callback: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: (code?: string) => void;
      language?: string;
    }
  ) => string;
  reset: (widgetId?: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

/**
 * Captcha Cloudflare Turnstile — gratuito.
 * Não renderiza nada se NEXT_PUBLIC_TURNSTILE_SITE_KEY não estiver configurada,
 * então o formulário continua utilizável em dev/CI.
 */
export default function TurnstileWidget({ onToken, onError, resetKey = 0 }: TurnstileWidgetProps) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    if (!siteKey || !scriptReady || widgetIdRef.current !== null) return;
    const el = containerRef.current;
    if (!el || !window.turnstile) return;

    widgetIdRef.current = window.turnstile.render(el, {
      sitekey: siteKey,
      language: "pt-BR",
      callback: (token: string) => onToken(token),
      "expired-callback": () => onToken(""),
      "error-callback": (code?: string) => {
        onToken("");
        // Código da Cloudflare (110200 = domínio não autorizado, 110100/400020 = sitekey inválida)
        console.error("[Turnstile] erro", code ?? "desconhecido");
        onError?.(code ?? "desconhecido");
      },
    });
  }, [siteKey, scriptReady, onToken, onError]);

  // Token novo a pedido do formulário (após falha no envio)
  useEffect(() => {
    if (resetKey === 0 || widgetIdRef.current === null || !window.turnstile) return;
    onToken("");
    window.turnstile.reset(widgetIdRef.current);
  }, [resetKey, onToken]);

  if (!siteKey) return null;

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        onReady={() => setScriptReady(true)}
        strategy="afterInteractive"
      />
      <div ref={containerRef} aria-label="Verificação de segurança" />
    </>
  );
}
