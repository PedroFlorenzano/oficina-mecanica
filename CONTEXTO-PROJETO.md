# Contexto do Projeto — Sistema Oficina Mecânica

> **⚠️ Este arquivo existe em DOIS locais e ambos devem ser atualizados sempre:**
> - `C:\Desenvolvimento\ProjetoOficina\CONTEXTO-PROJETO.md` (raiz)
> - `C:\Desenvolvimento\ProjetoOficina\oficina\CONTEXTO-PROJETO.md` (dentro do app)
>
> Ao alterar um, copiar para o outro.

## Resumo

Sistema SaaS de gestão para oficinas mecânicas automotivas brasileiras.
Piloto na **Paiffer Bosch Car Service Peugeot** (Sorocaba/SP), substituindo o sistema legado Syscar.
Objetivo final: atender inúmeras oficinas via assinatura mensal.

**Repositório:** https://github.com/PedroFlorenzano/oficina-mecanica
**Branch principal:** main
**Branch de desenvolvimento atual:** feature/autenticacao-perfis
**Última atualização:** 24/05/2026

---

## Stack Tecnológica

- **Frontend:** Next.js 16 (App Router) + TypeScript 5 + Tailwind CSS 4
- **Backend:** API Routes do Next.js (thin controllers)
- **ORM:** Prisma 6
- **Banco:** SQLite (dev) — preparado para migrar para PostgreSQL (prod)
- **Auth:** NextAuth v4 + CredentialsProvider + JWT sessions
- **Hash de senhas:** bcryptjs (salt rounds: 10)
- **PDF:** @react-pdf/renderer (server-side)
- **UI:** Design System próprio (src/components/ui/)
- **Arquitetura:** DDD (Domain-Driven Design) + Clean Architecture

---

## Arquitetura do Código

