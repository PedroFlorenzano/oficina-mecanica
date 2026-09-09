# Arquitetura

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js 16 (App Router) |
| Linguagem | TypeScript 5 |
| Estilo | Tailwind CSS 4 |
| ORM | Prisma 6 |
| Banco | PostgreSQL — Neon (`sa-east-1`) em produção, Docker em desenvolvimento |
| Autenticação | NextAuth v4 com estratégia JWT |
| Formulários | react-hook-form + Zod 4 |
| PDF | @react-pdf/renderer |
| Ícones | lucide-react |
| Senhas | bcryptjs |
| Armazenamento de imagens | Cloudinary (produção), disco local (desenvolvimento) |
| WhatsApp | Evolution API |
| Testes | Jest + fast-check (property-based), Playwright (E2E) |

## Camadas

Clean Architecture com DDD. A dependência aponta sempre para dentro: `app` → `application` → `domain`, com `infrastructure` implementando as interfaces do domínio.

```
src/
├── domain/           Regras de negócio puras. Não importa Next.js, Prisma ou React.
│   ├── errors/       DomainError e subclasses
│   ├── repositories/ Interfaces (contratos) — I<Entidade>Repository
│   ├── services/     Serviços de domínio (ex: WorkDayCalculator)
│   ├── storage/      Contrato de armazenamento de arquivos (IFileStorage)
│   └── value-objects/ CPF, CNPJ, Document, Email, Money, Plate,
│                      OrderStatusTransitions, PasswordValidator
├── application/      Orquestra o domínio
│   ├── dtos/         Formatos de entrada dos use cases
│   └── use-cases/    Um arquivo por operação, 18 módulos
├── infrastructure/   Única camada que fala com Prisma e serviços externos
│   ├── database/     prisma.ts — withTenant() e prismaAdmin
│   ├── repositories/ Prisma<Entidade>Repository — 15 implementações
│   ├── storage/      LocalFileStorage e CloudinaryFileStorage
│   ├── fiscal/       Adapters NF-e/NFS-e, assinatura XML, certificado
│   ├── whatsapp/     Integração com Evolution API
│   ├── marketplace/  Busca em catálogo de fornecedores
│   └── container.ts  Injeção de dependência
├── app/              App Router — rotas de API finas e páginas
├── components/       Componentes React, incluindo o design system em ui/
└── lib/              Utilitários compartilhados
```

### O que pertence a cada camada

Um erro comum é colocar regra de negócio na rota. A rota deve apenas autenticar, montar o input, chamar o use case e tratar o erro. Se você precisa de um `if` sobre regra de negócio dentro de `route.ts`, ele provavelmente pertence ao use case.

## Padrões de código

### Rota de API

```ts
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const container = createContainer(session.user.tenantId);

    const useCase = new CreateClient(container.clientRepository);
    const result = await useCase.execute(await request.json(), session.user.tenantId);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
```

Três peças obrigatórias:
- `requireAuth()` de `@/lib/auth` — devolve a sessão ou lança; nunca lê `tenantId` do corpo da requisição.
- `createContainer(tenantId)` de `@/infrastructure/container` — monta os repositórios já no contexto do tenant.
- `handleError(error)` de `@/lib/api-handler` — traduz erro de domínio em resposta HTTP.

Para restringir a ADMIN, compare `session.user.role !== "ADMIN"` e responda 403. Para permissões mais finas, use `hasPermission()` de `@/lib/permissions`.

### Use case

Injeção pelo construtor, um método `execute`, e erro de domínio para violação de regra:

```ts
export class CreateClient {
  constructor(private readonly repository: IClientRepository) {}

  async execute(input: CreateClientDTO, tenantId: string) {
    // valida, aplica regra, delega persistência ao repositório
  }
}
```

### Erros

Definidos em `src/domain/errors/DomainError.ts` e mapeados por `handleError` (o mapa real está em `src/lib/api-handler.ts`):

| Erro | HTTP |
|------|------|
| `ValidationError` | 400 |
| `BusinessRuleError` | 400 |
| `AuthenticationError` | 401 |
| `ForbiddenError` | 403 |
| `NotFoundError` | 404 |
| `ConflictError` | 409 |
| `RateLimitError` | 429 (com header `Retry-After`) |

