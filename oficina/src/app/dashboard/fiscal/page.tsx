"use client";

import { useState, useEffect, useRef } from "react";
import { PageHeader, Card, Input, Select, Button } from "@/components/ui";
import { Upload, ShieldCheck, AlertTriangle, FileText, Building2, Settings } from "lucide-react";

interface FiscalConfig {
  enabled: boolean;
  environment: string;
  cnpj: string;
  inscricaoEstadual: string;
  inscricaoMunicipal: string;
  razaoSocial: string;
  cityCode: string;
  nfeSeries: number;
  nfseSeries: string;
  nextNfeNumber: number;
  nextNfseNumber: number;
  nfeCfop: string;
  cnae: string;
  codigoServico: string;
  codigoServicoMunicipal: string;
  descricaoServico: string;
  aliquotaISS: number;
  regimeEspecial: string;
  regimeApuracao: string;
  naturezaOperacao: string;
  tipoRPS: string;
  wsUsuario: string;
  wsSenha: string;
  certificateBase64?: string | null;
}

const TABS = [
  { id: "cert", label: "Certificado Digital", icon: ShieldCheck },
  { id: "nfse", label: "Configurações NFS-e", icon: FileText },
  { id: "nfe", label: "Configurações NF-e", icon: FileText },
  { id: "controle", label: "Controle de Emissão", icon: Settings },
] as const;

type TabId = typeof TABS[number]["id"];

const DEFAULTS: FiscalConfig = {
  enabled: false, environment: "production", cnpj: "", inscricaoEstadual: "", inscricaoMunicipal: "",
  razaoSocial: "", cityCode: "3552205", nfeSeries: 1, nfseSeries: "U", nextNfeNumber: 1, nextNfseNumber: 1,
  nfeCfop: "5405", cnae: "", codigoServico: "1401", codigoServicoMunicipal: "1401",
  descricaoServico: "", aliquotaISS: 2.01, regimeEspecial: "1", regimeApuracao: "2",
  naturezaOperacao: "1", tipoRPS: "1", wsUsuario: "", wsSenha: "",
};

