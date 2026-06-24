import { SignedXml } from "xml-crypto";
import { CertificateData } from "./CertificateManager";

/**
 * Assina XML da NF-e com XMLDSig (enveloped signature) padrão ICP-Brasil.
 * Usa xml-crypto para canonicalização C14N correta.
 */
export class XmlSigner {
  constructor(private cert: CertificateData) {}

  /**
   * Assina NF-e — insere Signature após infNFe dentro do NFe.
   */
  signNFe(xml: string, nfeId: string): string {
    const sig = new SignedXml({
      privateKey: this.cert.privateKeyPem,
      publicCert: this.cert.certificatePem,
      canonicalizationAlgorithm: "http://www.w3.org/TR/2001/REC-xml-c14n-20010315",
      signatureAlgorithm: "http://www.w3.org/2000/09/xmldsig#rsa-sha1",
    });

    sig.addReference({
      xpath: `//*[local-name()='infNFe']`,
      uri: `#${nfeId}`,
      digestAlgorithm: "http://www.w3.org/2000/09/xmldsig#sha1",
      transforms: [
        "http://www.w3.org/2000/09/xmldsig#enveloped-signature",
        "http://www.w3.org/TR/2001/REC-xml-c14n-20010315",
      ],
    });

    sig.computeSignature(xml, {
      location: { reference: `//*[local-name()='NFe']`, action: "append" },
    });

    return sig.getSignedXml();
  }

  /**
   * Assina evento (cancelamento, etc.) — insere Signature dentro do evento.
   */
  signEvento(xml: string, eventId: string): string {
    const sig = new SignedXml({
      privateKey: this.cert.privateKeyPem,
      publicCert: this.cert.certificatePem,
      canonicalizationAlgorithm: "http://www.w3.org/TR/2001/REC-xml-c14n-20010315",
      signatureAlgorithm: "http://www.w3.org/2000/09/xmldsig#rsa-sha1",
    });

    sig.addReference({
      xpath: `//*[local-name()='infEvento']`,
      uri: `#${eventId}`,
      digestAlgorithm: "http://www.w3.org/2000/09/xmldsig#sha1",
      transforms: [
        "http://www.w3.org/2000/09/xmldsig#enveloped-signature",
        "http://www.w3.org/TR/2001/REC-xml-c14n-20010315",
      ],
    });

    sig.computeSignature(xml, {
      location: { reference: `//*[local-name()='evento']`, action: "append" },
    });

    return sig.getSignedXml();
  }

  signInut(xml: string, inutId: string): string {
    const sig = new SignedXml({
      privateKey: this.cert.privateKeyPem,
      publicCert: this.cert.certificatePem,
      canonicalizationAlgorithm: "http://www.w3.org/TR/2001/REC-xml-c14n-20010315",
      signatureAlgorithm: "http://www.w3.org/2000/09/xmldsig#rsa-sha1",
    });

    sig.addReference({
      xpath: `//*[local-name()='infInut']`,
      uri: `#${inutId}`,
      digestAlgorithm: "http://www.w3.org/2000/09/xmldsig#sha1",
      transforms: [
        "http://www.w3.org/2000/09/xmldsig#enveloped-signature",
        "http://www.w3.org/TR/2001/REC-xml-c14n-20010315",
      ],
    });

    sig.computeSignature(xml, {
      location: { reference: `//*[local-name()='inutNFe']`, action: "append" },
    });

    return sig.getSignedXml();
  }
}
