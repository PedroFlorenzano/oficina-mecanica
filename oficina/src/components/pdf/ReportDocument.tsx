import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica" },
  title: { fontSize: 16, fontWeight: "bold", marginBottom: 4 },
  subtitle: { fontSize: 9, color: "#666", marginBottom: 20 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 11, fontWeight: "bold", marginBottom: 8, borderBottomWidth: 1, borderBottomColor: "#ddd", paddingBottom: 4 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  label: { color: "#555" },
  value: { fontWeight: "bold" },
  tableHeader: { flexDirection: "row", backgroundColor: "#f1f5f9", paddingVertical: 4, paddingHorizontal: 6, marginBottom: 2 },
  tableRow: { flexDirection: "row", paddingVertical: 3, paddingHorizontal: 6, borderBottomWidth: 0.5, borderBottomColor: "#e2e8f0" },
  col1: { width: "8%" },
  col2: { width: "22%" },
  col3: { width: "14%" },
  col4: { width: "18%", textAlign: "right" },
  col5: { width: "18%", textAlign: "right" },
  col6: { width: "12%", textAlign: "right" },
  col7: { width: "8%", textAlign: "right" },
  green: { color: "#16a34a" },
  red: { color: "#dc2626" },
});

const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

interface ReportPDFProps {
  data: {
    totalOrders: number;
    totalRevenue: number;
    avgTicket: number;
    partsCost: number;
    grossProfit: number;
    completedCount: number;
    cancelledCount: number;
    monthly: { month: string; revenue: number; count: number }[];
    profitByOrder: { number: number; client: string; plate: string; revenue: number; partsCost: number; profit: number; margin: number }[];
  };
  period?: string;
}

export function ReportDocument({ data, period }: ReportPDFProps) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={s.title}>Relatório Financeiro</Text>
        <Text style={s.subtitle}>{period || "Período completo"} — Gerado em {new Date().toLocaleDateString("pt-BR")}</Text>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Resumo</Text>
          <View style={s.row}><Text style={s.label}>Faturamento Total</Text><Text style={[s.value, s.green]}>{fmt(data.totalRevenue)}</Text></View>
          <View style={s.row}><Text style={s.label}>Lucro Bruto</Text><Text style={s.value}>{fmt(data.grossProfit)}</Text></View>
          <View style={s.row}><Text style={s.label}>Ticket Médio</Text><Text style={s.value}>{fmt(data.avgTicket)}</Text></View>
          <View style={s.row}><Text style={s.label}>Custo de Peças</Text><Text style={[s.value, s.red]}>{fmt(data.partsCost)}</Text></View>
          <View style={s.row}><Text style={s.label}>Total de OS</Text><Text style={s.value}>{data.totalOrders}</Text></View>
          <View style={s.row}><Text style={s.label}>Concluídas</Text><Text style={s.value}>{data.completedCount}</Text></View>
          <View style={s.row}><Text style={s.label}>Canceladas</Text><Text style={s.value}>{data.cancelledCount}</Text></View>
        </View>

        {data.monthly.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Faturamento Mensal</Text>
            {data.monthly.map((m) => (
              <View key={m.month} style={s.row}>
                <Text style={s.label}>{m.month}</Text>
                <Text style={s.value}>{fmt(m.revenue)} ({m.count} OS)</Text>
              </View>
            ))}
          </View>
        )}

        {data.profitByOrder.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Lucro por OS</Text>
            <View style={s.tableHeader}>
              <Text style={[s.col1, { fontWeight: "bold" }]}>Nº</Text>
              <Text style={[s.col2, { fontWeight: "bold" }]}>Cliente</Text>
              <Text style={[s.col3, { fontWeight: "bold" }]}>Placa</Text>
              <Text style={[s.col4, { fontWeight: "bold" }]}>Faturamento</Text>
              <Text style={[s.col5, { fontWeight: "bold" }]}>Custo</Text>
              <Text style={[s.col6, { fontWeight: "bold" }]}>Lucro</Text>
              <Text style={[s.col7, { fontWeight: "bold" }]}>%</Text>
            </View>
            {data.profitByOrder.slice(0, 40).map((o) => (
              <View key={o.number} style={s.tableRow}>
                <Text style={s.col1}>#{o.number}</Text>
                <Text style={s.col2}>{o.client}</Text>
                <Text style={s.col3}>{o.plate}</Text>
                <Text style={s.col4}>{fmt(o.revenue)}</Text>
                <Text style={[s.col5, s.red]}>{fmt(o.partsCost)}</Text>
                <Text style={[s.col6, o.profit >= 0 ? s.green : s.red]}>{fmt(o.profit)}</Text>
                <Text style={s.col7}>{o.margin.toFixed(0)}%</Text>
              </View>
            ))}
          </View>
        )}
      </Page>
    </Document>
  );
}
