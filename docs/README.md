# Documentação — Operare

Documentação técnica do Operare, SaaS de gestão para oficinas mecânicas.

## Índice

| Documento | Para quê |
|-----------|----------|
| [arquitetura.md](./arquitetura.md) | Camadas, padrões de código, como o multi-tenant funciona de fato |
| [modulos.md](./modulos.md) | O que cada módulo faz e onde vive no código |
| [operacao.md](./operacao.md) | Variáveis de ambiente, deploy, CI, cron, monitoramento e limites dos planos gratuitos |
| [seguranca.md](./seguranca.md) | Autenticação, permissões, isolamento entre oficinas, proteção de rotas públicas |
| [backlog.md](./backlog.md) | O que falta, priorizado |
| [historico.md](./historico.md) | Registro condensado do que foi construído, por data |
| [manual-usuario.md](./manual-usuario.md) | Guia de uso do sistema, voltado ao usuário final |
| [specs/](./specs/) | Especificações ativas e arquivo do feedback do cliente-piloto |

## Regras desta documentação

1. **Uma afirmação, um lugar.** Se algo está descrito em `arquitetura.md`, os outros arquivos apontam para lá em vez de repetir. Duplicação foi o que fez a documentação anterior divergir do código.
2. **Só o que é verificável no código.** Nenhum documento aqui deve conter número, status ou comportamento que não possa ser conferido rodando um comando ou abrindo um arquivo. Onde há incerteza, ela é declarada.
3. **Status honesto.** Uma funcionalidade só é descrita como ativa se estiver ativa em produção. O caso do RLS (policies existem mas não têm efeito) é o exemplo de por que essa regra existe.
4. **Histórico separado da referência.** `historico.md` conta o que aconteceu; os demais descrevem como o sistema é hoje. Não misturar.

## Números do projeto

Verificáveis em `oficina/`:

| Medida | Valor | Como conferir |
|--------|-------|---------------|
| Testes unitários | 455 em 45 suítes | `npm test` |
| Testes E2E | 4 arquivos (login, criar OS, multi-tenant, pista) | `npm run test:e2e` |
| Rotas de API | 97 | contar `route.ts` em `src/app/api` |
| Módulos de use case | 18 | pastas em `src/application/use-cases` |
| Repositórios Prisma | 15 | arquivos em `src/infrastructure/repositories` |
| Models / enums no banco | 33 / 15 | `prisma/schema.prisma` |
| Migrations aplicadas | 22 | pastas em `prisma/migrations` |
| Avisos de lint | 0 erros, 34 warnings | `npm run lint` |

Ao alterar esses números, atualize esta tabela — ela é a defesa contra a documentação envelhecer em silêncio.