export default function FiscalConfigPage() {
  const [config, setConfig] = useState<FiscalConfig>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState<TabId>("cert");

  // Certificado
  const [certPassword, setCertPassword] = useState("");
  const [certUploading, setCertUploading] = useState(false);
  const [certInfo, setCertInfo] = useState<{ cnpj: string; notAfter: string; subject: string } | null>(null);
  const [certMessage, setCertMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/fiscal/config").then(r => r.json()).then(d => {
      if (d.cnpj !== undefined) setConfig({ ...DEFAULTS, ...d });
    }).finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/fiscal/config", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(config) });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleCertUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file || !certPassword) {
      setCertMessage({ type: "error", text: "Selecione o arquivo .pfx e informe a senha" });
      return;
    }
    setCertUploading(true);
    setCertMessage(null);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1];
      const res = await fetch("/api/fiscal/certificate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pfxBase64: base64, password: certPassword }),
      });
      const data = await res.json();
      setCertUploading(false);
      if (res.ok) {
        setCertInfo({ cnpj: data.cnpj, notAfter: data.notAfter, subject: data.subject || "" });
        setCertMessage({ type: "success", text: "Certificado salvo com sucesso" });
        setCertPassword("");
        if (fileRef.current) fileRef.current.value = "";
        setConfig(prev => ({ ...prev, certificateBase64: "loaded" }));
      } else {
        setCertMessage({ type: "error", text: data.error || "Erro ao enviar certificado" });
      }
    };
    reader.readAsDataURL(file);
  };

  const set = (field: keyof FiscalConfig) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const val = e.target.type === "number" ? parseFloat(e.target.value) || 0 : e.target.value;
    setConfig(prev => ({ ...prev, [field]: val }));
  };

  if (loading) return <p className="p-6 text-slate-500">Carregando...</p>;

  return (
    <div className="space-y-6">
      <PageHeader title="Configuração Fiscal" description="NF-e e NFS-e — certificado, dados fiscais e controle de numeração" />

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSave}>
        {/* TAB: Certificado Digital */}
        {tab === "cert" && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-6">Certificado Digital A1 (e-CNPJ)</h3>

            {(config.certificateBase64 || certInfo) && (
              <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-800 font-medium mb-2">
                  <ShieldCheck className="w-5 h-5" />
                  Certificado Configurado
                </div>
                {certInfo && (
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-green-700">
                    <span>CNPJ: {certInfo.cnpj}</span>
                    <span>Válido até: {new Date(certInfo.notAfter).toLocaleDateString("pt-BR")}</span>
                    {certInfo.subject && <span className="col-span-2">Emitido para: {certInfo.subject}</span>}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-4 max-w-md">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Arquivo .pfx / .p12</label>
                <input ref={fileRef} type="file" accept=".pfx,.p12" className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
              </div>
              <Input label="Senha do certificado" type="password" value={certPassword} onChange={e => setCertPassword(e.target.value)} placeholder="Senha do arquivo .pfx" />
              <Button type="button" onClick={handleCertUpload} loading={certUploading}>
                <Upload className="w-4 h-4 mr-1" /> Enviar Certificado
              </Button>
              {certMessage && (
                <div className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 ${certMessage.type === "success" ? "text-green-700 bg-green-50 border border-green-200" : "text-red-700 bg-red-50 border border-red-200"}`}>
                  {certMessage.type === "error" && <AlertTriangle className="w-4 h-4" />}
                  {certMessage.text}
                </div>
              )}
            </div>
          </Card>
        )}

        {/* TAB: NFS-e */}
        {tab === "nfse" && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Configurações NFS-e</h3>
            <p className="text-sm text-slate-500 mb-6">Nota Fiscal de Serviço Eletrônica — Prefeitura Municipal</p>

            <div className="space-y-6">
              {/* Identificação */}
              <fieldset className="border border-slate-200 rounded-lg p-4">
                <legend className="text-sm font-semibold text-red-600 px-2">Identificação e Localização</legend>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input label="CNPJ" value={config.cnpj || ""} onChange={set("cnpj")} placeholder="00.000.000/0000-00" />
                  <Input label="Inscrição Municipal" value={config.inscricaoMunicipal || ""} onChange={set("inscricaoMunicipal")} placeholder="Ex: 429689" />
                  <Input label="CNAE" value={config.cnae || ""} onChange={set("cnae")} placeholder="Ex: 452000100" />
                  <Input label="Razão Social" value={config.razaoSocial || ""} onChange={set("razaoSocial")} className="md:col-span-2" />
                  <Input label="Código IBGE Município" value={config.cityCode || ""} onChange={set("cityCode")} placeholder="3552205" />
                </div>
              </fieldset>

              {/* Regime Tributário */}
              <fieldset className="border border-slate-200 rounded-lg p-4">
                <legend className="text-sm font-semibold text-red-600 px-2">Regime Tributário e Enquadramento</legend>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Select label="Regime Especial" value={config.regimeEspecial || "1"} onChange={set("regimeEspecial")} options={[
                    { value: "1", label: "1 - Microempresa Municipal" },
                    { value: "2", label: "2 - Estimativa" },
                    { value: "3", label: "3 - Sociedade de Profissionais" },
                    { value: "4", label: "4 - Cooperativa" },
                    { value: "5", label: "5 - MEI" },
                    { value: "6", label: "6 - ME/EPP (Simples Nacional)" },
                  ]} />
                  <Select label="Regime de Apuração" value={config.regimeApuracao || "2"} onChange={set("regimeApuracao")} options={[
                    { value: "1", label: "1 - Normal" },
                    { value: "2", label: "2 - Simples Nacional" },
                  ]} />
                  <Input label="Alíquota ISS (%)" type="number" step="0.01" value={config.aliquotaISS ?? 2.01} onChange={set("aliquotaISS")} />
                </div>
              </fieldset>

              {/* Serviço Prestado */}
              <fieldset className="border border-slate-200 rounded-lg p-4">
                <legend className="text-sm font-semibold text-red-600 px-2">Classificação do Serviço Prestado</legend>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input label="Código Serviço (LC 116)" value={config.codigoServico || ""} onChange={set("codigoServico")} placeholder="1401" hint="Item da LC 116/2003" />
                  <Input label="Código Serviço Municipal" value={config.codigoServicoMunicipal || ""} onChange={set("codigoServicoMunicipal")} placeholder="1401" />
                  <Select label="Natureza da Operação" value={config.naturezaOperacao || "1"} onChange={set("naturezaOperacao")} options={[
                    { value: "1", label: "1 - Tributação no Município" },
                    { value: "2", label: "2 - Tributação fora do Município" },
                    { value: "3", label: "3 - Isenção" },
                    { value: "4", label: "4 - Imune" },
                    { value: "5", label: "5 - Exigib. suspensa decisão judicial" },
                    { value: "6", label: "6 - Exigib. suspensa proc. administrativo" },
                  ]} />
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Descrição do Serviço</label>
                  <textarea value={config.descricaoServico || ""} onChange={set("descricaoServico")} rows={3} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Ex: comercio e varejo de peças e acessórios automotivos, manutenção e reparação automotiva, alinhamento e balanceamento" />
                </div>
              </fieldset>

              {/* Integração WebService */}
              <fieldset className="border border-slate-200 rounded-lg p-4">
                <legend className="text-sm font-semibold text-red-600 px-2">Integração WebService</legend>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Select label="Tipo RPS" value={config.tipoRPS || "1"} onChange={set("tipoRPS")} options={[
                    { value: "1", label: "1 - Recibo Provisório de Serviços" },
                    { value: "2", label: "2 - RPS Mista (conjugada)" },
                    { value: "3", label: "3 - Cupom" },
                  ]} />
                  <Input label="Usuário WebService" value={config.wsUsuario || ""} onChange={set("wsUsuario")} placeholder="(opcional)" />
                  <Input label="Senha WebService" type="password" value={config.wsSenha || ""} onChange={set("wsSenha")} placeholder="(opcional)" />
                </div>
              </fieldset>
            </div>
          </Card>
        )}

        {/* TAB: NF-e */}
        {tab === "nfe" && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Configurações NF-e</h3>
            <p className="text-sm text-slate-500 mb-6">Nota Fiscal Eletrônica — SEFAZ Estadual</p>

            <div className="space-y-6">
              <fieldset className="border border-slate-200 rounded-lg p-4">
                <legend className="text-sm font-semibold text-red-600 px-2">Dados do Emitente</legend>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input label="CNPJ" value={config.cnpj || ""} onChange={set("cnpj")} placeholder="00.000.000/0000-00" />
                  <Input label="Inscrição Estadual" value={config.inscricaoEstadual || ""} onChange={set("inscricaoEstadual")} />
                  <Input label="Razão Social" value={config.razaoSocial || ""} onChange={set("razaoSocial")} />
                </div>
              </fieldset>

              <fieldset className="border border-slate-200 rounded-lg p-4">
                <legend className="text-sm font-semibold text-red-600 px-2">CFOP</legend>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="CFOP padrão" value={config.nfeCfop || ""} onChange={set("nfeCfop")} placeholder="5405" hint="Código Fiscal de Operação" />
                  <Select label="Ambiente" value={config.environment} onChange={set("environment")} options={[
                    { value: "production", label: "Produção" },
                    { value: "homologation", label: "Homologação (sem validade fiscal)" },
                  ]} />
                </div>
              </fieldset>
            </div>
          </Card>
        )}

        {/* TAB: Controle de Emissão */}
        {tab === "controle" && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Controle de Emissão</h3>
            <p className="text-sm text-slate-500 mb-6">Séries e numeração sequencial</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <fieldset className="border border-slate-200 rounded-lg p-4">
                <legend className="text-sm font-semibold text-red-600 px-2">NF-e</legend>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Série" type="number" value={config.nfeSeries} onChange={set("nfeSeries")} />
                  <Input label="Próxima Numeração" type="number" value={config.nextNfeNumber} onChange={set("nextNfeNumber")} />
                </div>
              </fieldset>

              <fieldset className="border border-slate-200 rounded-lg p-4">
                <legend className="text-sm font-semibold text-red-600 px-2">NFS-e</legend>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Série" value={config.nfseSeries || "U"} onChange={set("nfseSeries")} hint="Ex: U" />
                  <Input label="Próxima Numeração" type="number" value={config.nextNfseNumber} onChange={set("nextNfseNumber")} />
                </div>
              </fieldset>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={config.enabled} onChange={e => setConfig({ ...config, enabled: e.target.checked })} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                <span className="text-sm font-medium text-slate-700">Habilitar emissão automática de notas fiscais</span>
              </label>
              <p className="text-xs text-slate-500 mt-1 ml-6">Quando habilitado, o sistema emite a nota fiscal automaticamente ao finalizar uma OS.</p>
            </div>
          </Card>
        )}

        {/* Botão Salvar (fixo em todas as tabs) */}
        <div className="flex items-center gap-3 pt-4">
          <Button type="submit" loading={saving}>Salvar Alterações</Button>
          {saved && <span className="text-sm text-green-600 font-medium">✓ Configurações salvas</span>}
        </div>
      </form>
    </div>
  );
}
