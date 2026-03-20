"use client";

import { getSession, useSession } from "next-auth/react";
import type {
  ResumoRespostaDTO,
  TransacaoRequisicaoDTO,
  TransacaoRespostaDTO,
  HistoricoTransacaoRespostaDTO,
  FechamentoFaturaRespostaDTO,
  SalarioRequisicaoDTO,
  AlertaCreditoRequisicaoDTO,
  OrcamentoRespostaDTO,
  Page,
} from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

async function fetchApiClient<T>(
  path: string,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  const execute = async (resolvedToken: string) =>
    fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resolvedToken}`,
        ...options.headers,
      },
    });

  let response = await execute(token);

  if (response.status === 401) {
    const refreshedSession = await getSession();
    const refreshedToken = refreshedSession?.accessToken;

    if (refreshedToken && refreshedToken !== token) {
      response = await execute(refreshedToken);
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    if (response.status === 401) {
      throw new Error("Sessão expirada. Faça login novamente.");
    }
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
    obterResumo: () => fetchApiClient<ResumoRespostaDTO>("/api/resumo", token),

    obterOrcamento: () =>
      fetchApiClient<OrcamentoRespostaDTO>("/api/orcamento", token),

    atualizarSalario: (data: SalarioRequisicaoDTO) =>
      fetchApiClient<OrcamentoRespostaDTO>("/api/orcamento/salario", token, {
        method: "PUT",
        body: JSON.stringify(data),
      }),

    atualizarAlertaCredito: (data: AlertaCreditoRequisicaoDTO) =>
      fetchApiClient<OrcamentoRespostaDTO>("/api/orcamento/alerta-credito", token, {
        method: "PUT",
        body: JSON.stringify(data),
      }),

    criarTransacao: (data: TransacaoRequisicaoDTO) =>
      fetchApiClient<TransacaoRespostaDTO>("/api/transacoes", token, {
        method: "POST",
        body: JSON.stringify(data),
      }),

    atualizarTransacao: (id: string, data: TransacaoRequisicaoDTO) =>
      fetchApiClient<TransacaoRespostaDTO>(`/api/transacoes/${id}`, token, {
        method: "PUT",
        body: JSON.stringify(data),
      }),

    listarTransacoes: (params?: {
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
      const url = query ? `/api/transacoes?${query}` : "/api/transacoes";
      return fetchApiClient<Page<TransacaoRespostaDTO>>(url, token);
    },

    removerTransacao: (id: string) =>
      fetchApiClient<void>(`/api/transacoes/${id}`, token, {
        method: "DELETE",
      }),

    fecharFatura: () =>
      fetchApiClient<FechamentoFaturaRespostaDTO>("/api/fatura/fechar", token, {
        method: "POST",
      }),

    fecharSaldoDebitoPix: () =>
      fetchApiClient<FechamentoFaturaRespostaDTO>("/api/fatura/fechar-debito-pix", token, {
        method: "POST",
      }),

    listarHistoricoTransacoes: (params?: {
      dataInicio?: string;
      dataFim?: string;
      page?: number;
      size?: number;
    }) => {
      const searchParams = new URLSearchParams();
      if (params?.dataInicio)
        searchParams.set("dataInicio", params.dataInicio);
      if (params?.dataFim)
        searchParams.set("dataFim", params.dataFim);
      if (params?.page !== undefined)
        searchParams.set("page", params.page.toString());
      if (params?.size !== undefined)
        searchParams.set("size", params.size.toString());

      const query = searchParams.toString();
      const url = query
        ? `/api/historico-transacoes?${query}`
        : "/api/historico-transacoes";
      return fetchApiClient<Page<HistoricoTransacaoRespostaDTO>>(url, token);
    },
  };
}
