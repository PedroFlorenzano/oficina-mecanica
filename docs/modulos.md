# Módulos

Catálogo do que existe, para onde olhar no código e quais regras de negócio importam. São 18 módulos de use case, 17 áreas no dashboard e 97 rotas de API.

Convenção de caminhos: use cases em `src/application/use-cases/<modulo>/`, telas em `src/app/dashboard/<area>/`, rotas em `src/app/api/<recurso>/`.

## O conceito central: Reclamações

É o diferencial do produto sobre o sistema legado. Uma OS não é uma lista solta de itens: ela é composta por **reclamações do cliente** ("barulho na suspensão", "troca de óleo"), e cada reclamação agrupa os próprios serviços e peças, com subtotal por reclamação e total geral.

Isso importa na prática porque o cliente aprova ou recusa **por reclamação**, não a OS inteira. Cada serviço e cada peça carrega uma flag `approved`, e o subtotal exibido no cabeçalho da reclamação conta apenas itens aprovados.

## Núcleo operacional

### Clientes (`clients`, 6 use cases)
Cadastro de pessoa física e jurídica, com validação de CPF/CNPJ via value objects. Tem histórico de atendimentos (`/api/clients/[id]/history`) e desativação em vez de exclusão quando há vínculo.

### Veículos (`vehicles`, 5 use cases)
Vinculados a um cliente, placa única por oficina. Guardam quilometragem, histórico de serviços e a opção de lembrete de troca de óleo (`oilReminderEnabled`). O cálculo de "está na hora da troca" compara a quilometragem atual com a da última troca registrada.

### Ordens de Serviço (`orders`, 10 use cases)
O coração do sistema. Fluxo de status:

```
OPEN → IN_PROGRESS → WAITING_PART | WAITING_APPROVAL → COMPLETED → DELIVERED
                                                                  ↘ CANCELLED
```

As transições válidas estão em `src/domain/value-objects/OrderStatusTransitions.ts` — não espalhe essa regra. Inclui geração de PDF (orçamento e OS), duplicação de OS, cancelamento com motivo e cálculo de prazo de entrega.

### Estoque (`stock`, 10 use cases)
Controle por **custo médio ponderado**, recalculado a cada entrada. Duas regras que o código garante:

- **Saldo nunca fica negativo.** Operações que levariam a isso são recusadas.
- **Movimentação não se edita nem se apaga.** Correção é feita por novo lançamento de ajuste, preservando a trilha.

Tipos de movimento: entrada, saída, reserva, consumo, estorno e ajuste.

O fluxo dentro da OS tem três momentos: a peça é **reservada** quando entra no orçamento, **consumida** quando a OS é concluída, e **estornada** se a OS é cancelada. `ConfirmStockConsumption` liquida a reserva existente ou dá baixa real, e devolve avisos quando algo não fecha, em vez de falhar silenciosamente.

Itens têm código do sistema, código original do fabricante, SKU, aplicação (quais veículos servem), localização física e fornecedor. A busca por aplicação alimenta a sugestão de peças compatíveis com o veículo da OS.

### Catálogo de Serviços (`services`, 4 use cases)
Serviços pré-cadastrados com preço e tempo estimado, também criáveis direto na OS. Exclusão em lote pula serviços já vinculados a alguma OS e informa o motivo por item. Inclui **Kits** (models `Kit` e `KitItem`, tela em `dashboard/services/kits`): conjuntos de serviços e peças aplicados de uma vez.

### Pista (`dashboard/pista`)
Quadro Kanban das OS por status, com arrastar e soltar, atualização otimista com rollback quando a API recusa, filtro por mecânico e versão para impressão. Suporte a toque para uso em tablet (`src/app/dashboard/pista/hooks/useTouchDrag.ts`).

### Cronômetro (`timer`, 7 use cases)
Apontamento de tempo por serviço: iniciar, pausar, retomar, finalizar e corrigir. Toda correção fica registrada em `TimerAuditLog` — o tempo trabalhado é base de comissão, então precisa de trilha de auditoria. Alimenta a média histórica usada no cálculo de prazo.

### Comissões (`commissions`, 7 use cases)
Gera comissão a partir dos serviços executados, com máquina de estados própria (gerada → aprovada → paga, ou cancelada). A taxa vem do serviço quando definida, com fallback para a taxa do mecânico. Cada mecânico vê apenas as próprias comissões.

## Financeiro e fiscal

