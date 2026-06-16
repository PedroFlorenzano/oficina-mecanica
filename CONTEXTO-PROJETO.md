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
**Branch de desenvolvimento atual:** main
**Última atualização:** 04/06/2026

---

## Stack Tecnológica

- **Frontend:** Next.js 16 (App Router) + TypeScript 5 + Tailwind CSS 4
- **Backend:** API Routes do Next.js (thin controllers)
- **ORM:** Prisma 6
- **Banco:** PostgreSQL 16 (via Docker em dev) — com Row-Level Security (RLS) para isolamento multi-tenant
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
| 3 | Multi-Tenancy | ✅ 100% | tenantId em todos os dados, RLS policies em 22 tabelas, withTenant + prismaAdmin, createContainer por requisição, Docker + validação end-to-end, roles separados (operare_app/operare_admin), seed 2 tenants, 218 testes passando |
| 4 | Ordem de Serviço (OS) | ✅ 100% | Criação com Reclamações, status padrão WAITING_APPROVAL, cancelamento com motivo, PDF completo, integração estoque (reserva/consumo/reversão), Kanban Pista |
| 5 | Controle de Estoque | ✅ 100% | CRUD itens, entrada com custo médio ponderado, histórico paginado de movimentos, alertas de mínimo (badge Sidebar + painel), ajuste físico (ADJUSTMENT), log imutável |
| 6 | Emissão de NF-e/NFS-e | ✅ 100% (simulado) | Infra completa: schema, use cases, API routes, UI config + listagem + botão na OS. Adapter simulado (FakeFiscalAdapter), processamento síncrono, DANFE/DANFSE PDF. Falta: adapter real SEFAZ/Prefeitura + certificado A1 |
| 7 | Integração WhatsApp + Assinatura | ✅ 100% | Envio real via Evolution API, webhook de status (DELIVERED/READ), notificação automática ao mover OS na Pista, lembrete preventivo automático (cron), assinatura digital mobile-first |
| 8 | Assinatura Digital | ✅ 100% | Incluído no módulo 7 — página pública /sign/[token] mobile-first com Canvas touch + mudança automática de status (APPROVAL→IN_PROGRESS, DELIVERY→DELIVERED) |
| 9 | Gestão de Comissões | ✅ 100% | Comissão por mecânico sobre valor bruto dos serviços, percentual configurável (commissionRate), geração por período, fluxo PENDING→APPROVED→PAID (ou CANCELLED), 7 use cases, 7 API routes, 3 páginas UI, 31 testes unitários |
| 10 | Etiqueta de Troca de Óleo | ✅ 100% | Botão em toda OS, preview visual, impressão popup otimizada (80mm×110mm, 1 página), dados: oficina, telefone, veículo, placa, KM, próxima troca (KM+10000, data+6meses) |
| 11 | Cronômetro de Serviço | ✅ 100% | Model TimerLog + TimerAuditLog, use cases completos, property-based tests, API routes, componente TimerControl na tela de OS |
| 12 | Fotos na OS (Antes/Depois/Dano) | ✅ 100% | Upload múltiplo (JPEG/PNG/WebP, max 10MB), categorias (Antes/Depois/Dano), galeria com lightbox, exclusão, armazenamento em disco (uploads/), RLS via ServiceOrder, API routes |
| 13 | Onboarding Self-Service | ✅ 100% | Cadastro público de nova oficina (tenant + admin), validação CNPJ/email/senha, página /register com formulário completo, link na tela de login |
| 14 | Agendamento Online | ✅ 100% | Config por tenant (horário, slots, dias), página pública /agendar/[tenantId], slots disponíveis, booking com validação, painel admin com confirmar/cancelar/concluir, link no Sidebar |
| 15 | Billing/Assinatura | ✅ 100% (infra) | Campos plan/billingStatus/planExpiresAt no Tenant, trial 14 dias no cadastro, CheckSubscription (bloqueia suspended/cancelled/trial expirado), webhook genérico para gateway (Stripe/Asaas), API GET /api/billing |

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
OrderService: id, description, price, timeMinutes (Int?), commissionRate (Float?), serviceId, orderId,
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
ServiceCatalog: id, code, description, category, estimatedTime, defaultPrice, pricingType, commissionRate (Float?), active
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
cp .env.example .env          # editar com seus valores

# Subir PostgreSQL via Docker
npm run db:docker

# Criar shadow database (primeira vez)
docker exec -it oficina-postgres-1 psql -U operare -d operare_dev -c "CREATE DATABASE operare_shadow;"

# Aplicar migrations (schema + RLS policies)
npx prisma migrate dev

# Popular com dados demo (2 tenants)
npx prisma db seed

