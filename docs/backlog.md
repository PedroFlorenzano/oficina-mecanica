# Backlog

Última revisão: 09/09/2026.

Ordem de prioridade: primeiro o que protege quem já usa o sistema, depois o que destrava receita, por último melhorias.

## 1. Protege quem já usa

| # | Item | Esforço | Situação |
|---|------|---------|----------|
| S1 | **`findById` sem filtro de tenant** | 3–5h | `PrismaServiceOrderRepository.findById(id)` não recebe `tenantId`. O comentário no código diz que o RLS protege, mas o RLS está inerte em produção. Qualquer rota que dependa só dele pode devolver OS de outra oficina se o id for conhecido; hoje só a imprevisibilidade do id protege. Correção: incluir `tenantId` na assinatura e ajustar todos os chamadores. Auditar as demais rotas em busca do mesmo padrão. |
| S2 | **Vulnerabilidades em dependências** | 2–4h | 26 avisos do `npm audit` (6 críticos, 15 altos), todos pré-existentes: `next`, `next-auth`, `xml-crypto`, `xlsx`, `prisma`, `playwright`, `@babel/core`, `@xmldom/xmldom`. Nenhum do `cloudinary`. Não é `npm audit fix` cego — pode subir major de `next`/`prisma`. Commit isolado, com E2E e validação do módulo fiscal, que depende de `xml-crypto` e `fast-xml-parser`. |
| S3 | **Backup externo do banco** | 3–4h | O plano gratuito do Neon retém **6 horas** de histórico e permite 1 snapshot manual. Erro percebido na manhã seguinte é irrecuperável e não existe cópia fora do Neon. Fazer `pg_dump` diário via GitHub Actions para armazenamento externo, **com restauração testada** — só conta como pronto depois de restaurar de verdade. |
| S4 | **Rastreamento de erros de aplicação** | 1–2h | O monitoramento atual diz se o site está no ar, não se uma tela lança exceção. Recomendado Sentry no plano gratuito (entra com login do GitHub, sem credencial nova). Alternativa sem serviço externo é tabela de log com tela de ADMIN, mas consome o 0,5 GB apertado do Neon. |
| S5 | **Trocar a senha do `neondb_owner`** | 15min | A credencial circulou por canais pouco controlados. É o role com acesso total ao banco. |
| S6 | **Reset de senha por e-mail** | 4–6h | Não existe. Hoje só um ADMIN redefine a senha de outro usuário, e um ADMIN que perde a senha depende de intervenção manual no banco. Nenhuma biblioteca de e-mail no projeto ainda; Resend tem faixa gratuita. |
| S7 | **Alerta de cota do banco** | 1–2h | Não existe aviso algum de que o banco está perto do limite. Os 0,5 GB do plano gratuito, ao estourar, fazem **inserções e atualizações falharem** — a oficina simplesmente não consegue mais abrir OS. O plano gratuito do Neon também não oferece notificação de consumo. Hoje em 0,04 GB (8%), mas sem vigilância isso vira uma parada de operação sem aviso. Basta o job diário já existente consultar `pg_database_size` e falhar o workflow acima de um limite. |

## 2. Destrava receita

| # | Item | Esforço | Situação |
|---|------|---------|----------|
| C1 | **Gateway de pagamento** | 4–8h | Não existe uma linha de Stripe ou Asaas. O webhook `/api/billing/webhook` existe e valida assinatura, mas **nada o chama**. Asaas cobre boleto, Pix e cartão com API brasileira. Sem isso, cobrança é manual. |
| C2 | **Restrição de funcionalidade por plano** | 4–6h | Hoje **toda conta tem acesso a tudo**, independente do plano. Sem isso não há diferença entre os planos na prática. Contas piloto devem manter acesso total. |
| C3 | **Contrato e LGPD** | 2–3h | Termos de uso e política de privacidade. Necessário antes de faturar, especialmente porque o sistema guarda dado pessoal de terceiros (clientes das oficinas) e fotos de veículos. |
| C4 | **Decidir o plano da Vercel** | — | O plano Hobby é destinado a uso não comercial. Operar cobrando de clientes exige o plano pago. Decisão de negócio, não técnica. |
| C5 | **Landing page com conteúdo real** | 2–3h | Faltam capturas de tela reais e revisão do texto. |

### Planos definidos

Básico R$250, Profissional R$400, Enterprise R$600 por mês.