```
oficina/src/
├── types/
│   └── next-auth.d.ts        # Module augmentation: userId, tenantId, role na Session e JWT
├── domain/                    # Regras de negócio puras (sem deps de framework)
│   ├── errors/               # DomainError, ValidationError, NotFoundError, ConflictError,
│   │                         # BusinessRuleError, AuthenticationError, ForbiddenError
│   ├── value-objects/        # CPF, CNPJ, Document, Money, Plate, Email, PasswordValidator,
│   │                         # OrderStatusTransitions
│   └── repositories/        # Interfaces: IClientRepository, IVehicleRepository,
│                             # IServiceOrderRepository, IStockItemRepository,
│                             # IStockMovementRepository, IUserRepository,
│                             # IServiceCatalogRepository, ITimerLogRepository,
│                             # ICommissionRepository
│                             # IWhatsAppRepository, IFiscalRepository
├── application/              # Casos de uso + DTOs
│   ├── dtos/                # CreateClientDTO, CreateOrderDTO, CreateVehicleDTO,
│   │                         # CreateStockItemDTO, CreateServiceDTO, RegisterStockEntryDTO,
│   │                         # AdjustInventoryDTO, CreateUserDTO, UpdateUserDTO, ChangePasswordDTO,
│   │                         # StartTimerDTO, PauseTimerDTO, ResumeTimerDTO, FinishTimerDTO, CorrectTimerDTO,
│   │                         # GenerateCommissionDTO, CancelCommissionDTO
│   ├── errors/              # ApplicationError
│   └── use-cases/           # Organizados por módulo:
│       ├── clients/         # CreateClient, UpdateClient, SearchClients, DeleteClient,
│       │                     # ActivateClient, GetClientHistory
│       ├── vehicles/        # CreateVehicle, UpdateVehicle, DeleteVehicle,
│       │                     # GetVehicleHistory, CheckOilChangeReminder
│       ├── orders/          # CreateOrder, UpdateOrderStatus, UpdatePistaStatus,
│       │                     # GetPista, CancelOrder, GenerateOrderPDF
│       ├── stock/           # CreateStockItem, UpdateStockItem, DeleteStockItem,
│       │                     # ReserveStock, ConfirmStockConsumption, ReverseStockReservations,
│       │                     # RegisterStockEntry, AdjustInventory, GetLowStockAlerts
│       ├── services/        # CreateService, UpdateService, DeleteService
│       └── users/           # LoginUser, CreateUser, UpdateUser, DeactivateUser,
│                             # ActivateUser, ChangePassword
│       └── timer/           # StartTimer, PauseTimer, ResumeTimer, FinishTimer,
│                             # CorrectTimer, GetTimersByService, GetTimersByOrder
│       └── commissions/     # GenerateCommission, ListCommissions, GetCommissionDetail,
│                             # ApproveCommission, PayCommission, CancelCommission,
│                             # GetMechanicCommissionSummary
│       └── whatsapp/        # SendApprovalLink, SendDeliveryNotification,
│                             # SendMaintenanceReminder, GetMessageLogs
│       └── fiscal/          # IssueFiscalInvoice, CancelFiscalInvoice,
│                             # GetInvoicesByOrder, RetryInvoice
├── infrastructure/           # Implementações concretas
│   ├── database/prisma.ts   # Singleton Prisma
│   ├── repositories/        # PrismaClientRepository, PrismaVehicleRepository,
│   │                         # PrismaServiceOrderRepository, PrismaStockItemRepository,
│   │                         # PrismaStockMovementRepository, PrismaUserRepository,
│   │                         # PrismaServiceCatalogRepository, PrismaTimerLogRepository,
│   │                         # PrismaCommissionRepository
│   │                         # PrismaWhatsAppRepository, PrismaFiscalRepository
│   └── container.ts         # DI container (clientRepository, vehicleRepository,
│                             # orderRepository, stockItemRepository, stockMovementRepository,
│                             # userRepository, serviceCatalogRepository, timerLogRepository,
│                             # commissionRepository, whatsAppRepository, fiscalRepository)
├── middleware.ts              # withAuth — protege /dashboard/* e /api/* (exceto /api/auth/* e /api/public/*)
├── app/                      # Next.js App Router
│   ├── api/
│   │   ├── auth/[...nextauth]/  # NextAuth handler + authOptions exportado
│   │   ├── clients/         # GET, POST, [id]/GET/PUT/PATCH/DELETE, [id]/history
│   │   ├── vehicles/        # GET, POST, [id]/GET/PUT/DELETE, [id]/history, [id]/oil-reminder
│   │   ├── orders/          # GET, POST, [id]/GET/PATCH, [id]/pdf, [id]/oil-label,
│   │   │                     # [id]/invoice/GET/POST, [id]/signatures,
│   │   │                     # pista/GET/PATCH, [id]/timers/GET (GetTimersByOrder)
│   │   ├── order-services/  # [id]/timers/GET (GetTimersByService)
│   │   ├── timer-logs/      # POST (StartTimer), [id]/pause/PATCH, [id]/resume/POST,
│   │   │                     # [id]/finish/PATCH, [id]/PATCH (CorrectTimer - ADMIN)
│   │   ├── commissions/     # GET (list), POST (generate), summary/GET,
│   │   │                     # [id]/GET, [id]/approve/PATCH, [id]/pay/PATCH, [id]/cancel/PATCH
│   │   ├── whatsapp/        # config/GET/PUT, send/POST, logs/GET
│   │   ├── fiscal/          # config/GET/PUT, invoices/GET, invoices/[id]/PATCH
│   │   ├── public/          # sign/[token]/GET/POST (rota pública sem auth)
│   │   ├── reports/         # GET (resumo financeiro com filtro por período)
│   │   ├── dashboard/       # summary/GET (cards + últimas OS)
│   │   ├── stock/           # GET, POST, [id]/GET/PUT/DELETE, [id]/entry, [id]/adjust,
│   │   │                     # [id]/movements, alerts
│   │   ├── services/        # GET, POST, [id]/PUT/DELETE
│   │   └── users/           # GET, POST, [id]/PUT/PATCH, me/password/PATCH,
│   │                         # [id]/productivity/GET, [id]/commissions/GET
│   ├── login/               # Tela de login (Server Component + LoginForm client)
│   └── dashboard/
│       ├── layout.tsx       # Server Component com getServerSession, header autenticado
│       ├── clients/         # Listagem, form, [id]/history
│       ├── vehicles/        # Listagem, form, [id]/history
│       ├── orders/          # Listagem, new/, [id]/
│       ├── pista/           # Kanban com drag-and-drop
│       ├── stock/           # Listagem, form, [id]/ (detalhe + histórico de movimentos)
│       ├── services/        # Listagem, form
│       ├── users/           # CRUD de usuários (só ADMIN), [id]/ produtividade mecânico
│       ├── commissions/     # Listagem, new/, [id]/ (detalhe + ações)
│       ├── reports/         # Relatórios financeiros com filtro por período
│       ├── whatsapp/        # Configuração WhatsApp Business (ADMIN)
│       ├── fiscal/          # Configuração fiscal, invoices/ (listagem NF-e/NFS-e)
│       └── profile/         # Troca de senha do usuário logado
├── sign/                     # Página pública /sign/[token] — assinatura mobile-first
├── components/
│   ├── Sidebar.tsx          # Navegação condicional por role (prop `role`)
│   ├── LoginForm.tsx        # Formulário de login (client component)
│   ├── LogoutButton.tsx     # Botão de logout com signOut
│   ├── OilLabel.tsx         # Etiqueta de troca de óleo (preview + impressão 80mm×110mm)
│   ├── pdf/OSDocument.tsx   # Template PDF da OS com @react-pdf/renderer
│   ├── timer/
│   │   └── TimerControl.tsx # Componente client-side de cronômetro (ticker, modal pausa,
│   │                         # correção admin inline HH:MM:SS, histórico por sessão)
│   └── ui/                  # Design System
└── lib/
    ├── api-handler.ts       # Mapper DomainError → HTTP (inclui 401/403)
    ├── auth.ts              # authOptions + requireAuth() helper
    ├── permissions.ts       # hasPermission(role, resource, permission) — matriz RBAC
    ├── prisma.ts            # Re-export para compatibilidade
    └── validators.ts        # Zod legacy
```

---

## Módulos Implementados

