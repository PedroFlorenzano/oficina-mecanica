import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 9, fontFamily: "Helvetica" },
  header: { marginBottom: 14, borderBottomWidth: 1, borderBottomColor: "#334155", paddingBottom: 10 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  title: { fontSize: 20, fontFamily: "Helvetica-Bold", color: "#0f172a" },
  subtitle: { fontSize: 8, color: "#64748b" },
  section: { marginBottom: 10 },
  sectionTitle: { fontFamily: "Helvetica-Bold", fontSize: 8, color: "#64748b", letterSpacing: 0.5, marginBottom: 4, textTransform: "uppercase" },
  card: { backgroundColor: "#f8fafc", borderWidth: 0.5, borderColor: "#e2e8f0", borderRadius: 4, padding: 8 },
  grid2: { flexDirection: "row", gap: 8 },
  gridCell: { flex: 1 },
  fieldLabel: { fontSize: 7, color: "#94a3b8", marginBottom: 1 },
  fieldValue: { fontSize: 9, color: "#1e293b" },
  fieldValueBold: { fontSize: 9, color: "#1e293b", fontFamily: "Helvetica-Bold" },
  complaintBox: { borderWidth: 0.5, borderColor: "#c7d2fe", borderRadius: 4, marginBottom: 8, overflow: "hidden" },
  complaintHeader: { backgroundColor: "#eef2ff", paddingHorizontal: 8, paddingVertical: 5 },
  complaintTitle: { fontFamily: "Helvetica-Bold", fontSize: 9, color: "#3730a3" },
  complaintBody: { paddingHorizontal: 8, paddingVertical: 6 },
  tableHeader: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#e2e8f0", paddingBottom: 3, marginBottom: 3 },
  tableHeaderText: { fontSize: 7, color: "#94a3b8", fontFamily: "Helvetica-Bold" },
  tableRow: { flexDirection: "row", paddingVertical: 2.5, borderBottomWidth: 0.3, borderBottomColor: "#f1f5f9" },
  tableRowLast: { flexDirection: "row", paddingVertical: 2.5 },
  colDesc: { flex: 3 },
  colQty: { flex: 0.8, textAlign: "center" },
  colUnit: { flex: 1.2, textAlign: "right" },
  colTotal: { flex: 1.2, textAlign: "right" },
  cellText: { fontSize: 8, color: "#334155" },
  cellTextMuted: { fontSize: 8, color: "#94a3b8" },
  subtotalRow: { flexDirection: "row", justifyContent: "flex-end", paddingTop: 5, marginTop: 3, borderTopWidth: 0.5, borderTopColor: "#e2e8f0" },
  subtotalLabel: { fontSize: 8, color: "#64748b", marginRight: 8 },
  subtotalValue: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#1e293b" },
  totalsBox: { backgroundColor: "#f1f5f9", borderWidth: 0.5, borderColor: "#cbd5e1", borderRadius: 4, padding: 10, marginBottom: 10 },
  totalsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  totalsLabel: { fontSize: 8, color: "#64748b" },
  totalsValue: { fontSize: 8, color: "#1e293b", fontFamily: "Helvetica-Bold" },
  totalFinalRow: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 0.5, borderTopColor: "#94a3b8", paddingTop: 6, marginTop: 4 },
  totalFinalLabel: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#0f172a" },
  totalFinalValue: { fontSize: 13, fontFamily: "Helvetica-Bold", color: "#16a34a" },
  footer: { position: "absolute", bottom: 24, left: 36, right: 36, borderTopWidth: 0.5, borderTopColor: "#e2e8f0", paddingTop: 6 },
  footerRow: { flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 7, color: "#94a3b8" },
  footerValidity: { fontSize: 8, color: "#64748b", fontFamily: "Helvetica-Bold", marginBottom: 4 },
});

function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString("pt-BR");
}

function formatMoney(v: number) {
  return `R$ ${(v || 0).toFixed(2)}`;
}

