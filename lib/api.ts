import { auth } from "@/auth";
import type {
  ResumoRespostaDTO,
  OrcamentoRespostaDTO,
  TransacaoRequisicaoDTO,
  TransacaoRespostaDTO,
  SalarioRequisicaoDTO,
  Page,
} from "@/types";

// Server-side: usa URL interna (Docker) se disponível, senão a pública
const API_URL = process.env.API_URL_INTERNAL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

async function getToken(): Promise<string | undefined> {
  const session = await auth();
  return session?.accessToken;
}

async function fetchApi<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

// ── Orçamento ──
export async function getResumo(): Promise<ResumoRespostaDTO> {
  return fetchApi<ResumoRespostaDTO>("/api/summary");
}

export async function getBudget(): Promise<OrcamentoRespostaDTO> {
  return fetchApi<OrcamentoRespostaDTO>("/api/budget");
}

export async function updateSalario(
  data: SalarioRequisicaoDTO
): Promise<OrcamentoRespostaDTO> {
  return fetchApi<OrcamentoRespostaDTO>("/api/budget/salary", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

// ── Transações ──
export async function createTransaction(
  data: TransacaoRequisicaoDTO
): Promise<TransacaoRespostaDTO> {
  return fetchApi<TransacaoRespostaDTO>("/api/transactions", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getTransactions(params?: {
  tipo?: string;
  dataInicio?: string;
  dataFim?: string;
  page?: number;
  size?: number;
}): Promise<Page<TransacaoRespostaDTO>> {
  const searchParams = new URLSearchParams();
  if (params?.tipo) searchParams.set("tipo", params.tipo);
  if (params?.dataInicio) searchParams.set("dataInicio", params.dataInicio);
  if (params?.dataFim) searchParams.set("dataFim", params.dataFim);
  if (params?.page !== undefined)
    searchParams.set("page", params.page.toString());
  if (params?.size !== undefined)
    searchParams.set("size", params.size.toString());

  const query = searchParams.toString();
  const url = query ? `/api/transactions?${query}` : "/api/transactions";
  return fetchApi<Page<TransacaoRespostaDTO>>(url);
}

export async function deleteTransaction(id: string): Promise<void> {
  return fetchApi<void>(`/api/transactions/${id}`, { method: "DELETE" });
}
