# Segurança

Estado real das proteções, incluindo o que **não** está protegido. Um documento de segurança que só lista acertos é pior que documento nenhum, porque cria confiança indevida.

## Autenticação

NextAuth v4 com estratégia JWT, sessão de 24 horas. Credenciais verificadas por `LoginUser`, senha com bcrypt.

- **Bloqueio por tentativa:** 5 senhas erradas bloqueiam a conta por 15 minutos (`failedLoginCount` e `lockedUntil` em `User`). O contador zera no acesso bem-sucedido.
- **Conta inativa é recusada** no login, não apenas escondida na interface.
- **Origem do tenant:** `requireAuth()` devolve a sessão e o `tenantId` vem dela. Nenhuma rota deve aceitar `tenantId` do corpo ou da query — seria trivial trocar de oficina.

O middleware (`src/middleware.ts`) responde 401 em JSON para rotas de API sem sessão e redireciona páginas para `/login`. As rotas públicas estão na constante `PUBLIC_API_PREFIXES`, em um único lugar:

`/api/auth/`, `/api/public/`, `/api/health`, `/api/whatsapp/webhook`, `/api/whatsapp/reminders`, `/api/billing/webhook`

Ao criar rota pública nova, é essa lista que precisa ser alterada — e cada entrada nela é uma decisão de segurança, não de conveniência.

## Autorização

Três papéis: ADMIN, MECHANIC, ATTENDANT. A matriz de permissões está em `src/lib/permissions.ts`, com `hasPermission()`. Além do papel, cada usuário pode ter permissões customizadas que refinam o padrão — usado para dar a um mecânico específico acesso a algo além do seu papel.

Checagens acontecem em três níveis: middleware (bloqueia área inteira, como `/dashboard/users` só para ADMIN), rota de API (403 quando o papel não permite) e interface (esconde ou desabilita o botão). A checagem na interface é conveniência; **a que protege é a da rota**.

## Isolamento entre oficinas

Este é o ponto de atenção principal do sistema. Leia [arquitetura.md](./arquitetura.md#multi-tenancy--como-funciona-de-fato) para o mecanismo.

Resumo do risco: o RLS do Postgres **não protege nada em produção** hoje, porque a conexão usa um role com `BYPASSRLS`. Todo o isolamento vem do filtro por `tenantId` no código. Isso significa que uma consulta sem filtro vaza dados entre oficinas — e isso já aconteceu duas vezes:

| Onde | O que vazava | Situação |
|------|--------------|----------|
| `GET /api/uploads/<chave>` | Qualquer usuário logado lia foto de outra oficina se soubesse o caminho | Corrigido: a chave começa com `t/<tenantId>` e é comparada com a sessão |
| `GET /api/orders/[id]/photos` | Metadados das fotos (descrição, nome do arquivo, quem enviou) de OS de outra oficina | Corrigido: a rota confirma que a OS pertence ao tenant |

E há um caso conhecido **ainda aberto**: `PrismaServiceOrderRepository.findById(id)` não recebe `tenantId`. Qualquer rota que dependa só dele pode devolver OS de outra oficina se o identificador for conhecido; o que protege hoje é apenas a imprevisibilidade do id. Está registrado como item S1 no [backlog](./backlog.md).

Para auditar o estado: `GET /api/admin/db-diagnostics` (só ADMIN) informa o role da conexão, se tem `BYPASSRLS`, e a cobertura de policies, sem expor credencial.

## Rotas públicas

Rotas sem autenticação são a superfície mais exposta do sistema. Duas camadas as protegem.

### Rate limit

Implementado em `src/lib/rate-limit.ts`, com contagem na tabela `RateLimitHit` do Postgres. A contagem precisa ficar no banco porque em ambiente serverless cada requisição pode cair numa instância diferente — contador em memória não funcionaria.

| Chave | Limite |
|-------|--------|
| `register:attempt:ip:<ip>` | 15 por hora |
| `register:attempt:global` | 100 por hora |
| `register:success:ip:<ip>` | 3 por dia |
| `schedule:ip:<ip>` | 5 por hora |
| `schedule:tenant:<id>` | 60 por hora |

Tentativa e sucesso são cotas **separadas** de propósito. Quando eram a mesma, errar o formulário três vezes bloqueava o cadastro pelo resto do dia.

Excedido: HTTP 429 com header `Retry-After`. A API tem `checkRateLimit` (só consulta), `recordRateLimitHit` (só registra) e `enforceRateLimit` (faz os dois) — a separação existe para só cobrar a cota de sucesso após a operação dar certo.

### Captcha

Cloudflare Turnstile, em `/register` e no agendamento público. A verificação só é exigida quando `TURNSTILE_SECRET_KEY` existe, então desenvolvimento e CI funcionam sem configurar nada.

Indisponibilidade da Cloudflare **não** bloqueia o cadastro — o rate limit é a segunda camada. Cada token é válido para um único envio, então o widget é reiniciado a cada falha de formulário.

## Armazenamento de imagens

Fotos de veículos de clientes são dado pessoal e recebem tratamento correspondente.

- Enviadas ao Cloudinary como `authenticated`: não existe URL pública adivinhável.
- A aplicação **nunca entrega o link do provedor ao navegador**. Quem serve os bytes é `/api/uploads`, que valida sessão e tenant. Assim nenhum link continua funcionando fora do sistema.
- A chave tem o formato `t/<tenantId>/orders/<orderId>/<uuid>.<ext>`, e a autorização é decidida por `isKeyOwnedByTenant()` em `src/lib/file-access.ts` — função pura, com testes cobrindo travessia de diretório, segmento vazio, prefixo forjado e o caso sutil de um tenant cujo id é prefixo de outro.
- Acesso negado responde **404, não 403**, para não confirmar que o arquivo existe em outra oficina.
- O tipo do arquivo é determinado pelos **bytes iniciais** (`src/lib/image-validation.ts`), não pelo `Content-Type` que o navegador declara. HTML, SVG e PDF renomeados para `.jpg` são recusados.

## Segredos

Regra que já custou um incidente: **variável com prefixo `NEXT_PUBLIC_` é embutida no JavaScript enviado ao navegador.** Qualquer segredo ali é público.

Ocorrido: a Secret Key do Turnstile foi colocada em `NEXT_PUBLIC_TURNSTILE_SITE_KEY` e foi publicada no bundle. Foi detectada, rotacionada e corrigida. Nenhuma credencial do Cloudinary usa esse prefixo, por isso o aviso explícito no `.env.example`.

Segundo ponto: **o repositório é público.** A migration `20260605001456_add_rls_policies` contém senha de role em texto claro, acessível por qualquer um. Mitigado revogando o LOGIN desses roles (migration `20260909160000_revoke_orphan_role_login`), mas a lição vale para o futuro: nada de credencial em migration.

## Auditoria e trilhas

- `TimerAuditLog` registra toda correção de tempo — o tempo vira dinheiro via comissão.
- Movimentações de estoque não são editáveis nem apagáveis; correção é lançamento novo.
- Histórico de status da OS guarda origem, destino, data e autor.

## Pendências de segurança

Detalhadas no [backlog](./backlog.md):

- **S1** — `findById` sem filtro de tenant, e a auditoria das demais rotas em busca do mesmo padrão.
- **S2** — 26 avisos do `npm audit` (6 críticos), todos em dependências pré-existentes.
- Ativar o RLS de verdade ([specs/rls-ativacao.md](./specs/rls-ativacao.md)).
- Reset de senha por e-mail não existe; hoje só ADMIN redefine senha de outro usuário.
- Sem rastreamento de erros de aplicação em produção — falha silenciosa não gera alerta.
