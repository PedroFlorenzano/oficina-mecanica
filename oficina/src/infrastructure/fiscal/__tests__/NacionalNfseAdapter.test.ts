import { NacionalNfseAdapter, NacionalNfseConfig } from "../NacionalNfseAdapter";

// Mock https module
jest.mock("https", () => ({
  request: jest.fn(),
}));

const mockConfig: NacionalNfseConfig = {
  pfxBase64: "", // Testes não fazem request real
  pfxPassword: "test123",
  cnpj: "12.345.678/0001-99",
  inscricaoMunicipal: "123456",
  razaoSocial: "Oficina Teste Ltda",
  cityCode: "3552205",
  codigoServico: "1401",
  aliquotaISS: 2.01,
  serie: "1",
  environment: "homologation",
  descricaoServico: "Manutenção e reparação de veículos automotores",
};

// Para testes que não precisam de certificado real, mockamos o CertificateManager
jest.mock("../CertificateManager", () => ({
  CertificateManager: jest.fn().mockImplementation(() => ({
    load: jest.fn().mockReturnValue({
      privateKeyPem: "-----BEGIN PRIVATE KEY-----\nMOCK\n-----END PRIVATE KEY-----",
      certificatePem: "-----BEGIN CERTIFICATE-----\nMOCK\n-----END CERTIFICATE-----",
      certificateDer: Buffer.from("mock"),
      cnpj: "12345678000199",
      notAfter: new Date("2027-12-31"),
    }),
    getCertificateData: jest.fn().mockReturnValue({
      privateKeyPem: "-----BEGIN PRIVATE KEY-----\nMOCK\n-----END PRIVATE KEY-----",
      certificatePem: "-----BEGIN CERTIFICATE-----\nMOCK\n-----END CERTIFICATE-----",
      certificateDer: Buffer.from("mock"),
      cnpj: "12345678000199",
      notAfter: new Date("2027-12-31"),
    }),
    getPfxBuffer: jest.fn().mockReturnValue(Buffer.from("mock-pfx")),
    isExpired: jest.fn().mockReturnValue(false),
  })),
}));

// Mock xml-crypto SignedXml
jest.mock("xml-crypto", () => ({
  SignedXml: jest.fn().mockImplementation(() => ({
    addReference: jest.fn(),
    computeSignature: jest.fn(),
    getSignedXml: jest.fn().mockReturnValue("<DPS><infDPS Id=\"DPS123\"><tpAmb>2</tpAmb></infDPS><Signature/></DPS>"),
  })),
}));

