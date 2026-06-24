import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

// Code128-C encoder (otimizado para dígitos — ideal para chave de acesso)
const CODE128_PATTERNS: number[][] = [
  [2,1,2,2,2,2],[2,2,2,1,2,2],[2,2,2,2,2,1],[1,2,1,2,2,3],[1,2,1,3,2,2],
  [1,3,1,2,2,2],[1,2,2,2,1,3],[1,2,2,3,1,2],[1,3,2,2,1,2],[2,2,1,2,1,3],
  [2,2,1,3,1,2],[2,3,1,2,1,2],[1,1,2,2,3,2],[1,2,2,1,3,2],[1,2,2,2,3,1],
  [1,1,3,2,2,2],[1,2,3,1,2,2],[1,2,3,2,2,1],[2,2,3,2,1,1],[2,2,1,1,3,2],
  [2,2,1,2,3,1],[2,1,3,2,1,2],[2,2,3,1,1,2],[3,1,2,1,3,1],[3,1,1,2,2,2],
  [3,2,1,1,2,2],[3,2,1,2,2,1],[3,1,2,2,1,2],[3,2,2,1,1,2],[3,2,2,2,1,1],
  [2,1,2,1,2,3],[2,1,2,3,2,1],[2,3,2,1,2,1],[1,1,1,3,2,3],[1,3,1,1,2,3],
  [1,3,1,3,2,1],[1,1,2,3,1,3],[1,3,2,1,1,3],[1,3,2,3,1,1],[2,1,1,3,1,3],
  [2,3,1,1,1,3],[2,3,1,3,1,1],[1,1,2,1,3,3],[1,1,2,3,3,1],[1,3,2,1,3,1],
  [1,1,3,1,2,3],[1,1,3,3,2,1],[1,3,3,1,2,1],[3,1,3,1,2,1],[2,1,1,3,3,1],
  [2,3,1,1,3,1],[2,1,3,1,1,3],[2,1,3,3,1,1],[2,1,3,1,3,1],[3,1,1,1,2,3],
  [3,1,1,3,2,1],[3,3,1,1,2,1],[3,1,2,1,1,3],[3,1,2,3,1,1],[3,3,2,1,1,1],
  [3,1,4,1,1,1],[2,2,1,4,1,1],[4,3,1,1,1,1],[1,1,1,2,2,4],[1,1,1,4,2,2],
  [1,2,1,1,2,4],[1,2,1,4,2,1],[1,4,1,1,2,2],[1,4,1,2,2,1],[1,1,2,2,1,4],
  [1,1,2,4,1,2],[1,2,2,1,1,4],[1,2,2,4,1,1],[1,4,2,1,1,2],[1,4,2,2,1,1],
  [2,4,1,2,1,1],[2,2,1,1,1,4],[4,1,3,1,1,1],[2,4,1,1,1,2],[1,3,4,1,1,1],
  [1,1,1,2,4,2],[1,2,1,1,4,2],[1,2,1,2,4,1],[1,1,4,2,1,2],[1,2,4,1,1,2],
  [1,2,4,2,1,1],[4,1,1,2,1,2],[4,2,1,1,1,2],[4,2,1,2,1,1],[2,1,2,1,4,1],
  [2,1,4,1,2,1],[4,1,2,1,2,1],[1,1,1,1,4,3],[1,1,1,3,4,1],[1,3,1,1,4,1],
  [1,1,4,1,1,3],[1,1,4,3,1,1],[4,1,1,1,1,3],[4,1,1,3,1,1],[1,1,3,1,4,1],
  [1,1,4,1,3,1],[3,1,1,1,4,1],[4,1,1,1,3,1],[2,1,1,4,1,2],[2,1,1,2,1,4],
  [2,1,1,2,3,2],[2,3,3,1,1,1,2],
];
const START_C = 105;
const STOP = 106;

function encodeCode128C(digits: string): boolean[] {
  const values: number[] = [START_C];
  for (let i = 0; i < digits.length; i += 2) {
    values.push(parseInt(digits.substring(i, i + 2), 10));
  }
  // Checksum
  let checksum = values[0];
  for (let i = 1; i < values.length; i++) checksum += values[i] * i;
  values.push(checksum % 103);
  values.push(STOP);
  // Convert to bars
  const bars: boolean[] = [];
  for (const val of values) {
    const pattern = CODE128_PATTERNS[val];
    for (let i = 0; i < pattern.length; i++) {
      const isBar = i % 2 === 0;
      for (let j = 0; j < pattern[i]; j++) bars.push(isBar);
    }
  }
  return bars;
}

