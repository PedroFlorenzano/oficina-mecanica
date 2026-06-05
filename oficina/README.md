# Operare — Sistema de Gestão para Oficinas Mecânicas

Sistema SaaS multi-tenant de gestão para oficinas mecânicas automotivas brasileiras. Desenvolvido com Next.js 16, TypeScript, Prisma, PostgreSQL com Row-Level Security e Clean Architecture (DDD).

## Stack

- **Frontend:** Next.js 16 (App Router) + Tailwind CSS 4
- **Backend:** API Routes + Clean Architecture (DDD)
- **Banco:** PostgreSQL 16 (via Docker) + Row-Level Security (RLS)
- **ORM:** Prisma 6
- **Auth:** NextAuth v4 + JWT
- **PDF:** @react-pdf/renderer
- **WhatsApp:** Evolution API

## Módulos

| Módulo | Status |
|--------|--------|
| Clientes e Veículos | ✅ |
| Ordens de Serviço | ✅ |
| Controle de Estoque | ✅ |
| Pista (Kanban) | ✅ |
| Autenticação + RBAC | ✅ |
| Cronômetro de Serviço | ✅ |
| Gestão de Comissões | ✅ |
| WhatsApp + Assinatura Digital | ✅ |
| Etiqueta de Troca de Óleo | ✅ |
| Relatórios Financeiros | ✅ |
| NF-e/NFS-e | ✅ (simulado) |
| Multi-Tenancy (PostgreSQL + RLS) | ✅ |

## Setup

```bash
cd oficina
npm install
cp .env.example .env  # editar com seus valores

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
```

Acesse http://localhost:3000

**Credenciais demo:**
- Admin Paiffer: `admin@paiffer.com` / `password123`
- Mecânico Paiffer: `mecanico@paiffer.com` / `password123`
- Admin Demo: `admin@demo.com` / `password123`

## Arquitetura

```
src/
├── domain/          # Regras de negócio puras
├── application/     # Use cases + DTOs
├── infrastructure/  # Prisma repos + DI (createContainer por tenant)
├── app/             # Next.js App Router
├── components/      # React components + Design System
└── lib/             # Utilitários compartilhados
```

### Multi-Tenancy (Defense in Depth)

```
API Route → requireAuth() → session.tenantId
  → createContainer(tenantId) → repositórios com RLS ativo
    → PostgreSQL RLS policies bloqueiam acesso cross-tenant
```

- **Camada 1 (código):** Todos os repositórios filtram por `tenantId`
- **Camada 2 (banco):** RLS policies em 22 tabelas (12 diretas + 10 indiretas via join)
- **Roles:** `operare_app` (sem BYPASSRLS) para uso normal, `operare` owner (BYPASSRLS) para login/assinatura pública

## Testes

```bash
npm test           # 218 testes unitários
npm run build      # Build de produção
```

## Documentação

- **[Manual do Usuário](./MANUAL-USUARIO.md)** — Guia completo de uso do sistema
- **PDF do Manual:** Acesse `/api/manual` com o sistema rodando para baixar o PDF
- **[Contexto do Projeto](./CONTEXTO-PROJETO.md)** — Decisões técnicas e estado atual

## Roadmap para Produção

### 1. NF-e/NFS-e — Adapter Real
- Certificado digital A1 (upload + assinatura XML)
- Adapter SEFAZ (webservice SOAP, NF-e 4.0)
- Adapter Prefeitura (API REST ABRASF, NFS-e)
- DANFE com código de barras (Code128)

### 2. Multi-Tenancy — Próximos Passos
- ~~Migração SQLite → PostgreSQL~~ ✅
- ~~Row-Level Security em 22 tabelas~~ ✅
- ~~Roles separados (operare_app / operare_admin)~~ ✅
- ~~Seed multi-tenant (2 tenants)~~ ✅
- ~~Validação end-to-end com Docker~~ ✅
- Onboarding self-service (cadastro de nova oficina)
- Billing/Assinatura (Stripe, Asaas)
- Path-based multi-tenant (`app.operare.tech/paiffer`)

### 3. Deploy em Produção
- Hosting (Vercel / AWS / VPS)
- Domínio + SSL (`operare.tech`)
- CI/CD (GitHub Actions)
- Backup diário + monitoramento (Sentry)

### 4. Comercialização
- Landing page + deck comercial
- Planos e preços
- Contrato / LGPD
- Canal de suporte

## Licença

Proprietary — Paiffer Tecnologia
