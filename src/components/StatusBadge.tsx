import { Badge } from '@/components/ui/badge'

export const STATUS_LABELS: Record<string, string> = {
  nova: 'Nova',
  em_analise: 'Em análise',
  direcionada: 'Direcionada',
  em_tratativa: 'Em tratativa',
  aguardando_loja: 'Aguardando loja',
  aguardando_industria: 'Aguardando indústria',
  aguardando_representante: 'Aguardando representante',
  resolvida: 'Resolvida',
  cancelada: 'Cancelada',
  improcedente: 'Improcedente',
}

export const STATUS_VARIANTS: Record<string, string> = {
  nova: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
  em_analise: 'bg-amber-100 text-amber-800 hover:bg-amber-100',
  direcionada: 'bg-violet-100 text-violet-800 hover:bg-violet-100',
  em_tratativa: 'bg-cyan-100 text-cyan-800 hover:bg-cyan-100',
  aguardando_loja: 'bg-slate-100 text-slate-800 hover:bg-slate-100',
  aguardando_industria: 'bg-slate-100 text-slate-800 hover:bg-slate-100',
  aguardando_representante: 'bg-slate-100 text-slate-800 hover:bg-slate-100',
  resolvida: 'bg-green-100 text-green-800 hover:bg-green-100',
  cancelada: 'bg-red-100 text-red-800 hover:bg-red-100',
  improcedente: 'bg-zinc-100 text-zinc-800 hover:bg-zinc-100',
}

export const CATEGORIA_LABELS: Record<string, string> = {
  estrutura: 'Estrutura',
  ruptura: 'Ruptura',
  validade: 'Validade',
  avaria: 'Avaria',
  reposicao: 'Reposição',
  equipamento: 'Equipamento',
  atendimento: 'Atendimento',
  outro: 'Outro',
}

const StatusBadge = ({ status }: { status: string }) => (
  <Badge className={STATUS_VARIANTS[status] || ''} variant="secondary">
    {STATUS_LABELS[status] || status}
  </Badge>
)

export default StatusBadge
