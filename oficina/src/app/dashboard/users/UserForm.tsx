"use client";

import { useState } from "react";
import { Input, Select, Button, Modal } from "@/components/ui";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
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

export default function UserForm({ user, onSaved, onCancel }: UserFormProps) {
  const isEditing = !!user;

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [role, setRole] = useState(user?.role ?? "ATTENDANT");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Nome é obrigatório";
    if (!isEditing && !email.trim()) errs.email = "E-mail é obrigatório";
    if (!role) errs.role = "Perfil é obrigatório";
    if (!isEditing && !password) errs.password = "Senha é obrigatória na criação";
    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setLoading(true);
    setErrors({});

    try {
      let res: Response;
      if (isEditing) {
        res = await fetch(`/api/users/${user.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, role }),
        });
      } else {
        res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, role, password }),
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
    <Modal
      isOpen
      onClose={onCancel}
      title={isEditing ? "Editar Usuário" : "Novo Usuário"}
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.form && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
            {errors.form}
          </div>
        )}

        <Input
          label="Nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
          required
          placeholder="Nome completo"
        />

        {!isEditing && (
          <Input
            label="E-mail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
            required
            placeholder="email@exemplo.com"
          />
        )}

        <Select
          label="Perfil"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          options={roleOptions}
          error={errors.role}
          required
        />

        {!isEditing && (
          <Input
            label="Senha"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            required
            placeholder="Mínimo 8 caracteres"
          />
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading}>
            {isEditing ? "Salvar" : "Criar Usuário"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
