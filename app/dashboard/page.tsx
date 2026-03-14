"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useApi } from "@/lib/api-client";
import type { ResumoRespostaDTO, TransacaoRespostaDTO } from "@/types";
import TransactionList from "@/components/TransactionList";

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function parseCurrencyInput(value: string): string {
  // Remove tudo que não é número ou vírgula/ponto
  return value.replaceAll(/[^\d,.-]/g, "");
}

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

    setLoading(true);
    setMensagem(null);

    try {
      await api.criarTransacao({
        tipo,
        valor: valorNumerico,
        descricao: descricao || undefined,
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

  const handleGerarListaTransacoes = async () => {
    if (showTransacoes) {
      setShowTransacoes(false);
      return;
    }
    try {
      setLoadingTransacoes(true);
      setShowTransacoes(true);
      const page = await api.listarTransacoes({ size: 1000 });
      setTransacoes(page.content);
    } catch (err) {
      setMensagem({
        tipo: "erro",
        texto: err instanceof Error ? err.message : "Erro ao carregar transações.",
      });
    } finally {
      setLoadingTransacoes(false);
    }
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

            <button
              onClick={handleGerarListaTransacoes}
              className="w-full rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              {showTransacoes ? "Ocultar Lista de Transações" : "Gerar Lista de Transações"}
            </button>
          </div>
        )}

        {/* Lista de Transações */}
        {showTransacoes && (
          <div className="mb-6 rounded-xl bg-white p-6 shadow-md">
            <h2 className="mb-4 text-lg font-semibold text-gray-700">
              Lista de Transações
            </h2>
            <TransactionList transactions={transacoes} loading={loadingTransacoes} />
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
                />{" "}
                Crédito
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-base font-medium text-gray-700">
                <input
                  type="radio"
                  name="tipo"
                  value="DEBIT_PIX"
                  checked={tipo === "DEBIT_PIX"}
                  onChange={() => setTipo("DEBIT_PIX")}
                  className="h-4 w-4 accent-gray-600"
                />{" "}
                Débito/PIX
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
