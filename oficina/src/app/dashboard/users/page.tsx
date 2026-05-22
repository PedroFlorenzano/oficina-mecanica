"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, UserX, UserCheck, UserCog, BarChart2 } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import UserForm from "./UserForm";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
}

const roleLabel: Record<string, string> = {
  ADMIN: "Administrador",
  ATTENDANT: "Atendente",
  MECHANIC: "Mecânico",
};

export default function UsersPage() {
  const { data: session } = useSession();
  const currentUserId = session?.user?.userId;

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true); // starts as true — first fetch happens on mount
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      setUsers(data);
    } catch {
      setError("Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/api/users")
      .then((r) => r.json())
      .then((data) => { if (!cancelled) { setUsers(data); setLoading(false); } })
      .catch(() => { if (!cancelled) { setError("Erro ao carregar usuários"); setLoading(false); } });
    return () => { cancelled = true; };
  }, []);

  function handleNew() {
    setEditingUser(null);
    setShowForm(true);
  }

  function handleEdit(user: User) {
    setEditingUser(user);
    setShowForm(true);
  }

  function handleSaved() {
    setShowForm(false);
    setEditingUser(null);
    fetchUsers();
  }

  async function handleToggleActive(user: User) {
    setProcessing(user.id);
    try {
      const action = user.active ? "deactivate" : "activate";
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? "Erro ao atualizar usuário");
        return;
      }
      await fetchUsers();
    } finally {
      setProcessing(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-800">Usuários</h1>
        </div>
        <button
          onClick={handleNew}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg
            hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          <Plus size={18} />
          Novo Usuário
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {showForm && (
        <UserForm
          user={editingUser}
          onSaved={handleSaved}
          onCancel={() => { setShowForm(false); setEditingUser(null); }}
        />
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <p className="p-6 text-slate-500">Carregando...</p>
        ) : users.length === 0 ? (
          <div className="p-8 text-center">
            <UserCog size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500">Nenhum usuário encontrado</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Nome</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">E-mail</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Perfil</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => (
                <tr
                  key={user.id}
                  className={`hover:bg-slate-50 ${!user.active ? "opacity-60" : ""}`}
                >
                  <td className="px-4 py-3 font-medium text-slate-800">{user.name}</td>
                  <td className="px-4 py-3 text-slate-600">{user.email}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {roleLabel[user.role] ?? user.role}
                  </td>
                  <td className="px-4 py-3">
                    {user.active ? (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                        Ativo
                      </span>
                    ) : (
                      <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                        Inativo
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(user)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Editar usuário"
                      >
                        <Edit size={16} />
                      </button>
                      {/* Histórico de produtividade para não-ADMINs */}
                      {user.role !== "ADMIN" && (
                        <Link
                          href={`/dashboard/users/${user.id}`}
                          className="text-slate-400 hover:text-purple-600 transition-colors"
                          title="Ver histórico de produtividade"
                        >
                          <BarChart2 size={16} />
                        </Link>
                      )}
                      {/* Não exibir botão de desativar para o próprio usuário logado */}
                      {user.id !== currentUserId && (
                        <button
                          onClick={() => handleToggleActive(user)}
                          disabled={processing === user.id}
                          className={
                            user.active
                              ? "text-red-400 hover:text-red-600 disabled:opacity-50"
                              : "text-green-500 hover:text-green-700 disabled:opacity-50"
                          }
                          title={user.active ? "Desativar usuário" : "Ativar usuário"}
                        >
                          {user.active ? <UserX size={16} /> : <UserCheck size={16} />}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
