"use client";

import { useRef } from "react";
import { Button } from "@/components/ui";
import { Printer } from "lucide-react";

interface OilLabelData {
  shopName: string;
  shopPhone: string | null;
  vehicle: string;
  plate: string;
  currentKm: number;
  nextKm: number;
  currentDate: string;
  nextDate: string;
  orderNumber: number;
}

interface OilLabelProps {
  data: OilLabelData;
  onClose: () => void;
}

export default function OilLabel({ data, onClose }: OilLabelProps) {
  const labelRef = useRef<HTMLDivElement>(null);

  const fmtDate = (d: string) => new Date(d).toLocaleDateString("pt-BR");
  const fmtKm = (km: number) => km.toLocaleString("pt-BR");

  const handlePrint = () => {
    const content = labelRef.current;
    if (!content) return;
    const win = window.open("", "_blank", "width=600,height=400");
    if (!win) return;
    win.document.write(`
      <html><head><title>Etiqueta Troca de Óleo</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; display: flex; justify-content: center; padding-top: 5mm; }
        .label { width: 76mm; border: 2px solid #000; padding: 10px; }
        .shop { font-weight: bold; font-size: 16px; text-align: center; margin-bottom: 2px; }
        .phone { text-align: center; font-size: 12px; color: #555; margin-bottom: 6px; }
        .title { font-weight: bold; text-align: center; font-size: 15px; margin-bottom: 8px; border-bottom: 2px solid #000; padding-bottom: 4px; text-transform: uppercase; }
        .row { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 14px; }
        .label-key { font-weight: bold; }
        .next { font-size: 15px; font-weight: bold; margin-top: 8px; text-align: center; border-top: 2px solid #000; padding-top: 6px; text-transform: uppercase; }
        .next-value { font-size: 18px; font-weight: bold; }
        @page { size: 80mm 110mm; margin: 2mm; }
      </style></head><body>
      <div class="label">
        <div class="shop">${data.shopName}</div>
        ${data.shopPhone ? `<div class="phone">${data.shopPhone}</div>` : ""}
        <div class="title">Troca de Óleo</div>
        <div class="row"><span class="label-key">Veículo:</span><span>${data.vehicle}</span></div>
        <div class="row"><span class="label-key">Placa:</span><span>${data.plate}</span></div>
        <div class="row"><span class="label-key">KM Atual:</span><span>${fmtKm(data.currentKm)}</span></div>
        <div class="row"><span class="label-key">Data:</span><span>${fmtDate(data.currentDate)}</span></div>
        <div class="next">Próxima Troca</div>
        <div class="row"><span class="label-key">KM:</span><span class="next-value">${fmtKm(data.nextKm)}</span></div>
        <div class="row"><span class="label-key">Data:</span><span class="next-value">${fmtDate(data.nextDate)}</span></div>
      </div>
      <script>window.print();window.close();</script>
      </body></html>
    `);
    win.document.close();
  };

  return (
    <div className="space-y-4">
      {/* Preview */}
      <div ref={labelRef} className="border-2 border-dashed border-slate-300 rounded-lg p-4 max-w-xs mx-auto bg-white">
        <p className="font-bold text-center text-sm">{data.shopName}</p>
        {data.shopPhone && <p className="text-center text-xs text-slate-500">{data.shopPhone}</p>}
        <p className="font-bold text-center text-xs mt-2 border-b border-slate-300 pb-1">TROCA DE ÓLEO</p>
        <div className="mt-2 space-y-1 text-xs">
          <div className="flex justify-between"><span className="font-semibold">Veículo:</span><span>{data.vehicle}</span></div>
          <div className="flex justify-between"><span className="font-semibold">Placa:</span><span>{data.plate}</span></div>
          <div className="flex justify-between"><span className="font-semibold">KM Atual:</span><span>{fmtKm(data.currentKm)}</span></div>
          <div className="flex justify-between"><span className="font-semibold">Data:</span><span>{fmtDate(data.currentDate)}</span></div>
        </div>
        <p className="font-bold text-center text-xs mt-2 border-t border-slate-300 pt-1">PRÓXIMA TROCA</p>
        <div className="mt-1 space-y-1 text-xs">
          <div className="flex justify-between"><span className="font-semibold">KM:</span><span className="font-bold text-red-600">{fmtKm(data.nextKm)}</span></div>
          <div className="flex justify-between"><span className="font-semibold">Data:</span><span className="font-bold text-red-600">{fmtDate(data.nextDate)}</span></div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-center gap-3">
        <Button variant="outline" onClick={onClose}>Fechar</Button>
        <Button onClick={handlePrint}>
          <Printer className="w-4 h-4 mr-2" />
          Imprimir
        </Button>
      </div>
    </div>
  );
}
