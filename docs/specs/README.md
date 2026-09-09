# Especificações

Auditoria feita em 09/09/2026, conferindo cada spec contra o código, não contra os próprios checkboxes.

Isso importou: o `tasks.md` de `autenticacao-perfis` marcava o Permission Guard como pendente, mas ele estava implementado em `src/lib/permissions.ts` desde antes. **Checkbox de spec não é fonte de verdade.**

## Status das 9 specs originais

| Spec | Situação | Destino |
|------|----------|---------|
| autenticacao-perfis | Concluída, e a implementação foi além | Arquivada |
| cronometro-servico | Concluída, incluindo os testes de propriedade opcionais | Arquivada |
| estoque-completo | Concluída | Arquivada |
| gestao-comissoes | Concluída | Arquivada |
| modulos-clientes-os | Concluída | Arquivada |
| pista-kanban-board | Concluída | Arquivada |
| video-feedback-cliente | Concluída (15/15) | Arquivada, com as transcrições preservadas |
| mrp-marketplace | **Parcial** | [Ativa](./mrp-marketplace.md) |
| postgresql-rls-migration | **Parcial, e o essencial não está em produção** | [Ativa, reescrita](./rls-ativacao.md) |

## Por que as concluídas foram arquivadas em vez de mantidas

Nenhuma delas serve mais como referência confiável. Duas razões:

**A implementação divergiu para melhor.** A spec de autenticação descreve papéis fixos; o sistema ganhou permissões customizadas por usuário, que a spec não prevê. Quem ler a spec entende o sistema errado.

**As premissas envelheceram.** As specs de estoque e de clientes/OS afirmam que o banco é SQLite e que o tenant vem de uma constante `DEMO_TENANT_ID`. Nada disso é verdade: o banco é PostgreSQL e o tenant vem da sessão autenticada. Uma spec com premissa falsa é pior que spec nenhuma.

O conteúdo que ainda valia foi absorvido em [modulos.md](../modulos.md) e [arquitetura.md](../arquitetura.md), agora versionado no git.

## O que foi descartado, e por quê

**Task 12 da spec de RLS** — script de migração de dados de SQLite para PostgreSQL. Nunca foi escrito, e a migração já aconteceu por outro caminho. Não há resíduo de SQLite no repositório: nenhum arquivo `.db`, nenhuma dependência, e `migration_lock.toml` aponta para postgresql.

**Tasks 11.1 a 11.6 da spec de RLS** — testes de isolamento contra Postgres real. Não foram descartadas, mas foram **condicionadas**: rodá-las hoje daria falsa segurança, porque o role de conexão tem `BYPASSRLS` e qualquer teste passaria pelo motivo errado. Movidas para [rls-ativacao.md](./rls-ativacao.md) na ordem correta.

## Arquivo histórico

[feedback-cliente-piloto.md](./feedback-cliente-piloto.md) — 12 transcrições de vídeos gravados pelo dono da oficina piloto, que originaram 15 correções no sistema.

Foram consolidadas em um documento único (os arquivos originais tinham nomes gerados pelo WhatsApp) e trazidas para dentro do git porque são insubstituíveis: é o feedback bruto de quem usa o sistema no balcão, com a justificativa de cada mudança na voz dele ("o nosso povo já se atrapalha"). Especificação se reescreve; a fala do cliente, não.

## Onde as specs viviam

Todas estavam em `.kiro/specs/`, que **está no `.gitignore`**. Ou seja: cerca de 8.000 linhas de especificação e os arquivos de orientação do projeto existiam apenas em uma máquina, fora do controle de versão. As specs ativas e o material histórico passaram para cá; as concluídas seguem em `.kiro/specs/concluidas/` como registro local.