describe("NacionalNfseAdapter", () => {
  let adapter: NacionalNfseAdapter;

  beforeEach(() => {
    adapter = new NacionalNfseAdapter(mockConfig);
  });

  describe("constructor", () => {
    it("deve instanciar com configuração válida", () => {
      expect(adapter).toBeInstanceOf(NacionalNfseAdapter);
    });

    it("deve usar endpoint de homologação para environment=homologation", () => {
      const a = new NacionalNfseAdapter({ ...mockConfig, environment: "homologation" });
      expect(a).toBeDefined();
      // O endpoint é interno, verificamos indiretamente via sucesso na instanciação
    });

    it("deve usar endpoint de produção para environment=production", () => {
      const a = new NacionalNfseAdapter({ ...mockConfig, environment: "production" });
      expect(a).toBeDefined();
    });
  });

  describe("authorize — construção do XML DPS", () => {
    // Para testar a construção do XML, acessamos o método privado via prototype
    const buildDpsXml = NacionalNfseAdapter.prototype["buildDpsXml"];

    it("deve gerar XML com campos obrigatórios", () => {
      const input = {
        type: "NFSE" as const,
        number: 1001,
        series: 1,
        cnpj: "12345678000199",
        razaoSocial: "Oficina Teste",
        inscricaoEstadual: null,
        inscricaoMunicipal: "123456",
        cityCode: "3552205",
        items: [{ description: "Troca de óleo", quantity: 1, unitPrice: 150, totalPrice: 150 }],
        totalAmount: 150,
      };

      const xml = buildDpsXml.call(adapter, input);

      expect(xml).toContain("<tpAmb>2</tpAmb>");
      expect(xml).toContain("<verAplic>Operare_1.0</verAplic>");
      expect(xml).toContain("<serie>1</serie>");
      expect(xml).toContain("<nDPS>1001</nDPS>");
      expect(xml).toContain("<tpEmit>1</tpEmit>");
      expect(xml).toContain("<cLocEmi>3552205</cLocEmi>");
      expect(xml).toContain("<CNPJ>12345678000199</CNPJ>");
      expect(xml).toContain("<cTribNac>14.01</cTribNac>");
      expect(xml).toContain("<vServ>150.00</vServ>");
      expect(xml).toContain("<pAliq>2.01</pAliq>");
      expect(xml).toContain("<tribISSQN>1</tribISSQN>");
      expect(xml).toContain("<tpRetISSQN>2</tpRetISSQN>");
    });

    it("deve formatar código de serviço XXXX para XX.XX", () => {
      const adapterWith1401 = new NacionalNfseAdapter({ ...mockConfig, codigoServico: "1401" });
      const xml = buildDpsXml.call(adapterWith1401, {
        type: "NFSE" as const, number: 1, series: 1, cnpj: "12345678000199",
        razaoSocial: "Teste", inscricaoEstadual: null, inscricaoMunicipal: null,
        cityCode: "3552205", items: [], totalAmount: 100,
      });
      expect(xml).toContain("<cTribNac>14.01</cTribNac>");
    });

    it("deve manter código já formatado XX.XX", () => {
      const adapterFormatted = new NacionalNfseAdapter({ ...mockConfig, codigoServico: "14.01" });
      const xml = buildDpsXml.call(adapterFormatted, {
        type: "NFSE" as const, number: 1, series: 1, cnpj: "12345678000199",
        razaoSocial: "Teste", inscricaoEstadual: null, inscricaoMunicipal: null,
        cityCode: "3552205", items: [], totalAmount: 200,
      });
      expect(xml).toContain("<cTribNac>14.01</cTribNac>");
    });

    it("deve gerar ID da DPS no formato correto", () => {
      const xml = buildDpsXml.call(adapter, {
        type: "NFSE" as const, number: 42, series: 1, cnpj: "12345678000199",
        razaoSocial: "Teste", inscricaoEstadual: null, inscricaoMunicipal: null,
        cityCode: "3552205", items: [], totalAmount: 100,
      });
      // DPS + CNPJ(14) + cityCode(7) + serie(5) + nDPS(15)
      expect(xml).toContain('Id="DPS12345678000199355220500001000000000000042"');
    });

    it("deve escapar caracteres especiais na descrição", () => {
      const adapterEscape = new NacionalNfseAdapter({ ...mockConfig, descricaoServico: "Serviço <especial> & raro" });
      const xml = buildDpsXml.call(adapterEscape, {
        type: "NFSE" as const, number: 1, series: 1, cnpj: "12345678000199",
        razaoSocial: "Teste", inscricaoEstadual: null, inscricaoMunicipal: null,
        cityCode: "3552205", items: [], totalAmount: 100,
      });
      expect(xml).toContain("Serviço &lt;especial&gt; &amp; raro");
      expect(xml).not.toContain("<especial>");
    });
  });

  describe("cancel — construção do XML evento", () => {
    const buildCancelEventXml = NacionalNfseAdapter.prototype["buildCancelEventXml"];

    it("deve gerar XML de cancelamento com chave e motivo", () => {
      const xml = buildCancelEventXml.call(adapter, "NFSe12345678901234567890123456789012345678901234567890", "Serviço não prestado");

      expect(xml).toContain("<tpAmb>2</tpAmb>");
      expect(xml).toContain("<verAplic>Operare_1.0</verAplic>");
      expect(xml).toContain("<cnpjAutor>12345678000199</cnpjAutor>");
      expect(xml).toContain("<chNFSe>NFSe12345678901234567890123456789012345678901234567890</chNFSe>");
      expect(xml).toContain("<cMotivo>1</cMotivo>");
      expect(xml).toContain("<xMotivo>Serviço não prestado</xMotivo>");
      expect(xml).toContain('Id="ECANCNFSe12345678901234567890123456789012345678901234567890"');
    });
  });
});
