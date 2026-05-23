"use client";

import { useState, useEffect, useRef, use } from "react";

export default function SignPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    fetch(`/api/public/sign/${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError("Erro ao carregar"))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Ajustar para DPI do dispositivo
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, [data]);

  const getPos = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const endDraw = () => setIsDrawing(false);

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
    setHasDrawn(false);
  };

  const handleSign = async () => {
    if (!hasDrawn) return;
    setSaving(true);
    const imageData = canvasRef.current!.toDataURL("image/png");
    const res = await fetch(`/api/public/sign/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageData }),
    });
    if (res.ok) {
      setSuccess(true);
    } else {
      const d = await res.json();
      setError(d.error || "Erro ao salvar assinatura");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-500">Carregando...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="text-center">
          <p className="text-red-600 text-lg font-medium">{error}</p>
          <p className="text-slate-500 text-sm mt-2">Entre em contato com a oficina.</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-green-50 p-6">
        <div className="text-center">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-xl font-bold text-green-800">Assinatura registrada!</h1>
          <p className="text-green-600 mt-2">
            {data.type === "APPROVAL" ? "Orçamento aprovado com sucesso." : "Recebimento confirmado com sucesso."}
          </p>
          <p className="text-sm text-slate-500 mt-4">Você pode fechar esta página.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 flex flex-col">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-4">
        <h1 className="text-lg font-bold text-slate-800 text-center">
          {data.type === "APPROVAL" ? "Aprovação de Orçamento" : "Confirmação de Entrega"}
        </h1>
        {data.order && (
          <div className="mt-3 space-y-1 text-sm text-slate-600">
            <p><strong>OS:</strong> #{data.order.number}</p>
            <p><strong>Veículo:</strong> {data.order.vehicle} — {data.order.plate}</p>
            {data.order.mileage > 0 && <p><strong>KM:</strong> {data.order.mileage.toLocaleString("pt-BR")}</p>}
          </div>
        )}
        <p className="text-xs text-slate-400 mt-3 text-center">
          Assinante: {data.signerName}
        </p>
      </div>

      {/* Detalhes da OS */}
      {data.type === "APPROVAL" && data.order?.complaints && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-4 space-y-4 max-h-[40vh] overflow-y-auto">
          {data.order.complaints.map((c: any, i: number) => (
            <div key={i} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
              <p className="font-semibold text-slate-700 text-sm mb-2">
                {c.number}. {c.description}
              </p>
              {c.services.length > 0 && (
                <div className="ml-3 mb-1">
                  <p className="text-xs font-medium text-slate-500 uppercase mb-1">Serviços</p>
                  {c.services.map((s: any, j: number) => (
                    <div key={j} className="flex justify-between text-xs text-slate-600">
                      <span>{s.description}</span>
                      <span className="font-medium">R$ {s.price.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
              {c.parts.length > 0 && (
                <div className="ml-3">
                  <p className="text-xs font-medium text-slate-500 uppercase mb-1">Peças</p>
                  {c.parts.map((p: any, j: number) => (
                    <div key={j} className="flex justify-between text-xs text-slate-600">
                      <span>{p.quantity}x {p.description}</span>
                      <span className="font-medium">R$ {p.totalPrice.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          <div className="border-t-2 border-slate-300 pt-2 flex justify-between font-bold text-slate-800">
            <span>Total</span>
            <span>R$ {data.order.totalAmount.toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* Canvas */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border-2 border-dashed border-slate-300 overflow-hidden mb-4 relative">
        <canvas
          ref={canvasRef}
          className="w-full h-full min-h-[200px] touch-none cursor-crosshair"
          style={{ height: "250px" }}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
        />
        {!hasDrawn && (
          <p className="absolute inset-0 flex items-center justify-center text-slate-300 text-sm pointer-events-none">
            Desenhe sua assinatura aqui
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={clear}
          className="flex-1 py-3 border border-slate-300 rounded-xl text-slate-700 font-medium"
        >
          Limpar
        </button>
        <button
          onClick={handleSign}
          disabled={!hasDrawn || saving}
          className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium disabled:opacity-50"
        >
          {saving ? "Salvando..." : data.type === "APPROVAL" ? "Aprovar Orçamento" : "Confirmar Recebimento"}
        </button>
      </div>
    </div>
  );
}
