import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getDashboard, DashboardData } from '@/services/ocorrencias'
import { useRealtime } from '@/hooks/use-realtime'
import { useAuth } from '@/hooks/use-auth'
import StatusBadge from '@/components/StatusBadge'
import { STATUS_LABELS, CATEGORIA_LABELS } from '@/components/StatusBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Inbox, CheckCircle2, AlertTriangle, Clock, Timer, TrendingUp, Zap } from 'lucide-react'

const fmtData = (d?: string) => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

const fmtMin = (m: number | null) => {
  if (m === null || m === undefined) return '—'
  if (m < 60) return `${m} min`
  if (m < 1440) return `${(m / 60).toFixed(1)} h`
  return `${(m / 1440).toFixed(1)} d`
}

const KPI = ({
  titulo,
  valor,
  icon: Icon,
  cor,
}: {
  titulo: string
  valor: string | number
  icon: typeof Inbox
  cor?: string
}) => (
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <Icon className="h-4 w-4" /> {titulo}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <p className={`text-3xl font-bold ${cor || ''}`}>{valor}</p>
    </CardContent>
  </Card>
)

const GraficoBarras = ({ data }: { data: Array<{ nome: string; qtd: number }> }) => (
  <div className="h-64">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="nome"
          tick={{ fontSize: 11 }}
          interval={0}
          angle={-20}
          textAnchor="end"
          height={60}
        />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
        <Tooltip />
        <Bar dataKey="qtd" name="Ocorrências" fill="#6366f1" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  </div>
)

const Painel = () => {
  const { isSupervisao } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    try {
      const d = await getDashboard()
      setData(d as any)
    } catch {
      setData(null)
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

  if (loading) return <p className="text-muted-foreground">Carregando painel...</p>
  if (!data)
    return (
      <p className="text-muted-foreground">
        Painel indisponível no momento. Recarregue a página para tentar de novo.
      </p>
    )

  const pctNoPrazo =
    data.resolvidas_com_prazo > 0
      ? Math.round((data.resolvidas_no_prazo / data.resolvidas_com_prazo) * 100)
      : null

  const statusChart = Object.entries(data.por_status).map(([k, v]) => ({
    nome: STATUS_LABELS[k] || k,
    qtd: v,
  }))

  const catChart = Object.entries(data.por_categoria).map(([k, v]) => ({
    nome: CATEGORIA_LABELS[k] || (k === 'sem_classificacao' ? 'Sem classif.' : k),
    qtd: v,
  }))

  const areaLabels: Record<string, string> = {
    io: 'IO (Rhuan)',
    operacao_loja: 'Operação loja (Fernando)',
    merchandising: 'Merchandising (Felipe)',
    pontos_extras: 'Pontos extras (Gabriels/Arthur)',
    acesso_loja: 'Acesso/QR (Carol)',
    outro: 'Outro',
    sem_area: 'Sem área',
  }
  const areaChart = Object.entries(data.por_area || {}).map(([k, v]) => ({
    nome: areaLabels[k] || k,
    qtd: v,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Painel</h1>
        <p className="text-sm text-muted-foreground">
          Indicadores do fluxo de ocorrências — abertas, SLA, tempos e reincidência
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPI titulo="Abertas" valor={data.abertas} icon={Inbox} />
        <KPI titulo="Resolvidas" valor={data.resolvidas} icon={CheckCircle2} />
        <KPI
          titulo="Fora do SLA"
          valor={data.fora_sla}
          icon={AlertTriangle}
          cor={data.fora_sla > 0 ? 'text-amber-600' : ''}
        />
        <KPI
          titulo="Precisam de apoio"
          valor={data.apoio}
          icon={Zap}
          cor={data.apoio > 0 ? 'text-red-600' : ''}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPI titulo="Vencem em 24h" valor={data.proximas_24h} icon={Clock} />
        <KPI
          titulo="Tempo 1ª ação"
          valor={fmtMin(data.tempo_medio_primeira_acao_min)}
          icon={Timer}
        />
        <KPI
          titulo="Tempo de resolução"
          valor={fmtMin(data.tempo_medio_resolucao_min)}
          icon={Timer}
        />
        <KPI
          titulo="Resolvidas no prazo"
          valor={pctNoPrazo === null ? '—' : `${pctNoPrazo}%`}
          icon={TrendingUp}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ocorrências por status</CardTitle>
          </CardHeader>
          <CardContent>
            {statusChart.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem dados ainda.</p>
            ) : (
              <GraficoBarras data={statusChart} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Abertas por categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {catChart.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem dados ainda.</p>
            ) : (
              <GraficoBarras data={catChart} />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Abertas por área (IO)</CardTitle>
          </CardHeader>
          <CardContent>
            {areaChart.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem dados ainda.</p>
            ) : (
              <GraficoBarras data={areaChart} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Responsáveis — abertas e fora do SLA</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data.por_responsavel || []).length === 0 && (
              <p className="text-sm text-muted-foreground">Sem dados ainda.</p>
            )}
            {(data.por_responsavel || []).map((r) => (
              <div
                key={r.responsavel}
                className="flex items-center justify-between text-sm border-b last:border-0 pb-2 last:pb-0"
              >
                <span className="font-medium">{r.responsavel}</span>
                <span className="flex items-center gap-3">
                  <span className="text-muted-foreground text-xs">{r.abertas} aberta(s)</span>
                  {r.fora_sla > 0 && (
                    <span className="text-amber-600 text-xs font-medium">
                      {r.fora_sla} fora do SLA
                    </span>
                  )}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top indústrias (abertas)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.por_industria.length === 0 && (
              <p className="text-sm text-muted-foreground">Sem dados ainda.</p>
            )}
            {data.por_industria.map((i) => (
              <div key={i.nome} className="flex items-center justify-between text-sm">
                <span>{i.nome}</span>
                <span className="font-medium">{i.qtd}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cobrança — fora do SLA (top 10)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.pendencias.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhuma ocorrência aberta fora do SLA. Bom sinal!
              </p>
            )}
            {data.pendencias.map((p) => (
              <Link
                key={p.id}
                to={`/ocorrencias/${p.id}`}
                className="block border rounded-lg p-3 hover:bg-muted/50"
              >
                <div className="flex items-center gap-2 justify-between">
                  <span className="font-mono text-sm">#{p.numero}</span>
                  <StatusBadge status={p.status} />
                </div>
                <p className="text-sm mt-1 line-clamp-1">{p.situacao}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {p.loja || '—'} · {p.industria || '—'} · prazo {fmtData(p.prazo)}
                </p>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      {!isSupervisao && (
        <p className="text-xs text-muted-foreground">
          Os indicadores consolidados são calculados pelo sistema a cada acesso.
        </p>
      )}
    </div>
  )
}

export default Painel