| Funcionalidade | Básico | Profissional | Enterprise |
|----------------|:-:|:-:|:-:|
| OS ilimitadas, clientes, veículos, estoque | ✅ | ✅ | ✅ |
| Relatórios financeiros e PDF de OS/orçamento | ✅ | ✅ | ✅ |
| Limite de usuários | 3 | 10 | ilimitado |
| NF-e e NFS-e | — | ✅ | ✅ |
| WhatsApp e aprovação digital | — | ✅ | ✅ |
| Cronômetro e comissões | — | ✅ | ✅ |
| Agendamento online e Pista | — | ✅ | ✅ |
| Multi-loja, produtividade, exportação, garantia, fotos | — | — | ✅ |
| Migração do sistema anterior | — | — | ✅ |
| Suporte | e-mail | WhatsApp prioritário | dedicado |

## 3. Projeto próprio: ativar o RLS

Trabalho com risco alto de quebrar produção, detalhado em [specs/rls-ativacao.md](./specs/rls-ativacao.md). Resumo: 14 arquivos de produção consultam o Prisma fora do `withTenant`. Eles **filtram `tenantId` explicitamente**, então não vazam dados hoje — mas passariam a receber zero linhas se o role perdesse `BYPASSRLS`, porque a variável de sessão que as policies usam não estaria definida. Trocar a variável de conexão hoje deixaria telas vazias em produção, sem erro visível.

## 4. Dívida técnica com prazo

| Item | Prazo | Observação |
|------|-------|-----------|
| Renomear `src/middleware.ts` → `proxy.ts` | Antes do Next 17 | Depreciado no Next 16. Commit isolado, com teste de login e de acesso por oficina. |
| Mover config do Prisma de `package.json` para `prisma.config.ts` | Antes do Prisma 7 | O formato atual sai na próxima major. |
| Teste do `CalculateOrderDeadline` | — | O `WorkDayCalculator` tem testes; o use case que combina tudo não. É o cálculo com mais regras do sistema. |

## 5. Melhorias sem urgência

| Item | Esforço | Observação |
|------|---------|-----------|
| Consulta de placa com preenchimento automático | 1h + custo | Infraestrutura pronta (`/api/vehicles/plate`); falta contratar API e definir `PLATE_API_TOKEN`. Recomendado API Placas (apiplacas.com.br), cerca de R$0,03 a R$0,05 por consulta em pacotes. Alternativas: PlacaFipe (similar), CarsXE (mais completo e mais caro), SINESP e scrapers open-source (instáveis, não recomendados para produção). |
| DANFSe v2.0 em PDF | 6–8h | **Correção de registro:** o backlog anterior dizia que a NFS-e no padrão Nacional estava toda por fazer. Não está: `NacionalNfseAdapter` existe, tem testes, e é o caminho padrão para NFS-e em `createFiscalAdapter`. O que falta é o **documento auxiliar em PDF** (DANFSe v2.0, conforme NT 008 SE/CGNFS-e), com QR Code, seção de tributação IBS/CBS e marca d'água para nota cancelada ou substituída. Hoje a NFS-e é emitida mas não há PDF para entregar ao cliente. |
| NFC-e modelo 65 (cupom fiscal) | 8–16h | Sem demanda. |
| Dashboard de cliques em fornecedores | 4–6h | Item 2.6 da spec de marketplace: relatório de demanda para o administrador da plataforma. Hoje os cliques são gravados (`SupplierClick`) mas não há tela que os leia. |
| Adapters adicionais de fornecedor | — | Existe apenas o do Mercado Livre. |
| Completar o manual do usuário | 1–2h | Duas telas existem no sistema e não têm seção no manual: **Fornecedores** e **Importação de dados**. A de importação é justamente a que um cliente novo usa primeiro, na migração do sistema anterior. |

## Concluído recentemente

Registro do que saiu do backlog, para não ser reaberto por engano. Histórico completo em [historico.md](./historico.md).

| Item | Data |
|------|------|
| Fotos da OS em armazenamento externo (o upload falhava em produção) | 09/09/2026 |
| Isolamento das fotos por oficina, nos arquivos e nos metadados | 09/09/2026 |
| Health check sem consultar o banco (evitava estourar a cota do Neon) | 09/09/2026 |
| Verificação de tipos no CI e zero erro de `tsc` | 09/09/2026 |
| Cron diário, health check e monitoramento de disponibilidade | 09/09/2026 |
| Rate limit e captcha nas rotas públicas | 09/09/2026 |
| 15 ajustes vindos do feedback do cliente-piloto | 09/09/2026 |
| Deploy em produção (Vercel + Neon, `operare.tech`) | 2026 |
| NF-e (SEFAZ) e NFS-e (padrão Nacional) com emissão real | 06/2026 |
| Importação de dados do sistema anterior | 07/2026 |
| Kits de serviço | 08/2026 |
| Exportação de OS em lote (CSV) | 06/2026 |
| PWA, CI/CD, testes E2E, multi-tenant por caminho | 06/2026 |
