"use client";

import { useState, useMemo } from "react";
import type { TransacaoRespostaDTO } from "@/types";

type SortKey = "dataHora" | "valor" | "descricao";
type SortOrder = "asc" | "desc";

interface TransactionListProps {
  transactions: TransacaoRespostaDTO[];
  loading: boolean;
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

export default function TransactionList({ transactions, loading }: Readonly<TransactionListProps>) {
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
      <table className="w-full min-w-[500px] table-auto">
        <thead className="bg-gray-50">
          <tr>
            <th className={headerClass} onClick={() => handleSort("dataHora")}>
              Data
              <SortIcon active={sortKey === "dataHora"} order={sortOrder} />
            </th>
            <th className={headerClass} onClick={() => handleSort("valor")}>
              Valor
              <SortIcon active={sortKey === "valor"} order={sortOrder} />
            </th>
            <th className={headerClass} onClick={() => handleSort("descricao")}>
              Descrição
              <SortIcon active={sortKey === "descricao"} order={sortOrder} />
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {sorted.map((t) => (
            <tr key={t.id} className="transition hover:bg-gray-50">
              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                {formatDate(t.dataHora)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-600">
                {formatCurrency(t.valor)}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                {t.descricao ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
