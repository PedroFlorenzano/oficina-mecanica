"use client";

import { useState, useEffect } from "react";
import { PageHeader, Card, Input, Select, Button } from "@/components/ui";

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
}

export default function FiscalConfigPage() {
  const [config, setConfig] = useState<FiscalConfig>({ enabled: false, environment: "homologation", cnpj: "", inscricaoEstadual: "", inscricaoMunicipal: "", razaoSocial: "", cityCode: "", nfeSeries: 1, nfseSeries: 1 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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

  if (loading) return <p className="p-6 text-slate-500">Carregando...</p>;

  return (
    <div className="space-y-6">
      <PageHeader title="Configuração Fiscal" description="NF-e e NFS-e — dados do emitente e certificado digital" />
      <Card className="p-6 max-w-2xl">
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