Erro de domínio sem mapeamento cai em 400. Note que violação de regra de negócio responde 400, não 422.

Mensagens sempre em português do Brasil — elas chegam ao usuário final.

### Value objects

Validação passa pelo construtor do value object, não por `if` espalhado. `CPF`, `CNPJ`, `Document` (escolhe entre os dois), `Email`, `Money`, `Plate`.

### Design system

Componentes em `src/components/ui/` (`Button`, `Input`, `Select`, `Badge`, `Card`, `Modal`, `Table`, `PageHeader`, `EmptyState`, `Combobox`). Prefira-os a HTML solto: eles carregam acessibilidade e consistência visual.

## Multi-tenancy — como funciona de fato

Esta seção é a mais importante do documento, porque a versão anterior da documentação a descrevia errado.

O isolamento entre oficinas está previsto em duas camadas:

**Camada 1 — código (ativa).** Toda consulta filtra por `tenantId`. O `tenantId` vem sempre da sessão autenticada, nunca do cliente. `createContainer(tenantId)` usa `withTenant()`, que abre uma transação e executa `set_config('app.current_tenant_id', ..., true)` antes das consultas.

**Camada 2 — banco, via Row-Level Security (existe, mas INERTE em produção).** As migrations criam `ENABLE ROW LEVEL SECURITY` e policies para as tabelas com dado de tenant. Só que a aplicação se conecta ao Neon com o role `neondb_owner`, que tem o atributo `BYPASSRLS` — e o Postgres ignora policies para roles com esse atributo. Resultado: as policies não filtram nada em produção.

Consequência prática: **hoje o isolamento depende exclusivamente da camada 1.** Um esquecimento de `where tenantId` numa consulta vaza dados entre oficinas, sem rede de proteção. Duas ocorrências já foram encontradas assim (ver `seguranca.md`).

Para conferir o estado a qualquer momento, um ADMIN pode chamar `GET /api/admin/db-diagnostics`, que informa o role da conexão, se ele tem `BYPASSRLS`, e quantas tabelas e policies existem.

O caminho para ativar a camada 2 está em [specs/rls-ativacao.md](./specs/rls-ativacao.md). Não é uma troca de variável: cerca de 25 arquivos consultam o Prisma fora do `withTenant`, e passariam a receber zero linhas.

### Container e o cliente admin

- `createContainer(tenantId)` — uso normal, com contexto de tenant.
- `adminContainer` — operações legitimamente cross-tenant: login (procurar usuário por e-mail antes de saber o tenant), página pública de assinatura, webhook do WhatsApp e o cron de lembretes. Usa `prismaAdmin`, que aponta para `DATABASE_URL_ADMIN` ou, na falta dela, `DATABASE_URL`.

Ao escrever código novo, `adminContainer` deve ser exceção justificada, não conveniência.

## Convenções

| Artefato | Convenção | Exemplo |
|----------|-----------|---------|
| Use case | Classe PascalCase, verbo + substantivo | `CreateClient`, `UpdateOrderStatus` |
| Interface de repositório | Prefixo `I` | `IClientRepository` |
| Repositório Prisma | Prefixo `Prisma` | `PrismaClientRepository` |
| DTO | `Create`/`Update` + entidade + `DTO` | `CreateVehicleDTO` |
| Model do banco | PascalCase singular | `ServiceOrder`, `StockItem` |
| Componente | PascalCase | `StockItemForm.tsx` |

Importações usam o alias `@/` para `src/`. Não use caminho relativo atravessando camadas.

## Checklist para um módulo novo

1. `domain/repositories/I<Entidade>Repository.ts` — o contrato
2. `application/dtos/Create<Entidade>DTO.ts` — o formato de entrada
3. `application/use-cases/<modulo>/` — um arquivo por operação
4. `infrastructure/repositories/Prisma<Entidade>Repository.ts` — a implementação
5. `infrastructure/container.ts` — registrar o repositório
6. `app/api/<recurso>/route.ts` e `[id]/route.ts` — controllers finos
7. `app/dashboard/<modulo>/page.tsx` e `<Entidade>Form.tsx` — a interface
8. Testes do use case em `__tests__/` ao lado dele

Se a entidade tem dado de oficina, ela precisa de `tenantId` e de filtro por `tenantId` em **toda** consulta — inclusive `findById`.
