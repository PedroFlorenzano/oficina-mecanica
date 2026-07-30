"use client";

import { useState } from "react";
import { Upload, FileSpreadsheet, Users, Car, Package, Wrench, CheckCircle2, XCircle, AlertTriangle, Loader2, ClipboardList, FileText, DollarSign, Timer } from "lucide-react";
import { PageHeader } from "@/components/ui";

interface ImportModule {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  acceptedFormats: string;
  order: number;
  tip: string;
}

const MODULES: ImportModule[] = [
  {
    id: "clients",
    name: "Clientes",
    icon: <Users className="w-5 h-5" />,
    description: "Importar cadastro de clientes (CPF/CNPJ, nome, telefone, email, endereço)",
    acceptedFormats: ".xls,.xlsx,.csv",
    order: 1,
    tip: "Importe primeiro os clientes, pois os veículos serão vinculados a eles.",
  },
  {
    id: "vehicles",
    name: "Veículos",
    icon: <Car className="w-5 h-5" />,
    description: "Importar veículos com placa, marca, modelo, ano e proprietário",
    acceptedFormats: ".xls,.xlsx,.csv",
    order: 2,
    tip: "Os veículos serão vinculados aos clientes pelo nome. Importe clientes antes.",
  },
  {
    id: "stock",
    name: "Estoque",
    icon: <Package className="w-5 h-5" />,
    description: "Importar itens de estoque (código, descrição, marca, quantidade, custo)",
    acceptedFormats: ".xls,.xlsx,.csv",
    order: 3,
    tip: "O saldo importado será o saldo inicial. Custos devem estar em reais (R$).",
  },
  {
    id: "services",
    name: "Catálogo de Serviços",
    icon: <Wrench className="w-5 h-5" />,
    description: "Importar serviços com código, descrição e valores",
    acceptedFormats: ".xls,.xlsx,.csv",
    order: 4,
    tip: "Serviços duplicados (mesmo código) serão ignorados por padrão.",
  },
  {
    id: "orders",
    name: "Ordens de Serviço (Histórico)",
    icon: <ClipboardList className="w-5 h-5" />,
    description: "Importar OS históricas do relatório de vendas (nº, cliente, veículo, valor, data)",
    acceptedFormats: ".xls,.xlsx,.csv",
    order: 5,
    tip: "As OS serão importadas como 'Entregues'. Importe clientes e veículos antes para vinculação automática.",
  },
  {
    id: "invoices",
    name: "Notas Fiscais (Histórico)",
    icon: <FileText className="w-5 h-5" />,
    description: "Importar registro histórico de NF-e/NFS-e emitidas (número, status, valor, chave)",
    acceptedFormats: ".xls,.xlsx,.csv",
    order: 6,
    tip: "Importa como referência histórica. Novas notas devem ser emitidas pelo módulo fiscal do Operare.",
  },
  {
    id: "financial",
    name: "Gestão Financeira (Referência)",
    icon: <DollarSign className="w-5 h-5" />,
    description: "Importar contas a pagar/receber do sistema anterior para consulta histórica",
    acceptedFormats: ".xls,.xlsx,.csv",
    order: 7,
    tip: "Dados importados como referência. O Operare calcula faturamento automaticamente a partir das OS.",
  },
  {
    id: "productivity",
    name: "Produtividade (Referência)",
    icon: <Timer className="w-5 h-5" />,
    description: "Importar apontamentos de tempo dos mecânicos para comparação com o cronômetro do Operare",
    acceptedFormats: ".xls,.xlsx,.csv",
    order: 8,
    tip: "Dados importados como referência. O cronômetro do Operare rastreia tempo automaticamente.",
  },
];

interface ImportResult {
  imported: number;
  updated: number;
  skipped: number;
  errors: Array<{ row: number; field?: string; value?: string; message: string }>;
  skippedRows: Array<{ row: number; reason: string }>;
  warnings: string[];
}

interface PreviewResult {
  data: Record<string, unknown>[];
  errors: Array<{ row: number; message: string }>;
  skipped: Array<{ row: number; reason: string }>;
}

