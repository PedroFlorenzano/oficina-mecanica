import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

interface ChecklistData {
  orderNumber: number;
  date: string;
  client: { name: string; document: string; phone: string | null };
  vehicle: { plate: string; brand: string; model: string; year: number; color: string | null };
  mileage: number;
  shopName: string;
}

const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 9, fontFamily: "Helvetica" },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", textAlign: "center", marginBottom: 4 },
  subtitle: { fontSize: 9, textAlign: "center", color: "#64748b", marginBottom: 16 },
  section: { marginBottom: 12 },
  sectionTitle: { fontFamily: "Helvetica-Bold", fontSize: 10, backgroundColor: "#f1f5f9", paddingHorizontal: 6, paddingVertical: 4, marginBottom: 6, borderRadius: 2 },
  row: { flexDirection: "row", marginBottom: 4 },
  label: { fontSize: 8, color: "#64748b", width: 80 },
  value: { fontSize: 9, fontFamily: "Helvetica-Bold", flex: 1 },
  checkRow: { flexDirection: "row", alignItems: "center", marginBottom: 5, paddingVertical: 2 },
  checkbox: { width: 12, height: 12, borderWidth: 1, borderColor: "#334155", borderRadius: 2, marginRight: 8 },
  checkLabel: { fontSize: 9, flex: 1 },
  checkOptions: { flexDirection: "row", gap: 16 },
  optionGroup: { flexDirection: "row", alignItems: "center", gap: 4 },
  radioBox: { width: 10, height: 10, borderWidth: 1, borderColor: "#334155", borderRadius: 5 },
  optionLabel: { fontSize: 8, color: "#475569" },
  fuelRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  fuelBar: { flex: 1, height: 14, borderWidth: 1, borderColor: "#334155", borderRadius: 3, flexDirection: "row" },
  fuelSegment: { flex: 1, borderRightWidth: 0.5, borderRightColor: "#94a3b8" },
  fuelLabel: { fontSize: 7, color: "#64748b", width: 60 },
  obsBox: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 4, height: 50, marginTop: 4, padding: 4 },
  signatureSection: { marginTop: 24, flexDirection: "row", gap: 40 },
  signatureBox: { flex: 1, alignItems: "center" },
  signatureLine: { borderTopWidth: 1, borderTopColor: "#334155", width: "100%", marginTop: 40 },
  signatureLabel: { fontSize: 8, color: "#64748b", marginTop: 4 },
  footer: { position: "absolute", bottom: 20, left: 30, right: 30, textAlign: "center", fontSize: 7, color: "#94a3b8" },
});

const checklistItems = [
  { category: "Exterior", items: ["Amassados/Riscos", "Para-choque dianteiro", "Para-choque traseiro", "Retrovisores", "Vidros (trincas)", "Palhetas", "Antena", "Lanternas/Faróis"] },
  { category: "Interior", items: ["Bancos (estado)", "Painel/Console", "Ar-condicionado", "Tapetes", "Macaco/Triângulo/Chave de roda", "Estepe", "Documentos no veículo", "Rádio/Multimídia"] },
  { category: "Pertences", items: ["Objetos pessoais no veículo", "Cartão de estacionamento", "Controle de portão", "Outros (anotar abaixo)"] },
];

export default function ChecklistDocument({ data }: { data: ChecklistData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>CHECKLIST DE RECEBIMENTO</Text>
        <Text style={styles.subtitle}>{data.shopName} — OS #{data.orderNumber} — {data.date}</Text>

        {/* Dados do cliente/veículo */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dados</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Cliente:</Text>
            <Text style={styles.value}>{data.client.name}</Text>
            <Text style={styles.label}>CPF/CNPJ:</Text>
            <Text style={styles.value}>{data.client.document}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Veículo:</Text>
            <Text style={styles.value}>{data.vehicle.brand} {data.vehicle.model} ({data.vehicle.year})</Text>
            <Text style={styles.label}>Placa:</Text>
            <Text style={styles.value}>{data.vehicle.plate}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Cor:</Text>
            <Text style={styles.value}>{data.vehicle.color || "—"}</Text>
            <Text style={styles.label}>KM Entrada:</Text>
            <Text style={styles.value}>{data.mileage.toLocaleString("pt-BR")} km</Text>
          </View>
        </View>

        {/* Nível de combustível */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Combustível</Text>
          <View style={styles.fuelRow}>
            <Text style={styles.fuelLabel}>Nível:</Text>
            <Text style={{ fontSize: 7 }}>E</Text>
            <View style={styles.fuelBar}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <View key={i} style={styles.fuelSegment} />
              ))}
            </View>
            <Text style={{ fontSize: 7 }}>F</Text>
          </View>
        </View>

        {/* Checklist */}
        {checklistItems.map((cat) => (
          <View key={cat.category} style={styles.section}>
            <Text style={styles.sectionTitle}>{cat.category}</Text>
            {cat.items.map((item) => (
              <View key={item} style={styles.checkRow}>
                <View style={styles.checkbox} />
                <Text style={styles.checkLabel}>{item}</Text>
                <View style={styles.checkOptions}>
                  <View style={styles.optionGroup}>
                    <View style={styles.radioBox} />
                    <Text style={styles.optionLabel}>OK</Text>
                  </View>
                  <View style={styles.optionGroup}>
                    <View style={styles.radioBox} />
                    <Text style={styles.optionLabel}>Avaria</Text>
                  </View>
                  <View style={styles.optionGroup}>
                    <View style={styles.radioBox} />
                    <Text style={styles.optionLabel}>N/A</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        ))}

        {/* Observações */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Observações / Avarias Detalhadas</Text>
          <View style={styles.obsBox} />
        </View>

        {/* Assinaturas */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Responsável da Oficina</Text>
          </View>
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Cliente</Text>
          </View>
        </View>

        <Text style={styles.footer}>Documento gerado em {data.date} — {data.shopName}</Text>
      </Page>
    </Document>
  );
}