| # | Módulo | Status | O que está pronto |
|---|--------|--------|-------------------|
| 1 | Gestão de Clientes e Veículos | ✅ 100% | CRUD completo, soft-delete + reativação, histórico de OS por cliente/veículo, lembrete de troca de óleo (toggle por veículo), busca por placa |
| 2 | Autenticação e Perfis de Acesso | ✅ 100% | Login/logout, NextAuth JWT, middleware de proteção, bloqueio após 5 tentativas, 3 roles (ADMIN/ATTENDANT/MECHANIC), gerenciamento de usuários, troca de senha |
| 3 | Multi-Tenancy | 🟡 20% | tenantId em todos os dados, estrutura pronta — isolamento real depende de PostgreSQL em produção |
| 4 | Ordem de Serviço (OS) | ✅ 100% | Criação com Reclamações, status padrão WAITING_APPROVAL, cancelamento com motivo, PDF completo, integração estoque (reserva/consumo/reversão), Kanban Pista |
| 5 | Controle de Estoque | ✅ 100% | CRUD itens, entrada com custo médio ponderado, histórico paginado de movimentos, alertas de mínimo (badge Sidebar + painel), ajuste físico (ADJUSTMENT), log imutável |
| 6 | Emissão de NF-e/NFS-e | 🟡 70% | Infra pronta: schema, use cases, API routes, UI config + listagem + botão na OS. Falta: integração SEFAZ/Prefeitura + BullMQ |
| 7 | Integração WhatsApp + Assinatura | ✅ 100% | Envio real via Evolution API, webhook de status (DELIVERED/READ), notificação automática ao mover OS na Pista, lembrete preventivo automático (cron), assinatura digital mobile-first |
| 8 | Assinatura Digital | ✅ 100% | Incluído no módulo 7 — página pública /sign/[token] mobile-first com Canvas touch + mudança automática de status (APPROVAL→IN_PROGRESS, DELIVERY→DELIVERED) |
| 9 | Gestão de Comissões | ✅ 100% | Comissão por mecânico sobre valor bruto dos serviços, percentual configurável (commissionRate), geração por período, fluxo PENDING→APPROVED→PAID (ou CANCELLED), 7 use cases, 7 API routes, 3 páginas UI, 31 testes unitários |
| 10 | Etiqueta de Troca de Óleo | ✅ 100% | Botão em toda OS, preview visual, impressão popup otimizada (80mm×110mm, 1 página), dados: oficina, telefone, veículo, placa, KM, próxima troca (KM+10000, data+6meses) |
| 11 | Cronômetro de Serviço | ✅ 100% | Model TimerLog + TimerAuditLog, use cases completos, property-based tests, API routes, componente TimerControl na tela de OS |

---

## Schema Prisma — Estado Atual

### Modelos e campos relevantes

```
Tenant: id, name, cnpj, logo, phone, address, active
User: id, email, password (bcrypt), name, role (ADMIN/MECHANIC/ATTENDANT),
      active, tenantId, failedLoginCount (Int @default(0)), lockedUntil (DateTime?),
      commissionRate (Float @default(0))
Client: id, name, document, docType (CPF/CNPJ), phone, email, address, active (bool), tenantId
Vehicle: id, plate, brand, model, year, yearModel, color, fuel, chassis, mileage,
         oilReminderEnabled (bool @default(true)), clientId, tenantId
ServiceOrder: id, number, status (OPEN→WAITING_APPROVAL→...→DELIVERED/CANCELLED),
              mileage, notes, cancelReason (String?), totalAmount, clientId, vehicleId,
              tenantId, createdById
Complaint: id, number, description, orderId
OrderService: id, description, price, timeMinutes (Int?), serviceId, orderId,
              complaintId, mechanicId
OrderPart: id, description, quantity, unitPrice, totalPrice, stockItemId, orderId,
           complaintId, used (bool)
StockItem: id, code, barcode, description, brand, unit, minQuantity, quantity,
           location, costPrice, sellPrice, avgCost, profitMargin, active, tenantId
StockMovement: id, type (IN/OUT/RESERVED/CONSUMPTION/REVERSAL/ADJUSTMENT),
               quantity, reason, document, orderId, balanceBefore, balanceAfter,
               stockItemId, createdAt  ← IMUTÁVEL (sem update/delete)
StatusHistory: id, fromStatus, toStatus, userId, orderId
TimerLog: id, startedAt, pausedAt, finishedAt, pauseReason, totalSeconds,
          orderServiceId, userId, auditLogs TimerAuditLog[]
TimerAuditLog: id, timerLogId, adminUserId, previousTotalSeconds, newTotalSeconds, changedAt
ServiceCatalog: id, code, description, category, estimatedTime, defaultPrice, pricingType, active
Commission: id, mechanicId, tenantId, startDate, endDate, commissionRate (snapshot),
            totalBase, totalCommission, status (PENDING/APPROVED/PAID/CANCELLED),
            approvedAt, approvedById, paidAt, paidById, cancelledAt, cancelledById, cancelReason
CommissionItem: id, commissionId, orderServiceId, baseValue, commissionValue
WhatsAppConfig: id, tenantId (unique), phoneNumberId, accessToken, businessName, enabled
WhatsAppMessage: id, tenantId, orderId, type, to, content, status, externalId, error, sentAt
Signature: id, orderId, type (APPROVAL/DELIVERY), imageData, signerName, token (unique), expiresAt, signedAt
FiscalConfig: id, tenantId (unique), enabled, environment, certificateBase64, cnpj, IE, IM,
             razaoSocial, nfeSeries, nfseSeries, nextNfeNumber, nextNfseNumber, cityCode
FiscalInvoice: id, tenantId, orderId, type (NFE/NFSE), status, number, series, accessKey,
              protocolNumber, xmlContent, pdfUrl, totalAmount, issueDate, cancelDate, cancelReason, retryCount
FiscalInvoiceItem: id, invoiceId, description, quantity, unitPrice, totalPrice, cfop, ncm, serviceCode
```

