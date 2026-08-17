import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

interface CheckoutData {
  orderNumber: number;
  date: string;
  client: { name: string };
  vehicle: { plate: string; brand: string; model: string; year: number; color: string | null };
  services: string[]; // Lista de serviços da OS (sem valores)
  shopName: string;
}

const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 9, fontFamily: "Helvetica" },
  header: { backgroundColor: "#1e293b", borderRadius: 6, padding: 16, marginBottom: 16, alignItems: "center" },
  headerTitle: { fontSize: 18, fontFamily: "Helvetica-Bold", color: "#ffffff", letterSpacing: 1 },
  headerSubtitle: { fontSize: 8, color: "#94a3b8", marginTop: 4 },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", textAlign: "center", marginBottom: 4 },
  vehicleInfo: { fontSize: 8, textAlign: "center", color: "#64748b", marginBottom: 16 },
  section: { marginBottom: 10 },
  sectionTitle: { fontFamily: "Helvetica-Bold", fontSize: 9, color: "#475569", marginBottom: 6, textTransform: "uppercase" },
  checkRow: { flexDirection: "row", alignItems: "center", marginBottom: 6, paddingVertical: 2 },
  checkbox: { width: 13, height: 13, borderWidth: 1.5, borderColor: "#334155", borderRadius: 2, marginRight: 10 },
  checkLabel: { fontSize: 10, flex: 1, color: "#1e293b" },
  separator: { borderBottomWidth: 0.5, borderBottomColor: "#e2e8f0", marginVertical: 10 },
  footerSection: { marginTop: 20, flexDirection: "row", justifyContent: "space-between" },
  footerField: { flexDirection: "row", alignItems: "center" },
  footerLabel: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#475569" },
  footerLine: { borderBottomWidth: 1, borderBottomColor: "#334155", width: 100, marginLeft: 4 },
  message: { marginTop: 24, textAlign: "center", fontSize: 9, color: "#64748b", fontStyle: "italic" },
  footer: { position: "absolute", bottom: 20, left: 30, right: 30, textAlign: "center", fontSize: 7, color: "#94a3b8" },
});

// Itens fixos de verificação (baseado no modelo Paiffer)
const FIXED_ITEMS = [
  "Conferência de todos os itens relatados na entrega",
  "Teste de rodagem",
  "Aperto das 4 rodas",
  "Nível do óleo do motor",
  "Nível fluido de direção",
  "Nível fluido de arrefecimento",
  "Nível do fluido de freio",
  "Nível da água do limpador de para-brisa",
  "Calibração dos pneus + step",
  "Lâmpadas",
  "Etiqueta de óleo",
  "Regulagem do freio de mão",
];

export default function CheckoutDocument({ data }: { data: CheckoutData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header da oficina */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{data.shopName}</Text>
          <Text style={styles.headerSubtitle}>
            OS #{data.orderNumber} — {data.client.name} — {data.vehicle.plate}
          </Text>
        </View>

        {/* Título */}
        <Text style={styles.title}>Check-out de Saída</Text>
        <Text style={styles.vehicleInfo}>
          {data.vehicle.brand} {data.vehicle.model} ({data.vehicle.year}) — {data.vehicle.color || ""} — Placa: {data.vehicle.plate}
        </Text>

        {/* Itens fixos de verificação */}
        <View style={styles.section}>
          {FIXED_ITEMS.map((item) => (
            <View key={item} style={styles.checkRow}>
              <View style={styles.checkbox} />
              <Text style={styles.checkLabel}>{item}</Text>
            </View>
          ))}
        </View>

        {/* Serviços da OS */}
        {data.services.length > 0 && (
          <>
            <View style={styles.separator} />
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Serviços executados nesta OS</Text>
              {data.services.map((service, i) => (
                <View key={i} style={styles.checkRow}>
                  <View style={styles.checkbox} />
                  <Text style={styles.checkLabel}>{service}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Data e Mecânico */}
        <View style={styles.separator} />
        <View style={styles.footerSection}>
          <View style={styles.footerField}>
            <Text style={styles.footerLabel}>Data: ___/___/___</Text>
          </View>
          <View style={styles.footerField}>
            <Text style={styles.footerLabel}>Mecânico:</Text>
            <View style={styles.footerLine} />
          </View>
        </View>

        {/* Mensagem de agradecimento */}
        <Text style={styles.message}>
          A {data.shopName} agradece a confiança em nosso trabalho.{"\n"}Deus abençoe!
        </Text>

        <Text style={styles.footer}>Documento gerado em {data.date} — {data.shopName}</Text>
      </Page>
    </Document>
  );
}
