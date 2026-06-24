/**
 * Mapeamento de códigos de rejeição da SEFAZ para mensagens amigáveis em pt-BR.
 * Referência: Manual de Integração NF-e, Tabela de cStat.
 */
const SEFAZ_REJEICOES: Record<string, string> = {
  // Lote
  "204": "Duplicidade de NF-e — já existe nota com essa chave de acesso",
  "205": "NF-e está denegada na base da SEFAZ",
  "206": "NF-e já está cancelada na base da SEFAZ",
  "207": "CNPJ do emitente não está cadastrado na SEFAZ",
  "208": "CNPJ do destinatário não está cadastrado na Receita Federal",
  "209": "IE do emitente inválida",
  "210": "IE do destinatário inválida",
  "213": "Emitente não habilitado para emissão de NF-e",
  "215": "Rejeição: Falha no Schema XML — verifique o formato dos campos",
  "217": "NF-e não encontrada na base da SEFAZ",
  "218": "NF-e já está cancelada",
  "219": "Prazo de cancelamento expirado (máx 24h)",
  "220": "Emitente bloqueado na SEFAZ — entre em contato com a fiscalização",
  "222": "Protocolo de autorização inválido",
  "225": "Falha no Schema XML do lote — campos obrigatórios faltando",
  "228": "Data de emissão muito antiga (máx 30 dias)",
  "232": "IE do destinatário não cadastrada",
  "233": "IE do destinatário não vinculada ao CNPJ informado",
  "234": "IE do destinatário está bloqueada",
  "236": "Chave de acesso com dígito verificador inválido",
  "239": "Chave de acesso com campo numérico diferente do XML",
  "240": "Chave de acesso com UF diferente do XML",
  "241": "UF do emitente diverge da UF da chave",
  "242": "Chave de acesso com CNPJ diferente do emitente",
  "243": "Chave de acesso com modelo diferente do XML",
  "244": "Chave de acesso com série diferente do XML",
  "245": "Chave de acesso com número diferente do XML",
  "252": "Ambiente informado diverge do ambiente de recebimento (use tpAmb=2 para homologação)",
  "274": "CNPJ base do emitente difere do CNPJ do certificado digital",
  "280": "Certificado digital não é ICP-Brasil",
  "281": "Certificado digital revogado",
  "282": "Certificado digital expirado — renove o certificado",
  "283": "Certificado digital com erro na cadeia de certificação",
  "284": "Certificado digital emitido por AC não autorizada",
  "286": "Certificado digital vencido ou não vigente",
  "290": "Certificado digital com CNPJ diferente do emitente",
  "291": "Certificado digital com razão social diferente",
  "293": "CNPJ do assinante não confere com emitente/procurador",
  "297": "Assinatura digital inválida — verifique o certificado e a montagem do XML",
  "298": "Assinatura digital com certificado expirado",
  "299": "Assinatura digital com certificado revogado",
  "301": "Emissão de NF-e não permitida para este emitente",
  "302": "Irregularidade fiscal do emitente",
  "303": "Emitente não habilitado para tipo de emissão informado",
  "321": "NF-e com CFOP de importação e operação interna",
  "323": "CNPJ do destinatário inválido (dígito verificador)",
  "324": "CPF do destinatário inválido (dígito verificador)",
  "327": "CFOP de operação interna mas UF do destinatário é diferente",
  "328": "CFOP de operação interestadual mas UF do destinatário é igual",
  "346": "Código do município do fato gerador inválido",
  "502": "Erro na validação do XML — tag obrigatória ausente",
  "539": "Duplicidade de NF-e com diferença de chave de acesso",
  "587": "Código de serviço de transporte inválido",
  "593": "CNPJ do emitente com situação cadastral irregular na Receita",
  "598": "NF-e com valor total divergente dos itens",
  "600": "CSOSN incompatível — verifique o regime tributário",
  "656": "Consumo indevido — muitas requisições em sequência. Aguarde alguns minutos.",
  "660": "Emitente com CPF não habilitado para emissão",
  "694": "Não informado o campo modBCST",
  "729": "NCM não existe na tabela de NCM vigente",
  "778": "NF-e sem informação do DIFAL (diferencial de alíquota)",
};

/**
 * Retorna mensagem amigável em pt-BR para um código de rejeição da SEFAZ.
 * Se não encontrado no mapa, retorna o motivo original da SEFAZ.
 */
export function getSefazRejeicaoMessage(cStat: string, xMotivo?: string): string {
  return SEFAZ_REJEICOES[cStat] || xMotivo || `Rejeição ${cStat} — consulte o manual da SEFAZ`;
}
