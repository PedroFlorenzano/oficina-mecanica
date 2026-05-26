# Sistema Oficina Mecânica

Sistema SaaS de gestão para oficinas mecânicas automotivas brasileiras. Desenvolvido com Next.js 16, TypeScript, Prisma e Clean Architecture.

## Stack

- **Frontend:** Next.js 16 (App Router) + Tailwind CSS 4
- **Backend:** API Routes + Clean Architecture (DDD)
- **ORM:** Prisma 6 + SQLite (dev) / PostgreSQL (prod)
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

## Setup

```bash
cd oficina
npm install
cp .env.example .env  # editar com seus valores
npx prisma migrate dev
npx prisma db seed
npm run dev
```

Acesse http://localhost:3000

**Credenciais demo:**
- Admin: `admin@paiffer.com` / `password123`
- Mecânico: `mecanico@paiffer.com` / `password123`

## Arquitetura

```
src/
├── domain/          # Regras de negócio puras
├── application/     # Use cases + DTOs
├── infrastructure/  # Prisma repos + DI
├── app/             # Next.js App Router
├── components/      # React components + Design System
└── lib/             # Utilitários compartilhados
```

## Testes

```bash
npm test           # 213 testes unitários
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
- BullMQ + Redis (processamento assíncrono, opcional)
- DANFE com código de barras (Code128)

### 2. Multi-Tenancy Real
- Migração SQLite → PostgreSQL
- Isolamento por schema ou row-level security
- Onboarding self-service (cadastro de nova oficina)
- Billing/Assinatura (Stripe, Asaas)
- Subdomínio por tenant

### 3. Deploy em Produção
- Hosting (Vercel / AWS / VPS)
- Domínio + SSL
- CI/CD (GitHub Actions)
- Backup diário + monitoramento (Sentry)

### 4. Comercialização
- Landing page + deck comercial
- Planos e preços
- Contrato / LGPD
- Canal de suporte

## Licença

Proprietary — Paiffer Tecnologia