function BarcodeView({ value }: { value: string }) {
  if (!value || value.length < 10) return null;
  const bars = encodeCode128C(value);
  return (
    <View style={{ flexDirection: "row", height: 36, alignSelf: "center", marginVertical: 4 }}>
      {bars.map((isBlack, i) => (
        <View key={i} style={{ width: 0.8, height: 36, backgroundColor: isBlack ? "#000" : "#fff" }} />
      ))}
    </View>
  );
}

export interface DanfeItem {
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  cfop?: string | null;
  ncm?: string | null;
  serviceCode?: string | null;
}

export interface DanfeData {
  type: "NFE" | "NFSE";
  number: number;
  series: number;
  accessKey: string;
  protocolNumber: string;
  issueDate: string | Date;
  emitter: { cnpj: string; razaoSocial: string; inscricaoEstadual?: string | null; inscricaoMunicipal?: string | null; cityCode?: string | null };
  client: { name: string; document?: string | null; phone?: string | null; address?: string | null };
  items: DanfeItem[];
  totalAmount: number;
  orderNumber: number;
}

const s = StyleSheet.create({
  page: { padding: 30, fontSize: 8, fontFamily: "Helvetica" },
  border: { borderWidth: 1, borderColor: "#000" },
  header: { flexDirection: "row", borderWidth: 1, borderColor: "#000", marginBottom: 4 },
  headerLeft: { flex: 2, padding: 8, borderRightWidth: 1, borderRightColor: "#000" },
  headerCenter: { flex: 1, padding: 8, borderRightWidth: 1, borderRightColor: "#000", justifyContent: "center", alignItems: "center" },
  headerRight: { flex: 2, padding: 8 },
  title: { fontSize: 14, fontFamily: "Helvetica-Bold", textAlign: "center" },
  subtitle: { fontSize: 7, textAlign: "center", color: "#333", marginTop: 2 },
  label: { fontSize: 6, color: "#666", marginBottom: 1 },
  value: { fontSize: 8, color: "#000" },
  valueBold: { fontSize: 9, fontFamily: "Helvetica-Bold" },
  row: { flexDirection: "row" },
  cell: { padding: 4, borderWidth: 0.5, borderColor: "#000" },
  section: { marginTop: 4, borderWidth: 1, borderColor: "#000" },
  sectionTitle: { backgroundColor: "#e5e5e5", padding: 3, fontFamily: "Helvetica-Bold", fontSize: 7 },
  tableHeader: { flexDirection: "row", backgroundColor: "#f0f0f0", borderBottomWidth: 0.5, borderBottomColor: "#000" },
  tableRow: { flexDirection: "row", borderBottomWidth: 0.3, borderBottomColor: "#ccc" },
  thText: { fontSize: 6, fontFamily: "Helvetica-Bold", padding: 3 },
  tdText: { fontSize: 7, padding: 3 },
  colDesc: { flex: 4 },
  colCode: { flex: 1.5 },
  colQty: { flex: 1, textAlign: "right" },
  colUnit: { flex: 1.2, textAlign: "right" },
  colTotal: { flex: 1.2, textAlign: "right" },
  totalBox: { flexDirection: "row", justifyContent: "flex-end", padding: 6, borderTopWidth: 1, borderTopColor: "#000" },
  totalLabel: { fontSize: 9, marginRight: 10 },
  totalValue: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  accessKeyBox: { marginTop: 4, padding: 6, borderWidth: 1, borderColor: "#000", alignItems: "center" },
  accessKeyText: { fontSize: 7, fontFamily: "Courier", letterSpacing: 1 },
  footer: { position: "absolute", bottom: 20, left: 30, right: 30, fontSize: 6, color: "#999", textAlign: "center" },
});

function fmt(v: number) { return `R$ ${v.toFixed(2).replace(".", ",")}`; }
function fmtDate(d: string | Date) { return new Date(d).toLocaleString("pt-BR"); }
function formatAccessKey(key: string) { return key.replace(/(.{4})/g, "$1 ").trim(); }

