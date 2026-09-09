# MRP e marketplace de fornecedores

Única spec funcional com itens realmente abertos. Auditada em 09/09/2026.

## Fase 1 — Cálculo de prazo de entrega: concluída

`CalculateOrderDeadline` estima a entrega da OS combinando:

- dias úteis, via `WorkDayCalculator` (`src/domain/services/`), respeitando os feriados cadastrados
- capacidade da oficina, pelo número de mecânicos configurado
- tempo estimado dos serviços, com média histórica vinda do cronômetro
- disponibilidade das peças, contando o que já está reservado para aquela OS e aplicando o prazo do fornecedor quando falta peça

Persiste `estimatedDelivery`, o total de dias e a justificativa do cálculo, e recalcula quando a OS muda ou quando entra estoque. Suporte no banco: `Supplier`, `StockItem.supplierId`, `StockItem.leadTimeDays`, `ScheduleConfig.defaultPartLeadDays`, `ScheduleConfig.mechanicCount` e `Holiday`.

Uma correção relevante entrou em 09/09: o cálculo tratava peça já reservada para a própria OS como falta de estoque, aplicando prazo de fornecedor sem necessidade e empurrando a entrega para frente sem motivo.

## Fase 2 — Busca em fornecedores: quase concluída

Existe: `SupplierSearchConfig` e `SupplierClick` no banco, `api/suppliers/search` com adapter do Mercado Livre, `api/suppliers/click` registrando os cliques e o componente `SupplierSearch`.

## O que falta

| # | Item | Esforço | Observação |
|---|------|---------|-----------|
| 1 | **Teste do `CalculateOrderDeadline`** | 2–3h | O `WorkDayCalculator` tem testes; o use case que combina dias úteis, capacidade, histórico e estoque não tem nenhum. É o cálculo com mais regras do sistema e o que já apresentou erro de contagem — justamente o tipo de código que precisa de teste. Prioridade sobre os demais itens desta spec. |
| 2 | **Painel de demanda por cliques** | 4–6h | Os cliques em peças de fornecedores são gravados em `SupplierClick`, mas nenhuma tela os lê. A informação existe e não é usada. Seria visão do administrador da plataforma, não da oficina: quais peças as oficinas mais procuram e não têm em estoque. Tem valor comercial — é dado de demanda agregada. |
| 3 | **Adapters adicionais de fornecedor** | 4h cada | Existe apenas o do Mercado Livre. A arquitetura prevê mais de um, com interface comum. Vale confirmar se a interface está de fato extraída antes de escrever o segundo adapter. |

## Sobre a Fase 3 da spec original

A spec descrevia como "futuro" duas coisas que já existem: média histórica de tempo pelo cronômetro e cadastro de feriados. Foram antecipadas durante a Fase 1. O que resta de Fase 3 é integração com API real de fornecedor, coberta pelo item 3 acima.

## Por que esta spec permanece ativa

É a única com trabalho pendente que agrega funcionalidade nova, em vez de corrigir dívida. O item 1 é o mais importante e o menos visível: o cálculo de prazo é o que a oficina promete ao cliente final, e errar prazo custa credibilidade com o cliente da oficina.
