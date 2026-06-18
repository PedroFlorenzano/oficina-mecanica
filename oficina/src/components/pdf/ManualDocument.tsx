import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica" },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 4, color: "#0f172a" },
  subtitle: { fontSize: 10, color: "#64748b", marginBottom: 24 },
  h2: { fontSize: 14, fontWeight: "bold", color: "#1e293b", marginTop: 18, marginBottom: 8, borderBottomWidth: 1, borderBottomColor: "#e2e8f0", paddingBottom: 4 },
  h3: { fontSize: 11, fontWeight: "bold", color: "#334155", marginTop: 10, marginBottom: 4 },
  p: { fontSize: 9, color: "#334155", marginBottom: 6, lineHeight: 1.5 },
  bullet: { fontSize: 9, color: "#334155", marginBottom: 3, paddingLeft: 12, lineHeight: 1.4 },
  tableHeader: { flexDirection: "row", backgroundColor: "#f1f5f9", paddingVertical: 4, paddingHorizontal: 6, marginBottom: 1 },
  tableRow: { flexDirection: "row", paddingVertical: 3, paddingHorizontal: 6, borderBottomWidth: 0.5, borderBottomColor: "#e2e8f0" },
  thCell: { fontSize: 8, fontWeight: "bold", color: "#475569" },
  tdCell: { fontSize: 8, color: "#334155" },
  col1: { width: "25%" },
  col2: { width: "75%" },
  note: { fontSize: 8, color: "#64748b", backgroundColor: "#f8fafc", padding: 8, borderRadius: 3, marginBottom: 8, borderLeftWidth: 2, borderLeftColor: "#3b82f6" },
  code: { fontSize: 8, color: "#1e293b", backgroundColor: "#f1f5f9", padding: 6, borderRadius: 3, marginBottom: 8, fontFamily: "Courier" },
});

