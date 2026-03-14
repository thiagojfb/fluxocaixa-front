export interface ResumoRespostaDTO {
  salario: number;
  alertaCredito: number | null;
  totalGastoCredito: number;
  totalGastoDebitoPix: number;
  totalGasto: number;
  saldoDisponivel: number;
  totalTransacoes: number;
}

export interface OrcamentoRespostaDTO {
  id: string;
  salario: number;
  alertaCredito: number | null;
  criadoEm: string;
  atualizadoEm: string;
}

export interface TransacaoRequisicaoDTO {
  tipo: "CREDIT" | "DEBIT_PIX";
  valor: number;
  descricao?: string;
}

export interface TransacaoRespostaDTO {
  id: string;
  tipo: string;
  descricao: string | null;
  valor: number;
  dataHora: string;
  criadoEm: string;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

export interface SalarioRequisicaoDTO {
  salario: number;
}

export interface AlertaCreditoRequisicaoDTO {
  alertaCredito: number;
}