# Iniciar
npm run dev
# http://localhost:3000
```

## Dados de Demo

- **Tenant 1:** Paiffer Bosch Car Service (id: `tenant-paiffer`)
- **Admin:** `admin@paiffer.com` / `password123` (role: ADMIN)
- **Mecânico:** `mecanico@paiffer.com` / `password123` (role: MECHANIC)
- **Tenant 2:** Demo Oficina (id: `tenant-demo`)
- **Admin:** `admin@demo.com` / `password123` (role: ADMIN)
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

## Módulo 6 — NF-e/NFS-e (simulado 100% em 26/05/2026)

### O que está pronto

Fluxo completo funcionando com **adapter simulado** (sem comunicação real com SEFAZ/Prefeitura). Schema, repositório, use cases, API routes, UI de configuração, listagem de notas, processamento síncrono, geração de XML mock e DANFE/DANFSE em PDF.

### Fluxo implementado

```
OS concluída → ADMIN clica "Emitir NF" → escolhe NFE (produtos) ou NFSE (serviços)
→ IssueFiscalInvoice cria invoice PENDING com itens
→ FiscalProcessor processa imediatamente (substitui BullMQ)
→ FakeFiscalAdapter gera XML mock + chave de acesso + protocolo fictício
→ Invoice atualizada para AUTHORIZED
→ Botão "DANFE" na listagem → GET /api/fiscal/invoices/[id]/pdf → PDF
→ Se erro: até 3 retries automáticos → marca ERROR + lastError
```

### Arquitetura do Adapter (Strategy Pattern)

```
src/infrastructure/fiscal/
├── IFiscalAdapter.ts         # Interface: authorize(input) → FiscalAuthorization, cancel(key, reason)
├── FakeFiscalAdapter.ts      # Implementação simulada (dev/homologação)
└── FiscalProcessor.ts        # Processador síncrono (substitui BullMQ)
```

- **`IFiscalAdapter`** — contrato com métodos `authorize()` e `cancel()`
- **`FakeFiscalAdapter`** — gera XML realista (NF-e 4.0 / ABRASF NFS-e), chave de acesso com mod11 (44 dígitos), protocolo fictício, simula latência 200-500ms
- **`FiscalProcessor`** — processa invoice síncrono: PENDING → PROCESSING → AUTHORIZED (ou ERROR)

### DANFE/DANFSE em PDF

- **Componente:** `src/components/pdf/DanfeDocument.tsx` — layout profissional com emitente, chave de acesso formatada, destinatário, tabela de itens (NCM/CFOP ou Cód. Serviço), total
- **Rota:** `GET /api/fiscal/invoices/[id]/pdf` — gera PDF inline (apenas para notas AUTHORIZED)
- **Nota:** Inclui aviso "Documento emitido em ambiente de homologação — sem valor fiscal"

### API Routes

| Rota | Método | Ação |
|------|--------|------|
| `/api/fiscal/config` | GET/PUT | Configuração fiscal |
| `/api/fiscal/invoices` | GET | Listagem com filtros |
| `/api/fiscal/invoices/[id]` | PATCH | Retry ou Cancel |
| `/api/fiscal/invoices/[id]/pdf` | GET | Download DANFE/DANFSE PDF |
| `/api/orders/[id]/invoice` | GET | Notas da OS |
| `/api/orders/[id]/invoice` | POST | Emitir nota (processa imediatamente) |

### O que falta para produção real

Para trocar pelo adapter real, basta criar `SefazFiscalAdapter implements IFiscalAdapter` e substituir `new FakeFiscalAdapter()` nas rotas:

- Adapter real de comunicação com SEFAZ (webservice SOAP, layout NF-e 4.0)
- Adapter real de comunicação com Prefeitura (API REST ABRASF para NFS-e)
- Certificado digital A1 (upload + validação + assinatura XML)
- BullMQ + Redis para processamento assíncrono em produção (opcional — o síncrono funciona para volume baixo)
- DANFE com código de barras (Code128 da chave de acesso)

---

## Melhorias de UX implementadas (22/05/2026)

- **Página de Relatórios** (`/dashboard/reports`, ADMIN): faturamento, lucro bruto, ticket médio, custo de peças, gráfico de barras mensal (6 meses), distribuição por status, filtro por período
- **Busca global na listagem de OS**: filtra instantaneamente por nº, cliente, placa ou modelo
- **Exportação CSV**: botão na listagem de OS, exporta dados filtrados com BOM UTF-8 para Excel
- **Tela de comissões por mecânico** (`/dashboard/users/[id]/commissions`): histórico com filtro por período, cards de resumo, lista expansível com detalhes dos serviços
- **Etiqueta de Troca de Óleo**: botão em toda OS, preview visual, impressão otimizada 80mm×110mm

---

## Melhorias de Estoque e Fornecedor (implementado em 25/05/2026)

### Localização (gaveta) visível no estoque

- **Listagem** (`/dashboard/stock`): nova coluna **"Local"** na tabela mostrando onde o item está (ex: "Gaveta 3", "Prateleira A3")
- **Detalhe do item** (`/dashboard/stock/[id]`): banner amarelo em destaque com ícone 📍 mostrando a localização

### Fornecedor no item de estoque (`StockItem.supplier`)

- Novo campo `supplier` (String?) no model `StockItem`
- **Cadastro/edição de item**: campo "Fornecedor Padrão" no formulário
- O fornecedor é exibido automaticamente nas peças da OS e no PDF

### Fornecedor na entrada de estoque (`StockMovement.supplier`)

- Novo campo `supplier` (String?) no model `StockMovement`
- **Modal "Registrar Entrada"** (botão verde na página de detalhe do item): campos quantidade, custo unitário, fornecedor e nº nota fiscal
- **Histórico de movimentações**: nova coluna "Fornecedor" na tabela — facilita reclamações de garantia

### Fornecedor nas peças da OS

- **Tela de detalhe da OS** (`/dashboard/orders/[id]`): coluna "Fornecedor" nas tabelas de peças (reclamações e peças avulsas)
- **PDF da OS**: coluna "Fornecedor" nas tabelas de peças impressas
- O dado vem de `OrderPart → StockItem.supplier` (join automático via Prisma)

### Auto-vinculação de peças ao estoque

- Ao criar uma OS, se a peça não veio com `stockItemId` mas a descrição bate com um item de estoque do tenant, o sistema vincula automaticamente
- Corrigido bug no Combobox de peças: o `onChange` chamado após `onSelect` não reseta mais o `stockItemId`

### Schema adicionado

```prisma
// StockItem — novo campo:
supplier  String?