### Enums
- `Role`: ADMIN, MECHANIC, ATTENDANT
- `DocType`: CPF, CNPJ
- `OrderStatus`: OPEN, IN_PROGRESS, WAITING_PART, WAITING_APPROVAL, COMPLETED, DELIVERED, CANCELLED
- `MovementType`: IN, OUT, RESERVED, CONSUMPTION, REVERSAL, ADJUSTMENT
- `CommissionStatus`: PENDING, APPROVED, PAID, CANCELLED
- `WhatsAppMessageStatus`: PENDING, SENT, DELIVERED, READ, FAILED
- `WhatsAppMessageType`: APPROVAL_LINK, DELIVERY_NOTIFICATION, MAINTENANCE_REMINDER
- `SignatureType`: APPROVAL, DELIVERY
- `FiscalInvoiceType`: NFE, NFSE
- `FiscalInvoiceStatus`: PENDING, PROCESSING, AUTHORIZED, REJECTED, CANCELLED, ERROR

---

## Autenticação — Como Funciona

```
Fluxo: /login → LoginForm → signIn("credentials") → NextAuth → LoginUser use case
       → bcrypt.compare → JWT { userId, tenantId, role } → cookie → middleware valida
```

- **Sessão:** JWT (não database), maxAge 24h, `NEXTAUTH_SECRET` em `.env`
- **requireAuth():** em `src/lib/auth.ts` — todas as API routes chamam isso no topo
- **Bloqueio:** 5 tentativas falhas → lockedUntil = agora + 15min
- **Roles e o que cada um acessa:**
  - `ADMIN` — tudo, incluindo `/dashboard/users`
  - `ATTENDANT` — clientes, veículos, OS, estoque (r), fiscal, WhatsApp, etiquetas
  - `MECHANIC` — OS (r), estoque (r), cronômetros (r/w), etiquetas (r/w)

---

## Fluxo de Estoque na OS

```
Adicionar peça à OS  → ReserveStock      (MovementType.RESERVED, saldo -= qty)
Concluir OS          → ConfirmStockConsumption (CONSUMPTION p/ used=true, REVERSAL p/ used=false)
Cancelar OS          → ReverseStockReservations (REVERSAL, saldo += qty)
Ajuste físico        → AdjustInventory   (ADJUSTMENT, saldo = newQuantity)
Entrada de estoque   → RegisterStockEntry (IN, recalcula avgCost = CMP)
```

**Fórmula CMP:** `novo = (saldo × avgCostAtual + qtd × unitCost) / (saldo + qtd)`

---

## Estrutura da OS (Inovação vs Syscar)

A OS usa o conceito de **Reclamações do Cliente** (complaints):
- Cada OS tem N reclamações (ex: "Barulho na suspensão", "Troca de óleo")
- Dentro de cada reclamação ficam os Serviços e Peças relacionados
- Subtotal por reclamação + Total geral
- **Status padrão de criação:** `WAITING_APPROVAL` (cliente precisa aprovar o orçamento)

**Fluxo de status:** OPEN → IN_PROGRESS → WAITING_PART | WAITING_APPROVAL → COMPLETED → DELIVERED (ou CANCELLED)

---

## Design System (src/components/ui/)

Componentes prontos:
- `Button` — 5 variantes (primary, secondary, outline, ghost, danger), 3 tamanhos, loading
- `Input` — label, erro, hint, readonly, suporta `type="password"`
- `Select` — label, erro, chevron customizado
- `Badge` — 7 cores (default, success, warning, error, info, purple, orange)
- `Card` / `CardHeader` / `CardTitle`
- `Modal` — 4 tamanhos (sm, md, lg, xl), Escape, backdrop, scroll lock
- `Table` / `TableHeader` / `TableHead` / `TableBody` / `TableRow` / `TableCell`
- `PageHeader` — título + descrição + slot ação
- `EmptyState` — ícone + título + descrição + ação
- `Combobox` — busca, navegação por teclado, close on blur

---

## Decisões de Negócio Tomadas