export default function ImportPage() {
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [duplicateMode, setDuplicateMode] = useState<"skip" | "update">("skip");
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setResult(null);
    setError(null);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch(`/api/import/${activeModule}?mode=preview`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao processar arquivo");
      }

      const data = await res.json();
      setPreview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao processar arquivo");
      setPreview(null);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!file || !activeModule) return;

    setLoading(true);
    setError(null);

    try {
      const totalRecords = preview?.data?.length || 0;
      const CHUNK_SIZE = 30;
      const needsChunking = totalRecords > CHUNK_SIZE;
      const totalChunks = needsChunking ? Math.ceil(totalRecords / CHUNK_SIZE) : 1;

      let totalImported = 0;
      let totalUpdated = 0;
      let totalSkipped = 0;
      let allErrors: Array<{ row: number; field?: string; value?: string; message: string }> = [];
      let allSkippedRows: Array<{ row: number; reason: string }> = [];
      let allWarnings: string[] = [];

      for (let chunkIdx = 0; chunkIdx < totalChunks; chunkIdx++) {
        const formData = new FormData();
        formData.append("file", file);

        const params = new URLSearchParams({
          mode: "import",
          duplicates: duplicateMode,
        });
        if (needsChunking) {
          params.set("chunk", String(chunkIdx));
          params.set("chunkSize", String(CHUNK_SIZE));
        }

        const res = await fetch(`/api/import/${activeModule}?${params}`, {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          let errorMsg = "Erro na importação";
          try {
            const err = await res.json();
            errorMsg = err.error || errorMsg;
          } catch {
            if (res.status === 504 || res.status === 502) {
              errorMsg = `Timeout no chunk ${chunkIdx + 1}/${totalChunks}. ${totalImported} registros já foram importados.`;
            } else {
              errorMsg = `Erro do servidor (${res.status}) no chunk ${chunkIdx + 1}/${totalChunks}.`;
            }
          }
          throw new Error(errorMsg);
        }

        const data = await res.json();
        totalImported += data.imported || 0;
        totalUpdated += data.updated || 0;
        totalSkipped += data.skipped || 0;
        if (data.errors) allErrors = [...allErrors, ...data.errors];
        if (data.skippedRows) allSkippedRows = [...allSkippedRows, ...data.skippedRows];
        if (data.warnings) allWarnings = [...allWarnings, ...data.warnings];
      }

      setResult({
        imported: totalImported,
        updated: totalUpdated,
        skipped: totalSkipped,
        errors: allErrors,
        skippedRows: allSkippedRows,
        warnings: allWarnings,
      });
      setPreview(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro na importação");
    } finally {
      setLoading(false);
    }
  };

  const resetState = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
  };

  const currentModule = MODULES.find((m) => m.id === activeModule);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader
        title="Importar Dados"
        description="Migre dados do sistema anterior para o Operare via arquivo XLS, XLSX ou CSV"
      />

      {/* Module Selection */}
      {!activeModule && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Selecione o módulo para importar
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            Siga a ordem recomendada: Clientes → Veículos → Estoque → Serviços
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {MODULES.sort((a, b) => a.order - b.order).map((mod) => (
              <button
                key={mod.id}
                onClick={() => { setActiveModule(mod.id); resetState(); }}
                className="flex items-start gap-4 p-5 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
              >
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                  {mod.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-gray-400">
                      {mod.order}.
                    </span>
                    <h3 className="font-medium text-gray-900">{mod.name}</h3>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{mod.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Import Flow */}
      {activeModule && currentModule && (
        <div className="mt-6">
          <button
            onClick={() => { setActiveModule(null); resetState(); }}
            className="text-sm text-blue-600 hover:text-blue-800 mb-4 inline-flex items-center gap-1"
          >
            ← Voltar aos módulos
          </button>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                {currentModule.icon}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Importar {currentModule.name}
                </h2>
                <p className="text-sm text-gray-500">{currentModule.description}</p>
              </div>
            </div>

            {/* Tip */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
              <p className="text-sm text-amber-800">
                <AlertTriangle className="w-4 h-4 inline mr-1" />
                {currentModule.tip}
              </p>
            </div>

            {/* File Upload */}
            {!result && (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <FileSpreadsheet className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                  <label className="cursor-pointer">
                    <span className="text-blue-600 hover:text-blue-800 font-medium">
                      Selecionar arquivo
                    </span>
                    <input
                      type="file"
                      accept={currentModule.acceptedFormats}
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                  <p className="text-sm text-gray-500 mt-1">
                    XLS, XLSX ou CSV (máximo 10MB)
                  </p>
                  {file && (
                    <p className="text-sm text-gray-700 mt-2 font-medium">
                      📎 {file.name} ({(file.size / 1024).toFixed(0)} KB)
                    </p>
                  )}
                </div>

                {/* Duplicate handling */}
                {preview && (
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-700">Registros duplicados:</span>
                    <label className="inline-flex items-center gap-1.5">
                      <input
                        type="radio"
                        name="dup"
                        value="skip"
                        checked={duplicateMode === "skip"}
                        onChange={() => setDuplicateMode("skip")}
                        className="text-blue-600"
                      />
                      <span className="text-sm">Ignorar</span>
                    </label>
                    <label className="inline-flex items-center gap-1.5">
                      <input
                        type="radio"
                        name="dup"
                        value="update"
                        checked={duplicateMode === "update"}
                        onChange={() => setDuplicateMode("update")}
                        className="text-blue-600"
                      />
                      <span className="text-sm">Atualizar existente</span>
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                <span className="text-gray-600 font-medium">
                  {preview ? "Importando registros... Isso pode levar alguns minutos." : "Analisando arquivo..."}
                </span>
                {preview && (
                  <span className="text-xs text-gray-400">Não feche esta página.</span>
                )}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-700 flex items-center gap-2">
                  <XCircle className="w-4 h-4" /> {error}
                </p>
              </div>
            )}

            {/* Preview */}
            {preview && !loading && !result && (
              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900">
                    Preview — {preview.data.length} registros válidos
                  </h3>
                  <button
                    onClick={handleImport}
                    disabled={preview.data.length === 0}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Importar {preview.data.length} registros
                  </button>
                </div>

                {/* Preview errors */}
                {preview.errors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm font-medium text-red-800 mb-1">
                      {preview.errors.length} linhas com erro (não serão importadas):
                    </p>
                    <ul className="text-xs text-red-700 space-y-0.5 max-h-32 overflow-y-auto">
                      {preview.errors.slice(0, 20).map((e, i) => (
                        <li key={i}>Linha {e.row}: {e.message}</li>
                      ))}
                      {preview.errors.length > 20 && (
                        <li>... e mais {preview.errors.length - 20} erros</li>
                      )}
                    </ul>
                  </div>
                )}

                {/* Preview table */}
                {preview.data.length > 0 && (
                  <div className="border border-gray-200 rounded-lg overflow-x-auto max-h-64 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          {Object.keys(preview.data[0]).map((key) => (
                            <th
                              key={key}
                              className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap"
                            >
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {preview.data.slice(0, 50).map((row, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            {Object.values(row).map((val, j) => (
                              <td
                                key={j}
                                className="px-3 py-1.5 text-gray-700 whitespace-nowrap max-w-[200px] truncate"
                              >
                                {val !== null ? String(val) : "—"}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {preview.data.length > 50 && (
                      <p className="text-xs text-gray-500 p-2 bg-gray-50 text-center">
                        Mostrando 50 de {preview.data.length} registros
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Result */}
            {result && (
              <div className="mt-6 space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-medium text-green-800 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" /> Importação concluída
                  </h3>
                  <div className="mt-3 grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-700">{result.imported}</p>
                      <p className="text-xs text-green-600">Importados</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-700">{result.updated}</p>
                      <p className="text-xs text-blue-600">Atualizados</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-500">{result.skipped}</p>
                      <p className="text-xs text-gray-500">Ignorados</p>
                    </div>
                  </div>
                </div>

                {/* Warnings */}
                {result.warnings.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-sm font-medium text-amber-800 mb-1">Avisos:</p>
                    <ul className="text-xs text-amber-700 space-y-0.5 max-h-24 overflow-y-auto">
                      {result.warnings.map((w, i) => <li key={i}>⚠ {w}</li>)}
                    </ul>
                  </div>
                )}

                {/* Errors */}
                {result.errors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm font-medium text-red-800 mb-1">
                      {result.errors.length} erro(s):
                    </p>
                    <ul className="text-xs text-red-700 space-y-0.5 max-h-32 overflow-y-auto">
                      {result.errors.slice(0, 30).map((e, i) => (
                        <li key={i}>
                          {e.row > 0 ? `Linha ${e.row}: ` : ""}
                          {e.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <button
                  onClick={() => { resetState(); }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200"
                >
                  Importar outro arquivo
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
