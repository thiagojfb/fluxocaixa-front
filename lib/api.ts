import { auth } from "@/auth";
import type {
  ResumoRespostaDTO,
  OrcamentoRespostaDTO,
  TransacaoRequisicaoDTO,
  TransacaoRespostaDTO,
  HistoricoTransacaoRespostaDTO,
  FechamentoFaturaRespostaDTO,
  SalarioRequisicaoDTO,
  AlertaCreditoRequisicaoDTO,
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
  return fetchApi<ResumoRespostaDTO>("/api/resumo");
}

export async function obterOrcamento(): Promise<OrcamentoRespostaDTO> {
  return fetchApi<OrcamentoRespostaDTO>("/api/orcamento");
}

export async function atualizarSalario(
  data: SalarioRequisicaoDTO
): Promise<OrcamentoRespostaDTO> {
  return fetchApi<OrcamentoRespostaDTO>("/api/orcamento/salario", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function atualizarAlertaCredito(
  data: AlertaCreditoRequisicaoDTO
): Promise<OrcamentoRespostaDTO> {
  return fetchApi<OrcamentoRespostaDTO>("/api/orcamento/alerta-credito", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

// ── Transações ──
export async function criarTransacao(
  data: TransacaoRequisicaoDTO
): Promise<TransacaoRespostaDTO> {
  return fetchApi<TransacaoRespostaDTO>("/api/transacoes", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function atualizarTransacao(
  id: string,
  data: TransacaoRequisicaoDTO
): Promise<TransacaoRespostaDTO> {
  return fetchApi<TransacaoRespostaDTO>(`/api/transacoes/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function listarTransacoes(params?: {
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
  const url = query ? `/api/transacoes?${query}` : "/api/transacoes";
  return fetchApi<Page<TransacaoRespostaDTO>>(url);
}

export async function removerTransacao(id: string): Promise<void> {
  return fetchApi<void>(`/api/transacoes/${id}`, { method: "DELETE" });
}

export async function fecharFatura(): Promise<FechamentoFaturaRespostaDTO> {
  return fetchApi<FechamentoFaturaRespostaDTO>("/api/fatura/fechar", {
    method: "POST",
  });
}

export async function fecharSaldoDebitoPix(): Promise<FechamentoFaturaRespostaDTO> {
  return fetchApi<FechamentoFaturaRespostaDTO>("/api/fatura/fechar-debito-pix", {
    method: "POST",
  });
}

export async function listarHistoricoTransacoes(params?: {
  dataInicio?: string;
  dataFim?: string;
  page?: number;
  size?: number;
}): Promise<Page<HistoricoTransacaoRespostaDTO>> {
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
  return fetchApi<Page<HistoricoTransacaoRespostaDTO>>(url);
}
