"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useApi } from "@/lib/api-client";
import type {
  HistoricoTransacaoRespostaDTO,
  ResumoRespostaDTO,
  TransacaoRequisicaoDTO,
  TransacaoRespostaDTO,
} from "@/types";
import TransactionList from "@/components/TransactionList";

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

function formatTipo(tipo: string): string {
  if (tipo === "CREDIT") return "Crédito";
  if (tipo === "DEBIT_PIX") return "Débito/PIX";
  return tipo;
}

function parseCurrencyInput(value: string): string {
  // Remove tudo que não é número ou vírgula/ponto
  return value.replaceAll(/[^\d,.-]/g, "");
}

function parseIntegerInput(value: string): string {
  return value.replaceAll(/[^\d]/g, "");
}

function toIsoInicioDoDiaOrUndefined(value: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00`);
  return date.toISOString();
}

function toIsoFimDoDiaOrUndefined(value: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(`${value}T23:59:59.999`);
  return date.toISOString();
}

const TAMANHO_PAGINA_HISTORICO = 10;

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const api = useApi();

  const [resumo, setResumo] = useState<ResumoRespostaDTO | null>(null);
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tipo, setTipo] = useState<"CREDIT" | "DEBIT_PIX" | "">("");
  const [loading, setLoading] = useState(false);
  const [loadingResumo, setLoadingResumo] = useState(true);
  const [mensagem, setMensagem] = useState<{
    tipo: "sucesso" | "erro";
    texto: string;
  } | null>(null);
  const [showOpcoes, setShowOpcoes] = useState(false);
  const [novoSalario, setNovoSalario] = useState("");
  const [alertaCreditoInput, setAlertaCreditoInput] = useState("");
  const [showTransacoes, setShowTransacoes] = useState(false);
  const [transacoes, setTransacoes] = useState<TransacaoRespostaDTO[]>([]);
  const [loadingTransacoes, setLoadingTransacoes] = useState(false);
  const [processingTransacaoId, setProcessingTransacaoId] = useState<string | null>(null);
  const [transacaoEmEdicao, setTransacaoEmEdicao] = useState<TransacaoRespostaDTO | null>(null);
  const [editarValor, setEditarValor] = useState("");
  const [editarDescricao, setEditarDescricao] = useState("");
  const [editarTipo, setEditarTipo] = useState<"CREDIT" | "DEBIT_PIX">("CREDIT");
  const [showHistorico, setShowHistorico] = useState(false);
  const [historicoTransacoes, setHistoricoTransacoes] = useState<HistoricoTransacaoRespostaDTO[]>([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [paginaHistorico, setPaginaHistorico] = useState(0);
  const [totalPaginasHistorico, setTotalPaginasHistorico] = useState(0);
  const [totalElementosHistorico, setTotalElementosHistorico] = useState(0);
  const [loadingFecharFatura, setLoadingFecharFatura] = useState(false);
  const [loadingFecharDebitoPix, setLoadingFecharDebitoPix] = useState(false);
  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");
  const [usarLancamentoParcelado, setUsarLancamentoParcelado] = useState(false);
  const [quantidadeVezesLancamento, setQuantidadeVezesLancamento] = useState("2");

  // Redirect if error in token
  useEffect(() => {
    if (session?.error === "RefreshTokenError") {
      signOut({ callbackUrl: "/login" });
    }
  }, [session]);

  const carregarResumo = useCallback(async () => {
    if (!session?.accessToken) return;
    try {
      setLoadingResumo(true);
      const data = await api.obterResumo();
      setResumo(data);
    } catch (err) {
      console.error("Erro ao carregar resumo:", err);
    } finally {
      setLoadingResumo(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.accessToken]);

  useEffect(() => {
    if (status === "authenticated") {
      carregarResumo();
    }
  }, [status, carregarResumo]);

  useEffect(() => {
    if (resumo?.alertaCredito !== null && resumo?.alertaCredito !== undefined) {
      setAlertaCreditoInput(String(resumo.alertaCredito).replaceAll(".", ","));
      return;
    }

    setAlertaCreditoInput("");
  }, [resumo?.alertaCredito]);

  const handleConfirmar = async () => {
    if (!valor || !tipo) {
      setMensagem({ tipo: "erro", texto: "Preencha o valor e selecione o tipo." });
      return;
    }

    const valorNumerico = Number.parseFloat(valor.replaceAll(",", "."));
    if (Number.isNaN(valorNumerico) || valorNumerico <= 0) {
      setMensagem({ tipo: "erro", texto: "Valor inválido." });
      return;
    }

    let quantidadeVezes: number | undefined;
    if (usarLancamentoParcelado) {
      const quantidade = Number.parseInt(quantidadeVezesLancamento, 10);
      if (Number.isNaN(quantidade) || quantidade < 1) {
        setMensagem({ tipo: "erro", texto: "Quantidade de vezes inválida." });
        return;
      }
      quantidadeVezes = quantidade;
    }

    setLoading(true);
    setMensagem(null);

    try {
      await api.criarTransacao({
        tipo,
        valor: valorNumerico,
        descricao: descricao || undefined,
        quantidadeVezes,
      });
      setMensagem({ tipo: "sucesso", texto: "Transação registrada com sucesso!" });
      setValor("");
      setDescricao("");
      setTipo("");
      await carregarResumo();
    } catch (err) {
      setMensagem({
        tipo: "erro",
        texto: err instanceof Error ? err.message : "Erro ao registrar transação.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAtualizarSalario = async () => {
    const salarioNumerico = Number.parseFloat(novoSalario.replaceAll(",", "."));
    if (Number.isNaN(salarioNumerico) || salarioNumerico < 0) {
      setMensagem({ tipo: "erro", texto: "Salário inválido." });
      return;
    }

    try {
      await api.atualizarSalario({ salario: salarioNumerico });
      setMensagem({ tipo: "sucesso", texto: "Salário atualizado com sucesso!" });
      setShowOpcoes(false);
      setNovoSalario("");
      await carregarResumo();
    } catch (err) {
      setMensagem({
        tipo: "erro",
        texto: err instanceof Error ? err.message : "Erro ao atualizar salário.",
      });
    }
  };

  const carregarTransacoesFiltradas = useCallback(async () => {
    const page = await api.listarTransacoes({
      size: 1000,
      dataInicio: toIsoInicioDoDiaOrUndefined(filtroDataInicio),
      dataFim: toIsoFimDoDiaOrUndefined(filtroDataFim),
    });
    setTransacoes(page.content);
  }, [api, filtroDataFim, filtroDataInicio]);

  const handleGerarListaTransacoes = async () => {
    if (showTransacoes) {
      setShowTransacoes(false);
      return;
    }
    try {
      setLoadingTransacoes(true);
      setShowTransacoes(true);
      await carregarTransacoesFiltradas();
    } catch (err) {
      setMensagem({
        tipo: "erro",
        texto: err instanceof Error ? err.message : "Erro ao carregar transações.",
      });
    } finally {
      setLoadingTransacoes(false);
    }
  };

  const handleEditarTransacao = (transacao: TransacaoRespostaDTO) => {
    setTransacaoEmEdicao(transacao);
    setEditarValor(String(transacao.valor).replaceAll(".", ","));
    setEditarDescricao(transacao.descricao ?? "");
    setEditarTipo(transacao.tipo === "DEBIT_PIX" ? "DEBIT_PIX" : "CREDIT");
  };

  const handleConfirmarEdicaoTransacao = async () => {
    if (!transacaoEmEdicao) return;

    const valorNumerico = Number.parseFloat(editarValor.replaceAll(",", "."));
    if (Number.isNaN(valorNumerico) || valorNumerico <= 0) {
      setMensagem({ tipo: "erro", texto: "Valor inválido para editar a transação." });
      return;
    }

    if (!globalThis.confirm("Confirma a alteração desta transação?")) {
      return;
    }

    const payload: TransacaoRequisicaoDTO = {
      tipo: editarTipo,
      valor: valorNumerico,
      descricao: editarDescricao.trim() ? editarDescricao.trim() : undefined,
    };

    try {
      setProcessingTransacaoId(transacaoEmEdicao.id);
      await api.atualizarTransacao(transacaoEmEdicao.id, payload);
      setMensagem({ tipo: "sucesso", texto: "Transação atualizada com sucesso!" });
      setTransacaoEmEdicao(null);
      await Promise.all([carregarResumo(), carregarTransacoesFiltradas()]);
    } catch (err) {
      setMensagem({
        tipo: "erro",
        texto: err instanceof Error ? err.message : "Erro ao atualizar transação.",
      });
    } finally {
      setProcessingTransacaoId(null);
    }
  };

  const handleRemoverTransacao = async (transacao: TransacaoRespostaDTO) => {
    if (!globalThis.confirm(`Confirma a remoção da transação "${transacao.descricao ?? "sem descrição"}"?`)) {
      return;
    }

    try {
      setProcessingTransacaoId(transacao.id);
      await api.removerTransacao(transacao.id);
      setMensagem({ tipo: "sucesso", texto: "Transação removida com sucesso!" });
      await Promise.all([carregarResumo(), carregarTransacoesFiltradas()]);
    } catch (err) {
      setMensagem({
        tipo: "erro",
        texto: err instanceof Error ? err.message : "Erro ao remover transação.",
      });
    } finally {
      setProcessingTransacaoId(null);
    }
  };

  const carregarHistoricoPaginado = useCallback(async (pagina: number) => {
    try {
      setLoadingHistorico(true);
      const page = await api.listarHistoricoTransacoes({
        page: pagina,
        size: TAMANHO_PAGINA_HISTORICO,
        dataInicio: toIsoInicioDoDiaOrUndefined(filtroDataInicio),
        dataFim: toIsoFimDoDiaOrUndefined(filtroDataFim),
      });
      setHistoricoTransacoes(page.content);
      setPaginaHistorico(page.number);
      setTotalPaginasHistorico(page.totalPages);
      setTotalElementosHistorico(page.totalElements);
    } catch (err) {
      setMensagem({
        tipo: "erro",
        texto: err instanceof Error ? err.message : "Erro ao carregar histórico de transações.",
      });
    } finally {
      setLoadingHistorico(false);
    }
  }, [api, filtroDataFim, filtroDataInicio]);

  const handleGerarHistorico = async () => {
    if (showHistorico) {
      setShowHistorico(false);
      return;
    }

    setShowHistorico(true);
    await carregarHistoricoPaginado(0);
  };

  const handleSalvarAlertaCredito = () => {
    const alertaNumerico = Number.parseFloat(alertaCreditoInput.replaceAll(",", "."));
    if (Number.isNaN(alertaNumerico) || alertaNumerico < 0) {
      setMensagem({ tipo: "erro", texto: "Valor de alerta inválido." });
      return;
    }

    api
      .atualizarAlertaCredito({ alertaCredito: alertaNumerico })
      .then(async () => {
        setMensagem({ tipo: "sucesso", texto: "Alerta de cartão de crédito salvo com sucesso!" });
        await carregarResumo();
      })
      .catch((err) => {
        setMensagem({
          tipo: "erro",
          texto: err instanceof Error ? err.message : "Erro ao salvar alerta de crédito.",
        });
      });
  };

  const handleFecharFatura = async () => {
    try {
      setLoadingFecharFatura(true);
      const resposta = await api.fecharFatura();

      setMensagem({
        tipo: "sucesso",
        texto: `Fatura fechada com sucesso! ${resposta.quantidadeTransacoesCreditoTransportadas} transações de crédito transportadas (total ${formatCurrency(resposta.totalFaturaFechada)}).`,
      });

      setTransacoes([]);
      setShowTransacoes(false);
      setHistoricoTransacoes([]);
      setShowHistorico(false);
      setPaginaHistorico(0);
      setTotalPaginasHistorico(0);
      setTotalElementosHistorico(0);
      await carregarResumo();
    } catch (err) {
      setMensagem({
        tipo: "erro",
        texto: err instanceof Error ? err.message : "Erro ao fechar fatura.",
      });
    } finally {
      setLoadingFecharFatura(false);
    }
  };

  const handleFecharSaldoDebitoPix = async () => {
    try {
      setLoadingFecharDebitoPix(true);
      const resposta = await api.fecharSaldoDebitoPix();

      setMensagem({
        tipo: "sucesso",
        texto: `Saldo débito/PIX fechado com sucesso! ${resposta.quantidadeTransacoesCreditoTransportadas} transações transportadas (total ${formatCurrency(resposta.totalFaturaFechada)}).`,
      });

      setTransacoes([]);
      setShowTransacoes(false);
      setHistoricoTransacoes([]);
      setShowHistorico(false);
      setPaginaHistorico(0);
      setTotalPaginasHistorico(0);
      setTotalElementosHistorico(0);
      await carregarResumo();
    } catch (err) {
      setMensagem({
        tipo: "erro",
        texto: err instanceof Error ? err.message : "Erro ao fechar saldo débito/PIX.",
      });
    } finally {
      setLoadingFecharDebitoPix(false);
    }
  };

  const handleLogout = () => {
    signOut({ callbackUrl: "/login" });
  };

  if (status === "loading" || loadingResumo) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="flex flex-col items-center gap-4">
          <svg
            className="h-10 w-10 animate-spin text-green-700"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <p className="text-gray-500">Carregando...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  const salario = resumo?.salario ?? 0;
  const saldoCredito = resumo?.totalGastoCredito ?? 0;
  const saldoDebitoPix = resumo?.totalGastoDebitoPix ?? 0;
  const saldoDisponivel = resumo?.saldoDisponivel ?? 0;
  const alertaCredito = resumo?.alertaCredito ?? null;
  const creditoAcimaDoAlerta = alertaCredito !== null && saldoCredito > alertaCredito;
  const podeIrPaginaAnteriorHistorico = paginaHistorico > 0;
  const podeIrProximaPaginaHistorico = paginaHistorico + 1 < totalPaginasHistorico;

  let conteudoHistorico: ReactNode;
  if (loadingHistorico) {
    conteudoHistorico = <p className="py-4 text-sm text-gray-500">Carregando histórico...</p>;
  } else if (historicoTransacoes.length === 0) {
    conteudoHistorico = (
      <p className="py-4 text-sm text-gray-500">Nenhuma transação no histórico para o período informado.</p>
    );
  } else {
    conteudoHistorico = (
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full min-w-[700px] table-auto">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Data da Transação</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Fechada em</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Tipo</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Valor</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Vezes</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Descrição</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {historicoTransacoes.map((t) => (
              <tr key={t.id} className="transition hover:bg-gray-50">
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{formatDate(t.dataHora)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{formatDate(t.fechadoEm)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{formatTipo(t.tipo)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-600">{formatCurrency(t.valor)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-600">{t.quantidadeVezes}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{t.descricao ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-4xl rounded-2xl bg-blue-100 p-8 shadow-lg">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-xl font-bold text-green-700">
            Salário: {formatCurrency(salario)}
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => setShowOpcoes(!showOpcoes)}
              className="rounded-full bg-green-800 px-6 py-2 text-sm font-semibold text-white transition hover:bg-green-900"
            >
              Opções
            </button>
            <button
              onClick={handleLogout}
              className="rounded-full bg-gray-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-700"
            >
              Sair
            </button>
          </div>
        </div>

        {/* Mensagem de feedback */}
        {mensagem && (
          <div
            className={`mb-4 rounded-lg px-4 py-3 text-sm font-medium ${
              mensagem.tipo === "sucesso"
                ? "bg-green-100 text-green-800 border border-green-300"
                : "bg-red-100 text-red-800 border border-red-300"
            }`}
          >
            {mensagem.texto}
          </div>
        )}

        {/* Painel de opções */}
        {showOpcoes && (
          <div className="mb-6 rounded-xl bg-white p-6 shadow-md">
            <h2 className="mb-4 text-lg font-semibold text-gray-700">
              Atualizar Salário
            </h2>
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Novo salário"
                value={novoSalario}
                onChange={(e) => setNovoSalario(parseCurrencyInput(e.target.value))}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-gray-800 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-200"
              />
              <button
                onClick={handleAtualizarSalario}
                className="rounded-lg bg-green-700 px-6 py-2 text-sm font-semibold text-white transition hover:bg-green-800"
              >
                Salvar
              </button>
            </div>

            <hr className="my-4 border-gray-200" />

            <h2 className="mb-4 text-lg font-semibold text-gray-700">
              Alerta de Cartão de Crédito
            </h2>
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Valor de alerta"
                value={alertaCreditoInput}
                onChange={(e) => setAlertaCreditoInput(parseCurrencyInput(e.target.value))}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-gray-800 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-200"
              />
              <button
                onClick={handleSalvarAlertaCredito}
                className="rounded-lg bg-red-700 px-6 py-2 text-sm font-semibold text-white transition hover:bg-red-800"
              >
                Salvar
              </button>
            </div>

            <hr className="my-4 border-gray-200" />

            <h2 className="mb-4 text-lg font-semibold text-gray-700">
              Lançamento Parcelado
            </h2>
            <div className="space-y-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={usarLancamentoParcelado}
                  onChange={(e) => setUsarLancamentoParcelado(e.target.checked)}
                  className="h-4 w-4 accent-green-700"
                />
                <span>Usar quantidade de vezes no próximo lançamento</span>
              </label>

              <input
                type="text"
                placeholder="Quantidade de vezes"
                value={quantidadeVezesLancamento}
                onChange={(e) => setQuantidadeVezesLancamento(parseIntegerInput(e.target.value))}
                disabled={!usarLancamentoParcelado}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-800 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-200 disabled:cursor-not-allowed disabled:bg-gray-100"
              />
            </div>

            <hr className="my-4 border-gray-200" />

            <h2 className="mb-4 text-lg font-semibold text-gray-700">
              Filtro por Período
            </h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <input
                type="date"
                value={filtroDataInicio}
                onChange={(e) => setFiltroDataInicio(e.target.value)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-gray-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
              />
              <input
                type="date"
                value={filtroDataFim}
                onChange={(e) => setFiltroDataFim(e.target.value)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-gray-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <hr className="my-4 border-gray-200" />

            <button
              onClick={handleGerarListaTransacoes}
              className="w-full rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              {showTransacoes ? "Ocultar Lista de Transações" : "Gerar Lista de Transações"}
            </button>

            <button
              onClick={handleGerarHistorico}
              className="mt-3 w-full rounded-lg bg-purple-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-purple-700"
            >
              {showHistorico ? "Ocultar Histórico de Transações" : "Gerar Histórico de Transações"}
            </button>

            <button
              onClick={handleFecharFatura}
              disabled={loadingFecharFatura}
              className="mt-3 w-full rounded-lg bg-orange-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingFecharFatura ? "Fechando fatura..." : "Fechar Fatura"}
            </button>

            <button
              onClick={handleFecharSaldoDebitoPix}
              disabled={loadingFecharDebitoPix}
              className="mt-3 w-full rounded-lg bg-teal-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingFecharDebitoPix ? "Fechando débito/PIX..." : "Fechar Saldo Débito/PIX"}
            </button>
          </div>
        )}

        {/* Lista de Transações */}
        {showTransacoes && (
          <div className="mb-6 rounded-xl bg-white p-6 shadow-md">
            <h2 className="mb-4 text-lg font-semibold text-gray-700">
              Lista de Transações
            </h2>
            <TransactionList
              transactions={transacoes}
              loading={loadingTransacoes}
              processingId={processingTransacaoId}
              onEdit={handleEditarTransacao}
              onDelete={handleRemoverTransacao}
            />
          </div>
        )}

        {transacaoEmEdicao && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
              <h3 className="mb-4 text-lg font-semibold text-gray-800">Editar transação</h3>

              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Valor"
                  value={editarValor}
                  onChange={(e) => setEditarValor(parseCurrencyInput(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
                />

                <input
                  type="text"
                  placeholder="Descrição (opcional)"
                  value={editarDescricao}
                  onChange={(e) => setEditarDescricao(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
                />

                <div className="flex gap-5">
                  <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700">
                    <input
                      type="radio"
                      name="editarTipo"
                      value="CREDIT"
                      checked={editarTipo === "CREDIT"}
                      onChange={() => setEditarTipo("CREDIT")}
                      className="h-4 w-4 accent-gray-600"
                    />
                    <span>Crédito</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700">
                    <input
                      type="radio"
                      name="editarTipo"
                      value="DEBIT_PIX"
                      checked={editarTipo === "DEBIT_PIX"}
                      onChange={() => setEditarTipo("DEBIT_PIX")}
                      className="h-4 w-4 accent-gray-600"
                    />
                    <span>Débito/PIX</span>
                  </label>
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setTransacaoEmEdicao(null)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmarEdicaoTransacao}
                  disabled={processingTransacaoId === transacaoEmEdicao.id}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Salvar alterações
                </button>
              </div>
            </div>
          </div>
        )}

        {showHistorico && (
          <div className="mb-6 rounded-xl bg-white p-6 shadow-md">
            <h2 className="mb-4 text-lg font-semibold text-gray-700">
              Histórico de Transações
            </h2>

            {conteudoHistorico}

            {!loadingHistorico && totalPaginasHistorico > 0 && (
              <div className="mt-4 flex flex-col items-center justify-between gap-3 text-sm text-gray-600 md:flex-row">
                <span>
                  Página {paginaHistorico + 1} de {totalPaginasHistorico} • {totalElementosHistorico} registro(s)
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => void carregarHistoricoPaginado(paginaHistorico - 1)}
                    disabled={!podeIrPaginaAnteriorHistorico}
                    className="rounded-lg border border-gray-300 px-4 py-2 font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => void carregarHistoricoPaginado(paginaHistorico + 1)}
                    disabled={!podeIrProximaPaginaHistorico}
                    className="rounded-lg border border-gray-300 px-4 py-2 font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex flex-col gap-8 md:flex-row">
          {/* Left - Saldos */}
          <div className="flex flex-1 flex-col gap-6">
            <div className="rounded-xl bg-green-400 px-6 py-4 text-lg font-bold text-black shadow">
              Saldo Salário: {formatCurrency(saldoDisponivel)}
            </div>
            <div
              className={`rounded-xl bg-green-400 px-6 py-4 text-lg font-bold shadow ${
                creditoAcimaDoAlerta ? "text-red-700" : "text-black"
              }`}
            >
              Saldo Crédito: {formatCurrency(saldoCredito)}
            </div>
            <div className="rounded-xl bg-green-400 px-6 py-4 text-lg font-bold text-black shadow">
              Saldo Débito/PIX: {formatCurrency(saldoDebitoPix)}
            </div>
          </div>

          {/* Right - Formulário */}
          <div className="flex flex-1 flex-col items-center gap-6">
            <input
              type="text"
              placeholder="Insira o Valor Aqui"
              value={valor}
              onChange={(e) => setValor(parseCurrencyInput(e.target.value))}
              className="w-full rounded-full border-2 border-red-700 bg-white px-6 py-4 text-center text-lg text-gray-500 outline-none focus:border-red-800 focus:ring-2 focus:ring-red-300"
            />

            <input
              type="text"
              placeholder="Descrição (opcional)"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="w-full rounded-full border border-gray-300 bg-white px-6 py-3 text-center text-sm text-gray-500 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
            />

            <div className="flex gap-8">
              <label className="flex cursor-pointer items-center gap-2 text-base font-medium text-gray-700">
                <input
                  type="radio"
                  name="tipo"
                  value="CREDIT"
                  checked={tipo === "CREDIT"}
                  onChange={() => setTipo("CREDIT")}
                  className="h-4 w-4 accent-gray-600"
                />
                <span>Crédito</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-base font-medium text-gray-700">
                <input
                  type="radio"
                  name="tipo"
                  value="DEBIT_PIX"
                  checked={tipo === "DEBIT_PIX"}
                  onChange={() => setTipo("DEBIT_PIX")}
                  className="h-4 w-4 accent-gray-600"
                />
                <span>Débito/PIX</span>
              </label>
            </div>

            <button
              onClick={handleConfirmar}
              disabled={loading}
              className="w-full rounded-xl bg-red-700 px-8 py-4 text-xl font-bold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Processando..." : "Confirmar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
