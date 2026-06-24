import * as forge from "node-forge";

export interface CertificateData {
  privateKeyPem: string;
  certificatePem: string;
  certificateDer: Buffer;
  cnpj: string;
  notAfter: Date;
}

/**
 * Carrega certificado A1 (.pfx) e extrai chave privada + certificado X509.
 * Usado para assinar XML (XMLDSig) e mutual TLS com a SEFAZ.
 */
export class CertificateManager {
  private data: CertificateData | null = null;

  load(pfxBase64: string, password: string): CertificateData {
    const pfxDer = forge.util.decode64(pfxBase64);
    const p12Asn1 = forge.asn1.fromDer(pfxDer);
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);

    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
    const cert = certBags[forge.pki.oids.certBag]?.[0]?.cert;
    if (!cert) throw new Error("Certificado não encontrado no PFX");

    const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
    const key = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0]?.key;
    if (!key) throw new Error("Chave privada não encontrada no PFX");

    const cn = cert.subject.getField("CN")?.value || "";
    const cnpjMatch = cn.match(/(\d{14})/);
    const cnpj = cnpjMatch ? cnpjMatch[1] : "";

    const certificatePem = forge.pki.certificateToPem(cert);
    const privateKeyPem = forge.pki.privateKeyToPem(key);
    const certDerBytes = forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes();
    const certificateDer = Buffer.from(certDerBytes, "binary");

    this.data = {
      privateKeyPem,
      certificatePem,
      certificateDer,
      cnpj,
      notAfter: cert.validity.notAfter,
    };

    return this.data;
  }

  getCertificateData(): CertificateData {
    if (!this.data) throw new Error("Certificado não carregado. Chame load() primeiro.");
    return this.data;
  }

  /**
   * Retorna o PFX como Buffer para uso em https.Agent (mutual TLS).
   */
  getPfxBuffer(pfxBase64: string): Buffer {
    return Buffer.from(pfxBase64, "base64");
  }

  isExpired(): boolean {
    if (!this.data) return true;
    return new Date() > this.data.notAfter;
  }
}
