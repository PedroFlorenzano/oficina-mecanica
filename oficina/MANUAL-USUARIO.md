# Manual do Usuário — Sistema Oficina Mecânica

## Visão Geral

Sistema de gestão completo para oficinas mecânicas automotivas. Controle de clientes, veículos, ordens de serviço, estoque, comissões e muito mais — tudo em uma plataforma web moderna e intuitiva.

---

## Acesso ao Sistema

### Login

1. Acesse o sistema pelo navegador (Chrome, Firefox, Edge ou Safari)
2. Informe seu **e-mail** e **senha**
3. Clique em **Entrar**

> **Segurança:** Após 5 tentativas incorretas, a conta é bloqueada por 15 minutos.

### Perfis de Acesso

| Perfil | O que pode fazer |
|--------|-----------------|
| **Administrador** | Acesso total: gerenciar usuários, relatórios, comissões, configurações |
| **Atendente** | Clientes, veículos, OS, estoque (consulta), catálogo de serviços |
| **Mecânico** | Visualizar OS atribuídas, cronômetros, comissões próprias |

O administrador pode personalizar as permissões de cada mecânico individualmente.

---

## Dashboard

Ao fazer login, você verá o painel principal com:

- **Cards de resumo:** clientes ativos, veículos, OS em aberto, itens de estoque
- **Últimas OS:** tabela com as 8 ordens mais recentes (nº, cliente, veículo, status, valor)
- **Atalhos:** clique em qualquer card para ir direto ao módulo

**Mecânicos** veem um dashboard diferente: OS atribuídas, cronômetros ativos e comissões pendentes.

---

## Clientes

### Cadastrar Cliente

1. Vá em **Clientes** no menu lateral
2. Clique em **Novo Cliente**
3. Preencha: nome, CPF ou CNPJ, telefone, e-mail, endereço
4. Clique em **Cadastrar**

### Buscar Cliente

Use a barra de busca para encontrar por nome, CPF/CNPJ, telefone ou placa de veículo.

### Inativar / Reativar

- Clique no ícone 🚫 para inativar (o histórico é mantido)
- Marque "Mostrar inativos" e clique no ícone ✓ para reativar

### Histórico de OS

Clique no ícone 📋 ao lado do cliente para ver todas as OS vinculadas.

---

## Veículos

### Cadastrar Veículo

1. Vá em **Veículos** no menu lateral
2. Clique em **Novo Veículo**
3. Busque e selecione o **cliente proprietário**
4. Preencha: placa, marca, modelo, ano, cor, combustível, KM
5. Clique em **Cadastrar**

### Formato de Placa

O sistema aceita dois formatos:
- **Mercosul:** ABC1D23 (3 letras + 1 número + 1 letra + 2 números)
- **Antigo:** ABC-1234 (3 letras + hífen + 4 números)

A formatação é automática ao digitar.

### Lembrete de Troca de Óleo

Cada veículo tem um toggle de lembrete. Quando ativado, o sistema alerta quando o veículo se aproximar do intervalo de troca (5.000 km ou 6 meses).

---

## Ordens de Serviço (OS)

### Criar Nova OS

1. Vá em **Ordens de Serviço** → **Nova OS**
2. Selecione o **cliente** (busca por nome)
3. Selecione o **veículo** do cliente
4. Informe o **KM de entrada**
5. Adicione **reclamações** do cliente (ex: "Barulho na suspensão")
6. Para cada reclamação, adicione **serviços** e **peças**
7. Clique em **Criar OS**

A OS é criada com status **Aguardando Aprovação**.

### Conceito de Reclamações

Diferencial do sistema: cada OS é organizada por **reclamações do cliente**. Cada reclamação agrupa seus próprios serviços e peças, com subtotal individual e total geral.

### Fluxo de Status

```
Aguardando Aprovação → Em Execução → Concluída → Entregue
                     → Aguardando Peça ↔ Em Execução
                     → Cancelada (com motivo)
```

