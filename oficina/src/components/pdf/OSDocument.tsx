import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 9, fontFamily: "Helvetica" },

  // Cabeçalho
  header: { marginBottom: 14, borderBottomWidth: 1, borderBottomColor: "#334155", paddingBottom: 10 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  osTitle: { fontSize: 20, fontFamily: "Helvetica-Bold", color: "#0f172a" },
  osDate: { fontSize: 8, color: "#64748b" },
  statusBadge: { fontSize: 8, color: "#1e40af", backgroundColor: "#dbeafe", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },

  // Seções
  section: { marginBottom: 10 },
  sectionTitle: { fontFamily: "Helvetica-Bold", fontSize: 8, color: "#64748b", letterSpacing: 0.5, marginBottom: 4, textTransform: "uppercase" },
  card: { backgroundColor: "#f8fafc", borderWidth: 0.5, borderColor: "#e2e8f0", borderRadius: 4, padding: 8 },

  // Grid de campos
  grid2: { flexDirection: "row", gap: 8 },
  gridCell: { flex: 1 },
  fieldLabel: { fontSize: 7, color: "#94a3b8", marginBottom: 1 },
  fieldValue: { fontSize: 9, color: "#1e293b" },
  fieldValueBold: { fontSize: 9, color: "#1e293b", fontFamily: "Helvetica-Bold" },

  // Reclamações
  complaintBox: { borderWidth: 0.5, borderColor: "#c7d2fe", borderRadius: 4, marginBottom: 8, overflow: "hidden" },
  complaintHeader: { backgroundColor: "#eef2ff", paddingHorizontal: 8, paddingVertical: 5 },
  complaintTitle: { fontFamily: "Helvetica-Bold", fontSize: 9, color: "#3730a3" },
  complaintBody: { paddingHorizontal: 8, paddingVertical: 6 },

  // Tabela interna
  tableHeader: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#e2e8f0", paddingBottom: 3, marginBottom: 3 },
  tableHeaderText: { fontSize: 7, color: "#94a3b8", fontFamily: "Helvetica-Bold" },
  tableRow: { flexDirection: "row", paddingVertical: 2.5, borderBottomWidth: 0.3, borderBottomColor: "#f1f5f9" },
  tableRowLast: { flexDirection: "row", paddingVertical: 2.5 },
  colDesc: { flex: 3 },
  colTime: { flex: 1, textAlign: "right" },
  colQty: { flex: 0.8, textAlign: "center" },
  colUnit: { flex: 1.2, textAlign: "right" },
  colTotal: { flex: 1.2, textAlign: "right" },
  cellText: { fontSize: 8, color: "#334155" },
  cellTextMuted: { fontSize: 8, color: "#94a3b8" },

  // Subtotal reclamação
  subtotalRow: { flexDirection: "row", justifyContent: "flex-end", paddingTop: 5, marginTop: 3, borderTopWidth: 0.5, borderTopColor: "#e2e8f0" },
  subtotalLabel: { fontSize: 8, color: "#64748b", marginRight: 8 },
  subtotalValue: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#1e293b" },

  // Total geral
  totalsBox: { backgroundColor: "#f1f5f9", borderWidth: 0.5, borderColor: "#cbd5e1", borderRadius: 4, padding: 10, marginBottom: 10 },
  totalsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  totalsLabel: { fontSize: 8, color: "#64748b" },
  totalsValue: { fontSize: 8, color: "#1e293b", fontFamily: "Helvetica-Bold" },
  totalFinalRow: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 0.5, borderTopColor: "#94a3b8", paddingTop: 6, marginTop: 4 },
  totalFinalLabel: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#0f172a" },
  totalFinalValue: { fontSize: 13, fontFamily: "Helvetica-Bold", color: "#16a34a" },

  // Observações
  notesBox: { backgroundColor: "#fffbeb", borderWidth: 0.5, borderColor: "#fde68a", borderRadius: 4, padding: 8 },
  notesText: { fontSize: 8, color: "#78350f" },

  // Cancelamento
  cancelBox: { backgroundColor: "#fff1f2", borderWidth: 0.5, borderColor: "#fecdd3", borderRadius: 4, padding: 8 },
  cancelText: { fontSize: 8, color: "#be123c" },

  // Histórico
  historyRow: { flexDirection: "row", alignItems: "center", paddingVertical: 2.5, borderBottomWidth: 0.3, borderBottomColor: "#f1f5f9" },
  historyDate: { fontSize: 7, color: "#94a3b8", width: 100 },
  historyStatus: { fontSize: 8, color: "#334155" },

  // Rodapé
  footer: { position: "absolute", bottom: 24, left: 36, right: 36, borderTopWidth: 0.5, borderTopColor: "#e2e8f0", paddingTop: 6, flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 7, color: "#94a3b8" },
});

