"use client";

import { useSession } from "next-auth/react";
import type {
  ResumoRespostaDTO,
  TransacaoRequisicaoDTO,
  TransacaoRespostaDTO,
  SalarioRequisicaoDTO,
  OrcamentoRespostaDTO,
  Page,
} from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

async function fetchApiClient<T>(
  path: string,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.mensagem ?? `Erro ${response.status}: ${response.statusText}`
    );
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}

export function useApi() {
  const { data: session } = useSession();
  const token = session?.accessToken ?? "";

  return {
    getResumo: () => fetchApiClient<ResumoRespostaDTO>("/api/summary", token),

    getBudget: () =>
      fetchApiClient<OrcamentoRespostaDTO>("/api/budget", token),

    updateSalario: (data: SalarioRequisicaoDTO) =>
      fetchApiClient<OrcamentoRespostaDTO>("/api/budget/salary", token, {
        method: "PUT",
        body: JSON.stringify(data),
      }),

    createTransaction: (data: TransacaoRequisicaoDTO) =>
      fetchApiClient<TransacaoRespostaDTO>("/api/transactions", token, {
        method: "POST",
        body: JSON.stringify(data),
      }),

    getTransactions: (params?: {
      tipo?: string;
      dataInicio?: string;
      dataFim?: string;
      page?: number;
      size?: number;
    }) => {
      const searchParams = new URLSearchParams();
      if (params?.tipo) searchParams.set("tipo", params.tipo);
      if (params?.dataInicio)
        searchParams.set("dataInicio", params.dataInicio);
      if (params?.dataFim) searchParams.set("dataFim", params.dataFim);
      if (params?.page !== undefined)
        searchParams.set("page", params.page.toString());
      if (params?.size !== undefined)
        searchParams.set("size", params.size.toString());

      const query = searchParams.toString();
      const url = query ? `/api/transactions?${query}` : "/api/transactions";
      return fetchApiClient<Page<TransacaoRespostaDTO>>(url, token);
    },

    deleteTransaction: (id: string) =>
      fetchApiClient<void>(`/api/transactions/${id}`, token, {
        method: "DELETE",
      }),
  };
}