### Financeiro (`financial`, 6 use cases)
Lançamentos de receita e despesa, contas a pagar e receber, prorrogação e baixa de lançamento, geração de DRE e exportação em PDF.

### Fiscal (`fiscal`, 4 use cases)
Emissão real de NF-e e NFS-e, não simulada. Adapters em `src/infrastructure/fiscal/`, escolhidos por `createFiscalAdapter` conforme a configuração da oficina:

- **NF-e** — `SefazNFeAdapter`: SEFAZ, modelo 4.0, comunicação SOAP com assinatura XML por certificado A1, incluindo cancelamento, carta de correção, inutilização e consulta de status. A UF é derivada do código IBGE do município, então não é específico de um estado.
- **NFS-e** — `NacionalNfseAdapter`: padrão Nacional (SEFIN), obrigatório desde 01/01/2026. O campo `modeloNacional` no banco distingue do antigo padrão municipal DSF, mas **só o adapter nacional existe no código hoje**.
- **`FakeFiscalAdapter`**: usado automaticamente quando não há certificado configurado ou o ambiente não é homologação/produção. É o que permite mexer no sistema sem certificado digital.

Gera DANFE em PDF com código de barras Code128. Não existe ainda o DANFSe v2.0 em PDF para a NFS-e nacional — ver [backlog](./backlog.md). Configuração por oficina em `FiscalConfig`, incluindo o certificado.

### Relatórios (`reports`, 2 use cases)
Lucro por OS, peças mais usadas e produtividade por mecânico, com comparativo entre mecânicos.

## Comunicação com o cliente

### WhatsApp (`whatsapp`, 6 use cases)
Integração com Evolution API: notificação automática de mudança de status, envio de orçamento para aprovação, lembrete preventivo de troca de óleo e webhook para receber respostas.

### Assinatura digital
Página pública em `/sign/[token]`, sem login, onde o cliente aprova o orçamento. Usa `adminContainer` porque não há sessão — o token é a credencial.

### Agendamento (`appointments`, 2 use cases)
Página pública por oficina para o cliente marcar horário, com configuração de horário de funcionamento e feriados, e gestão pelo dashboard.

## Plataforma

### Usuários e perfis (`users`, 6 use cases)
Papéis ADMIN, MECHANIC e ATTENDANT, além de permissões customizadas por usuário que refinam o padrão do papel. Bloqueio de conta após 5 tentativas de senha erradas, por 15 minutos. Detalhes em [seguranca.md](./seguranca.md).

### Onboarding (`tenants`, 1 use case)
Cadastro self-service de oficina em `/register`, criando a oficina e o primeiro ADMIN. Rota pública, protegida por rate limit e captcha.

### Cobrança (`billing`, 2 use cases)
Infraestrutura e interface de assinatura: planos, status, banner de fim de teste. **Não há gateway de pagamento conectado** — o webhook `/api/billing/webhook` existe e valida assinatura, mas nada o chama. Ver [backlog.md](./backlog.md).

### Fornecedores (`suppliers`, 4 use cases)
Cadastro de fornecedores com prazo de entrega, usado no cálculo de prazo da OS. Inclui busca de peças em catálogo externo com registro de cliques (`SupplierClick`).

### Fotos da OS (`photos`, 2 use cases)
Fotos categorizadas em antes, depois e dano. A imagem é comprimida no navegador, validada pelos bytes reais no servidor, gravada no Cloudinary como privada e servida por rota autenticada. Detalhes em [seguranca.md](./seguranca.md).

### Importação (`import`, 8 importadores)
Importação self-service de CSV e XLSX para migrar dados do sistema anterior, com tratamento de duplicatas. Cobre clientes, veículos, OS, serviços, estoque, financeiro, notas e produtividade. Os utilitários de leitura e mapeamento ficam em `import/parsers/`. Validado contra os dados reais do cliente-piloto.

## Cálculo de prazo de entrega (MRP)

`CalculateOrderDeadline` estima a data de entrega combinando: dias úteis (`WorkDayCalculator`, respeitando feriados), capacidade da oficina em número de mecânicos, tempo estimado dos serviços com média histórica do cronômetro, e disponibilidade das peças — considerando o que já está reservado para aquela OS e o prazo do fornecedor quando falta peça. Persiste a data, o total de dias e a justificativa. Recalcula quando a OS muda ou quando entra estoque.

## Onde a documentação por módulo termina

Detalhes de tela e de uso operacional estão no [manual do usuário](./manual-usuario.md). Decisões históricas e a ordem em que os módulos nasceram estão em [historico.md](./historico.md).
