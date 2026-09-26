import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  getOcorrencia,
  getTratativas,
  createTratativa,
  updateOcorrencia,
  getLembretes,
  autorizarRepresentante,
  Ocorrencia as OcType,
  Tratativa,
  Lembrete,
  fileUrl,
} from '@/services/ocorrencias'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import StatusBadge, { STATUS_LABELS, CATEGORIA_LABELS } from '@/components/StatusBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Paperclip, Send, Target, Pencil } from 'lucide-react'

const TIPOS = ['contato', 'acao', 'retorno', 'observacao', 'evidencia']

const TIPO_LABELS: Record<string, string> = {
  contato: 'Contato',
  acao: 'Ação',
  retorno: 'Retorno',
  observacao: 'Observação',
  evidencia: 'Evidência',
}

const OcorrenciaDetalhe = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, isAdmin } = useAuth()
  const [oc, setOc] = useState<OcType | null>(null)
  const [tratativas, setTratativas] = useState<Tratativa[]>([])
  const [loading, setLoading] = useState(true)
  const [descricao, setDescricao] = useState('')
  const [tipo, setTipo] = useState('observacao')
  const [evidencia, setEvidencia] = useState<File | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [lembretes, setLembretes] = useState<Lembrete[]>([])

  const loadData = async () => {
    if (!id) return
    try {
      const o = await getOcorrencia(id)
      setOc(o as any)
      const t = await getTratativas(id)
      setTratativas(t as any)
      getLembretes(id)
        .then((l) => setLembretes(l as any))
        .catch(() => {})
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [id])

  useRealtime('tratativas', () => {
    loadData()
  })

  const mudarStatus = async (novo: string) => {
    if (!oc) return
    const patch: any = { status: novo }
    if (novo === 'resolvida') {
      patch.resolvida_em = new Date().toISOString()
      const inicio = new Date(oc.data_ocorrencia || oc.created || Date.now()).getTime()
      patch.tempo_resolucao_min = Math.round((Date.now() - inicio) / 60000)
    }
    await updateOcorrencia(oc.id, patch)
    loadData()
  }

  const enviarTratativa = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!oc || !descricao.trim()) return
    setEnviando(true)
    try {
      const data: any = {
        ocorrencia_id: oc.id,
        autor_id: user?.id,
        tipo,
        descricao: descricao.trim(),
      }
      if (evidencia) {
        const form = new FormData()
        form.append('ocorrencia_id', oc.id)
        form.append('autor_id', user?.id || '')
        form.append('tipo', tipo)
        form.append('descricao', descricao.trim())
        form.append('evidencia', evidencia)
        await createTratativa(form)
      } else {
        await createTratativa(data)
      }
      setDescricao('')
      setEvidencia(null)
      loadData()
    } finally {
      setEnviando(false)
    }
  }

  const fmtData = (d?: string) => {
    if (!d) return '—'
    return new Date(d).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) return <p className="text-muted-foreground">Carregando...</p>
  if (!oc) return <p className="text-destructive">Ocorrência não encontrada.</p>

  const aberta = !['resolvida', 'cancelada', 'improcedente'].includes(oc.status)

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/ocorrencias')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 flex items-center gap-2 flex-wrap">
          <h1 className="text-2xl font-bold font-mono">#{oc.numero}</h1>
          <StatusBadge status={oc.status} />
          {oc.precisa_apoio && <Badge variant="destructive">Precisa de apoio</Badge>}
          {oc.origem === 'whatsapp' && <Badge variant="outline">WhatsApp</Badge>}
        </div>
      </div>

      {aberta && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Mudar status:</span>
          <Select
            value={oc.status}
            onValueChange={(v) => {
              if (v !== oc.status) mudarStatus(v)
            }}
          >
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_LABELS).map(([valor, label]) => (
                <SelectItem key={valor} value={valor}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(isAdmin || user?.role === 'supervisao') && (
            <>
              <Button
                variant="outline"
                onClick={() => navigate(`/ocorrencias/${oc.id}/direcionar`)}
              >
                <Target className="h-4 w-4 mr-2" /> Direcionar
              </Button>
              <Button variant="outline" onClick={() => navigate(`/ocorrencias/${oc.id}/editar`)}>
                <Pencil className="h-4 w-4 mr-2" /> Editar
              </Button>
            </>
          )}
        </div>
      )}

      {/* Fluxo de troca: representante autoriza → indústria */}
      {aberta && oc.representante_id && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Autorização de troca — representante{' '}
              {oc.autorizado_representante ? '✅ autorizada' : '⏳ pendente'}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-2">
            {!oc.autorizado_representante ? (
              <>
                <span className="text-sm text-muted-foreground">
                  Troca aguardando autorização do representante. Depois da autorização, a ocorrência{' '}
                  {oc.acompanhamento_industria
                    ? 'segue para a indústria.'
                    : 'segue em tratativa interna.'}
                </span>
                <Button
                  size="sm"
                  onClick={async () => {
                    await autorizarRepresentante(oc.id, { acao: 'autorizar' })
                    loadData()
                  }}
                >
                  Autorizar troca
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    await autorizarRepresentante(oc.id, { acao: 'recusar' })
                    loadData()
                  }}
                >
                  Recusar
                </Button>
              </>
            ) : (
              <span className="text-sm text-muted-foreground">
                Autorizada em {fmtData(oc.autorizado_representante)} —{' '}
                {oc.acompanhamento_industria
                  ? 'acompanhamento da indústria ativo.'
                  : 'tratativa interna.'}
              </span>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ocorrência</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Data:</span> {fmtData(oc.data_ocorrencia)}
            </p>
            <p>
              <span className="text-muted-foreground">Repositor:</span>{' '}
              {oc.repositor_nome || oc.expand?.promotor_id?.nome || '—'}
            </p>
            <p>
              <span className="text-muted-foreground">Loja:</span>{' '}
              {oc.loja_nome || oc.expand?.loja_id?.nome || '—'}
            </p>
            <p>
              <span className="text-muted-foreground">Indústria:</span>{' '}
              {oc.industria_nome || oc.expand?.industria_id?.nome || '—'}
            </p>
            <p>
              <span className="text-muted-foreground">Produto:</span> {oc.produto || '—'}
            </p>
            <p>
              <span className="text-muted-foreground">Situação encontrada:</span> {oc.situacao}
            </p>
            <p>
              <span className="text-muted-foreground">O que já foi feito:</span>{' '}
              {oc.acao_realizada || '—'}
            </p>
            <p>
              <span className="text-muted-foreground">Com quem falou na loja:</span>{' '}
              {oc.contato_loja || '—'}
            </p>
            <p>
              <span className="text-muted-foreground">Categoria:</span>{' '}
              {oc.categoria ? CATEGORIA_LABELS[oc.categoria] || oc.categoria : '—'}
            </p>
            <p>
              <span className="text-muted-foreground">Acompanhamento da indústria:</span>{' '}
              {oc.acompanhamento_industria ? 'Sim' : 'Não'}
            </p>
            <p>
              <span className="text-muted-foreground">Lembretes de SLA enviados:</span>{' '}
              {oc.lembretes_enviados || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mídia e classificação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {oc.midia && oc.midia.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {oc.midia.map((f) => (
                  <a key={f} href={fileUrl(oc, f)} target="_blank" rel="noreferrer">
                    {f.match(/\.(mp4|mov)$/i) ? (
                      <span className="underline text-sm">🎥 {f}</span>
                    ) : (
                      <img
                        src={fileUrl(oc, f)}
                        alt={f}
                        className="h-20 w-20 object-cover rounded border"
                      />
                    )}
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">Sem anexos.</p>
            )}
            {oc.mensagem_bruta && (
              <div className="mt-3">
                <p className="text-muted-foreground mb-1">Mensagem original (WhatsApp):</p>
                <pre className="whitespace-pre-wrap bg-muted rounded p-3 text-xs">
                  {oc.mensagem_bruta}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tratativas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {tratativas.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma tratativa registrada ainda.</p>
          )}
          {lembretes.length > 0 && (
            <div className="border rounded-lg p-3 space-y-2 bg-muted/40">
              <p className="text-xs font-medium text-muted-foreground">
                Lembretes automáticos de SLA ({lembretes.length}) — disparo por WhatsApp quando o
                Digisac for conectado
              </p>
              {lembretes.map((l) => (
                <div key={l.id} className="text-xs space-y-0.5">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Badge variant="outline">{l.destinatario_tipo || 'lembrete'}</Badge>
                    <span>{l.destinatario_nome || '—'}</span>
                    <span>·</span>
                    <span>{fmtData(l.created)}</span>
                    <Badge variant={l.status === 'pendente' ? 'secondary' : 'default'}>
                      {l.status || 'pendente'}
                    </Badge>
                  </div>
                  <p className="whitespace-pre-wrap">{l.mensagem}</p>
                </div>
              ))}
            </div>
          )}
          {tratativas.map((t) => (
            <div key={t.id} className="border rounded-lg p-3 space-y-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline">{TIPO_LABELS[t.tipo || ''] || t.tipo}</Badge>
                <span>{t.expand?.autor_id?.name || '—'}</span>
                <span>·</span>
                <span>{fmtData(t.created)}</span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{t.descricao}</p>
              {t.evidencia && t.evidencia.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {t.evidencia.map((f) => (
                    <a
                      key={f}
                      href={fileUrl(t, f)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs underline flex items-center gap-1"
                    >
                      <Paperclip className="h-3 w-3" /> {f}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}

          <form onSubmit={enviarTratativa} className="border-t pt-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={tipo} onValueChange={setTipo}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS.map((t) => (
                      <SelectItem key={t} value={t}>
                        {TIPO_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Evidência (foto/vídeo/PDF)</Label>
                <Input
                  type="file"
                  accept="image/*,video/mp4,video/quicktime,application/pdf"
                  onChange={(e) => setEvidencia(e.target.files?.[0] || null)}
                />
              </div>
            </div>
            <Textarea
              placeholder="Registrar contato, ação, retorno, previsão ou observação..."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={3}
              required
            />
            <Button type="submit" disabled={enviando || !descricao.trim()}>
              <Send className="h-4 w-4 mr-2" /> {enviando ? 'Enviando...' : 'Registrar tratativa'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {isAdmin && (
        <Button
          variant="destructive"
          onClick={async () => {
            if (confirm('Excluir esta ocorrência?')) {
              await updateOcorrencia(oc.id, { status: 'cancelada' })
              navigate('/ocorrencias')
            }
          }}
        >
          Cancelar ocorrência
        </Button>
      )}
    </div>
  )
}

export default OcorrenciaDetalhe
