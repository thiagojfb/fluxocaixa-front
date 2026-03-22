"use client";

import { useState, useMemo } from "react";
import type { TransacaoRespostaDTO } from "@/types";

type SortKey = "dataHora" | "tipo" | "valor" | "descricao";
type SortOrder = "asc" | "desc";

interface TransactionListProps {
  transactions: TransacaoRespostaDTO[];
  loading: boolean;
  processingId?: string | null;
  onEdit: (transaction: TransacaoRespostaDTO) => void;
  onDelete: (transaction: TransacaoRespostaDTO) => void;
}

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatDate = (iso: string) => {
  const date = new Date(iso);
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatTipo = (tipo: string) => {
  if (tipo === "CREDIT") return "Crédito";
  if (tipo === "DEBIT_PIX") return "Débito/PIX";
  return tipo;
};

function SortIcon({ active, order }: Readonly<{ active: boolean; order: SortOrder }>) {
  if (!active) {
    return (
      <svg className="ml-1 inline h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
        <path d="M7 7l3-3 3 3M7 13l3 3 3-3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      </svg>
    );
  }
  return order === "asc" ? (
    <svg className="ml-1 inline h-4 w-4 text-green-700" viewBox="0 0 20 20" fill="currentColor">
      <path d="M10 5l5 5H5l5-5z" />
    </svg>
  ) : (
    <svg className="ml-1 inline h-4 w-4 text-green-700" viewBox="0 0 20 20" fill="currentColor">
      <path d="M10 15l-5-5h10l-5 5z" />
    </svg>
  );
}

export default function TransactionList({
  transactions,
  loading,
  processingId = null,
  onEdit,
  onDelete,
}: Readonly<TransactionListProps>) {
  const [sortKey, setSortKey] = useState<SortKey>("dataHora");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  const sorted = useMemo(() => {
    const copy = [...transactions];
    copy.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "dataHora": {
          cmp = new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime();
          break;
        }
        case "tipo": {
          cmp = formatTipo(a.tipo).localeCompare(formatTipo(b.tipo), "pt-BR");
          break;
        }
        case "valor": {
          cmp = a.valor - b.valor;
          break;
        }
        case "descricao": {
          const da = (a.descricao ?? "").toLowerCase();
          const db = (b.descricao ?? "").toLowerCase();
          cmp = da.localeCompare(db, "pt-BR");
          break;
        }
      }
      return sortOrder === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [transactions, sortKey, sortOrder]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <svg className="h-8 w-8 animate-spin text-green-700" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="ml-3 text-gray-500">Carregando transações...</span>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <p className="py-6 text-center text-gray-500">Nenhuma transação encontrada.</p>
    );
  }

  const headerClass =
    "cursor-pointer select-none px-4 py-3 text-left text-sm font-semibold text-gray-700 transition hover:text-green-700";

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full min-w-[760px] table-auto">
        <thead className="bg-gray-50">
          <tr>
            <th className={headerClass} onClick={() => handleSort("dataHora")}>
              Data
              <SortIcon active={sortKey === "dataHora"} order={sortOrder} />
            </th>
            <th className={headerClass} onClick={() => handleSort("tipo")}>
              Tipo
              <SortIcon active={sortKey === "tipo"} order={sortOrder} />
            </th>
            <th className={headerClass} onClick={() => handleSort("valor")}>
              Valor
              <SortIcon active={sortKey === "valor"} order={sortOrder} />
            </th>
            <th className={headerClass} onClick={() => handleSort("descricao")}>
              Descrição
              <SortIcon active={sortKey === "descricao"} order={sortOrder} />
            </th>
            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {sorted.map((t) => (
            <tr key={t.id} className="transition hover:bg-gray-50">
              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                {formatDate(t.dataHora)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                {formatTipo(t.tipo)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-600">
                {formatCurrency(t.valor)}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                {t.descricao ?? "—"}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right">
                <div className="inline-flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onEdit(t)}
                    disabled={processingId === t.id}
                    className="rounded p-1 text-blue-600 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Editar transação"
                    title="Editar"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path d="M14.69 2.86a2 2 0 112.83 2.83l-9.2 9.2-3.68.85a.75.75 0 01-.9-.9l.85-3.68 9.2-9.2zM13.63 4.98L5.9 12.7l-.45 1.94 1.94-.45 7.73-7.73-1.5-1.49z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(t)}
                    disabled={processingId === t.id}
                    className="rounded p-1 text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Remover transação"
                    title="Remover"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M8.5 2.5A1.5 1.5 0 0010 4h0a1.5 1.5 0 001.5-1.5h2.25a.75.75 0 010 1.5h-.43l-.69 11.03A2 2 0 0110.64 17H9.36a2 2 0 01-1.99-1.97L6.68 4H6.25a.75.75 0 010-1.5H8.5zm1.5 3.75a.75.75 0 00-.75.75v6a.75.75 0 001.5 0V7a.75.75 0 00-.75-.75zm-3 0a.75.75 0 00-.75.75v6a.75.75 0 001.5 0V7a.75.75 0 00-.75-.75zm6 0a.75.75 0 00-.75.75v6a.75.75 0 001.5 0V7a.75.75 0 00-.75-.75z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
