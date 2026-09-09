# Operação

Como rodar, publicar e manter o sistema no ar. Inclui os limites dos planos gratuitos, que são restrições operacionais reais.

## Desenvolvimento local

```bash
cd oficina
npm install
cp .env.example .env      # editar com valores locais

npm run db:docker          # sobe PostgreSQL em container

# primeira vez: criar o shadow database usado pelo Prisma nas migrations
docker exec -it oficina-postgres-1 psql -U operare -d operare_dev -c "CREATE DATABASE operare_shadow;"

npx prisma migrate dev     # aplica schema e policies
npx prisma db seed         # popula com 2 oficinas de demonstração
npm run dev                # http://localhost:3000
```

O seed cria duas oficinas e seis usuários, todos com a senha `password123`:

| E-mail | Papel | Oficina |
|--------|-------|---------|
| `admin@paiffer.com` | ADMIN | Paiffer |
| `mecanico@paiffer.com` | MECHANIC | Paiffer |
| `carlos@paiffer.com` | MECHANIC | Paiffer |
| `atendente@paiffer.com` | ATTENDANT | Paiffer |
| `admin@demo.com` | ADMIN | Demo |
| `mecanico@demo.com` | MECHANIC | Demo |

Duas oficinas distintas é o que permite testar isolamento de dados; vários mecânicos, o que permite testar comissões e produtividade comparativa.

### Comandos

| Comando | O que faz |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | `prisma generate` + `prisma migrate deploy` + `next build` |
| `npm run lint` | ESLint — esperado 0 erros e 34 avisos |
| `npm test` | Jest — 455 testes em 45 suítes |
| `npm run test:e2e` | Playwright |
| `npm run db:migrate` | Cria e aplica migration em desenvolvimento |
| `npm run db:seed` | Popula dados de demonstração |
| `npm run db:reset` | Recria o banco do zero |
| `npx prisma studio` | Interface para inspecionar o banco |

**Atenção com o `build`:** ele executa `prisma migrate deploy`. Com o Docker parado, ele falha por não alcançar o banco — o que não indica erro de código. Para validar compilação e tipos sem banco, use `npx next build`.

### Antes de qualquer push

```bash
npm run lint      # 0 erros
npx tsc --noEmit  # sem saída
npm test          # tudo passando
npx next build    # compila
```

O CI roda exatamente isso, mais os testes E2E. `tsc --noEmit` está no CI de propósito: o `next build` ignora arquivos de teste, então erros de tipo em mocks passavam despercebidos.

## Variáveis de ambiente

O `.env.example` é a referência completa e comentada. Resumo:

| Variável | Obrigatória | Observação |
|----------|-------------|-----------|
| `DATABASE_URL` | Sim | Conexão com pooling, usada em runtime |
| `DIRECT_URL` | Sim | Conexão direta, usada pelas migrations |
| `DATABASE_URL_ADMIN` | Não | Operações cross-tenant; sem ela cai na `DATABASE_URL` |
| `NEXTAUTH_SECRET` | Sim | Assina o JWT da sessão |
| `NEXTAUTH_URL` | Sim | URL base da aplicação |
| `CLOUDINARY_CLOUD_NAME` | Produção | Sem as três, fotos vão para disco local e **falham na Vercel** |
| `CLOUDINARY_API_KEY` | Produção | Segredo de servidor |
| `CLOUDINARY_API_SECRET` | Produção | Segredo de servidor |
| `TURNSTILE_SECRET_KEY` | Recomendada | Sem ela o captcha é ignorado |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Recomendada | Única que pode ser pública |
| `CRON_SECRET` | Produção | A Vercel injeta no cron automaticamente se existir |
| `EVOLUTION_API_URL` / `_KEY` / `_INSTANCE` | Opcional | WhatsApp |