### Editar Orçamento

Enquanto a OS estiver em **Aguardando Aprovação**, é possível editar: remover reclamações, serviços ou peças. O sistema recalcula automaticamente.

### Ações na OS

| Botão | Função |
|-------|--------|
| **Imprimir** | Imprime a OS via navegador |
| **Baixar PDF** | Gera PDF completo da OS |
| **Orçamento** | PDF simplificado para o cliente (só em Aguardando Aprovação) |
| **Etiqueta Óleo** | Gera etiqueta de troca de óleo (80×110mm) |
| **Editar Orçamento** | Edita serviços/peças (só em Aguardando Aprovação) |
| **Enviar Aprovação** | Envia link de aprovação via WhatsApp |
| **Notificar Entrega** | Envia link de confirmação de entrega via WhatsApp |
| **Emitir NF** | Cria nota fiscal (NFE ou NFSE) |

### Cancelar OS

1. Na tela da OS, clique em **Cancelar OS**
2. Informe o motivo
3. Confirme — as reservas de estoque são revertidas automaticamente

---

## Pista (Kanban)

Visão de acompanhamento das OS em formato Kanban:

- **Colunas:** Aguardando Aprovação, Aguardando Início, Aguardando Peça, Em Andamento, Concluída
- **Arrastar e soltar:** mova cards entre colunas para alterar o status
- **Filtro:** selecione um mecânico para ver apenas suas OS
- **Clique no card:** abre o detalhe da OS

Ao mover uma OS, o cliente recebe automaticamente uma notificação via WhatsApp.

---

## Estoque

### Cadastrar Item

1. Vá em **Estoque** → **Novo Item**
2. Preencha: código, descrição, marca, unidade, quantidade mínima, preço de custo, margem, preço de venda
3. Opcionalmente: localização (gaveta/prateleira), fornecedor padrão
4. Clique em **Cadastrar**

### Registrar Entrada

1. Acesse o detalhe do item (clique na linha)
2. Clique em **Registrar Entrada**
3. Informe: quantidade, custo unitário, fornecedor, nº nota fiscal
4. O sistema recalcula o **Custo Médio Ponderado** automaticamente

### Ajustar Estoque

Para correções de inventário físico:
1. Clique em **Ajustar Estoque**
2. Informe a nova quantidade e o motivo
3. O sistema registra a movimentação de ajuste

### Alertas de Estoque Baixo

Itens abaixo da quantidade mínima aparecem:
- No **badge vermelho** do menu lateral
- No **painel de alertas** no topo da listagem de estoque

### Histórico de Movimentações

Cada item tem um histórico completo e imutável: entradas, saídas, reservas, consumos, reversões e ajustes.

---

## Catálogo de Serviços

### Cadastrar Serviço

1. Vá em **Catálogo de Serviços** → **Novo Serviço**
2. Preencha: descrição, código, categoria, tempo estimado, preço padrão
3. Opcionalmente: **comissão (%)** — se preenchido, usa essa taxa em vez da taxa padrão do mecânico
4. Clique em **Cadastrar**

Os serviços cadastrados aparecem como sugestão ao criar uma OS.

---

## Comissões

### Como Funciona

- Cada mecânico tem uma **taxa de comissão padrão** (ex: 10%)
- Serviços podem ter **taxa específica** (ex: 15% para troca de pastilhas)
- A comissão é calculada sobre o valor bruto dos serviços executados
- Prioridade: taxa do serviço > taxa padrão do mecânico

### Gerar Comissão (Administrador)

1. Vá em **Comissões** → **Gerar Comissão**
2. Selecione o mecânico e o período
3. O sistema lista os serviços elegíveis (OS concluídas/entregues)
4. Clique em **Gerar**

### Fluxo de Aprovação

```
Pendente → Aprovada → Paga
         → Cancelada (com motivo)
```

### Visualização (Mecânico)

O mecânico vê apenas suas próprias comissões — nunca as de outros.

---

## Cronômetro de Serviço

