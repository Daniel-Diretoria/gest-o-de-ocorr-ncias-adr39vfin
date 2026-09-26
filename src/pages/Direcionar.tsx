import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  getOcorrencia,
  getUsuarios,
  sugerirClassificacao,
  direcionarOcorrencia,
  Ocorrencia as OcType,
} from '@/services/ocorrencias'
import { useAuth } from '@/hooks/use-auth'
import StatusBadge, { STATUS_LABELS } from '@/components/StatusBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Sparkles, Check } from 'lucide-react'

const CATEGORIAS = [
  'estrutura',
  'ruptura',
  'validade',
  'avaria',
  'reposicao',
  'equipamento',
  'atendimento',
  'operacional',
  'outro',
]
const GRAVIDADES = ['baixa', 'media', 'alta', 'critica']
const PRIORIDADES = ['baixa', 'media', 'alta', 'urgente']
const VISIBILIDADES = ['interno', 'representante', 'industria']

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

const Direcionar = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAdmin, isSupervisao } = useAuth()
  const [oc, setOc] = useState<OcType | null>(null)
  const [usuarios, setUsuarios] = useState<Array<{ id: string; name: string; role: string }>>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [carregandoIA, setCarregandoIA] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [sugestao, setSugestao] = useState<{
    categoria?: string
    gravidade?: string
    prioridade?: string
    visibilidade?: string
    justificativa?: string
  } | null>(null)

  const [form, setForm] = useState({
    responsavel_id: '',
    prioridade: '',
    gravidade: '',
    categoria: '',
    visibilidade: 'interno',
    sla_prazo: '',
  })

  const loadData = async () => {
    if (!id) return
    try {
      const o = await getOcorrencia(id)
      setOc(o as any)
      const u = await getUsuarios()
      setUsuarios(u as any)
      setForm((f) => ({
        ...f,
        prioridade: (o as any).prioridade || '',
        gravidade: (o as any).gravidade || '',
        categoria: (o as any).categoria || '',
        visibilidade: (o as any).visibilidade || 'interno',
      }))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [id])

  const pedirSugestao = async () => {
    if (!id) return
    setErro('')
    setCarregandoIA(true)
    try {
      const r = await sugerirClassificacao(id)
      const s = (r as any).sugestao || r
      setSugestao(s)
      setForm((f) => ({
        ...f,
        categoria: s.categoria || f.categoria,
        gravidade: s.gravidade || f.gravidade,
        prioridade: s.prioridade || f.prioridade,
        visibilidade: s.visibilidade || f.visibilidade,
      }))
    } catch (err: any) {
      setErro(err?.message || 'Não foi possível obter a sugestão da IA.')
    } finally {
      setCarregandoIA(false)
    }
  }

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return
    setErro('')
    setSalvando(true)
    try {
      const data: any = {
        prioridade: form.prioridade,
        gravidade: form.gravidade,
        categoria: form.categoria,
        visibilidade: form.visibilidade,
      }
      if (form.responsavel_id) data.responsavel_id = form.responsavel_id
      if (form.sla_prazo) {
        data.sla_prazo = `${form.sla_prazo} 23:59:00.000Z`
      }
      await direcionarOcorrencia(id, data)
      navigate(`/ocorrencias/${id}`)
    } catch (err: any) {
      setErro(err?.message || 'Erro ao direcionar.')
    } finally {
      setSalvando(false)
    }
  }

  if (loading) return <p className="text-muted-foreground">Carregando...</p>
  if (!oc) return <p className="text-destructive">Ocorrência não encontrada.</p>

  const FECHADAS = ['resolvida', 'cancelada', 'improcedente']
  if (FECHADAS.includes(oc.status)) {
    return (
      <p className="text-muted-foreground">
        Ocorrência #{oc.numero} está {STATUS_LABELS[oc.status]?.toLowerCase()} — não pode ser
        direcionada.
      </p>
    )
  }

  const podeEditar = isAdmin || isSupervisao

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/ocorrencias/${id}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 flex items-center gap-2 flex-wrap">
          <h1 className="text-2xl font-bold font-mono">#{oc.numero}</h1>
          <StatusBadge status={oc.status} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resumo da ocorrência</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>
            <span className="text-muted-foreground">Loja:</span> {oc.loja_nome || '—'} ·{' '}
            <span className="text-muted-foreground">Indústria:</span> {oc.industria_nome || '—'} ·{' '}
            <span className="text-muted-foreground">Produto:</span> {oc.produto || '—'}
          </p>
          <p className="whitespace-pre-wrap">{oc.situacao}</p>
          {oc.acao_realizada && (
            <p className="text-muted-foreground">Já feito: {oc.acao_realizada}</p>
          )}
        </CardContent>
      </Card>

      {erro && <p className="text-sm text-destructive">{erro}</p>}

      {!podeEditar ? (
        <p className="text-muted-foreground">
          Somente supervisão ou admin podem direcionar ocorrências.
        </p>
      ) : (
        <form onSubmit={salvar} className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Classificação (IA sugere, você revisa)</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={pedirSugestao}
                disabled={carregandoIA}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {carregandoIA ? 'Analisando...' : 'Sugerir com IA'}
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {sugestao?.justificativa && (
                <p className="text-xs text-muted-foreground border-l-2 border-primary/40 pl-2">
                  IA: {sugestao.justificativa}
                </p>
              )}
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Categoria</Label>
                  <Select
                    value={form.categoria}
                    onValueChange={(v) => setForm((f) => ({ ...f, categoria: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIAS.map((c) => (
                        <SelectItem key={c} value={c}>
                          {cap(c)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Gravidade</Label>
                  <Select
                    value={form.gravidade}
                    onValueChange={(v) => setForm((f) => ({ ...f, gravidade: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {GRAVIDADES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {cap(c)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Prioridade (define o SLA)</Label>
                  <Select
                    value={form.prioridade}
                    onValueChange={(v) => setForm((f) => ({ ...f, prioridade: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORIDADES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {cap(c)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Visibilidade</Label>
                  <Select
                    value={form.visibilidade}
                    onValueChange={(v) => setForm((f) => ({ ...f, visibilidade: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {VISIBILIDADES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {cap(c)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>SLA (prazo final)</Label>
                  <Input
                    type="date"
                    value={form.sla_prazo}
                    onChange={(e) => setForm((f) => ({ ...f, sla_prazo: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Responsável</Label>
                  <Select
                    value={form.responsavel_id}
                    onValueChange={(v) => setForm((f) => ({ ...f, responsavel_id: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {usuarios.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name} ·{' '}
                          {u.role === 'admin'
                            ? 'Admin'
                            : u.role === 'supervisao'
                              ? 'Supervisão'
                              : 'Promotor'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button type="submit" disabled={salvando} className="w-full sm:w-auto">
            <Check className="h-4 w-4 mr-2" />{' '}
            {salvando ? 'Direcionando...' : 'Direcionar e iniciar SLA'}
          </Button>
        </form>
      )}
    </div>
  )
}

export default Direcionar
