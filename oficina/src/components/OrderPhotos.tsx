"use client";

import { useState, useEffect, useCallback } from "react";
import { Camera, Trash2, Upload, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui";
import { Modal } from "@/components/ui";

interface Photo {
  id: string;
  category: "BEFORE" | "AFTER" | "DAMAGE";
  description: string | null;
  filePath: string;
  fileName: string;
  createdAt: string;
  uploadedBy?: { name: string };
}

const categoryLabels: Record<string, { label: string; color: string }> = {
  BEFORE: { label: "Antes", color: "bg-blue-100 text-blue-700" },
  AFTER: { label: "Depois", color: "bg-green-100 text-green-700" },
  DAMAGE: { label: "Dano", color: "bg-red-100 text-red-700" },
};

export function OrderPhotos({ orderId }: { orderId: string }) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [lightbox, setLightbox] = useState<Photo | null>(null);
  const [category, setCategory] = useState<"BEFORE" | "AFTER" | "DAMAGE">("BEFORE");
  const [description, setDescription] = useState("");

  const fetchPhotos = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/${orderId}/photos`);
      if (res.ok) setPhotos(await res.json());
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => { fetchPhotos(); }, [fetchPhotos]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("category", category);
        if (description.trim()) formData.append("description", description.trim());

        const res = await fetch(`/api/orders/${orderId}/photos`, {
          method: "POST",
          body: formData,
        });
        if (!res.ok) {
          const err = await res.json();
          alert(err.error || "Erro ao enviar foto");
        }
      }
      setDescription("");
      setShowUpload(false);
      await fetchPhotos();
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDelete = async (photoId: string) => {
    if (!confirm("Excluir esta foto?")) return;
    const res = await fetch(`/api/orders/${orderId}/photos/${photoId}`, { method: "DELETE" });
    if (res.ok) setPhotos((prev) => prev.filter((p) => p.id !== photoId));
  };

  const grouped = {
    BEFORE: photos.filter((p) => p.category === "BEFORE"),
    AFTER: photos.filter((p) => p.category === "AFTER"),
    DAMAGE: photos.filter((p) => p.category === "DAMAGE"),
  };

  if (loading) {
    return <div className="animate-pulse h-32 bg-slate-100 rounded-lg" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Camera className="w-5 h-5" />
          Fotos ({photos.length})
        </h3>
        <Button variant="outline" size="sm" onClick={() => setShowUpload(!showUpload)}>
          <Upload className="w-4 h-4 mr-1" />
          Enviar Foto
        </Button>
      </div>

      {showUpload && (
        <div className="border rounded-lg p-4 bg-slate-50 space-y-3">
          <div className="flex gap-3 items-end flex-wrap">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as "BEFORE" | "AFTER" | "DAMAGE")}
                className="border rounded px-3 py-2 text-sm"
              >
                <option value="BEFORE">Antes</option>
                <option value="AFTER">Depois</option>
                <option value="DAMAGE">Dano</option>
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-slate-700 mb-1">Descrição (opcional)</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Risco no para-lama esquerdo"
                className="border rounded px-3 py-2 text-sm w-full"
              />
            </div>
            <label className="cursor-pointer inline-flex items-center h-8 px-3 text-xs gap-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 font-medium">
              {uploading ? "Enviando..." : "Selecionar Arquivo(s)"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleUpload}
                className="hidden"
                disabled={uploading}
              />
            </label>
          </div>
          <p className="text-xs text-slate-500">JPEG, PNG ou WebP. Máx. 10MB por arquivo.</p>
        </div>
      )}

      {photos.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Nenhuma foto registrada</p>
        </div>
      ) : (
        <div className="space-y-4">
          {(["BEFORE", "AFTER", "DAMAGE"] as const).map((cat) => {
            const items = grouped[cat];
            if (!items.length) return null;
            const { label, color } = categoryLabels[cat];
            return (
              <div key={cat}>
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium mb-2 ${color}`}>
                  {label} ({items.length})
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {items.map((photo) => (
                    <div
                      key={photo.id}
                      className="group relative rounded-lg overflow-hidden border bg-white aspect-square"
                    >
                      <img
                        src={`/api/uploads/${photo.filePath}`}
                        alt={photo.description || photo.fileName}
                        className="w-full h-full object-cover cursor-pointer"
                        onClick={() => setLightbox(photo)}
                      />
                      <button
                        onClick={() => handleDelete(photo.id)}
                        className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      {photo.description && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs px-2 py-1 truncate">
                          {photo.description}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {lightbox && (
        <Modal isOpen onClose={() => setLightbox(null)} title={lightbox.description || lightbox.fileName} size="xl">
          <div className="relative">
            <img
              src={`/api/uploads/${lightbox.filePath}`}
              alt={lightbox.description || lightbox.fileName}
              className="w-full max-h-[70vh] object-contain rounded"
            />
            <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
              <span>
                {categoryLabels[lightbox.category].label} • {lightbox.uploadedBy?.name} • {new Date(lightbox.createdAt).toLocaleString("pt-BR")}
              </span>
              <Button variant="danger" size="sm" onClick={() => { handleDelete(lightbox.id); setLightbox(null); }}>
                <Trash2 className="w-4 h-4 mr-1" /> Excluir
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
