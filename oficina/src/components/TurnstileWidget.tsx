"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

interface TurnstileWidgetProps {
  /** Recebe o token gerado pela Cloudflare (ou "" quando expira) */
  onToken: (token: string) => void;
}

interface TurnstileApi {
  render: (
    el: HTMLElement,
    options: {
      sitekey: string;
      callback: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
      language?: string;
    }
  ) => string;
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
export default function TurnstileWidget({ onToken }: TurnstileWidgetProps) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const containerRef = useRef<HTMLDivElement>(null);
  const renderedRef = useRef(false);
  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    if (!siteKey || !scriptReady || renderedRef.current) return;
    const el = containerRef.current;
    if (!el || !window.turnstile) return;

    renderedRef.current = true;
    window.turnstile.render(el, {
      sitekey: siteKey,
      language: "pt-br",
      callback: (token: string) => onToken(token),
      "expired-callback": () => onToken(""),
      "error-callback": () => onToken(""),
    });
  }, [siteKey, scriptReady, onToken]);

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