export function ManualDocument() {
  return (
    <Document>
      {/* Capa */}
      <Page size="A4" style={[s.page, { justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ fontSize: 28, fontWeight: "bold", color: "#1e40af", marginBottom: 8 }}>Sistema Oficina Mecânica</Text>
        <Text style={{ fontSize: 14, color: "#475569", marginBottom: 24 }}>Manual do Usuário</Text>
        <Text style={{ fontSize: 10, color: "#94a3b8" }}>Paiffer Bosch Car Service</Text>
        <Text style={{ fontSize: 9, color: "#94a3b8", marginTop: 4 }}>Versão 1.0 — Maio 2026</Text>
      </Page>

      {/* Página 1 - Acesso e Dashboard */}
      <Page size="A4" style={s.page}>
        <Text style={s.h2}>Acesso ao Sistema</Text>
        <Text style={s.h3}>Login</Text>
        <Text style={s.bullet}>• Acesse pelo navegador (Chrome, Firefox, Edge ou Safari)</Text>
        <Text style={s.bullet}>• Informe e-mail e senha</Text>
        <Text style={s.bullet}>• Após 5 tentativas incorretas, a conta é bloqueada por 15 minutos</Text>

        <Text style={s.h3}>Perfis de Acesso</Text>
        <View style={s.tableHeader}>
          <Text style={[s.thCell, s.col1]}>Perfil</Text>
          <Text style={[s.thCell, s.col2]}>Permissões</Text>
        </View>
        <View style={s.tableRow}>
          <Text style={[s.tdCell, s.col1]}>Administrador</Text>
          <Text style={[s.tdCell, s.col2]}>Acesso total: usuários, relatórios, comissões, configurações</Text>
        </View>
        <View style={s.tableRow}>
          <Text style={[s.tdCell, s.col1]}>Atendente</Text>
          <Text style={[s.tdCell, s.col2]}>Clientes, veículos, OS, estoque (consulta), catálogo de serviços</Text>
        </View>
        <View style={s.tableRow}>
          <Text style={[s.tdCell, s.col1]}>Mecânico</Text>
          <Text style={[s.tdCell, s.col2]}>OS atribuídas, cronômetros, comissões próprias</Text>
        </View>

        <Text style={s.h2}>Dashboard</Text>
        <Text style={s.p}>Painel principal com cards de resumo (clientes, veículos, OS em aberto, estoque) e tabela das últimas 8 OS. Clique em qualquer card para ir ao módulo.</Text>
        <Text style={s.p}>Mecânicos veem dashboard diferente: OS atribuídas, cronômetros ativos e comissões pendentes.</Text>

        <Text style={s.h2}>Clientes</Text>
        <Text style={s.h3}>Cadastrar</Text>
        <Text style={s.bullet}>• Menu lateral → Clientes → Novo Cliente</Text>
        <Text style={s.bullet}>• Preencha: nome, CPF/CNPJ, telefone, e-mail, endereço</Text>
        <Text style={s.h3}>Buscar</Text>
        <Text style={s.p}>Barra de busca: nome, CPF/CNPJ, telefone ou placa de veículo.</Text>
        <Text style={s.h3}>Inativar / Reativar</Text>
        <Text style={s.p}>Ícone 🚫 para inativar (histórico mantido). Marque {'"'}Mostrar inativos{'"'} para reativar.</Text>

        <Text style={s.h2}>Veículos</Text>
        <Text style={s.bullet}>• Menu lateral → Veículos → Novo Veículo</Text>
        <Text style={s.bullet}>• Busque e selecione o cliente proprietário</Text>
        <Text style={s.bullet}>• Placa: formato Mercosul (ABC1D23) ou antigo (ABC-1234)</Text>
        <Text style={s.bullet}>• Toggle de lembrete de troca de óleo (alerta a cada 5.000 km / 6 meses)</Text>
      </Page>

      {/* Página 2 - Ordens de Serviço */}
      <Page size="A4" style={s.page}>
        <Text style={s.h2}>Ordens de Serviço (OS)</Text>
        <Text style={s.h3}>Criar Nova OS</Text>
        <Text style={s.bullet}>• Selecione cliente → veículo → informe KM de entrada</Text>
        <Text style={s.bullet}>• Adicione reclamações do cliente (ex: {'"'}Barulho na suspensão{'"'})</Text>
        <Text style={s.bullet}>• Para cada reclamação, adicione serviços e peças</Text>
        <Text style={s.bullet}>• A OS é criada com status {'"'}Aguardando Aprovação{'"'}</Text>

        <Text style={s.h3}>Conceito de Reclamações</Text>
        <Text style={s.p}>Cada OS é organizada por reclamações do cliente. Cada reclamação agrupa seus serviços e peças, com subtotal individual e total geral.</Text>

        <Text style={s.h3}>Fluxo de Status</Text>
        <Text style={s.code}>Aguardando Aprovação → Em Execução → Concluída → Entregue{"\n"}                     → Aguardando Peça ↔ Em Execução{"\n"}                     → Cancelada (com motivo)</Text>

        <Text style={s.h3}>Ações Disponíveis</Text>
        <View style={s.tableHeader}>
          <Text style={[s.thCell, s.col1]}>Botão</Text>
          <Text style={[s.thCell, s.col2]}>Função</Text>
        </View>
        <View style={s.tableRow}><Text style={[s.tdCell, s.col1]}>Imprimir</Text><Text style={[s.tdCell, s.col2]}>Imprime via navegador</Text></View>
        <View style={s.tableRow}><Text style={[s.tdCell, s.col1]}>Baixar PDF</Text><Text style={[s.tdCell, s.col2]}>Gera PDF completo da OS</Text></View>
        <View style={s.tableRow}><Text style={[s.tdCell, s.col1]}>Orçamento</Text><Text style={[s.tdCell, s.col2]}>PDF simplificado para o cliente</Text></View>
        <View style={s.tableRow}><Text style={[s.tdCell, s.col1]}>Etiqueta Óleo</Text><Text style={[s.tdCell, s.col2]}>Etiqueta de troca (80×110mm)</Text></View>
        <View style={s.tableRow}><Text style={[s.tdCell, s.col1]}>Enviar Aprovação</Text><Text style={[s.tdCell, s.col2]}>Link de aprovação via WhatsApp</Text></View>
        <View style={s.tableRow}><Text style={[s.tdCell, s.col1]}>Notificar Entrega</Text><Text style={[s.tdCell, s.col2]}>Link de confirmação via WhatsApp</Text></View>
        <View style={s.tableRow}><Text style={[s.tdCell, s.col1]}>Emitir NF</Text><Text style={[s.tdCell, s.col2]}>Cria nota fiscal (NFE/NFSE)</Text></View>

        <Text style={s.h2}>Pista (Kanban)</Text>
        <Text style={s.p}>Visão de acompanhamento em formato Kanban. Arraste cards entre colunas para alterar status. Filtre por mecânico. Ao mover, o cliente recebe notificação automática via WhatsApp.</Text>
      </Page>

      {/* Página 3 - Estoque, Serviços, Comissões */}
      <Page size="A4" style={s.page}>
        <Text style={s.h2}>Estoque</Text>
        <Text style={s.h3}>Cadastrar Item</Text>
        <Text style={s.bullet}>• Código, descrição, marca, unidade, qtd mínima, custo, margem, venda</Text>
        <Text style={s.bullet}>• Localização (gaveta/prateleira) e fornecedor padrão</Text>
        <Text style={s.h3}>Registrar Entrada</Text>
        <Text style={s.p}>No detalhe do item: quantidade, custo unitário, fornecedor, nº NF. O Custo Médio Ponderado é recalculado automaticamente.</Text>
        <Text style={s.h3}>Ajustar Estoque</Text>
        <Text style={s.p}>Para correções de inventário: informe nova quantidade e motivo.</Text>
        <Text style={s.h3}>Alertas</Text>
        <Text style={s.p}>Itens abaixo do mínimo: badge vermelho no menu + painel de alertas na listagem.</Text>

        <Text style={s.h2}>Catálogo de Serviços</Text>
        <Text style={s.bullet}>• Descrição, código, categoria, tempo estimado, preço padrão</Text>
        <Text style={s.bullet}>• Comissão (%): taxa específica do serviço (vazio = usa taxa do mecânico)</Text>
        <Text style={s.p}>Serviços cadastrados aparecem como sugestão ao criar OS.</Text>

        <Text style={s.h2}>Comissões</Text>
        <Text style={s.h3}>Como Funciona</Text>
        <Text style={s.bullet}>• Cada mecânico tem taxa padrão (ex: 10%)</Text>
        <Text style={s.bullet}>• Serviços podem ter taxa específica (ex: 15%)</Text>
        <Text style={s.bullet}>• Prioridade: taxa do serviço → taxa do mecânico</Text>
        <Text style={s.h3}>Gerar Comissão (Admin)</Text>
        <Text style={s.p}>Selecione mecânico + período → sistema lista serviços elegíveis → Gerar.</Text>
        <Text style={s.h3}>Fluxo</Text>
        <Text style={s.code}>Pendente → Aprovada → Paga{"\n"}         → Cancelada (com motivo)</Text>
        <Text style={s.note}>Mecânicos veem apenas suas próprias comissões.</Text>

        <Text style={s.h2}>Cronômetro de Serviço</Text>
        <Text style={s.h3}>Mecânico</Text>
        <Text style={s.bullet}>• Na OS: Iniciar → Pausar (com motivo) → Retomar → Finalizar</Text>
        <Text style={s.h3}>Administrador</Text>
        <Text style={s.bullet}>• Visualiza todos os cronômetros</Text>
        <Text style={s.bullet}>• Corrige tempo de sessões finalizadas (com auditoria)</Text>
        <Text style={s.bullet}>• Acessa produtividade por mecânico</Text>
      </Page>

      {/* Página 4 - WhatsApp, Relatórios, Extras */}
      <Page size="A4" style={s.page}>
        <Text style={s.h2}>WhatsApp e Assinatura Digital</Text>
        <Text style={s.h3}>Aprovação</Text>
        <Text style={s.p}>Na OS {'"'}Aguardando Aprovação{'"'} → Enviar Aprovação → cliente recebe link → assina com o dedo → OS muda para {'"'}Aguardando Início{'"'}.</Text>
        <Text style={s.h3}>Entrega</Text>
        <Text style={s.p}>Na OS {'"'}Concluída{'"'} → Notificar Entrega → cliente confirma → OS muda para {'"'}Entregue{'"'}.</Text>
        <Text style={s.h3}>Automático</Text>
        <Text style={s.bullet}>• Toda mudança de status na Pista notifica o cliente</Text>
        <Text style={s.bullet}>• Lembrete preventivo diário (troca de óleo vencida)</Text>

        <Text style={s.h2}>Relatórios</Text>
        <Text style={s.bullet}>• Faturamento total, lucro bruto, ticket médio, custo de peças</Text>
        <Text style={s.bullet}>• Gráfico de faturamento mensal (6 meses)</Text>
        <Text style={s.bullet}>• Distribuição por status</Text>
        <Text style={s.bullet}>• Lucro por OS (com margem colorida)</Text>
        <Text style={s.bullet}>• Filtro por período + Exportar PDF</Text>

        <Text style={s.h2}>Funcionalidades Extras</Text>
        <Text style={s.h3}>Busca Rápida (Ctrl+K)</Text>
        <Text style={s.p}>Busca global por nº de OS, nome de cliente ou placa de veículo.</Text>
        <Text style={s.h3}>Etiqueta de Troca de Óleo</Text>
        <Text style={s.p}>Disponível em toda OS: oficina, telefone, veículo, placa, KM, próxima troca. Impressão 80×110mm.</Text>
        <Text style={s.h3}>Gerenciamento de Usuários (Admin)</Text>
        <Text style={s.bullet}>• Criar/editar usuários com perfil e taxa de comissão</Text>
        <Text style={s.bullet}>• Permissões customizáveis por módulo e ação</Text>
        <Text style={s.bullet}>• Cada usuário troca sua própria senha em Perfil</Text>

        <Text style={s.h2}>Requisitos Técnicos</Text>
        <Text style={s.bullet}>• Navegador: Chrome, Firefox, Edge ou Safari (recentes)</Text>
        <Text style={s.bullet}>• Internet: conexão estável</Text>
        <Text style={s.bullet}>• Dispositivo: desktop ou tablet</Text>

        <Text style={s.h2}>Dados de Demonstração</Text>
        <View style={s.tableHeader}>
          <Text style={[s.thCell, { width: "30%" }]}>Usuário</Text>
          <Text style={[s.thCell, { width: "35%" }]}>E-mail</Text>
          <Text style={[s.thCell, { width: "20%" }]}>Senha</Text>
          <Text style={[s.thCell, { width: "15%" }]}>Perfil</Text>
        </View>
        <View style={s.tableRow}>
          <Text style={[s.tdCell, { width: "30%" }]}>Administrador</Text>
          <Text style={[s.tdCell, { width: "35%" }]}>admin@paiffer.com</Text>
          <Text style={[s.tdCell, { width: "20%" }]}>password123</Text>
          <Text style={[s.tdCell, { width: "15%" }]}>ADMIN</Text>
        </View>
        <View style={s.tableRow}>
          <Text style={[s.tdCell, { width: "30%" }]}>João Mecânico</Text>
          <Text style={[s.tdCell, { width: "35%" }]}>mecanico@paiffer.com</Text>
          <Text style={[s.tdCell, { width: "20%" }]}>password123</Text>
          <Text style={[s.tdCell, { width: "15%" }]}>MECHANIC</Text>
        </View>
        <View style={s.tableRow}>
          <Text style={[s.tdCell, { width: "30%" }]}>Carlos Eletricista</Text>
          <Text style={[s.tdCell, { width: "35%" }]}>carlos@paiffer.com</Text>
          <Text style={[s.tdCell, { width: "20%" }]}>password123</Text>
          <Text style={[s.tdCell, { width: "15%" }]}>MECHANIC</Text>
        </View>
        <View style={s.tableRow}>
          <Text style={[s.tdCell, { width: "30%" }]}>Ana Atendente</Text>
          <Text style={[s.tdCell, { width: "35%" }]}>atendente@paiffer.com</Text>
          <Text style={[s.tdCell, { width: "20%" }]}>password123</Text>
          <Text style={[s.tdCell, { width: "15%" }]}>ATTENDANT</Text>
        </View>
      </Page>
    </Document>
  );
}
