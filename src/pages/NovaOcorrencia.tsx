import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  createOcorrencia,
  nextNumero,
  getIndustrias,
  getLojas,
  getPromotores,
  getRepresentantes,
  Industria,
  Loja,
  Promotor,
  Representante,
} from '@/services/ocorrencias'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft } from 'lucide-react'

const NovaOcorrencia = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [numero, setNumero] = useState<number>(0)
  const [industrias, setIndustrias] = useState<Industria[]>([])
  const [lojas, setLojas] = useState<Loja[]>([])
  const [promotores, setPromotores] = useState<Promotor[]>([])
  const [representantes, setRepresentantes] = useState<Representante[]>([])
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  const [form, setForm] = useState({
    data_ocorrencia: new Date().toISOString().slice(0, 10),
    promotor_id: '',
    repositor_nome: '',
    loja_id: '',
    loja_nome: '',
    industria_id: '',
    industria_nome: '',
    produto: '',
    situacao: '',
    acao_realizada: '',
    contato_loja: '',
    precisa_apoio: false,
    acompanhamento_industria: true,
    representante_id: '',
    categoria: '',
    gravidade: '',
    prioridade: '',
  })
  const [midia, setMidia] = useState<File[]>([])

  useEffect(() => {
    nextNumero().then(setNumero)
    getIndustrias().then((r) => setIndustrias(r as any))
    getLojas().then((r) => setLojas(r as any))
    getPromotores().then((r) => setPromotores(r as any))
    getRepresentantes().then((r) => setRepresentantes(r as any))
  }, [])

  const set = (campo: string, valor: any) => setForm((f) => ({ ...f, [campo]: valor }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')
    if (!form.situacao.trim()) {
      setErro('Situação encontrada é obrigatória.')
      return
    }
    setLoading(true)
    try {
      const data: any = {
        numero,
        data_ocorrencia: `${form.data_ocorrencia} 12:00:00.000Z`,
        promotor_id: form.promotor_id || null,
        repositor_nome: form.repositor_nome,
        loja_id: form.loja_id || null,
        loja_nome: form.loja_nome,
        industria_id: form.industria_id || null,
        industria_nome: form.industria_nome,
        produto: form.produto,
        situacao: form.situacao.trim(),
        acao_realizada: form.acao_realizada,
        contato_loja: form.contato_loja,
        precisa_apoio: form.precisa_apoio,
        acompanhamento_industria: form.acompanhamento_industria,
        representante_id: form.representante_id || null,
        categoria: form.categoria || null,
        gravidade: form.gravidade || null,
        prioridade: form.prioridade || null,
        status: 'nova',
        origem: 'manual',
        criado_por: user?.id || null,
      }
      if (midia.length > 0) {
        const fd = new FormData()
        Object.entries(data).forEach(([k, v]) => {
          if (v !== null && v !== undefined) fd.append(k, String(v))
        })
        midia.forEach((f) => fd.append('midia', f))
        await createOcorrencia(fd)
      } else {
        await createOcorrencia(data)
      }
      navigate('/ocorrencias')
    } catch (err: any) {
      setErro(
        err?.response?.data ? JSON.stringify(err.response.data) : 'Erro ao salvar ocorrência.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/ocorrencias')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Nova ocorrência #{numero}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Modelo padrão do campo</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Data</Label>
              <Input
                type="date"
                value={form.data_ocorrencia}
                onChange={(e) => set('data_ocorrencia', e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Repositor (promotor)</Label>
              <Select value={form.promotor_id} onValueChange={(v) => set('promotor_id', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {promotores.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Nome do repositor (livre)</Label>
              <Input
                value={form.repositor_nome}
                onChange={(e) => set('repositor_nome', e.target.value)}
                placeholder="Se não estiver cadastrado"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Loja (cadastrada)</Label>
              <Select value={form.loja_id} onValueChange={(v) => set('loja_id', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Opcional" />
                </SelectTrigger>
                <SelectContent>
                  {lojas.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Nome da loja (livre)</Label>
              <Input
                value={form.loja_nome}
                onChange={(e) => set('loja_nome', e.target.value)}
                placeholder="Ex.: Angeloni Centro"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Indústria (cadastrada)</Label>
              <Select value={form.industria_id} onValueChange={(v) => set('industria_id', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Opcional" />
                </SelectTrigger>
                <SelectContent>
                  {industrias.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Nome da indústria (livre)</Label>
              <Input
                value={form.industria_nome}
                onChange={(e) => set('industria_nome', e.target.value)}
                placeholder="Ex.: Italac"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Produto</Label>
              <Input
                value={form.produto}
                onChange={(e) => set('produto', e.target.value)}
                placeholder="Produto afetado"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Situação encontrada *</Label>
              <Textarea
                value={form.situacao}
                onChange={(e) => set('situacao', e.target.value)}
                rows={3}
                required
                placeholder="O que foi encontrado na loja"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>O que já foi feito</Label>
              <Textarea
                value={form.acao_realizada}
                onChange={(e) => set('acao_realizada', e.target.value)}
                rows={2}
                placeholder="Ações já realizadas no ponto de venda"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Com quem falou na loja</Label>
              <Input
                value={form.contato_loja}
                onChange={(e) => set('contato_loja', e.target.value)}
                placeholder="Nome e função"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Foto ou vídeo</Label>
              <Input
                type="file"
                accept="image/*,video/mp4,video/quicktime"
                multiple
                onChange={(e) => setMidia(Array.from(e.target.files || []))}
              />
            </div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <Switch
                checked={form.precisa_apoio}
                onCheckedChange={(v) => set('precisa_apoio', v)}
                id="apoio"
              />
              <Label htmlFor="apoio">Precisa de apoio?</Label>
            </div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <Switch
                checked={form.acompanhamento_industria}
                onCheckedChange={(v) => set('acompanhamento_industria', v)}
                id="acompanhamento"
              />
              <Label htmlFor="acompanhamento">Vai para acompanhamento da indústria?</Label>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Representante (autoriza trocas)</Label>
              <Select
                value={form.representante_id}
                onValueChange={(v) => set('representante_id', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Opcional — troca precisa passar por ele" />
                </SelectTrigger>
                <SelectContent>
                  {representantes.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.nome}
                      {r.expand?.industria_id ? ` — ${r.expand.industria_id.nome}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Classificação (pode ficar para a supervisão)
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select value={form.categoria} onValueChange={(v) => set('categoria', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {[
                    'estrutura',
                    'ruptura',
                    'validade',
                    'avaria',
                    'reposicao',
                    'equipamento',
                    'atendimento',
                    'operacional',
                    'outro',
                  ].map((c) => (
                    <SelectItem key={c} value={c}>
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Gravidade</Label>
              <Select value={form.gravidade} onValueChange={(v) => set('gravidade', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {['baixa', 'media', 'alta', 'critica'].map((c) => (
                    <SelectItem key={c} value={c}>
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Prioridade</Label>
              <Select value={form.prioridade} onValueChange={(v) => set('prioridade', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {['baixa', 'media', 'alta', 'urgente'].map((c) => (
                    <SelectItem key={c} value={c}>
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {erro && <p className="text-sm text-destructive">{erro}</p>}
        <Button type="submit" disabled={loading} className="w-full sm:w-auto">
          {loading ? 'Salvando...' : 'Registrar ocorrência'}
        </Button>
      </form>
    </div>
  )
}

export default NovaOcorrencia
