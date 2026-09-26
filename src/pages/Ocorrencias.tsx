import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getOcorrencias, Ocorrencia } from '@/services/ocorrencias'
import { useRealtime } from '@/hooks/use-realtime'
import StatusBadge, { STATUS_LABELS, CATEGORIA_LABELS } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Button as Btn } from '@/components/ui/button'
import { Plus, Search, Target } from 'lucide-react'

const AREAS = [
  { valor: 'io', label: 'IO (Rhuan)' },
  { valor: 'operacao_loja', label: 'Operação de loja (Fernando)' },
  { valor: 'merchandising', label: 'Merchandising (Felipe)' },
  { valor: 'pontos_extras', label: 'Pontos extras (Gabriels e Arthur)' },
  { valor: 'acesso_loja', label: 'Acesso/QR Code (Carol)' },
  { valor: 'outro', label: 'Outro' },
]

const Ocorrencias = () => {
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [statusFiltro, setStatusFiltro] = useState('todos')
  const [areaFiltro, setAreaFiltro] = useState('todas')
  const [respFiltro, setRespFiltro] = useState('todos')
  const navigate = useNavigate()

  const loadData = async () => {
    try {
      const items = await getOcorrencias()
      setOcorrencias(items as any)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('ocorrencias', () => {
    loadData()
  })

  const abertas = useMemo(
    () =>
      ocorrencias.filter((o) => !['resolvida', 'cancelada', 'improcedente'].includes(o.status))
        .length,
    [ocorrencias],
  )

  const filtradas = useMemo(() => {
    let list = ocorrencias
    if (statusFiltro !== 'todos') {
      list = list.filter((o) => o.status === statusFiltro)
    }
    if (areaFiltro !== 'todas') {
      list = list.filter((o) => (o.area || 'outro') === areaFiltro)
    }
    if (respFiltro !== 'todos') {
      list = list.filter((o) => (o.responsavel_nome || '').toLowerCase().indexOf(respFiltro) !== -1)
    }
    if (busca.trim()) {
      const q = busca.toLowerCase()
      list = list.filter(
        (o) =>
          o.situacao?.toLowerCase().includes(q) ||
          o.loja_nome?.toLowerCase().includes(q) ||
          o.industria_nome?.toLowerCase().includes(q) ||
          o.produto?.toLowerCase().includes(q) ||
          String(o.numero).includes(q),
      )
    }
    return list
  }, [ocorrencias, busca, statusFiltro, areaFiltro, respFiltro])

  const fmtData = (d?: string) => {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Ocorrências</h1>
          <p className="text-sm text-muted-foreground">
            {ocorrencias.length} registradas · {abertas} abertas
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/painel')}>
            <Target className="h-4 w-4 mr-2" /> Painel
          </Button>
          <Button onClick={() => navigate('/ocorrencias/nova')}>
            <Plus className="h-4 w-4 mr-2" /> Nova ocorrência
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por situação, loja, indústria, produto ou número..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={statusFiltro} onValueChange={setStatusFiltro}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {Object.entries(STATUS_LABELS).map(([valor, label]) => (
              <SelectItem key={valor} value={valor}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={areaFiltro} onValueChange={setAreaFiltro}>
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue placeholder="Área" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as áreas</SelectItem>
            {AREAS.map((a) => (
              <SelectItem key={a.valor} value={a.valor}>
                {a.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={respFiltro} onValueChange={setRespFiltro}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Responsável" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos responsáveis</SelectItem>
            <SelectItem value="rhuan">Rhuan</SelectItem>
            <SelectItem value="fernando">Fernando</SelectItem>
            <SelectItem value="felipe">Felipe</SelectItem>
            <SelectItem value="gabriel">Gabriel/Arthur</SelectItem>
            <SelectItem value="carol">Carol</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : filtradas.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Nenhuma ocorrência encontrada. Registre a primeira ou ajuste os filtros.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="p-3 font-medium">#</th>
                    <th className="p-3 font-medium">Data</th>
                    <th className="p-3 font-medium">Loja</th>
                    <th className="p-3 font-medium">Indústria</th>
                    <th className="p-3 font-medium">Situação</th>
                    <th className="p-3 font-medium">Categoria</th>
                    <th className="p-3 font-medium">Responsável</th>
                    <th className="p-3 font-medium">Status</th>
                    <th className="p-3 font-medium">SLA</th>
                  </tr>
                </thead>
                <tbody>
                  {filtradas.map((o) => (
                    <tr
                      key={o.id}
                      className="border-b last:border-0 hover:bg-muted/50 cursor-pointer"
                      onClick={() => navigate(`/ocorrencias/${o.id}`)}
                    >
                      <td className="p-3 font-mono">{o.numero}</td>
                      <td className="p-3 whitespace-nowrap">{fmtData(o.data_ocorrencia)}</td>
                      <td className="p-3">{o.loja_nome || '—'}</td>
                      <td className="p-3">{o.industria_nome || '—'}</td>
                      <td className="p-3 max-w-xs">
                        <span className="line-clamp-1">{o.situacao}</span>
                      </td>
                      <td className="p-3">
                        {o.categoria ? CATEGORIA_LABELS[o.categoria] || o.categoria : '—'}
                      </td>
                      <td className="p-3 text-xs">{o.responsavel_nome || '—'}</td>
                      <td className="p-3">
                        <StatusBadge status={o.status} />
                      </td>
                      <td className="p-3 whitespace-nowrap text-xs">
                        {o.sla_prazo ? (
                          <span
                            className={
                              !['resolvida', 'cancelada', 'improcedente'].includes(o.status) &&
                              new Date(o.sla_prazo) < new Date()
                                ? 'text-amber-600 font-medium'
                                : ''
                            }
                          >
                            {fmtData(o.sla_prazo)}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        Ocorrências vindas do WhatsApp via Umbler Talk entram aqui automaticamente.{' '}
        <Link to="/mensagens" className="underline">
          Ver mensagens recebidas
        </Link>
      </p>
    </div>
  )
}

export default Ocorrencias