### Para o Mecânico

1. Abra a OS atribuída
2. Em cada serviço, clique em **Iniciar** para começar a cronometrar
3. Use **Pausar** (com motivo) quando necessário
4. Clique em **Finalizar** ao concluir

### Para o Administrador

- Visualiza todos os cronômetros
- Pode **corrigir** o tempo de sessões finalizadas (com auditoria)
- Acessa a **produtividade por mecânico** (tempo estimado vs apontado)

---

## WhatsApp e Assinatura Digital

### Enviar Aprovação

1. Na OS em **Aguardando Aprovação**, clique em **Enviar Aprovação**
2. O cliente recebe um link no WhatsApp
3. Ao abrir, vê os detalhes da OS e assina com o dedo na tela
4. A OS muda automaticamente para **Aguardando Início**

### Notificar Entrega

1. Na OS **Concluída**, clique em **Notificar Entrega**
2. O cliente recebe link para confirmar recebimento
3. Ao assinar, a OS muda para **Entregue**

### Notificações Automáticas

Toda vez que uma OS é movida na Pista, o cliente recebe uma mensagem automática com o novo status.

### Lembrete Preventivo

O sistema verifica diariamente veículos com troca de óleo vencida (>6 meses ou >5.000 km) e envia lembrete via WhatsApp.

---

## Relatórios

### Resumo Financeiro

Acesse **Relatórios** no menu lateral para ver:

- **Faturamento total** e **lucro bruto**
- **Ticket médio** e **custo de peças**
- **Gráfico de faturamento mensal** (últimos 6 meses)
- **Distribuição por status**
- **Lucro por OS** (com margem colorida)

### Filtro por Período

Use os campos "De" e "Até" para filtrar por data.

### Exportar PDF

Clique em **Exportar PDF** para gerar um relatório completo em PDF com todos os dados do período filtrado.

---

## Etiqueta de Troca de Óleo

Em qualquer OS, clique em **Etiqueta Óleo** para gerar uma etiqueta de troca com:
- Nome da oficina e telefone
- Veículo e placa
- KM atual e próxima troca (+10.000 km)
- Data atual e próxima troca (+6 meses)

A etiqueta é otimizada para impressão em 80×110mm.

---

## Busca Rápida (Ctrl+K)

Pressione **Ctrl+K** em qualquer tela para abrir a busca global. Busque por:
- Número de OS
- Nome de cliente
- Placa de veículo

---

## Gerenciamento de Usuários (Administrador)

### Criar Usuário

1. Vá em **Usuários** → **Novo Usuário**
2. Preencha: nome, e-mail, senha, perfil (Admin/Atendente/Mecânico)
3. Para mecânicos: defina a **taxa de comissão** e as **permissões customizáveis**

### Permissões Customizáveis

Para mecânicos, o administrador pode configurar quais módulos e ações cada um pode acessar:
- Visualizar, Criar, Editar, Excluir — por módulo
- Módulos sem permissão "Visualizar" não aparecem no menu

### Troca de Senha

Cada usuário pode trocar sua própria senha em **Perfil** (menu superior).

---

## Requisitos Técnicos

- **Navegador:** Chrome, Firefox, Edge ou Safari (versões recentes)
- **Internet:** Conexão estável
- **Dispositivo:** Desktop ou tablet (responsivo)
- **WhatsApp:** Necessário para assinatura digital e notificações

---

## Dados de Demonstração

Para testar o sistema:

| Usuário | E-mail | Senha | Perfil |
|---------|--------|-------|--------|
| Administrador | admin@paiffer.com | password123 | ADMIN |
| João Mecânico | mecanico@paiffer.com | password123 | MECHANIC |
| Carlos Eletricista | carlos@paiffer.com | password123 | MECHANIC |
| Ana Atendente | atendente@paiffer.com | password123 | ATTENDANT |

---

## Suporte

Em caso de dúvidas ou problemas, entre em contato com o administrador do sistema.
