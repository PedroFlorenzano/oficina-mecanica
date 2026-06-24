"use client";

import { useState, useEffect, useRef } from "react";
import { PageHeader, Card, Input, Select, Button } from "@/components/ui";
import { Upload, ShieldCheck, AlertTriangle } from "lucide-react";

interface FiscalConfig {
  enabled: boolean;
  environment: string;
  cnpj: string;
  inscricaoEstadual: string;
  inscricaoMunicipal: string;
  razaoSocial: string;
  cityCode: string;
  nfeSeries: number;
  nfseSeries: number;
  certificateBase64?: string | null;
}

export default function FiscalConfigPage() {
  const [config, setConfig] = useState<FiscalConfig>({ enabled: false, environment: "homologation", cnpj: "", inscricaoEstadual: "", inscricaoMunicipal: "", razaoSocial: "", cityCode: "", nfeSeries: 1, nfseSeries: 1 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Certificado
  const [certPassword, setCertPassword] = useState("");
  const [certUploading, setCertUploading] = useState(false);
  const [certMessage, setCertMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/fiscal/config").then(r => r.json()).then(d => { if (d.cnpj !== undefined) setConfig(d); }).finally(() => setLoading(false));
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
        setCertMessage({ type: "success", text: `✓ Certificado salvo — CNPJ ${data.cnpj}, válido até ${new Date(data.notAfter).toLocaleDateString("pt-BR")}` });
        setCertPassword("");
        if (fileRef.current) fileRef.current.value = "";
        setConfig(prev => ({ ...prev, certificateBase64: "loaded" }));
      } else {
        setCertMessage({ type: "error", text: data.error || "Erro ao enviar certificado" });
      }
    };
    reader.readAsDataURL(file);
  };

  if (loading) return <p className="p-6 text-slate-500">Carregando...</p>;

  return (
    <div className="space-y-6">
      <PageHeader title="Configuração Fiscal" description="NF-e e NFS-e — dados do emitente e certificado digital" />

      {/* Certificado Digital */}
      <Card className="p-6 max-w-2xl">
        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-blue-600" />
          Certificado Digital A1
        </h3>

        {config.certificateBase64 && (
          <div className="mb-4 flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            <ShieldCheck className="w-4 h-4" />
            Certificado configurado
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Arquivo .pfx</label>
            <input ref={fileRef} type="file" accept=".pfx,.p12" className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
          </div>
          <Input label="Senha do certificado" type="password" value={certPassword} onChange={e => setCertPassword(e.target.value)} placeholder="Senha do arquivo .pfx" />
          <div className="flex items-center gap-3">
            <Button type="button" onClick={handleCertUpload} loading={certUploading}>
              <Upload className="w-4 h-4 mr-1" /> Enviar Certificado
            </Button>
          </div>
          {certMessage && (
            <div className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 ${certMessage.type === "success" ? "text-green-700 bg-green-50 border border-green-200" : "text-red-700 bg-red-50 border border-red-200"}`}>
              {certMessage.type === "error" && <AlertTriangle className="w-4 h-4" />}
              {certMessage.text}
            </div>
          )}
        </div>
      </Card>

      {/* Dados do Emitente */}
      <Card className="p-6 max-w-2xl">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Dados do Emitente</h3>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="CNPJ" value={config.cnpj || ""} onChange={e => setConfig({ ...config, cnpj: e.target.value })} placeholder="00.000.000/0000-00" />
            <Input label="Razão Social" value={config.razaoSocial || ""} onChange={e => setConfig({ ...config, razaoSocial: e.target.value })} />
            <Input label="Inscrição Estadual" value={config.inscricaoEstadual || ""} onChange={e => setConfig({ ...config, inscricaoEstadual: e.target.value })} />
            <Input label="Inscrição Municipal" value={config.inscricaoMunicipal || ""} onChange={e => setConfig({ ...config, inscricaoMunicipal: e.target.value })} />
            <Input label="Código IBGE Município" value={config.cityCode || ""} onChange={e => setConfig({ ...config, cityCode: e.target.value })} hint="Ex: 3552205 (Sorocaba)" />
            <Select label="Ambiente" value={config.environment} onChange={e => setConfig({ ...config, environment: e.target.value })} options={[{ value: "homologation", label: "Homologação" }, { value: "production", label: "Produção" }]} />
            <Input label="Série NF-e" type="number" value={config.nfeSeries} onChange={e => setConfig({ ...config, nfeSeries: parseInt(e.target.value) || 1 })} />
            <Input label="Série NFS-e" type="number" value={config.nfseSeries} onChange={e => setConfig({ ...config, nfseSeries: parseInt(e.target.value) || 1 })} />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={config.enabled} onChange={e => setConfig({ ...config, enabled: e.target.checked })} className="w-4 h-4 rounded border-slate-300" />
            <span className="text-sm text-slate-700">Habilitar emissão de notas fiscais</span>
          </label>
          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" loading={saving}>Salvar</Button>
            {saved && <span className="text-sm text-green-600">✓ Salvo</span>}
          </div>
        </form>
      </Card>
    </div>
  );
}
