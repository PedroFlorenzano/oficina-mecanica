"use client";

import { useState } from "react";
import { Input, Select, Button, Modal } from "@/components/ui";
import { configurableResources, allPermissions, CustomPermissions, Resource, Permission } from "@/lib/permissions";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  commissionRate?: number;
  customPermissions?: string | null;
}

interface UserFormProps {
  user: User | null;
  onSaved: () => void;
  onCancel: () => void;
}

const roleOptions = [
  { value: "ADMIN", label: "Administrador" },
  { value: "ATTENDANT", label: "Atendente" },
  { value: "MECHANIC", label: "Mecânico" },
];

function parsePerms(json: string | null | undefined): CustomPermissions {
  if (!json) return {};
  try { return JSON.parse(json); } catch { return {}; }
}

export default function UserForm({ user, onSaved, onCancel }: UserFormProps) {
  const isEditing = !!user;

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [role, setRole] = useState(user?.role ?? "ATTENDANT");
  const [password, setPassword] = useState("");
  const [commissionRate, setCommissionRate] = useState(user?.commissionRate?.toString() ?? "0");
  const [perms, setPerms] = useState<CustomPermissions>(parsePerms(user?.customPermissions));
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function togglePerm(resource: Resource, permission: Permission) {
    setPerms((prev) => {
      const current = prev[resource] || [];
      const has = current.includes(permission);
      const updated = has ? current.filter((p) => p !== permission) : [...current, permission];
      return { ...prev, [resource]: updated };
    });
  }

  function validate() {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Nome é obrigatório";
    if (!isEditing && !email.trim()) errs.email = "E-mail é obrigatório";
    if (!role) errs.role = "Perfil é obrigatório";
    if (!isEditing && !password) errs.password = "Senha é obrigatória na criação";
    if (role === "MECHANIC") {
      const rate = parseFloat(commissionRate);
      if (isNaN(rate) || rate < 0 || rate > 100) {
        errs.commissionRate = "Percentual deve ser entre 0 e 100";
      }
    }
    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setLoading(true);
    setErrors({});

    const customPermissions = role === "MECHANIC" ? JSON.stringify(perms) : undefined;

    try {
      let res: Response;
      if (isEditing) {
        res = await fetch(`/api/users/${user.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, role, commissionRate: role === "MECHANIC" ? parseFloat(commissionRate) : undefined, customPermissions }),
        });
      } else {
        res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, role, password, commissionRate: role === "MECHANIC" ? parseFloat(commissionRate) : undefined, customPermissions }),
        });
      }

      if (!res.ok) {
        const data = await res.json();
        setErrors({ form: data.error ?? "Erro ao salvar usuário" });
        return;
      }
      onSaved();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal isOpen onClose={onCancel} title={isEditing ? "Editar Usuário" : "Novo Usuário"} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.form && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{errors.form}</div>
        )}

        <Input label="Nome" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} required placeholder="Nome completo" />

        {!isEditing && (
          <Input label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} required placeholder="email@exemplo.com" />
        )}

        <Select label="Perfil" value={role} onChange={(e) => setRole(e.target.value)} options={roleOptions} error={errors.role} required />

        {role === "MECHANIC" && (
          <>
            <Input
              label="Comissão (%)"
              type="number"
              value={commissionRate}
              onChange={(e) => setCommissionRate(e.target.value)}
              error={errors.commissionRate}
              placeholder="0 a 100"
              hint="Percentual aplicado sobre o valor dos serviços executados"
            />

            {/* Permissões customizadas */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Permissões de Acesso</label>
              <p className="text-xs text-slate-500 mb-3">Defina quais telas e ações este mecânico pode acessar.</p>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs font-medium text-slate-500">Módulo</th>
                      {allPermissions.map((p) => (
                        <th key={p.value} className="text-center px-2 py-2 text-xs font-medium text-slate-500">{p.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {configurableResources.map(({ resource, label }) => (
                      <tr key={resource} className="hover:bg-slate-50">
                        <td className="px-3 py-2 text-slate-700">{label}</td>
                        {allPermissions.map((p) => (
                          <td key={p.value} className="text-center px-2 py-2">
                            <input
                              type="checkbox"
                              checked={perms[resource]?.includes(p.value) ?? false}
                              onChange={() => togglePerm(resource, p.value)}
                              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {!isEditing && (
          <Input label="Senha" type="password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} required placeholder="Mínimo 8 caracteres" />
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>Cancelar</Button>
          <Button type="submit" loading={loading}>{isEditing ? "Salvar" : "Criar Usuário"}</Button>
        </div>
      </form>
    </Modal>
  );
}
