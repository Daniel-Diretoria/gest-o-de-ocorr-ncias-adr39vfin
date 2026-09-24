import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getOcorrencias, Ocorrencia } from '@/services/ocorrencias'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import StatusBadge, { STATUS_LABELS } from '@/components/StatusBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Inbox, Clock, CheckCircle2, AlertTriangle } from 'lucide-react'

const Home = () => {
  const { user, isSupervisao } = useAuth()
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([])
  const [loading, setLoading] = useState(true)

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

  const abertas = ocorrencias.filter(
    (o) => !['resolvida', 'cancelada', 'improcedente'].includes(o.status),
  )
  const resolvidas = ocorrencias.filter((o) => o.status === 'resolvida')
  const foraDoPrazo = abertas.filter((o) => o.sla_prazo && new Date(o.sla_prazo) < new Date())
  const comApoio = abertas.filter((o) => o.precisa_apoio)

  const minhas = ocorrencias.filter(
    (o) => o.responsavel_id === user?.id || o.expand?.responsavel_id?.id === user?.id,
  )

  const fmtData = (d?: string) => {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Olá, {user?.name?.split(' ')[0] || 'time'}</h1>
          <p className="text-sm text-muted-foreground">Visão geral das ocorrências de campo</p>
        </div>
        <Button asChild>
          <Link to="/ocorrencias/nova">
            <Plus className="h-4 w-4 mr-2" /> Nova ocorrência
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Inbox className="h-4 w-4" /> Abertas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{loading ? '—' : abertas.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> Resolvidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{loading ? '—' : resolvidas.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Fora do SLA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-amber-600">
              {loading ? '—' : foraDoPrazo.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" /> Precisam de apoio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">{loading ? '—' : comApoio.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Abertas mais recentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {abertas.slice(0, 6).map((o) => (
              <Link
                key={o.id}
                to={`/ocorrencias/${o.id}`}
                className="block border rounded-lg p-3 hover:bg-muted/50"
              >
                <div className="flex items-center gap-2 justify-between">
                  <span className="font-mono text-sm">#{o.numero}</span>
                  <StatusBadge status={o.status} />
                </div>
                <p className="text-sm mt-1 line-clamp-1">{o.situacao}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {o.loja_nome || '—'} · {o.industria_nome || '—'} · {fmtData(o.data_ocorrencia)}
                </p>
              </Link>
            ))}
            {abertas.length === 0 && !loading && (
              <p className="text-sm text-muted-foreground">Nenhuma ocorrência aberta. Bom sinal!</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status do fluxo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[
                'nova',
                'em_analise',
                'direcionada',
                'em_tratativa',
                'aguardando_loja',
                'aguardando_industria',
                'aguardando_representante',
              ].map((s) => {
                const qtd = ocorrencias.filter((o) => o.status === s).length
                return (
                  <div key={s} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{STATUS_LABELS[s]}</span>
                    <span className="font-medium">{qtd}</span>
                  </div>
                )
              })}
              <div className="flex items-center justify-between text-sm border-t pt-2">
                <span className="text-muted-foreground">Atribuídas a mim</span>
                <span className="font-medium">{minhas.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {isSupervisao && (
        <p className="text-xs text-muted-foreground">
          Você tem acesso de supervisão: cadastros, classificação e direcionamento em{' '}
          <Link to="/cadastros" className="underline">
            Cadastros
          </Link>
          .
        </p>
      )}
    </div>
  )
}

export default Home