Nenhum segredo pode levar o prefixo `NEXT_PUBLIC_` — ver [seguranca.md](./seguranca.md#segredos).

## Publicação

Hospedagem na Vercel, banco no Neon (`sa-east-1`), domínio `operare.tech` — que responde com redirecionamento 308 para `https://www.operare.tech/`.

Todo push em `main` dispara build e deploy automáticos. Variáveis de ambiente novas **só valem a partir do próximo deploy**.

### Fluxo obrigatório

1. Rodar lint, tipos, testes e build localmente.
2. `git push origin main`.
3. Aguardar o CI concluir com `success`.
4. Confirmar que o deploy de produção ficou `success`.

Nada é "entregue" com CI vermelho ou deploy falho. Consultas rápidas:

```powershell
# CI
Invoke-RestMethod -Uri "https://api.github.com/repos/PedroFlorenzano/oficina-mecanica/actions/runs?per_page=1" |
  Select-Object -ExpandProperty workflow_runs |
  ForEach-Object { "$($_.head_sha.Substring(0,7)) | $($_.status) | $($_.conclusion)" }

# Deploy
$dep = (Invoke-RestMethod -Uri "https://api.github.com/repos/PedroFlorenzano/oficina-mecanica/deployments?per_page=1")[0]
(Invoke-RestMethod -Uri "https://api.github.com/repos/PedroFlorenzano/oficina-mecanica/deployments/$($dep.id)/statuses?per_page=1")[0].state
```

No PowerShell use `curl.exe`, e não `curl`, que é apelido de `Invoke-WebRequest`.

## Tarefas agendadas

`oficina/vercel.json` define um cron diário que chama `/api/whatsapp/reminders`, responsável pelos lembretes de troca de óleo. A rota percorre todas as oficinas ativas.

Autenticação: a Vercel injeta `Authorization: Bearer $CRON_SECRET` automaticamente, desde que a variável exista no deployment. Sem `CRON_SECRET` a rota responde 503; com ela, chamada sem credencial responde 401.

O plano gratuito da Vercel permite no mínimo **uma execução por dia** por cron, com precisão de cerca de uma hora.

## Monitoramento

`.github/workflows/uptime.yml` verifica a aplicação a cada 15 minutos e, uma vez por dia, também o banco e a página de login. Se falhar, o workflow fica vermelho e o GitHub avisa por e-mail. Repositório público tem minutos de Actions ilimitados, então isso não custa nada.

`GET /api/health` é público de propósito — um monitor não faz login — e **não consulta o banco** por padrão. Use `?db=1` para a verificação profunda.

Esse detalhe não é estético. O Neon hiberna o banco após 5 minutos sem uso e o plano gratuito dá 100 CU-horas por mês. Uma consulta a cada 10 minutos manteria o banco acordado metade do mês, consumindo cerca de 90 CU-horas — e ao esgotar a cota o Neon **suspende o banco até o próximo ciclo de faturamento**. Ou seja, o monitor derrubaria o sistema. Se alguém "melhorar" o health check para sempre consultar o banco, reintroduz essa falha.

Falta rastreamento de erros de aplicação: hoje sabemos se o site está no ar, não se uma tela está lançando exceção.

## Limites dos planos gratuitos

Restrições reais de operação, não curiosidades.

### Neon (Free)

| Recurso | Limite | Ao estourar |
|---------|--------|-------------|
| Compute | 100 CU-horas/mês por projeto | Banco **suspenso** até o próximo ciclo |
| Armazenamento | 0,5 GB por projeto | Inserções e atualizações **passam a falhar** |
| Transferência | 5 GB/mês | Compute suspenso |
| Histórico para restauração | **6 horas** (até 1 GB) | Não há como voltar além disso |
| Snapshot manual | 1 | — |
| Hibernação | Após 5 min sem uso, não desativável | Primeira consulta depois disso é lenta |

Os dois primeiros derrubam o sistema de formas diferentes: sem compute, ninguém acessa; sem espaço, ninguém consegue abrir OS. O terceiro é o mais silencioso: **6 horas de histórico** significa que um erro notado na manhã seguinte já é irrecuperável, e não existe cópia fora do Neon. Backup externo é item de backlog.

### Vercel (Hobby)

- Corpo de requisição limitado a cerca de **4,5 MB** em funções serverless. É por isso que a foto é comprimida no navegador antes do envio.
- Filesystem **somente leitura**, exceto `/tmp`, que é efêmero. Nada de gravar arquivo em disco.
- Cron com mínimo diário.
- O plano Hobby é destinado a uso **não comercial**. Cobrar de clientes exige o plano pago — decisão a tomar antes de faturar.

### Cloudinary (Free)

Cota mensal na casa de 25 créditos, onde 1 crédito equivale a 1 GB de armazenamento ou 1 GB de tráfego. **Não requer cartão de crédito**, o que elimina risco de fatura inesperada: ao exceder, o serviço limita em vez de cobrar.

## Diagnóstico

| Sintoma | Onde olhar |
|---------|-----------|
| Site fora do ar | `GET /api/health`; workflow Uptime no GitHub |
| Erro de banco | `GET /api/health?db=1`; painel do Neon (compute e armazenamento) |
| Foto não salva | As três variáveis do Cloudinary existem no deployment? |
| Cadastro bloqueado | Rate limit: HTTP 429 traz `Retry-After` |
| Captcha recusado | Site Key e Secret Key trocadas? Ver [seguranca.md](./seguranca.md#segredos) |
| Isolamento suspeito | `GET /api/admin/db-diagnostics` |
| Cron não roda | `CRON_SECRET` existe? Vercel → Settings → Cron Jobs |
