# Ativar o Row-Level Security

**Situação: as policies existem no banco e não protegem nada em produção.**

Reescrita da spec `postgresql-rls-migration` depois da auditoria de 09/09/2026. A parte de migrar de SQLite para PostgreSQL foi concluída e está em produção; o que sobrou é a metade que dá o nome à spec e nunca entrou em vigor.

## O diagnóstico

A aplicação conecta ao Neon com o role `neondb_owner`, que tem o atributo `BYPASSRLS`. O Postgres ignora policies para roles com esse atributo. Logo, as 30 tabelas com RLS habilitado e as 30 policies correspondentes não filtram uma única linha.

Confirmado por `GET /api/admin/db-diagnostics`, que retornou `current_user: neondb_owner` e `bypasses_rls: true` **nas duas conexões** (aplicação e admin).

Consequência: o isolamento entre oficinas depende exclusivamente do filtro por `tenantId` no código. Funciona — mas sem rede de proteção. Duas falhas reais já foram encontradas por inspeção, ambas em rotas de fotos, e uma terceira segue aberta (item S1 do [backlog](../backlog.md)).

## Por que não é só trocar a variável de conexão

Trocar `DATABASE_URL` para um role sem `BYPASSRLS` **quebraria produção na hora**. As policies dependem da variável de sessão `app.current_tenant_id`, definida por `withTenant()` dentro de uma transação. Consultas feitas fora desse contexto não têm a variável definida e, com RLS ativo, retornariam **zero linhas** — telas vazias, sem erro visível.

São 14 arquivos de produção nessa situação (verificado por busca de importação do cliente Prisma base):

**Rotas de API**
- `api/orders/export/route.ts`
- `api/orders/[id]/warranty/route.ts`
- `api/schedule/holidays/route.ts`
- `api/suppliers/click/route.ts`
- `api/suppliers/search/route.ts`
- `api/whatsapp/instance/route.ts`
- `api/admin/db-diagnostics/route.ts` — legítimo, é justamente o diagnóstico do banco

**Use cases**
- `orders/CalculateOrderDeadline.ts`
- `orders/CheckWarranty.ts`
- `stock/ConfirmStockConsumption.ts`
- `timer/GetTimersByOrder.ts`
- `timer/GetTimersByService.ts`
- `timer/StartTimer.ts`
- `whatsapp/SendStatusNotification.ts`

Ponto importante, que evita alarme falso: **esses arquivos filtram por `tenantId` explicitamente** (`where: { id, tenantId }`). Não há vazamento neles hoje. O problema é outro — eles não passam pelo `withTenant`, então **deixariam de funcionar** quando o RLS ficasse ativo.

Há também rotas que usam `prismaAdmin` para dados de oficina (`api/kits`, `api/billing`). Verificado: filtram por `tenantId` corretamente. O uso do cliente admin ali é inconsistência de padrão, não falha de isolamento — mas essas rotas ficariam permanentemente fora da proteção do RLS, porque o cliente admin ignora policies por definição.

## Ordem de execução

A sequência importa: qualquer inversão coloca produção em risco.

**1. Corrigir o item S1 primeiro.** Incluir `tenantId` em `findById` do repositório de OS e auditar os outros repositórios em busca do mesmo padrão. Isso vale por si, independente do RLS, e reduz o risco de tudo o que vem depois.

**2. Migrar os 14 arquivos** para `createContainer(tenantId)` ou `withTenant(tenantId)`. Mudança mecânica, mas precisa de teste por rota: uma consulta esquecida só aparece como tela vazia.

**3. Padronizar as rotas que usam `prismaAdmin`** sem necessidade real de operação cross-tenant. Manter o cliente admin apenas onde é justificado: login, assinatura pública, webhooks, cron e rate limit.

**4. Criar o role de runtime pelo SQL Editor do Neon**, não pelo console. Roles criados pelo console do Neon recebem `neon_superuser`, que **tem `BYPASSRLS`** — criar por lá reproduz exatamente o problema atual. O role precisa de `SELECT`, `INSERT`, `UPDATE`, `DELETE` nas tabelas da aplicação e nada além disso.

**5. Validar em branch do Neon**, nunca direto em produção. Branch é cópia isolada: aponte a aplicação para ela com o role novo e navegue por todas as telas procurando lista vazia.

**6. Escrever os testes de isolamento** (tasks 11.1 a 11.6 da spec original) contra o Postgres real, agora que passariam pelo motivo certo:
   - Consulta de uma oficina nunca retorna linha de outra
   - Escrita não consegue gravar com `tenantId` alheio
   - `UPDATE` e `DELETE` não alcançam linha de outra oficina
   - Tabelas ligadas indiretamente (itens de OS, movimentações) herdam o isolamento via join
   - Sem `app.current_tenant_id` definido, o resultado é vazio, não é tudo

**7. Só então apontar `DATABASE_URL`** para o role novo, mantendo o owner em `DIRECT_URL` (migrations precisam de mais privilégio) e em `DATABASE_URL_ADMIN`.

**8. Confirmar pelo diagnóstico** que `bypasses_rls` passou a ser `false` na conexão da aplicação, e revisar o veredito da rota `/api/admin/db-diagnostics`.

## Como saber que valeu

O teste final não é técnico: apagar o filtro `tenantId` de uma consulta, em ambiente de teste, e confirmar que **o banco recusa** devolver dado alheio. Se recusar, a segunda camada existe. Hoje, esse experimento devolveria dados de todas as oficinas.

## Estimativa e risco

Trabalho de 2 a 3 dias, com risco alto de indisponibilidade se feito fora de ordem. O ganho é deixar de depender da perfeição de cada consulta escrita daqui para frente — o que, num sistema com 97 rotas e crescendo, é a diferença entre um erro custar uma tela vazia e custar um vazamento entre clientes.

Não há urgência de prazo enquanto houver poucas oficinas em produção, mas o risco cresce com cada nova oficina e cada nova rota.
