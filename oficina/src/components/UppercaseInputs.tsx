"use client";

import { useEffect } from "react";

/**
 * Interceptor central de MAIÚSCULAS.
 *
 * Por que central e não em cada formulário:
 * são ~40 formulários no dashboard; alterar todos seria repetitivo, propenso a
 * esquecimento e difícil de manter. Em vez disso, um único listener em fase de
 * captura no <body> observa o evento `input` de todos os <input>/<textarea> de
 * texto e converte o valor para maiúsculas, usando o setter nativo do elemento
 * para que o React reconheça a mudança (setar `.value` direto não dispara o
 * onChange controlado).
 *
 * Limitação conhecida: por atuar no evento de input após a digitação, o cursor
 * é reposicionado no fim do campo ao editar no meio do texto (comportamento
 * aceitável para o caso de uso), e valores preenchidos programaticamente (sem
 * evento de input) não são convertidos. Campos de senha, e-mail, os marcados
 * com `data-no-uppercase` e qualquer coisa dentro de um formulário de login
 * são ignorados.
 */
export default function UppercaseInputs({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return;

    function shouldConvert(el: HTMLElement): el is HTMLInputElement | HTMLTextAreaElement {
      const tag = el.tagName;
      if (tag !== "INPUT" && tag !== "TEXTAREA") return false;

      // Exceções explícitas
      if (el.closest("[data-no-uppercase]")) return false;
      if (el.hasAttribute("data-no-uppercase")) return false;
      if (el.closest("form[data-login-form], form#login, .login-form")) return false;

      if (tag === "INPUT") {
        const input = el as HTMLInputElement;
        const type = (input.getAttribute("type") || "text").toLowerCase();
        // Só campos de texto digitável; nunca senha nem e-mail
        const textLike = ["text", "search", "tel", "url"];
        if (!textLike.includes(type)) return false;
      }
      return true;
    }

    function handler(event: Event) {
      const target = event.target as HTMLElement | null;
      if (!target || !shouldConvert(target)) return;

      const el = target;
      const upper = el.value.toUpperCase();
      if (upper === el.value) return;

      // Usa o setter nativo para que o React perceba a alteração do valor.
      const proto =
        el.tagName === "TEXTAREA"
          ? window.HTMLTextAreaElement.prototype
          : window.HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;

      const start = el.selectionStart;
      const end = el.selectionEnd;

      if (setter) {
        setter.call(el, upper);
      } else {
        el.value = upper;
      }

      // Restaura a seleção quando possível (evita pulo de cursor em texto simples).
      try {
        if (start !== null && end !== null) {
          el.setSelectionRange(start, end);
        }
      } catch {
        // alguns tipos de input não suportam setSelectionRange — ignorar
      }

      // Dispara um novo evento de input para o React atualizar o estado controlado.
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }

    // Fase de captura: pega o evento antes de propagar aos handlers do React.
    document.body.addEventListener("input", handler, true);
    return () => document.body.removeEventListener("input", handler, true);
  }, [enabled]);

  return null;
}