// StockMovement — novos campos:
supplier  String?
unitCost  Float?    // Custo unitário no momento da movimentação (para relatórios e NF-e)
```

---

## Auditoria e Correções de Segurança (25/05/2026)

### Bugs de UI corrigidos

1. **Combobox cortado na OS** — O dropdown era cortado pelo `overflow-hidden` do container da reclamação. Corrigido com `createPortal` para renderizar no `document.body` com posicionamento dinâmico (scroll/resize aware).

2. **Navegação quebrada (botão voltar)** — Múltiplas causas corrigidas:
   - `router.replace` em vez de `router.push` no login e após salvar formulários
   - `Link` em vez de `router.back()` para navegação explícita
   - `error.tsx` e `not-found.tsx` no dashboard para evitar tela vazia
   - **`RemountOnNavigate`** wrapper no layout do dashboard: detecta mudança de pathname e força `window.location.replace(pathname)` (hard navigation) — resolve o problema do Next.js App Router não re-executar `useEffect` em navegação soft entre páginas client

### Correções críticas de segurança e integridade

| Problema | Correção |
|----------|----------|
| `createWithComplaints` sem transação (dados parciais) | Envolvido em `prisma.$transaction` |
| Race condition no nº da OS (duplicados) | `getNextNumber` dentro da mesma transação |
| Webhook WhatsApp sem validação de origem | Verifica `apikey` header (`WEBHOOK_SECRET` ou `EVOLUTION_API_KEY`) |
| Rota reminders aberta sem `CRON_SECRET` | Retorna 503 se não configurado |
| Reserva de estoque silenciosa | Retorna `stockWarnings` na resposta da API |
| 13+ páginas sem verificar `res.ok` | Adicionado em todas as páginas client |
| Query SQLite-specific (`active = 1`) | Prisma `findMany` + filtro em memória (portável) |
| Tipagem `any` no repositório de OS | Tipos Prisma concretos (`OrderDetail`, `OrderWithClient`, `ActiveOrder`) |
| Testes não compilando (campo supplier) | Corrigido em todos os mocks |

### Novos arquivos de infraestrutura

- `src/components/RemountOnNavigate.tsx` — Wrapper no layout que força hard navigation ao mudar de rota (resolve useEffect não executando em navegação soft do App Router)
- `src/app/dashboard/error.tsx` — Error boundary do dashboard
- `src/app/dashboard/not-found.tsx` — Página 404 do dashboard
- `src/lib/useAuthFetch.ts` — Hook para fetch com redirect em 401

---

## Análise Financeira e Correções (25/05/2026)

### Cálculos validados (corretos)

- **totalAmount da OS** = soma de serviços + (qtd × unitPrice) por reclamação ✓
- **CMP** = `(saldo × avgCost + qtd × unitCost) / novoSaldo` com arredondamento 2 casas ✓
- **Comissão** = `Math.round(price × rate) / 100` com snapshot do rate ✓
- **totalCommission** = soma item a item (pode ter ±1 centavo vs cálculo global) ✓

### Bugs financeiros corrigidos

| Problema | Impacto | Correção |
|----------|---------|----------|
| NF-e incluía peças com `used=false` | Nota fiscal com valor maior que o real | Filtro `p.used !== false` no `IssueFiscalInvoice` |
| `StockMovement` não gravava custo no momento | Relatório de lucro bruto incorreto | Novo campo `unitCost` (Float?) gravado em todas as movimentações |
| Relatório usava `avgCost` atual | Lucro bruto distorcido | Usa `m.unitCost ?? m.stockItem.avgCost` (fallback para dados antigos) |

### Schema adicionado

```prisma
// StockMovement — novo campo:
unitCost  Float?  // Custo unitário no momento da movimentação
```

### Testes financeiros criados (23 testes)

- `CreateOrder.financial.test.ts` — 4 testes de totalAmount
- `RegisterStockEntry.financial.test.ts` — 8 testes de CMP
- `GenerateCommission.financial.test.ts` — 5 testes de comissões
- `IssueFiscalInvoice.financial.test.ts` — 6 testes de NF-e/NFS-e

---

## Edição de OS em WAITING_APPROVAL (25/05/2026)

### O que foi construído

Permite editar uma OS que ainda está aguardando aprovação do cliente. O atendente pode remover reclamações inteiras, serviços ou peças que o cliente não aprovou, e o sistema recalcula tudo automaticamente.

### Regras de negócio

- **Só edita em WAITING_APPROVAL** — qualquer outro status rejeita com erro
- **Mínimo 1 reclamação** com ao menos 1 serviço com preço > 0
- **Recalcula totalAmount** automaticamente
- **Reverte reservas de estoque** das peças removidas
- **Reserva estoque** das novas peças adicionadas
- **Comissões não são afetadas** (só existem para OS COMPLETED/DELIVERED)
- **Retorna `stockWarnings`** se alguma reserva falhar (saldo insuficiente)

### Fluxo

```
Cliente não aprova serviço → Atendente clica "Editar Orçamento" na OS
→ Tela de edição com dados atuais preenchidos
→ Remove reclamação/serviço/peça indesejada
→ Salvar → PUT /api/orders/[id]
→ Reverte reservas antigas → Substitui dados → Recalcula total → Reserva novas peças
→ Volta para detalhe da OS com valores atualizados
```

### Arquivos criados/modificados

- `src/application/dtos/UpdateOrderDTO.ts` — DTO de edição
- `src/application/use-cases/orders/UpdateOrder.ts` — Use case com validações
- `src/app/api/orders/[id]/route.ts` — Rota PUT adicionada
- `src/infrastructure/repositories/PrismaServiceOrderRepository.ts` — Método `replaceComplaints` com `$transaction`
- `src/domain/repositories/IServiceOrderRepository.ts` — Interface atualizada
- `src/app/dashboard/orders/[id]/edit/page.tsx` — Tela de edição (formulário completo)
- `src/app/dashboard/orders/[id]/page.tsx` — Botão "Editar Orçamento" (só em WAITING_APPROVAL)

### API

| Rota | Método | Ação | Condição |
|------|--------|------|----------|
| `/api/orders/[id]` | PUT | Editar OS completa | Apenas WAITING_APPROVAL |

### Testes

- `UpdateOrder.test.ts` — 10 testes cobrindo validações, cálculos e fluxo de estoque

---

## Contagem de Testes

**Total: 213 testes unitários passando** (24 suites)

| Módulo | Testes |
|--------|--------|
| Timer (cronômetro) | 86 + 7 properties |
| Comissões | 31 + 5 financeiros |
| Estoque | 8 + 8 financeiros |
| OS (criação/cancelamento/edição) | 4 + 10 + 4 financeiros |
| NF-e | 6 financeiros |
| Clientes/Veículos | 6 |
| Kanban | 8 properties |
| TimerControl (componente) | 9 |
| Imutabilidade StockMovement | 3 |

*Última atualização: 26/05/2026 — Módulo fiscal simulado 100%, DANFE PDF, UX profissional (botões NFE/NFSE, modal cancelamento).*

---

## Melhorias implementadas (25/05/2026 — sessão 2)

### Permissões Customizáveis por Usuário

O ADMIN pode configurar quais telas e ações cada mecânico pode acessar, via tabela de checkboxes no formulário de edição de usuário.

- **Campo:** `customPermissions` (JSON String?) no model `User`
- **Formato:** `{"vehicles":["read","update"],"clients":["read"],"orders":["read"]}` — só os recursos com permissão são listados
- **Propagação:** Login → JWT → Session → Sidebar
- **Função:** `hasPermission(role, resource, permission, customPermissions?)` — se há custom para o recurso, usa; senão, fallback para a matriz padrão do role
- **UI:** Tabela no UserForm com checkboxes por módulo × ação (Visualizar, Criar, Editar, Excluir)
- **Recursos configuráveis:** Clientes, Veículos, OS, Estoque, Catálogo de Serviços, Pista, Comissões
- **Efeito na Sidebar:** Módulos sem permissão "read" não aparecem no menu do mecânico

### Relatório de Lucro por OS

- **API:** `GET /api/reports` agora retorna `profitByOrder[]` com: id, number, client, plate, revenue, partsCost, profit, margin, date
- **Cálculo:** `profit = totalAmount - Σ(peças consumidas × unitCost)` por OS
- **UI:** Tabela na página de relatórios com margem colorida (verde ≥30%, amarelo ≥15%, vermelho <15%)

### Filtros Avançados na Listagem de OS

- **API:** `GET /api/orders` aceita query params: `status`, `startDate`, `endDate`, `mechanicId`, `clientId`
- **UI:** Painel colapsável "Filtros" com: select de status, date range, select de mecânico, select de cliente
- **Busca por texto:** Continua funcionando como filtro local sobre os resultados da API

### Dashboard do Mecânico

- **API:** `GET /api/dashboard/mechanic` — retorna OS atribuídas, cronômetros ativos, comissões pendentes
- **UI:** Dashboard condicional por role — MECHANIC vê: cards de resumo, lista de cronômetros ativos, tabela de OS atribuídas
- **ADMIN/ATTENDANT:** Continuam vendo o dashboard original

### PDF de Orçamento Simplificado

- **Componente:** `src/components/pdf/BudgetDocument.tsx` — versão limpa sem fornecedor, custo, histórico de status
- **Rota:** `GET /api/orders/[id]/budget` — gera PDF inline
- **UI:** Botão "Orçamento" na OS (só em WAITING_APPROVAL) com ícone FileText
- **Conteúdo:** Título "ORÇAMENTO", cliente (nome + telefone), veículo, reclamações com serviços e peças (sem fornecedor), total, rodapé "Válido por 15 dias"

### Correção de Bug — Listagem de OS

- **Problema:** Ao abrir uma OS e clicar "voltar" no navegador, a grid ficava carregando infinitamente
- **Causa:** `window.location.href` para navegação + `useEffect([])` não re-executava no bfcache
- **Correção:** Trocado por `router.push()` + listener `pageshow` como fallback

### Limpeza e Profissionalização do Projeto

- Removida spec NestJS obsoleta (`.kiro/specs/oficina-mecanica-system/`)
- Removidos arquivos temporários (screenshot GUID, CLAUDE.md, AGENTS.md, scripts de debug)
- Removidos 8 TODOs obsoletos de auth nos use cases
- Corrigido `DEMO_USER_ID` no CancelOrder (agora recebe userId real da sessão)
- Criado `src/lib/permissions.ts` — Permission Guard RBAC completo
- Tipados 79 dos 112 erros `no-explicit-any` (interfaces de domínio, repositórios, use cases, rotas)
- Tasks.md atualizados para refletir estado real do projeto

### Schema adicionado

```prisma
// User — novo campo:
customPermissions  String?  // JSON: {"resource": ["read","create","update","delete"]}
```

---

## Melhorias de UX implementadas (25/05/2026 — sessão 3)

| Melhoria | Status |
|----------|--------|
| Paginação na listagem de OS (15/página) | ✅ |
| Ordenação nas tabelas (Nº, Cliente, Status, Total, Data) | ✅ |
| Toast de sucesso (componente reutilizável) | ✅ |
| Hook `useUnsavedChanges` (confirmação ao sair) | ✅ |
| Busca rápida global Ctrl+K (OS, clientes, veículos) | ✅ |
| `.env.example` com todas as variáveis | ✅ |
| README profissional (setup, módulos, arquitetura) | ✅ |
| Tipagem `any` reduzida de 112 → 12 | ✅ |

---

## Ajustes de UX e Segurança (25/05/2026 — sessão 4)

### Padronização de Botões na OS

- Botões de ação na tela de detalhe da OS reorganizados: separados do header em uma linha `flex-wrap` com tamanho consistente (`px-4 py-2`, `inline-flex`, `font-medium`)
- Status badge permanece no header ao lado do título

### Formato Numérico Brasileiro

- Criado `src/lib/format.ts` com `formatCurrency()` — usa `toLocaleString("pt-BR", { style: "currency", currency: "BRL" })`
- Substituído `R$ x.toFixed(2)` por `formatCurrency(x)` em 11 arquivos (exibe `R$ 1.234,56`)
- Afeta: detalhe OS, listagem OS, dashboard, estoque (listagem e detalhe), criação OS, edição OS, histórico clientes, histórico veículos, catálogo serviços

### Permissões Customizáveis — Enforcement nos Botões de Ação

- `hasPermission()` + `useSession()` adicionado em 6 páginas: clientes, veículos, OS, estoque (listagem e detalhe), serviços
- Botões de **Criar**, **Editar** e **Excluir** agora respeitam as `customPermissions` do usuário
- Botões **Registrar Entrada** e **Ajustar Estoque** na página de detalhe do item só aparecem com permissão `create` ou `update`
- Se o ADMIN configurar um mecânico com apenas "Visualizar", os botões de ação não aparecem

### Filtro da Pista com Mecânicos Cadastrados

- `PistaFilters` transformado de input de texto para `<select>` que busca mecânicos via `GET /api/users?role=MECHANIC`
- API `/api/users` agora aceita query param `role` para filtrar
- `filterOrders` filtra por `mechanicId` nos serviços da OS (em vez de texto no `createdBy.name`)
- `KanbanCard` mostra nome do mecânico atribuído (via `mechanicMap` propagado pela cadeia Board→Column→Card)
- `ActiveOrder` e `PistaOrder` agora incluem `services[].mechanicId`
- Repositório `findActive` retorna `services.mechanicId` para suportar o filtro

### Comissão por Serviço (com fallback para taxa do mecânico)

**Schema adicionado:**
```prisma
// ServiceCatalog — novo campo:
commissionRate  Float?  // % comissão específica do serviço (null = usa taxa do mecânico)