const statusLabels: Record<string, string> = {
  OPEN: "Aberta",
  IN_PROGRESS: "Em Execução",
  WAITING_PART: "Aguardando Peça",
  WAITING_APPROVAL: "Aguardando Aprovação",
  COMPLETED: "Concluída",
  DELIVERED: "Entregue",
  CANCELLED: "Cancelada",
};

function formatDate(d: string | Date) {
  return new Date(d).toLocaleString("pt-BR");
}

function formatMoney(v: number) {
  return `R$ ${(v || 0).toFixed(2)}`;
}

function formatMinutes(min?: number | null) {
  if (!min) return "—";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

export function OSDocument({ order }: { order: any }) {
  const hasComplaints = order.complaints && order.complaints.length > 0;

  // Serviços e peças não vinculados a reclamações (OS legadas)
  const ungroupedServices = (order.services || []).filter((s: any) => !s.complaintId);
  const ungroupedParts = (order.parts || []).filter((p: any) => !p.complaintId);

  const totalServices = (order.services || []).reduce((s: number, sv: any) => s + (sv.price || 0), 0);
  const totalParts = (order.parts || []).reduce((s: number, p: any) => s + (p.totalPrice || 0), 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* ── CABEÇALHO ── */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.osTitle}>O.S. #{order.number}</Text>
              <Text style={styles.osDate}>Abertura: {formatDate(order.createdAt)}</Text>
              {order.createdBy && (
                <Text style={styles.osDate}>Responsável: {order.createdBy.name}</Text>
              )}
            </View>
            <Text style={styles.statusBadge}>{statusLabels[order.status] || order.status}</Text>
          </View>
        </View>

        {/* ── CLIENTE ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cliente</Text>
          <View style={styles.card}>
            <View style={styles.grid2}>
              <View style={styles.gridCell}>
                <Text style={styles.fieldLabel}>NOME / RAZÃO SOCIAL</Text>
                <Text style={styles.fieldValueBold}>{order.client?.name}</Text>
              </View>
              <View style={styles.gridCell}>
                <Text style={styles.fieldLabel}>CPF / CNPJ</Text>
                <Text style={styles.fieldValue}>{order.client?.document}</Text>
              </View>
            </View>
            <View style={[styles.grid2, { marginTop: 5 }]}>
              <View style={styles.gridCell}>
                <Text style={styles.fieldLabel}>TELEFONE</Text>
                <Text style={styles.fieldValue}>{order.client?.phone || "—"}</Text>
              </View>
              <View style={styles.gridCell}>
                <Text style={styles.fieldLabel}>E-MAIL</Text>
                <Text style={styles.fieldValue}>{order.client?.email || "—"}</Text>
              </View>
            </View>
            {order.client?.address && (
              <View style={{ marginTop: 5 }}>
                <Text style={styles.fieldLabel}>ENDEREÇO</Text>
                <Text style={styles.fieldValue}>{order.client.address}</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── VEÍCULO ── */}
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
                <Text style={styles.fieldLabel}>ANO</Text>
                <Text style={styles.fieldValue}>{order.vehicle?.year}</Text>
              </View>
              <View style={styles.gridCell}>
                <Text style={styles.fieldLabel}>COR</Text>
                <Text style={styles.fieldValue}>{order.vehicle?.color || "—"}</Text>
              </View>
            </View>
            <View style={{ marginTop: 5 }}>
              <Text style={styles.fieldLabel}>KM NA ENTRADA</Text>
              <Text style={styles.fieldValueBold}>{(order.mileage || 0).toLocaleString("pt-BR")} km</Text>
            </View>
          </View>
        </View>

        {/* ── RECLAMAÇÕES ── */}
        {hasComplaints && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reclamações / Serviços</Text>
            {order.complaints.map((c: any) => {
              const cSvcTotal = (c.services || []).reduce((s: number, sv: any) => s + (sv.price || 0), 0);
              const cPrtTotal = (c.parts || []).reduce((s: number, p: any) => s + (p.totalPrice || 0), 0);
              const cSubtotal = cSvcTotal + cPrtTotal;

              return (
                <View key={c.id} style={styles.complaintBox}>
                  <View style={styles.complaintHeader}>
                    <Text style={styles.complaintTitle}>#{c.number} — {c.description}</Text>
                  </View>
                  <View style={styles.complaintBody}>

                    {/* Serviços */}
                    {(c.services || []).length > 0 && (
                      <View style={{ marginBottom: 6 }}>
                        <Text style={[styles.fieldLabel, { marginBottom: 3 }]}>SERVIÇOS</Text>
                        <View style={styles.tableHeader}>
                          <Text style={[styles.tableHeaderText, styles.colDesc]}>Descrição</Text>
                          <Text style={[styles.tableHeaderText, styles.colTime]}>Tempo</Text>
                          <Text style={[styles.tableHeaderText, styles.colTotal]}>Valor</Text>
                        </View>
                        {(c.services || []).map((sv: any, idx: number) => (
                          <View
                            key={sv.id}
                            style={idx === c.services.length - 1 ? styles.tableRowLast : styles.tableRow}
                          >
                            <Text style={[styles.cellText, styles.colDesc]}>{sv.description}</Text>
                            <Text style={[styles.cellTextMuted, styles.colTime]}>
                              {formatMinutes(sv.timeMinutes)}
                            </Text>
                            <Text style={[styles.cellText, styles.colTotal]}>{formatMoney(sv.price)}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Peças */}
                    {(c.parts || []).length > 0 && (
                      <View style={{ marginBottom: 6 }}>
                        <Text style={[styles.fieldLabel, { marginBottom: 3 }]}>PEÇAS / PRODUTOS</Text>
                        <View style={styles.tableHeader}>
                          <Text style={[styles.tableHeaderText, styles.colDesc]}>Descrição</Text>
                          <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>Fornecedor</Text>
                          <Text style={[styles.tableHeaderText, styles.colQty]}>Qtd</Text>
                          <Text style={[styles.tableHeaderText, styles.colUnit]}>Unit.</Text>
                          <Text style={[styles.tableHeaderText, styles.colTotal]}>Total</Text>
                        </View>
                        {(c.parts || []).map((p: any, idx: number) => (
                          <View
                            key={p.id}
                            style={idx === c.parts.length - 1 ? styles.tableRowLast : styles.tableRow}
                          >
                            <Text style={[styles.cellText, styles.colDesc]}>{p.description}</Text>
                            <Text style={[styles.cellTextMuted, { flex: 1.5 }]}>{p.stockItem?.supplier || "—"}</Text>
                            <Text style={[styles.cellTextMuted, styles.colQty]}>{p.quantity}</Text>
                            <Text style={[styles.cellTextMuted, styles.colUnit]}>{formatMoney(p.unitPrice)}</Text>
                            <Text style={[styles.cellText, styles.colTotal]}>{formatMoney(p.totalPrice)}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    <View style={styles.subtotalRow}>
                      <Text style={styles.subtotalLabel}>Subtotal reclamação</Text>
                      <Text style={styles.subtotalValue}>{formatMoney(cSubtotal)}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ── SERVIÇOS AVULSOS (OS sem reclamações) ── */}
        {ungroupedServices.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Serviços</Text>
            <View style={styles.card}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, styles.colDesc]}>Descrição</Text>
                <Text style={[styles.tableHeaderText, styles.colTime]}>Tempo</Text>
                <Text style={[styles.tableHeaderText, styles.colTotal]}>Valor</Text>
              </View>
              {ungroupedServices.map((sv: any, idx: number) => (
                <View key={sv.id} style={idx === ungroupedServices.length - 1 ? styles.tableRowLast : styles.tableRow}>
                  <Text style={[styles.cellText, styles.colDesc]}>{sv.description}</Text>
                  <Text style={[styles.cellTextMuted, styles.colTime]}>{formatMinutes(sv.timeMinutes)}</Text>
                  <Text style={[styles.cellText, styles.colTotal]}>{formatMoney(sv.price)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── PEÇAS AVULSAS (OS sem reclamações) ── */}
        {ungroupedParts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Peças / Produtos</Text>
            <View style={styles.card}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, styles.colDesc]}>Descrição</Text>
                <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>Fornecedor</Text>
                <Text style={[styles.tableHeaderText, styles.colQty]}>Qtd</Text>
                <Text style={[styles.tableHeaderText, styles.colUnit]}>Unit.</Text>
                <Text style={[styles.tableHeaderText, styles.colTotal]}>Total</Text>
              </View>
              {ungroupedParts.map((p: any, idx: number) => (
                <View key={p.id} style={idx === ungroupedParts.length - 1 ? styles.tableRowLast : styles.tableRow}>
                  <Text style={[styles.cellText, styles.colDesc]}>{p.description}</Text>
                  <Text style={[styles.cellTextMuted, { flex: 1.5 }]}>{p.stockItem?.supplier || "—"}</Text>
                  <Text style={[styles.cellTextMuted, styles.colQty]}>{p.quantity}</Text>
                  <Text style={[styles.cellTextMuted, styles.colUnit]}>{formatMoney(p.unitPrice)}</Text>
                  <Text style={[styles.cellText, styles.colTotal]}>{formatMoney(p.totalPrice)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── TOTAL GERAL ── */}
        <View style={styles.totalsBox}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Total serviços</Text>
            <Text style={styles.totalsValue}>{formatMoney(totalServices)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Total peças / produtos</Text>
            <Text style={styles.totalsValue}>{formatMoney(totalParts)}</Text>
          </View>
          <View style={styles.totalFinalRow}>
            <Text style={styles.totalFinalLabel}>TOTAL GERAL</Text>
            <Text style={styles.totalFinalValue}>{formatMoney(order.totalAmount)}</Text>
          </View>
        </View>

        {/* ── OBSERVAÇÕES ── */}
        {order.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Observações</Text>
            <View style={styles.notesBox}>
              <Text style={styles.notesText}>{order.notes}</Text>
            </View>
          </View>
        )}

        {/* ── MOTIVO DE CANCELAMENTO ── */}
        {order.status === "CANCELLED" && order.cancelReason && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Motivo do cancelamento</Text>
            <View style={styles.cancelBox}>
              <Text style={styles.cancelText}>{order.cancelReason}</Text>
            </View>
          </View>
        )}

        {/* ── HISTÓRICO DE STATUS ── */}
        {(order.statusHistory || []).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Histórico de Status</Text>
            <View style={styles.card}>
              {[...(order.statusHistory || [])].reverse().map((h: any) => (
                <View key={h.id} style={styles.historyRow}>
                  <Text style={styles.historyDate}>{formatDate(h.createdAt)}</Text>
                  <Text style={styles.historyStatus}>
                    {h.fromStatus ? `${statusLabels[h.fromStatus] || h.fromStatus} → ` : ""}
                    {statusLabels[h.toStatus] || h.toStatus}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── RODAPÉ ── */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>O.S. #{order.number} — {order.client?.name}</Text>
          <Text style={styles.footerText}>Gerado em {formatDate(new Date())}</Text>
        </View>
      </Page>
    </Document>
  );
}
