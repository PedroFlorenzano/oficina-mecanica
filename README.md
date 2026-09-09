# Operare

SaaS de gestão para oficinas mecânicas automotivas brasileiras. Multi-oficina, com Next.js 16, TypeScript, Prisma, PostgreSQL e Clean Architecture.

Em produção em [operare.tech](https://www.operare.tech). Projeto piloto na Paiffer Bosch Car Service, em Sorocaba (SP), substituindo o sistema legado Syscar.

## O que o sistema faz

Ordens de serviço organizadas por **reclamações do cliente** — cada reclamação com seus próprios serviços, peças e subtotal, porque é assim que o cliente aprova o orçamento. Em volta disso: clientes e veículos, estoque com custo médio ponderado, quadro Kanban da pista, cronômetro por serviço, comissões, financeiro, emissão de NF-e e NFS-e, WhatsApp com aprovação digital, agendamento online, fotos da OS e importação de dados do sistema anterior.

O catálogo completo está em [docs/modulos.md](./docs/modulos.md).

## Começando

```bash
cd oficina
npm install
cp .env.example .env

npm run db:docker    # PostgreSQL em container
npx prisma migrate dev
npx prisma db seed
npm run dev          # http://localhost:3000
```

Entre com `admin@paiffer.com` e senha `password123`. O passo a passo completo, incluindo a criação do shadow database na primeira execução, está em [docs/operacao.md](./docs/operacao.md).

## Documentação

| Documento | Conteúdo |
|-----------|----------|
| [docs/arquitetura.md](./docs/arquitetura.md) | Camadas, padrões e como o multi-tenant funciona de fato |
| [docs/modulos.md](./docs/modulos.md) | O que cada módulo faz e onde vive |
| [docs/operacao.md](./docs/operacao.md) | Ambiente, deploy, CI, monitoramento e limites dos planos |
| [docs/seguranca.md](./docs/seguranca.md) | Autenticação, permissões e isolamento entre oficinas |
| [docs/backlog.md](./docs/backlog.md) | O que falta, priorizado |
| [docs/manual-usuario.md](./docs/manual-usuario.md) | Guia para o usuário final |
| [docs/](./docs/) | Índice completo |

## Estrutura

```
ProjetoOficina/
├── docs/       Documentação (referência única)
├── oficina/    A aplicação Next.js
└── .kiro/      Workspace local do Kiro (não versionado)
```

## Verificação antes de publicar

```bash
cd oficina
npm run lint      # 0 erros
npx tsc --noEmit  # sem saída
npm test          # 455 testes
npx next build    # compila
```

Todo push em `main` vai para produção depois do CI. Nada é considerado entregue com CI vermelho ou deploy falho.

## Estado atual

O sistema está no ar e em uso. Dois pontos que merecem conhecimento antes de mexer:

- **O isolamento entre oficinas depende do filtro por `tenantId` no código.** As policies de Row-Level Security existem no banco mas não têm efeito em produção, porque a conexão usa um role com `BYPASSRLS`. Ver [docs/seguranca.md](./docs/seguranca.md) e [docs/specs/rls-ativacao.md](./docs/specs/rls-ativacao.md).
- **Não há gateway de pagamento conectado.** A cobrança é manual, e nenhuma funcionalidade é restringida por plano.

## Licença

Proprietário — DF Developer