// OrderService — novo campo:
commissionRate  Float?  // % comissão snapshot (null = usa taxa do mecânico)
```

**Lógica de cálculo:**
- `GenerateCommission`: para cada serviço elegível, usa `OrderService.commissionRate` se definido; senão, usa `User.commissionRate` (taxa padrão do mecânico)
- Fórmula: `commissionValue = price × (serviceRate ?? mechanicRate) / 100`
- O `commissionRate` do `ServiceCatalog` é copiado para o `OrderService` no momento da criação da OS (snapshot)

**UI:**
- Catálogo de Serviços: novo campo "Comissão (%)" no formulário + coluna na tabela (mostra "X%" ou "Padrão")
- Criação/edição de OS: ao selecionar serviço do catálogo, `commissionRate` é copiado automaticamente

### Isolamento de Comissões por Mecânico

- Verificado que o backend já isola corretamente: `ListCommissions` usa `findByMechanic(userId)` para MECHANIC
- `GetCommissionDetail` verifica `mechanicId !== userId` e rejeita com 403
- `GetMechanicCommissionSummary` bloqueia acesso a dados de outro mecânico
- Rota `/api/users/[id]/commissions` restrita a ADMIN

### Contagem de Testes

**Total: 213 testes unitários passando** (24 suites) — +1 property test novo (filterOrders por mechanicId)

---

## Melhorias implementadas (26/05/2026 — sessão 5)

### Seed Completo

Reescrito `prisma/seed.ts` com dados demo abrangentes:
- **4 usuários:** admin, 2 mecânicos (com commissionRate), atendente
- **6 clientes** (incluindo 1 PJ inativo para testar reativação)
- **6 veículos** (placas Mercosul e antigas)
- **8 serviços no catálogo** (5 com commissionRate específica)
- **8 itens de estoque** (3 abaixo do mínimo para alertas)
- **10 OS** com todos os status (WAITING_APPROVAL, IN_PROGRESS, WAITING_PART, COMPLETED, DELIVERED, CANCELLED)
- **Cronômetros finalizados** em 5 serviços (com timeMinutes calculado)
- **3 comissões:** PAID (abril), APPROVED (maio), PENDING (maio)
- **Movimentações de estoque** com fornecedor e unitCost

### Máscara de Placa no Formulário de Veículo

- Suporta **Mercosul** (ABC1D23 — 3 letras + 1 número + 1 letra + 2 números)
- Suporta **antigo** (ABC-1234 — 3 letras + hífen + 4 números)
- Formatação automática ao digitar (uppercase, hífen automático no formato antigo)
- Validação visual em tempo real (borda vermelha se inválido)
- Bloqueio no submit com mensagem de erro

### Contagem de OS na Listagem de Clientes

- Nova coluna **"OS"** na tabela de clientes mostrando `_count.orders`
- A API já retornava esse dado — apenas adicionada a coluna na UI
- Não duplica o histórico existente (que é acessível via ícone 📋)

### Exportar Relatório Financeiro em PDF

- **Componente:** `src/components/pdf/ReportDocument.tsx` — resumo, faturamento mensal, tabela de lucro por OS
- **Rota:** `GET /api/reports/pdf` — aceita `startDate` e `endDate` como query params
- **UI:** Botão "Exportar PDF" no PageHeader da página de relatórios (respeita filtros de período)
- **Acesso:** Apenas ADMIN

### Zero `any` no Projeto

- Todos os 12 `any` restantes tipados no `BudgetDocument.tsx`
- Criadas interfaces: `BudgetService`, `BudgetPart`, `BudgetComplaint`, `BudgetOrder`
- **0 ocorrências de `any`** em todo o `src/`

### Manual do Usuário

- **Markdown:** `oficina/MANUAL-USUARIO.md` — 361 linhas cobrindo todos os módulos
- **PDF:** Componente `src/components/pdf/ManualDocument.tsx` (4 páginas)
- **Rota:** `GET /api/manual` — gera PDF do manual (sem autenticação)
- **UI:** Card "Manual do Usuário" na página de perfil (`/dashboard/profile`) — visível apenas para ADMIN
- **README:** Seção "Documentação" com links para manual MD, PDF e contexto

---

## Melhorias do Módulo Fiscal (26/05/2026 — sessão 6)

### Adapter Simulado Completo

O módulo NF-e/NFS-e agora funciona end-to-end com adapter fake (sem SEFAZ/Prefeitura real):

- **`FakeFiscalAdapter`** — gera XML realista (NF-e 4.0 / ABRASF NFS-e), chave de acesso com mod11, protocolo fictício, latência simulada
- **`FiscalProcessor`** — processamento síncrono (substitui BullMQ): PENDING → PROCESSING → AUTHORIZED
- **DANFE/DANFSE PDF** — componente `DanfeDocument.tsx` com layout profissional (emitente, chave de acesso, itens, total)
- **Rota PDF:** `GET /api/fiscal/invoices/[id]/pdf`

### Descrição Enriquecida nos Itens da NF-e

- Peças na NF-e incluem marca e fornecedor na descrição: `"Filtro de Ar | Mann | Forn: Auto Pecas Sorocaba"`
- Coleta correta de peças/serviços de `complaints[]` (não duplica com nível raiz)

### UX Profissional

- **Botões separados na OS:** "NF-e (Peças)" e "NFS-e (Serviços)" — sem prompt, ação direta
- **Modal de cancelamento:** aviso vermelho irreversível, dados da nota, campo com contador de caracteres (mín 15), botão desabilitado até atingir mínimo, feedback de erro inline
- **Link na coluna OS:** clicável, redireciona para detalhe da OS
- **Botão DANFE:** fetch com cookie (resolve 401 em nova aba), abre PDF via blob URL

### Seed Fiscal

- `FiscalConfig` adicionada ao seed com dados da Paiffer (CNPJ, IE, IM, razão social, cidade Sorocaba)
- Módulo fiscal já vem habilitado no ambiente de desenvolvimento

---

## Identidade do Produto — Decisões Tomadas (27/05/2026)

### Nome do SaaS

**Operare** — do latim "operar/trabalhar". Tom profissional, expansível para além de oficinas mecânicas.

- **Domínio:** `operare.tech` (`.com.br` já estava em uso)
- **Piloto:** Paiffer Bosch Car Service (Sorocaba/SP) — o nome "Paiffer" é da oficina cliente, não do produto

### Segmentos-alvo

| Segmento | Compatibilidade | Observação |
|----------|----------------|------------|
| Oficinas mecânicas automotivas | ✅ Core | Piloto atual |
| Estéticas automotivas | ✅ Alta | Ramo em crescimento no Brasil — OS, serviços, insumos, cronômetro, WhatsApp já cobrem |
| Oficinas de motos | ✅ Alta | Mesma lógica, sem mudanças |
| Oficinas de caminhões | ✅ Alta | Mesma lógica |
| Funilaria/Pintura | ✅ Alta | Pode precisar de fotos de danos no futuro |
| Elétrica automotiva | ✅ Alta | Sem mudanças necessárias |

### Posicionamento

- **Nacional** (Brasil) — sem planos de internacionalização no curto prazo
- **Tom:** Profissional, B2B
- **Modelo:** SaaS com assinatura mensal, multi-tenant

### Estrutura de Domínio Planejada

```
operare.tech                  → landing page / marketing / cadastro
app.operare.tech              → aplicação (login + dashboard)
app.operare.tech/[slug]       → path-based por tenant (ex: app.operare.tech/paiffer)
```

> **Decisão pendente:** path-based (`app.operare.tech/paiffer`) vs subdomínio (`paiffer.operare.tech`).
> Path-based é mais simples de implementar (sem wildcard DNS). Subdomínio é mais profissional.
> Recomendação: começar com path-based e migrar para subdomínio quando houver demanda.

### Multi-Tenancy — Estratégia Definida

- **Abordagem:** Row-Level Security (RLS) no PostgreSQL — uma tabela por entidade, isolamento garantido pelo banco
- **Motivo:** Menos complexidade operacional que schema-per-tenant; migrations simples; Prisma suporta nativamente
- **Proteção:** Mesmo que o código esqueça o filtro `tenantId`, o banco bloqueia via policy RLS
- **Banco:** Migrar de SQLite para PostgreSQL (pré-requisito do RLS)

---

## Pendente — Roadmap para Produção

> O sistema está funcional e completo para uso em uma oficina (single-tenant). O que resta são itens de infraestrutura de produção, integração fiscal real e comercialização.

### 1. NF-e/NFS-e — Adapter Real

| Item | Descrição | Dependência |
|------|-----------|-------------|
| Certificado digital A1 | Upload, validação e assinatura XML | Compra do certificado (~R$200/ano) |
| Adapter SEFAZ | Webservice SOAP, layout NF-e 4.0 | Credenciais de homologação SEFAZ-SP |
| Adapter Prefeitura | API REST ABRASF para NFS-e | Cadastro na Prefeitura de Sorocaba |
| BullMQ + Redis | Processamento assíncrono (opcional para volume baixo) | Redis em produção |
| DANFE com código de barras | Code128 da chave de acesso no PDF | Lib de barcode (react-barcode ou similar) |

**Para ativar:** Criar `SefazFiscalAdapter implements IFiscalAdapter` e substituir `new FakeFiscalAdapter()` nas rotas.

### 2. Multi-Tenancy Real

| Item | Descrição | Status |
|------|-----------|--------|
| PostgreSQL | Migrar de SQLite para Postgres | ✅ Completo |
| Row-Level Security | Policies em 22 tabelas + roles | ✅ Validado end-to-end |
| withTenant + prismaAdmin | Propagação de contexto via Prisma Extension | ✅ Implementado |
| Rotas migradas | 51 autenticadas + 4 cross-tenant | ✅ Todas migradas |
| Seed multi-tenant | 2 tenants com dados sobrepostos | ✅ Implementado |
| Docker + validação | PostgreSQL local + testes de isolamento | ✅ Concluído (04/06/2026) |
| Roles separados | `operare_app` (RLS) + `operare_admin` (BYPASSRLS) | ✅ Criados e testados |
| Onboarding | Fluxo de cadastro de nova oficina (self-service) | ⬜ UI + API |
| Billing/Assinatura | Controle de plano, inadimplência, bloqueio | ⬜ Gateway (Stripe/Asaas) |
| Subdomínio por tenant | path-based (`app.operare.tech/paiffer`) | ⬜ DNS + middleware |

### 3. Deploy em Produção

| Item | Descrição | Dependência |
|------|-----------|-------------|
| Hosting | Vercel, AWS (ECS/Lambda), ou VPS | Decisão de custo/escala |
| Domínio + SSL | Configuração DNS, certificado HTTPS | Registro de domínio |
| Variáveis de ambiente | NEXTAUTH_SECRET, DATABASE_URL, EVOLUTION_API_KEY, etc. | Definição de secrets |
| CI/CD | Pipeline de deploy automático (GitHub Actions) | Configuração do workflow |
| Backup | Estratégia de backup do banco (diário, retenção 30d) | Cron + storage (S3) |
| Monitoramento | Logs, alertas, uptime (Sentry, UptimeRobot) | Conta nos serviços |

### 4. Comercialização

| Item | Descrição | Dependência |
|------|-----------|-------------|
| Apresentação comercial | Deck de vendas, posicionamento, diferenciais | Definição de preços/planos |
| Landing page | Site de vendas do SaaS com CTA | Design + domínio público |
| Planos e preços | Básico / Profissional / Enterprise | Análise de mercado |
| Contrato e LGPD | Termos de uso, política de privacidade | Assessoria jurídica |
| Suporte | Canal de atendimento (WhatsApp, email, chat) | Definição de SLA |

---

## Migração PostgreSQL + RLS (implementado em 28/05/2026)

### O que foi construído

Migração completa do banco de dados de SQLite para PostgreSQL com implementação de Row-Level Security (RLS) nativo como segunda camada de isolamento multi-tenant. Estratégia **defense in depth**: o código continua filtrando por `tenantId` (camada 1) e o banco bloqueia qualquer acesso que escape via RLS policies (camada 2, independente do código).

### Decisões Arquiteturais

- **Abordagem:** Uma tabela por entidade com RLS policies (não schema-per-tenant)
- **Motivo:** Menor complexidade operacional, migrations simples, suporte nativo do Prisma
- **Contexto de tenant:** Propagado via `SET LOCAL app.current_tenant_id` dentro de cada transação (Prisma Extension)
- **Roles PostgreSQL:** `operare_app` (sem BYPASSRLS, uso normal) + `operare_admin` (BYPASSRLS, login/assinatura pública)

### Arquitetura de Isolamento

```
┌─────────────────────────────────────────────────────────────────┐
│  API Route → requireAuth() → session.user.tenantId             │
│  → createContainer(tenantId) → repositórios com RLS ativo      │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│  Prisma Extension (withTenant)                                  │
│  $transaction { SET LOCAL app.current_tenant_id = tenantId }   │
│  + filtros where: { tenantId } nos repositórios (defense in depth) │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│  PostgreSQL — RLS Policies                                      │
│  operare_app (sem BYPASSRLS): filtra por current_setting(...)  │
│  operare_admin (BYPASSRLS): acesso irrestrito (login, sign)    │
└─────────────────────────────────────────────────────────────────┘
```

### Arquivos criados/modificados

| Arquivo | Ação |
|---------|------|
| `oficina/docker-compose.yml` | Criado — PostgreSQL 16 com volume persistente |
| `oficina/.env.example` | Reescrito — DATABASE_URL, SHADOW_DATABASE_URL, DATABASE_URL_ADMIN |
| `oficina/.env` | Atualizado — URLs PostgreSQL para dev local |
| `oficina/package.json` | Script `db:docker` adicionado |
| `oficina/prisma/schema.prisma` | Provider `postgresql` + `shadowDatabaseUrl` |
| `oficina/prisma/migrations/20260528100000_add_rls_policies/migration.sql` | RLS completo: 12 tabelas diretas + 10 indiretas |
| `oficina/src/infrastructure/database/prisma.ts` | Reescrito — `prisma`, `prismaAdmin`, `withTenant()` |
| `oficina/src/infrastructure/database/__tests__/prisma-extension.test.ts` | 5 testes (unitários + property) |
| `oficina/src/infrastructure/container.ts` | Reescrito — `createContainer(tenantId)` + `adminContainer` |
| `oficina/src/infrastructure/repositories/*.ts` | 11 repositórios refatorados (injeção via construtor) |
| 51 rotas em `src/app/api/` | Migradas para `createContainer(tenantId)` |
| 4 rotas cross-tenant | Migradas para `adminContainer` |
| `oficina/prisma/seed.ts` | Reescrito — 2 tenants com dados sobrepostos |

### DI Container — Novo Padrão

```typescript
// Rotas autenticadas (RLS ativo):
const session = await requireAuth();
const tenantId = session.user.tenantId;
const container = createContainer(tenantId);

// Rotas cross-tenant (BYPASSRLS):
import { adminContainer } from "@/infrastructure/container";
// Usado em: login, assinatura pública, webhook WhatsApp, cron reminders
```

### Repositórios — Novo Padrão

```typescript
export class PrismaClientRepository implements IClientRepository {
  // Defense in depth: RLS também filtra no banco
  constructor(private readonly db: PrismaClient) {}
  // usa this.db em todas as queries
}
```

### RLS Policies — Cobertura

**12 tabelas diretas** (com `tenantId`): `Tenant`, `User`, `Client`, `Vehicle`, `ServiceCatalog`, `ServiceOrder`, `StockItem`, `Commission`, `WhatsAppConfig`, `WhatsAppMessage`, `FiscalConfig`, `FiscalInvoice`

**10 tabelas indiretas** (join com tabela pai): `StockMovement` (→StockItem), `Complaint` (→ServiceOrder), `OrderService` (→ServiceOrder), `OrderPart` (→ServiceOrder), `StatusHistory` (→ServiceOrder), `Signature` (→ServiceOrder), `TimerLog` (→OrderService→ServiceOrder), `TimerAuditLog` (→TimerLog→OrderService→ServiceOrder), `CommissionItem` (→Commission), `FiscalInvoiceItem` (→FiscalInvoice)

### Seed — 2 Tenants para Validação

- **tenant-paiffer** (admin@paiffer.com / password123) — dados reais do piloto
- **tenant-demo** (admin@demo.com / password123) — dados sobrepostos (mesmos nomes de clientes, mesmas placas, mesmo código de estoque)

### Variáveis de Ambiente

```bash
# App_Role (sem BYPASSRLS) — uso normal
DATABASE_URL="postgresql://operare_app:senha@localhost:5432/operare_dev"
# Shadow database para migrations
SHADOW_DATABASE_URL="postgresql://operare:operare@localhost:5432/operare_shadow"
# Admin_Role (BYPASSRLS) — login, assinatura pública
DATABASE_URL_ADMIN="postgresql://operare_admin:senha@localhost:5432/operare_dev"
```

### Como Rodar (novo)

```bash
cd oficina
npm run db:docker        # Sobe PostgreSQL via Docker
# Criar shadow DB (primeira vez):
# docker exec -it oficina-postgres-1 psql -U operare -d operare_dev -c "CREATE DATABASE operare_shadow;"
npx prisma migrate dev   # Aplica schema + RLS policies
npx prisma db seed       # Popula 2 tenants com dados demo
npm run dev              # http://localhost:3000
```

### Migração concluída ✅ (04/06/2026)

| # | Item | Status |
|---|------|--------|
| 1 | Docker Desktop instalado | ✅ |
| 2 | Migrations aplicadas (schema + RLS) | ✅ |
| 3 | Roles criados (`operare_app`, `operare_admin`) | ✅ |
| 4 | Seed com 2 tenants populado | ✅ |
| 5 | Isolamento RLS validado end-to-end | ✅ |
| 6 | 218 testes unitários passando | ✅ |
| 7 | Build de produção OK | ✅ |

**Validação RLS realizada:**
- Sem tenant configurado → 0 registros retornados (bloqueio total)
- Com `tenant-paiffer` → apenas dados do Paiffer (6 clientes)
- Com `tenant-demo` → apenas dados do Demo (2 clientes)
- Owner (`operare`) com BYPASSRLS → vê todos (8 clientes)

### Testes

- **218 testes unitários passando** (25 suites, zero regressões)
- **Build de produção** compilando sem erros
- Isolamento RLS validado manualmente contra PostgreSQL real

*Última atualização: 04/06/2026 — Migração PostgreSQL + RLS completa e validada com Docker.*

---

## Módulo 12 — Fotos na OS: Antes/Depois/Dano (implementado em 05/06/2026)

### O que foi construído

Upload e galeria de fotos associadas à OS, com categorias (Antes, Depois, Dano). Permite registrar visualmente o estado do veículo na entrada, danos identificados e o resultado após o serviço. Útil para oficinas de funilaria, estética automotiva e proteção contra disputas.

### Schema adicionado

```prisma
enum PhotoCategory { BEFORE, AFTER, DAMAGE }

model OrderPhoto {
  id, orderId, category (PhotoCategory), description?, filePath, fileName,
  mimeType, sizeBytes, uploadedById, createdAt
}
```

### Arquitetura

- **Armazenamento:** Disco local (`uploads/{orderId}/{uuid}.ext`) — pronto para migrar para S3
- **Servir imagens:** `GET /api/uploads/[...path]` (autenticado, com cache immutable)
- **RLS:** Policy indireta via `ServiceOrder.tenantId` (join)
- **Limite:** 10MB por arquivo, apenas JPEG/PNG/WebP

### API Routes

| Rota | Método | Ação |
|------|--------|------|
| `/api/orders/[id]/photos` | GET | Listar fotos da OS |
| `/api/orders/[id]/photos` | POST | Upload (multipart/form-data) |
| `/api/orders/[id]/photos/[photoId]` | DELETE | Excluir foto (disco + banco) |
| `/api/uploads/[...path]` | GET | Servir imagem (autenticado) |

### Componente UI

`src/components/OrderPhotos.tsx` — integrado na tela de detalhe da OS:
- Painel de upload com seleção de categoria e descrição opcional
- Upload múltiplo (seleciona vários arquivos de uma vez)
- Galeria agrupada por categoria (Antes/Depois/Dano) com thumbnails em grid
- Lightbox (modal) ao clicar na foto com dados do upload
- Botão de exclusão com confirmação (hover no thumbnail ou no lightbox)
- Loading skeleton enquanto carrega

### Arquivos criados

| Arquivo | Descrição |
|---------|-----------|
| `prisma/migrations/20260605091600_add_order_photos/migration.sql` | Schema + RLS policy |
| `src/domain/repositories/IOrderPhotoRepository.ts` | Interface do repositório |
| `src/infrastructure/repositories/PrismaOrderPhotoRepository.ts` | Implementação Prisma |
| `src/application/use-cases/photos/UploadOrderPhoto.ts` | Validação + persistência |
| `src/application/use-cases/photos/DeleteOrderPhoto.ts` | Exclusão disco + banco |
| `src/app/api/orders/[id]/photos/route.ts` | GET + POST |
| `src/app/api/orders/[id]/photos/[photoId]/route.ts` | DELETE |
| `src/app/api/uploads/[...path]/route.ts` | Servir imagens |
| `src/components/OrderPhotos.tsx` | Galeria + upload UI |

*Última atualização: 05/06/2026 — Módulo 12 (Fotos na OS) implementado.*

---

## Módulo 13 — Onboarding Self-Service (implementado em 05/06/2026)

### O que foi construído

Fluxo de cadastro público onde uma nova oficina se registra sozinha no sistema. Cria o tenant + usuário administrador em uma única transação.

### Fluxo

```
/register → Preenche dados (oficina + admin) → POST /api/public/register
→ Valida CNPJ (dígitos verificadores), e-mail, senha (PasswordValidator)
→ Verifica unicidade CNPJ e e-mail → Cria Tenant + User (ADMIN)
→ Sucesso → Redireciona para /login
```

### Validações

- CNPJ: 14 dígitos + validação de dígitos verificadores + unicidade
- E-mail: formato válido + unicidade global
- Senha: mín. 8 chars, maiúscula, minúscula, número
- Nome da oficina: mín. 3 caracteres
- Nome do admin: mín. 3 caracteres

### Arquivos criados

| Arquivo | Descrição |
|---------|-----------|
| `src/application/dtos/RegisterTenantDTO.ts` | DTO de entrada |
| `src/application/use-cases/tenants/RegisterTenant.ts` | Use case (prismaAdmin) |
| `src/app/api/public/register/route.ts` | API pública POST |
| `src/app/register/page.tsx` | Server component (redirect se logado) |
| `src/app/register/RegisterForm.tsx` | Client form com feedback |

---

## Módulo 14 — Agendamento Online (implementado em 05/06/2026)

### O que foi construído

Sistema de agendamento online onde o cliente final da oficina pode marcar horário via link público, sem necessidade de login. O admin configura dias, horários e capacidade; o cliente escolhe data, horário disponível e descreve o serviço.

### Schema

```prisma
model ScheduleConfig { slotDuration, maxPerSlot, workDays (JSON), startTime, endTime, lunchStart, lunchEnd, enabled }
model Appointment { clientName, clientPhone, vehicleInfo, description, date, status (PENDING/CONFIRMED/CANCELLED/COMPLETED) }
enum AppointmentStatus { PENDING, CONFIRMED, CANCELLED, COMPLETED }
```

### Fluxo público (cliente)

```
/agendar/[tenantId] → Seleciona data → Vê slots disponíveis (grid)
→ Preenche: nome, telefone, veículo, descrição do serviço
→ Confirma → POST /api/public/schedule/[tenantId]
→ Tela de sucesso
```

### Fluxo admin (dashboard)

```
/dashboard/appointments → Vê agendamentos (pendentes, hoje)
→ Confirmar (PENDING→CONFIRMED) ou Cancelar (PENDING→CANCELLED)
→ Concluir (CONFIRMED→COMPLETED)
→ Configurar (slots, dias, horários) → Gerar link público para compartilhar via WhatsApp
```

### API Routes

| Rota | Método | Ação | Auth |
|------|--------|------|------|
| `/api/public/schedule/[tenantId]` | GET | Slots disponíveis por data | Público |
| `/api/public/schedule/[tenantId]` | POST | Criar agendamento | Público |
| `/api/appointments` | GET | Listar agendamentos | Autenticado |
| `/api/appointments/[id]` | PATCH | Atualizar status/notes | Autenticado |
| `/api/appointments/config` | GET/PUT | Configuração de slots | ADMIN |

### Regras

- Não permite agendar no passado
- Não permite exceder `maxPerSlot` no mesmo horário
- Slots são gerados dinamicamente baseado na config (duração, horário de almoço, dias úteis)
- Link público: `/agendar/{tenantId}` — pode ser compartilhado via WhatsApp

*Última atualização: 05/06/2026 — Módulos 13 (Onboarding) e 14 (Agendamento) implementados.*

---

## Módulo 15 — Billing/Assinatura (infra pronta em 05/06/2026)

### O que foi construído

Infraestrutura completa de controle de assinatura: campos no Tenant, trial automático de 14 dias no cadastro, use case de verificação de acesso, e webhook genérico para receber eventos de gateways de pagamento (Stripe, Asaas, etc.).

### Schema adicionado

```prisma
// Tenant — novos campos:
plan           String  @default("trial")  // trial, basic, professional, enterprise
planExpiresAt  DateTime?
billingStatus  String  @default("active") // active, past_due, suspended, cancelled
```

### Planos

| Plano | Descrição |
|-------|-----------|
| `trial` | Teste gratuito por 14 dias (criado automaticamente no onboarding) |
| `basic` | Plano básico — funcionalidades essenciais |
| `professional` | Plano profissional — todos os módulos |
| `enterprise` | Plano enterprise — customizado |

### Máquina de estados (billingStatus)

```
active → past_due (payment_overdue)
past_due → active (payment_confirmed)
past_due → suspended (subscription_cancelled)
active → suspended (subscription_cancelled)
suspended → active (subscription_renewed)
```

- **active** — acesso normal
- **past_due** — acesso mantido com aviso (grace period)
- **suspended** — bloqueado (ForbiddenError ao acessar dashboard/API)
- **cancelled** — bloqueado permanentemente

### Use Cases

| Use Case | Descrição |
|----------|-----------|
| `CheckSubscription` | Verifica se o tenant pode acessar o sistema (bloqueia suspended/cancelled/trial expirado) |
| `ProcessBillingWebhook` | Processa eventos do gateway (payment_confirmed, payment_overdue, subscription_cancelled, subscription_renewed, subscription_upgraded) |

### API Routes

| Rota | Método | Ação | Auth |
|------|--------|------|------|
| `/api/billing` | GET | Status da assinatura do tenant | Autenticado |
| `/api/billing/webhook` | POST | Receber eventos do gateway | Público (x-webhook-secret) |

### O que falta para produção

- Integração real com Stripe ou Asaas (criar adapter)
- Página de escolha de plano (/pricing ou /upgrade)
- Banner de "trial expirando" no dashboard
- Página de billing com histórico de faturas
- Chamar `CheckSubscription` no middleware ou nas API routes críticas

### Variáveis de ambiente

```bash
BILLING_WEBHOOK_SECRET=sua-chave-secreta  # Validação do webhook
```

*Última atualização: 05/06/2026 — Módulo 15 (Billing/Assinatura) infra implementada.*


---

## Melhorias de UX na Ordem de Serviço (15/06/2026)

### Seleção Múltipla de Serviços e Peças

Ao criar ou editar uma OS, o atendente pode agora selecionar vários serviços ou peças de uma vez, evitando adicionar um a um.

- **Componente:** `src/components/ui/MultiSelectModal.tsx` — modal reutilizável com busca, checkboxes e confirmação em lote
- **Botão:** "Adicionar Vários" (ícone ListChecks) ao lado do "Adicionar" individual
- **Comportamento:** Abre modal com lista completa do catálogo/estoque, busca por texto, seleção com checkboxes, confirma e todos os itens são inseridos com preço/tempo/vínculo preenchidos
- **Onde:** Criação (`/dashboard/orders/new`) e Edição (`/dashboard/orders/[id]/edit`)
- **Excluídos:** Itens já adicionados na reclamação não aparecem no modal (evita duplicata)

### Tempo Estimado Visível no Cronômetro do Mecânico

O mecânico agora vê o tempo previsto para cada serviço junto ao cronômetro, sabendo o limite esperado.

- **Prop:** `estimatedMinutes` adicionada ao `TimerControl`
- **UI:** Banner amarelo "Tempo previsto: HH:MM:SS" logo abaixo do cronômetro real
- **Alerta:** Se o tempo apontado exceder o estimado, aparece "⚠ Excedido" em vermelho
- **Origem do dado:** `OrderService.timeMinutes` (copiado do `ServiceCatalog.estimatedTime` ao criar a OS)

### Arquivos criados/modificados

| Arquivo | Ação |
|---------|------|
| `src/components/ui/MultiSelectModal.tsx` | Criado — componente modal de seleção múltipla |
| `src/components/ui/index.ts` | Exporta MultiSelectModal e MultiSelectItem |
| `src/app/dashboard/orders/new/page.tsx` | Botões "Adicionar Vários" + modais + handlers |
| `src/app/dashboard/orders/[id]/edit/page.tsx` | Botões "Adicionar Vários" + modais + handlers |
| `src/components/timer/TimerControl.tsx` | Prop `estimatedMinutes` + exibição tempo previsto |
| `src/app/dashboard/orders/[id]/page.tsx` | Passa `estimatedMinutes={s.timeMinutes}` ao TimerControl |

*Última atualização: 15/06/2026 — Seleção múltipla + tempo previsto no cronômetro.*