1. **WhatsApp** — infra de código pronta; integração real via **Evolution API** (https://evolution.chatwoot.app.br/). Conta já disponível no Evolution Manager.
2. **Lembrete de manutenção preventiva** — o sistema registra a última troca de óleo/revisão; quando passar 6 meses ou +10.000 km, o futuro módulo de WhatsApp disparará mensagem automática. Toggle por veículo (`oilReminderEnabled`).
3. **Plataforma** — Web-first (responsivo desktop + tablet)
4. **Assinatura Digital** — Implementada junto com WhatsApp: link público mobile-first para o cliente assinar no celular. Ao assinar aprovação, OS muda para OPEN (Aguardando Início). Ao assinar entrega, OS muda para DELIVERED.
5. **Catálogo de Serviços** — Pré-cadastrado, permite criação inline na OS
6. **Múltiplos mecânicos por OS** — Suportado (por serviço via `mechanicId`)
7. **Billing/Inadimplência** — Recebido via webhook externo
8. **Multi-tenancy** — Dados isolados por `tenantId`; em dev usa `demo-tenant`; isolamento real com schema por tenant no PostgreSQL (produção)
9. **Comissões** — Calculadas sobre valor bruto, aprovação do admin antes do pagamento
10. **Estoque** — Saldo negativo bloqueado, custo médio ponderado, log imutável (sem UPDATE/DELETE em StockMovement)
11. **NF-e/NFS-e** — Máx 3 retries automáticas via BullMQ, depois notificação ao admin
12. **Senha** — Mínimo 8 chars, maiúscula, minúscula, dígito (validado em PasswordValidator + frontend)
13. **Status padrão da OS** — `WAITING_APPROVAL` (cliente aprova antes de executar)

---

## Próximos Módulos (sequência recomendada)

| Ordem | Módulo | Dependências |
|-------|--------|-------------|
| 1 | ✅ Estoque completo | — |
| 2 | ✅ Autenticação | — |
| 3 | Cronômetro de Serviço | Auth (vincular ao mecânico logado) |
| 4 | Gestão de Comissões | Auth + Cronômetro |
| 5 | Assinatura Digital | — (independente) |
| 6 | Etiqueta de Troca de Óleo | — (independente, ZPL/Zebra) |
| 7 | NF-e/NFS-e + WhatsApp + lembrete preventivo | Auth, BullMQ/Redis |

---

## Como Rodar

```bash
cd oficina
npm install
npx prisma migrate dev
npx prisma generate
npm run dev
# http://localhost:3000
```

## Dados de Demo (seed + demo-seed)

- **Tenant:** Paiffer Bosch Car Service (id: `demo-tenant`)
- **Admin:** `admin@paiffer.com` / `password123` (role: ADMIN)
- **Mecânico:** `mecanico@paiffer.com` / `password123` (role: MECHANIC)
- **Clientes:** 6 (incluindo 1 inativo — "Auto Peças Ltda" para testar reativação)
- **Veículos:** 6 (incluindo 1 com lembrete de óleo desligado — Toyota Corolla JKL4G56)
- **Ordens de Serviço:** 10 com todos os status (WAITING_APPROVAL, IN_PROGRESS, WAITING_PART, COMPLETED, DELIVERED, CANCELLED)
- **Estoque:** 8 itens (3 abaixo do mínimo para testar alertas)
- **Movimentações:** 17 registros (IN, OUT, ADJUSTMENT)

Para recriar dados demo após reset:
```bash
npx tsx prisma/seed.ts
```

---

## Referência do Sistema Legado (Syscar)

- OS impressa com: Cabeçalho oficina, Cliente completo, Veículo (KM-E/KM-S), Problemas/Avarias, Produtos (Cód/Marca/Qtd/Und/Desc/Unit/Total), Serviços (Cód/Qtd tempo/Desc/Unit/Total), Totais separados (Produtos + Serviços + Geral), Observações da oficina, Assinatura digital
- Pista: Cards Kanban com nº OS, status colorido, modelo+placa, cliente, mecânico, data, total
- Cadastro Produto: Código, Descrição, Aplicação, Localização, SKU, Barras, Marca, Unidade, Grupo, Observações, NCM, CEST, Estoque, Custo/Margem/Venda

---

*Última atualização: 24/05/2026 — Módulo WhatsApp 100%: webhook de status, lembrete preventivo automático, notificação ao mover OS na Pista.*

---

## Módulo 11 — Cronômetro de Serviço (implementado em 22/05/2026)

### O que foi construído

Rastreamento de tempo efetivo por mecânico em cada `OrderService` de uma OS. Múltiplas sessões de pausa/retomada por serviço, com cálculo de tempo líquido, atualização automática de `OrderService.timeMinutes` e log de auditoria para correções administrativas.

### Schema adicionado

```prisma
// Relação adicionada ao TimerLog existente:
model TimerLog {
  auditLogs  TimerAuditLog[]
}

// Novo model:
model TimerAuditLog {
  id                   String   @id @default(cuid())
  timerLogId           String
  adminUserId          String
  previousTotalSeconds Int
  newTotalSeconds      Int
  changedAt            DateTime @default(now())
  timerLog  TimerLog @relation(...)
}
```

### Estados do TimerLog

```
[*] → Ativa (start) → Pausada (pause) → Ativa (resume, cria novo TimerLog)
Ativa → Finalizada (finish)
Finalizada → Finalizada (admin correction, atualiza totalSeconds + auditoria)
```

- **Sessão Ativa:** `finishedAt IS NULL AND pausedAt IS NULL`
- **Sessão Pausada:** `pausedAt IS NOT NULL AND finishedAt IS NULL`
- **Sessão Finalizada:** `finishedAt IS NOT NULL`
- **Tempo líquido:** soma de `totalSeconds` das sessões finalizadas do serviço
- **Resume cria novo TimerLog** — o pausado fica consolidado com `totalSeconds` calculado

### Cálculo de tempo

- **Pausa:** `totalSeconds = floor((pausedAt - startedAt) / 1000)`
- **Finalização ativa:** `totalSeconds = timerLog.totalSeconds + floor((finishedAt - startedAt) / 1000)`
- **Finalização pausada:** `totalSeconds = timerLog.totalSeconds` (já calculado ao pausar)
- **timeMinutes:** `floor(sum(totalSeconds de sessões finalizadas) / 60)` gravado em `OrderService.timeMinutes`

### API Routes

| Rota | Método | Ação | Role |
|------|--------|------|------|
| `/api/timer-logs` | POST | StartTimer | MECHANIC |
| `/api/timer-logs/[id]/pause` | PATCH | PauseTimer | MECHANIC |
| `/api/timer-logs/[id]/resume` | POST | ResumeTimer | MECHANIC |
| `/api/timer-logs/[id]/finish` | PATCH | FinishTimer | MECHANIC |
| `/api/timer-logs/[id]` | PATCH | CorrectTimer | ADMIN |
| `/api/order-services/[id]/timers` | GET | GetTimersByService | todos |
| `/api/orders/[id]/timers` | GET | GetTimersByOrder | todos |

### Isolamento multi-tenant

`TimerLog` não tem `tenantId`. Isolamento via join: `TimerLog → OrderService → ServiceOrder.tenantId`. Método `findByIdForTenant(id, tenantId)` no repositório faz esse join automaticamente.

### Componente TimerControl

`src/components/timer/TimerControl.tsx` — client component integrado à tela `/dashboard/orders/[id]`:

- Busca estado via `GET /api/order-services/[id]/timers` ao montar
- Ticker `setInterval` (1s) incrementa display enquanto status é "ativa"
- `displaySeconds` = `netSeconds + elapsed atual` (ativa) | `netSeconds + pausedLog.totalSeconds` (pausada)
- **MECHANIC:** botões Iniciar / Pausar+Finalizar (ativo) / Retomar+Finalizar (pausado)
- **Pausa:** modal com campo de texto 3–255 chars, botão Confirmar desabilitado abaixo do mínimo
- **ADMIN/ATTENDANT:** somente visualização — sem botões de controle
- **Erro:** exibe mensagem + botão "Atualizar estado" (re-fetch sem esconder botões permanentemente)
- **Correção admin:** botão ✏️ em sessões finalizadas abre input HH:MM:SS inline
- Histório de sessões colapsável com início, fim/pausa, motivo e duração

### Testes

- **86 testes unitários** — guards, fluxo feliz, cenários de erro (StartTimer, PauseTimer, ResumeTimer, FinishTimer, CorrectTimer, GetTimersByService, GetTimersByOrder)
- **7 propriedades fast-check (100 runs cada):**
  - Property 1: `totalSeconds >= 0` para toda sessão finalizada
  - Property 2+8: `timeMinutes = floor(sum / 60)`
  - Property 3: cálculo sem pausas = `floor(delta / 1000)`
  - Property 4: soma de intervalos de pausa/retomada = `totalSeconds` acumulado
  - Property 5: unicidade de sessão ativa por `(orderServiceId, userId)`
  - Property 6: `pauseReason` armazenado igual ao informado (trim)
  - Property 7: `newTotalSeconds` fora de `[0, 86400]` rejeita com `ValidationError`
- **9 testes de componente** React Testing Library (TimerControl)

---

## Tela de Produtividade por Mecânico (implementado em 22/05/2026)

**Acesso:** `ADMIN` → Usuários → ícone 📊 em qualquer não-ADMIN → `/dashboard/users/[id]`

**API:** `GET /api/users/[id]/productivity` — retorna user + lista de serviços com apontamento

**O que exibe:**
- Cards de resumo: serviços com apontamento, tempo total apontado, tempo total estimado
- Tabela: OS# (link clicável), cliente, veículo/placa, nome do serviço, status da OS, tempo estimado, tempo apontado
- Código de cores no tempo apontado: verde (≤ estimado), amarelo (até 20% acima), vermelho (acima de 20%)

**Obs:** conta apenas sessões com `finishedAt IS NOT NULL`.

---

## Dashboard (renovado em 22/05/2026)

- Reescrito de server component estático para client component com fetch real
- Cards clicáveis com `Link` para o módulo correspondente + seta + hover animado
- Skeleton de loading animado enquanto dados carregam
- Dados reais via `GET /api/dashboard/summary`: conta clientes ativos, veículos, OS em aberto (não terminais), itens de estoque ativos
- Tabela das últimas 8 OS com: número, cliente, veículo+placa, status colorido, total R$, data, link "Abrir →"

---

## Módulo 9 — Gestão de Comissões (implementado em 22/05/2026)

### O que foi construído

Cálculo, aprovação e pagamento de comissões de mecânicos com base nos serviços executados em OSs concluídas. Percentual configurável por mecânico, geração por período, fluxo de aprovação pelo ADMIN.

### Schema adicionado

```prisma
// Alteração em User:
commissionRate  Float @default(0)  // 0–100

// Novos models:
model Commission {
  id, mechanicId, tenantId, startDate, endDate, commissionRate (snapshot),
  totalBase, totalCommission, status (PENDING/APPROVED/PAID/CANCELLED),
  approvedAt, approvedById, paidAt, paidById, cancelledAt, cancelledById, cancelReason
}

model CommissionItem {
  id, commissionId, orderServiceId, baseValue, commissionValue
}

enum CommissionStatus { PENDING, APPROVED, PAID, CANCELLED }
```

### Regras de Negócio

- **Cálculo:** `commissionValue = OrderService.price × commissionRate / 100`
- **Elegibilidade:** OS em status COMPLETED ou DELIVERED, serviço com mechanicId = mecânico, não incluído em outra comissão ativa
- **Sobreposição:** Não permite gerar comissão se já existe PENDING/APPROVED no mesmo período para o mesmo mecânico
- **Cancelamento:** Libera serviços para futuras comissões; comissões PAID não podem ser canceladas
- **Snapshot:** O `commissionRate` é gravado na Commission no momento da geração (alterações futuras não afetam comissões passadas)

### Máquina de Estados

```
PENDING → APPROVED (ApproveCommission, ADMIN)
PENDING → CANCELLED (CancelCommission, ADMIN, com motivo)
APPROVED → PAID (PayCommission, ADMIN)
APPROVED → CANCELLED (CancelCommission, ADMIN, com motivo)
PAID → (terminal)
CANCELLED → (terminal)
```

### API Routes

| Rota | Método | Ação | Role |
|------|--------|------|------|
| `/api/commissions` | GET | ListCommissions | ADMIN, MECHANIC |
| `/api/commissions` | POST | GenerateCommission | ADMIN |
| `/api/commissions/summary` | GET | GetMechanicCommissionSummary | ADMIN, MECHANIC |
| `/api/commissions/[id]` | GET | GetCommissionDetail | ADMIN, MECHANIC (dono) |
| `/api/commissions/[id]/approve` | PATCH | ApproveCommission | ADMIN |
| `/api/commissions/[id]/pay` | PATCH | PayCommission | ADMIN |
| `/api/commissions/[id]/cancel` | PATCH | CancelCommission | ADMIN |

### Páginas UI

- `/dashboard/commissions` — Listagem com cards de resumo, filtro por status, tabela com ações
- `/dashboard/commissions/new` — Formulário de geração (select mecânico + período)
- `/dashboard/commissions/[id]` — Detalhe com itens e botões de ação por status

### Testes

- **31 testes unitários** cobrindo todos os 7 use cases (fluxo feliz + cenários de erro)

*Última atualização: 22/05/2026 — Módulo 9 (Gestão de Comissões) implementado.*

---

## Módulo 7+8 — WhatsApp Business + Assinatura Digital (infra pronta em 22/05/2026)

### O que está pronto

Toda a infra de código: schema, repositório, use cases, API routes, UI de configuração, botões na OS e página pública de assinatura mobile-first.

### Fluxo planejado

```
OS criada (WAITING_APPROVAL) → ADMIN clica "Enviar Aprovação" → sistema gera token + mensagem
→ WhatsApp Business API envia link ao cliente → cliente abre /sign/[token] no celular
→ assina com o dedo → POST /api/public/sign/[token] → OS muda para IN_PROGRESS

OS concluída (COMPLETED) → ADMIN clica "Notificar Entrega" → link de confirmação
→ cliente assina → OS muda para DELIVERED
```

### API Routes

| Rota | Método | Ação | Auth |
|------|--------|------|------|
| `/api/whatsapp/config` | GET/PUT | Configuração | ADMIN |
| `/api/whatsapp/send` | POST | Enviar mensagem (approval/delivery/reminder) | Autenticado |
| `/api/whatsapp/logs` | GET | Histórico de mensagens | Autenticado |
| `/api/whatsapp/webhook` | POST | Receber status da Evolution API | Público |
| `/api/whatsapp/reminders` | GET | Disparar lembretes preventivos (cron) | CRON_SECRET |
| `/api/public/sign/[token]` | GET | Dados da OS para assinatura | Público |
| `/api/public/sign/[token]` | POST | Registrar assinatura | Público |

### O que falta para 100%

- ~~Ao assinar, mudar status da OS automaticamente~~ ✅ (23/05/2026)
- ~~Integrar com Evolution API para envio real de mensagens~~ ✅ (23/05/2026)
- ~~Webhook para receber status de entrega da mensagem (DELIVERED/READ)~~ ✅ (24/05/2026)
- ~~Lembrete preventivo automático (cron/scheduler para verificar veículos com troca vencida)~~ ✅ (24/05/2026)
- ~~Notificação automática ao mover OS na Pista~~ ✅ (24/05/2026)

### Notificação automática de status (implementado em 24/05/2026)

Toda vez que uma OS é movida na tela Pista (Kanban), o cliente recebe automaticamente uma mensagem no WhatsApp com o novo status.

- **Use case:** `SendStatusNotification` (`src/application/use-cases/whatsapp/SendStatusNotification.ts`)
- **Integração:** fire-and-forget na rota `PATCH /api/orders/pista` — não bloqueia resposta nem falha se WhatsApp der erro
- **Mensagem:** inclui nome do cliente, nº da OS, veículo/placa e status em pt-BR
- **Silencioso:** se o cliente não tiver telefone cadastrado, ignora sem erro

### Webhook de status (implementado em 24/05/2026)

Recebe atualizações de status de entrega da Evolution API e atualiza o registro da mensagem no banco.

- **Rota:** `POST /api/whatsapp/webhook` (pública, sem auth)
- **Mapeamento:** `DELIVERY_ACK` → DELIVERED, `READ/PLAYED` → READ, `SERVER_ACK` → SENT, `ERROR/FAILED` → FAILED
- **Busca:** localiza mensagem pelo `externalId` (messageId retornado pela Evolution ao enviar)
- **Método adicionado:** `findByExternalId(externalId)` no `IWhatsAppRepository`

### Lembrete preventivo automático (implementado em 24/05/2026)

Scheduler que verifica veículos com troca de óleo vencida e envia lembrete via WhatsApp.

- **Use case:** `SendOilChangeReminders` (`src/application/use-cases/whatsapp/SendOilChangeReminders.ts`)
- **Rota:** `GET /api/whatsapp/reminders` (pública, protegida por `CRON_SECRET`)
- **Critérios de alerta:** KM atual ≥ última troca + 4.000 km OU tempo > 6 meses desde última troca
- **Requisitos:** veículo com `oilReminderEnabled=true`, cliente com telefone, WhatsApp habilitado no tenant
- **Retorno:** `{ sent: N, skipped: N }`

### Configuração

**Webhook da Evolution API:**
- Na Evolution API, configure o webhook apontando para: `https://seu-dominio/api/whatsapp/webhook`
- Eventos: `messages.update` (status de entrega)

**Cron de lembretes preventivos:**
- Adicionar `CRON_SECRET=sua-chave-secreta` no `.env`
- Configurar scheduler externo (Vercel Cron, crontab, etc.) para chamar diariamente:
  ```
  GET https://seu-dominio/api/whatsapp/reminders?secret=sua-chave-secreta
  ```
  Ou via header: `Authorization: Bearer sua-chave-secreta`

### Integração WhatsApp — Evolution API

**Plataforma:** Evolution API v2 (https://evolution.chatwoot.app.br/)
- **URL da instância:** `https://cunningram-evolution.cloudfy.live`
- **Instance name:** `Teste1`
- **Número conectado:** 5519994239392 (Pedro Florenzano)
- **Adapter:** `src/infrastructure/whatsapp/EvolutionApiAdapter.ts`
- **Endpoint:** `POST /message/sendText/{instance}` com `{ number, text, linkPreview: true }`
- **Variáveis de ambiente:** `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE`

### Fluxo de Assinatura (implementado)

```
OS criada (WAITING_APPROVAL) → Admin clica "Enviar Aprovação"
→ POST /api/whatsapp/send { action: "approval", orderId }
→ SendApprovalLink gera token + monta mensagem + envia via Evolution API
→ Cliente recebe WhatsApp com link /sign/[token]
→ Cliente abre no celular → vê detalhes completos da OS → assina com o dedo no Canvas
→ POST /api/public/sign/[token] → OS muda para OPEN (Aguardando Início)

OS concluída (COMPLETED) → Admin clica "Notificar Entrega"
→ Cliente recebe link → assina → OS muda para DELIVERED
```

### Página pública de assinatura (`/sign/[token]`)

Mobile-first, sem autenticação. Exibe ao cliente:
- Cabeçalho: nº da OS, veículo (marca + modelo), placa, KM
- **Detalhes completos por reclamação:** cada reclamação com seus serviços (descrição + preço) e peças (qtd × descrição + total)
- Total geral em destaque
- Canvas touch para assinatura com o dedo
- Botões: Limpar / Aprovar Orçamento (ou Confirmar Recebimento)

A API `GET /api/public/sign/[token]` retorna: signerName, type, order (number, totalAmount, vehicle, plate, mileage, complaints com services e parts).

### Regras importantes de telefone

- **Todo número deve incluir o código do país (55 para Brasil)** para funcionar com a Evolution API
- O adapter normaliza automaticamente: remove caracteres não-numéricos e adiciona `55` se ausente
- Formato aceito pela API: `5511954337557` (sem +, sem espaços, sem parênteses)
- Números cadastrados sem código do país serão corrigidos pelo adapter, mas o ideal é armazenar sempre com DDD completo (ex: `(11) 95433-7557`)
- **Número de teste:** +55 11 95433-7557

---

## Módulo 6 — NF-e/NFS-e (infra pronta em 22/05/2026)

### O que está pronto

Schema completo, repositório, use cases com validações, API routes, UI de configuração e listagem de notas com ações (retry/cancel).

### Fluxo planejado

```
OS concluída → ADMIN clica "Emitir NF" → escolhe NFE (produtos) ou NFSE (serviços)
→ IssueFiscalInvoice cria invoice PENDING com itens → BullMQ job processa
→ Adapter gera XML → envia para SEFAZ/Prefeitura → atualiza status (AUTHORIZED/REJECTED)
→ Se erro: até 3 retries automáticos → depois notifica admin
```

### API Routes

| Rota | Método | Ação |
|------|--------|------|
| `/api/fiscal/config` | GET/PUT | Configuração fiscal |
| `/api/fiscal/invoices` | GET | Listagem com filtros |
| `/api/fiscal/invoices/[id]` | PATCH | Retry ou Cancel |
| `/api/orders/[id]/invoice` | GET | Notas da OS |
| `/api/orders/[id]/invoice` | POST | Emitir nota |

### O que falta para 100%

- BullMQ + Redis para processamento assíncrono
- Adapter de geração de XML (layout NF-e 4.0 / ABRASF NFS-e)
- Comunicação com SEFAZ (webservice) e Prefeitura (API REST)
- Certificado digital A1 (upload + validação)
- DANFE/DANFSE em PDF

---

## Melhorias de UX implementadas (22/05/2026)

- **Página de Relatórios** (`/dashboard/reports`, ADMIN): faturamento, lucro bruto, ticket médio, custo de peças, gráfico de barras mensal (6 meses), distribuição por status, filtro por período
- **Busca global na listagem de OS**: filtra instantaneamente por nº, cliente, placa ou modelo
- **Exportação CSV**: botão na listagem de OS, exporta dados filtrados com BOM UTF-8 para Excel
- **Tela de comissões por mecânico** (`/dashboard/users/[id]/commissions`): histórico com filtro por período, cards de resumo, lista expansível com detalhes dos serviços
- **Etiqueta de Troca de Óleo**: botão em toda OS, preview visual, impressão otimizada 80mm×110mm