export function BudgetDocument({ order }: { order: any }) {
  const hasComplaints = order.complaints && order.complaints.length > 0;
  const ungroupedServices = (order.services || []).filter((s: any) => !s.complaintId);
  const ungroupedParts = (order.parts || []).filter((p: any) => !p.complaintId);
  const totalServices = (order.services || []).reduce((s: number, sv: any) => s + (sv.price || 0), 0);
  const totalParts = (order.parts || []).reduce((s: number, p: any) => s + (p.totalPrice || 0), 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.title}>ORÇAMENTO #{order.number}</Text>
              <Text style={styles.subtitle}>Data: {formatDate(order.createdAt)}</Text>
            </View>
          </View>
        </View>

        {/* Cliente */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cliente</Text>
          <View style={styles.card}>
            <View style={styles.grid2}>
              <View style={styles.gridCell}>
                <Text style={styles.fieldLabel}>NOME</Text>
                <Text style={styles.fieldValueBold}>{order.client?.name}</Text>
              </View>
              <View style={styles.gridCell}>
                <Text style={styles.fieldLabel}>TELEFONE</Text>
                <Text style={styles.fieldValue}>{order.client?.phone || "—"}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Veículo */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Veículo</Text>
          <View style={styles.card}>
            <View style={styles.grid2}>
              <View style={styles.gridCell}>
                <Text style={styles.fieldLabel}>PLACA</Text>
                <Text style={styles.fieldValueBold}>{order.vehicle?.plate}</Text>
              </View>
              <View style={styles.gridCell}>
                <Text style={styles.fieldLabel}>MARCA / MODELO</Text>
                <Text style={styles.fieldValue}>{order.vehicle?.brand} {order.vehicle?.model}</Text>
              </View>
              <View style={styles.gridCell}>
                <Text style={styles.fieldLabel}>KM</Text>
                <Text style={styles.fieldValue}>{(order.mileage || 0).toLocaleString("pt-BR")} km</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Reclamações */}
        {hasComplaints && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Serviços e Peças</Text>
            {order.complaints.map((c: any) => {
              const cSvcTotal = (c.services || []).reduce((s: number, sv: any) => s + (sv.price || 0), 0);
              const cPrtTotal = (c.parts || []).reduce((s: number, p: any) => s + (p.totalPrice || 0), 0);
              return (
                <View key={c.id} style={styles.complaintBox}>
                  <View style={styles.complaintHeader}>
                    <Text style={styles.complaintTitle}>#{c.number} — {c.description}</Text>
                  </View>
                  <View style={styles.complaintBody}>
                    {(c.services || []).length > 0 && (
                      <View style={{ marginBottom: 6 }}>
                        <Text style={[styles.fieldLabel, { marginBottom: 3 }]}>SERVIÇOS</Text>
                        <View style={styles.tableHeader}>
                          <Text style={[styles.tableHeaderText, styles.colDesc]}>Descrição</Text>
                          <Text style={[styles.tableHeaderText, styles.colTotal]}>Valor</Text>
                        </View>
                        {(c.services || []).map((sv: any, idx: number) => (
                          <View key={sv.id} style={idx === c.services.length - 1 ? styles.tableRowLast : styles.tableRow}>
                            <Text style={[styles.cellText, styles.colDesc]}>{sv.description}</Text>
                            <Text style={[styles.cellText, styles.colTotal]}>{formatMoney(sv.price)}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                    {(c.parts || []).length > 0 && (
                      <View style={{ marginBottom: 6 }}>
                        <Text style={[styles.fieldLabel, { marginBottom: 3 }]}>PEÇAS</Text>
                        <View style={styles.tableHeader}>
                          <Text style={[styles.tableHeaderText, styles.colDesc]}>Descrição</Text>
                          <Text style={[styles.tableHeaderText, styles.colQty]}>Qtd</Text>
                          <Text style={[styles.tableHeaderText, styles.colUnit]}>Unit.</Text>
                          <Text style={[styles.tableHeaderText, styles.colTotal]}>Total</Text>
                        </View>
                        {(c.parts || []).map((p: any, idx: number) => (
                          <View key={p.id} style={idx === c.parts.length - 1 ? styles.tableRowLast : styles.tableRow}>
                            <Text style={[styles.cellText, styles.colDesc]}>{p.description}</Text>
                            <Text style={[styles.cellTextMuted, styles.colQty]}>{p.quantity}</Text>
                            <Text style={[styles.cellTextMuted, styles.colUnit]}>{formatMoney(p.unitPrice)}</Text>
                            <Text style={[styles.cellText, styles.colTotal]}>{formatMoney(p.totalPrice)}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                    <View style={styles.subtotalRow}>
                      <Text style={styles.subtotalLabel}>Subtotal</Text>
                      <Text style={styles.subtotalValue}>{formatMoney(cSvcTotal + cPrtTotal)}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Serviços avulsos */}
        {ungroupedServices.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Serviços</Text>
            <View style={styles.card}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, styles.colDesc]}>Descrição</Text>
                <Text style={[styles.tableHeaderText, styles.colTotal]}>Valor</Text>
              </View>
              {ungroupedServices.map((sv: any, idx: number) => (
                <View key={sv.id} style={idx === ungroupedServices.length - 1 ? styles.tableRowLast : styles.tableRow}>
                  <Text style={[styles.cellText, styles.colDesc]}>{sv.description}</Text>
                  <Text style={[styles.cellText, styles.colTotal]}>{formatMoney(sv.price)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Peças avulsas */}
        {ungroupedParts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Peças</Text>
            <View style={styles.card}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, styles.colDesc]}>Descrição</Text>
                <Text style={[styles.tableHeaderText, styles.colQty]}>Qtd</Text>
                <Text style={[styles.tableHeaderText, styles.colUnit]}>Unit.</Text>
                <Text style={[styles.tableHeaderText, styles.colTotal]}>Total</Text>
              </View>
              {ungroupedParts.map((p: any, idx: number) => (
                <View key={p.id} style={idx === ungroupedParts.length - 1 ? styles.tableRowLast : styles.tableRow}>
                  <Text style={[styles.cellText, styles.colDesc]}>{p.description}</Text>
                  <Text style={[styles.cellTextMuted, styles.colQty]}>{p.quantity}</Text>
                  <Text style={[styles.cellTextMuted, styles.colUnit]}>{formatMoney(p.unitPrice)}</Text>
                  <Text style={[styles.cellText, styles.colTotal]}>{formatMoney(p.totalPrice)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Total Geral */}
        <View style={styles.totalsBox}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Total serviços</Text>
            <Text style={styles.totalsValue}>{formatMoney(totalServices)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Total peças</Text>
            <Text style={styles.totalsValue}>{formatMoney(totalParts)}</Text>
          </View>
          <View style={styles.totalFinalRow}>
            <Text style={styles.totalFinalLabel}>TOTAL GERAL</Text>
            <Text style={styles.totalFinalValue}>{formatMoney(order.totalAmount)}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerValidity}>Orçamento válido por 15 dias</Text>
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Orçamento #{order.number} — {order.client?.name}</Text>
            <Text style={styles.footerText}>{formatDate(new Date())}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