export function DanfeDocument({ data }: { data: DanfeData }) {
  const isNFe = data.type === "NFE";

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Text style={s.valueBold}>{data.emitter.razaoSocial}</Text>
            <Text style={s.value}>CNPJ: {data.emitter.cnpj}</Text>
            {data.emitter.inscricaoEstadual && <Text style={s.value}>IE: {data.emitter.inscricaoEstadual}</Text>}
            {data.emitter.inscricaoMunicipal && <Text style={s.value}>IM: {data.emitter.inscricaoMunicipal}</Text>}
          </View>
          <View style={s.headerCenter}>
            <Text style={s.title}>{isNFe ? "DANFE" : "DANFSE"}</Text>
            <Text style={s.subtitle}>{isNFe ? "Documento Auxiliar da\nNota Fiscal Eletrônica" : "Documento Auxiliar da\nNota Fiscal de Serviço"}</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.label}>NÚMERO</Text>
            <Text style={s.valueBold}>{String(data.number).padStart(9, "0")}</Text>
            <Text style={[s.label, { marginTop: 4 }]}>SÉRIE</Text>
            <Text style={s.value}>{data.series}</Text>
            <Text style={[s.label, { marginTop: 4 }]}>EMISSÃO</Text>
            <Text style={s.value}>{fmtDate(data.issueDate)}</Text>
            <Text style={[s.label, { marginTop: 4 }]}>PROTOCOLO</Text>
            <Text style={s.value}>{data.protocolNumber}</Text>
          </View>
        </View>

        {/* Código de barras da chave de acesso */}
        {data.accessKey && <BarcodeView value={data.accessKey} />}

        {/* Chave de acesso */}
        <View style={s.accessKeyBox}>
          <Text style={s.label}>CHAVE DE ACESSO</Text>
          <Text style={s.accessKeyText}>{formatAccessKey(data.accessKey)}</Text>
        </View>

        {/* Destinatário */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>DESTINATÁRIO / TOMADOR</Text>
          <View style={{ padding: 6 }}>
            <View style={s.row}>
              <View style={{ flex: 3 }}>
                <Text style={s.label}>NOME / RAZÃO SOCIAL</Text>
                <Text style={s.valueBold}>{data.client.name}</Text>
              </View>
              <View style={{ flex: 1.5 }}>
                <Text style={s.label}>CPF / CNPJ</Text>
                <Text style={s.value}>{data.client.document || "—"}</Text>
              </View>
              <View style={{ flex: 1.5 }}>
                <Text style={s.label}>TELEFONE</Text>
                <Text style={s.value}>{data.client.phone || "—"}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Itens */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{isNFe ? "PRODUTOS" : "SERVIÇOS"}</Text>
          <View style={s.tableHeader}>
            <Text style={[s.thText, s.colDesc]}>Descrição</Text>
            <Text style={[s.thText, s.colCode]}>{isNFe ? "NCM/CFOP" : "Cód. Serv."}</Text>
            <Text style={[s.thText, s.colQty]}>Qtd</Text>
            <Text style={[s.thText, s.colUnit]}>V. Unit.</Text>
            <Text style={[s.thText, s.colTotal]}>V. Total</Text>
          </View>
          {data.items.map((item, i) => (
            <View key={i} style={s.tableRow}>
              <Text style={[s.tdText, s.colDesc]}>{item.description}</Text>
              <Text style={[s.tdText, s.colCode]}>{isNFe ? `${item.ncm || "—"} / ${item.cfop || "—"}` : item.serviceCode || "—"}</Text>
              <Text style={[s.tdText, s.colQty]}>{item.quantity}</Text>
              <Text style={[s.tdText, s.colUnit]}>{fmt(item.unitPrice)}</Text>
              <Text style={[s.tdText, s.colTotal]}>{fmt(item.totalPrice)}</Text>
            </View>
          ))}
          <View style={s.totalBox}>
            <Text style={s.totalLabel}>VALOR TOTAL:</Text>
            <Text style={s.totalValue}>{fmt(data.totalAmount)}</Text>
          </View>
        </View>

        {/* Info adicional */}
        <View style={[s.section, { padding: 6 }]}>
          <Text style={s.label}>INFORMAÇÕES COMPLEMENTARES</Text>
          <Text style={s.value}>Referente à O.S. #{data.orderNumber}</Text>
          <Text style={[s.value, { marginTop: 2, color: "#666" }]}>Documento emitido em ambiente de homologação — sem valor fiscal.</Text>
        </View>

        <Text style={s.footer}>Este documento é uma representação gráfica simplificada da {isNFe ? "NF-e" : "NFS-e"}.</Text>
      </Page>
    </Document>
  );
}
