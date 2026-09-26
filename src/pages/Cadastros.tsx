import { useEffect, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/hooks/use-auth'
import {
  getIndustrias,
  getLojas,
  getPromotores,
  getRepresentantes,
  getMensagens,
  createIndustria,
  createLoja,
  createPromotor,
  createRepresentante,
  deleteIndustria,
  deleteLoja,
  deletePromotor,
  deleteRepresentante,
  Industria,
  Loja,
  Promotor,
  Representante,
  MensagemWhats,
} from '@/services/ocorrencias'
import { useRealtime } from '@/hooks/use-realtime'
import { Trash2, UserPlus, Upload } from 'lucide-react'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import {
  getUsuarios,
  createUsuario,
  deleteUsuario,
  Usuario,
  importarConversa,
} from '@/services/ocorrencias'

const Cadastros = () => {
  const { isAdmin } = useAuth()
  const [industrias, setIndustrias] = useState<Industria[]>([])
  const [lojas, setLojas] = useState<Loja[]>([])
  const [promotores, setPromotores] = useState<Promotor[]>([])
  const [representantes, setRepresentantes] = useState<Representante[]>([])
  const [mensagens, setMensagens] = useState<MensagemWhats[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [erro, setErro] = useState('')

  const [novaIndustria, setNovaIndustria] = useState('')
  const [novaLoja, setNovaLoja] = useState({ nome: '', rede: '', endereco: '' })
  const [novoPromotor, setNovoPromotor] = useState({ nome: '', telefone: '' })
  const [novoRepresentante, setNovoRepresentante] = useState({
    nome: '',
    email: '',
    telefone: '',
    industria_id: '',
  })
  const [novoUsuario, setNovoUsuario] = useState({
    name: '',
    email: '',
    senha: '',
    role: 'promotor',
  })

  const loadData = () => {
    getIndustrias().then((r) => setIndustrias(r as any))
    getLojas().then((r) => setLojas(r as any))
    getPromotores().then((r) => setPromotores(r as any))
    getRepresentantes().then((r) => setRepresentantes(r as any))
    getMensagens().then((r) => setMensagens(r as any))
    if (isAdmin)
      getUsuarios()
        .then((r) => setUsuarios(r as any))
        .catch(() => {})
  }

  const addUsuario = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novoUsuario.name.trim() || !novoUsuario.email.trim() || novoUsuario.senha.length < 8) {
      setErro('Nome, e-mail e senha de no mínimo 8 caracteres são obrigatórios.')
      return
    }
    try {
      await createUsuario(novoUsuario)
      setNovoUsuario({ name: '', email: '', senha: '', role: 'promotor' })
      setErro('')
      getUsuarios().then((r) => setUsuarios(r as any))
    } catch (err) {
      setErro(getErrorMessage(err))
    }
  }

  const removeUsuario = async (id: string, nome: string) => {
    if (confirm(`Excluir o acesso de ${nome}?`)) {
      try {
        await deleteUsuario(id)
        getUsuarios().then((r) => setUsuarios(r as any))
      } catch (err) {
        setErro(getErrorMessage(err))
      }
    }
  }

  const importar = async (texto: string) => {
    if (!texto.trim()) {
      setErro('Cole o texto da conversa exportada ou selecione o arquivo .txt.')
      return
    }
    setImportando(true)
    setErro('')
    setResultadoImport('')
    try {
      const r: any = await importarConversa(texto)
      setResultadoImport(
        `Importado: ${r.ocorrencias_criadas} ocorrências criadas de ${r.mensagens_reconhecidas} mensagens reconhecidas (${r.ignoradas} ignoradas — sem o modelo padrão).`,
      )
      setConversa('')
    } catch (err: any) {
      setErro(err?.message || 'Erro na importação.')
    } finally {
      setImportando(false)
    }
  }

  const lerArquivo = (f: File | null) => {
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => importar(String(reader.result || ''))
    reader.readAsText(f, 'utf-8')
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('mensagens_whatsapp', () => {
    getMensagens().then((r) => setMensagens(r as any))
  })

  const addIndustria = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novaIndustria.trim()) return
    try {
      await createIndustria({ nome: novaIndustria.trim(), ativa: true })
      setNovaIndustria('')
      loadData()
    } catch (err) {
      setErro(getErrorMessage(err))
    }
  }

  const addLoja = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novaLoja.nome.trim()) return
    try {
      await createLoja({ ...novaLoja, ativa: true })
      setNovaLoja({ nome: '', rede: '', endereco: '' })
      loadData()
    } catch (err) {
      setErro(getErrorMessage(err))
    }
  }

  const addPromotor = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novoPromotor.nome.trim()) return
    try {
      await createPromotor({ ...novoPromotor, ativo: true })
      setNovoPromotor({ nome: '', telefone: '' })
      loadData()
    } catch (err) {
      setErro(getErrorMessage(err))
    }
  }

  const addRepresentante = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novoRepresentante.nome.trim()) return
    try {
      await createRepresentante({ ...novoRepresentante, ativo: true })
      setNovoRepresentante({ nome: '', email: '', telefone: '', industria_id: '' })
      loadData()
    } catch (err) {
      setErro(getErrorMessage(err))
    }
  }

  const fmtData = (d?: string) => {
    if (!d) return '—'
    return new Date(d).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Cadastros</h1>
        <p className="text-sm text-muted-foreground">Indústrias, lojas e promotores da operação</p>
      </div>

      {erro && <p className="text-sm text-destructive">{erro}</p>}

      <Tabs defaultValue="industrias">
        <TabsList>
          <TabsTrigger value="industrias">Indústrias ({industrias.length})</TabsTrigger>
          <TabsTrigger value="lojas">Lojas ({lojas.length})</TabsTrigger>
          <TabsTrigger value="promotores">Promotores ({promotores.length})</TabsTrigger>
          <TabsTrigger value="representantes">Representantes ({representantes.length})</TabsTrigger>
          <TabsTrigger value="mensagens">Mensagens WhatsApp ({mensagens.length})</TabsTrigger>
          {isAdmin && <TabsTrigger value="usuarios">Usuários ({usuarios.length})</TabsTrigger>}
          <TabsTrigger value="importar">Importar conversa</TabsTrigger>
        </TabsList>

        <TabsContent value="industrias" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Nova indústria</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={addIndustria} className="flex gap-2">
                <Input
                  value={novaIndustria}
                  onChange={(e) => setNovaIndustria(e.target.value)}
                  placeholder="Nome da indústria"
                />
                <Button type="submit">Adicionar</Button>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="p-3 font-medium">Nome</th>
                    <th className="p-3 font-medium">Ativa</th>
                    <th className="p-3 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {industrias.map((i) => (
                    <tr key={i.id} className="border-b last:border-0">
                      <td className="p-3">{i.nome}</td>
                      <td className="p-3">
                        <Switch
                          checked={i.ativa !== false}
                          onCheckedChange={async (v) => {
                            await import('@/services/ocorrencias').then((m) =>
                              m.updateIndustria(i.id, { ativa: v }),
                            )
                            loadData()
                          }}
                        />
                      </td>
                      <td className="p-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={async () => {
                            if (confirm(`Excluir ${i.nome}?`)) {
                              await deleteIndustria(i.id)
                              loadData()
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {industrias.length === 0 && (
                    <tr>
                      <td colSpan={3} className="p-6 text-center text-muted-foreground">
                        Nenhuma indústria cadastrada.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lojas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Nova loja</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={addLoja} className="grid gap-2 sm:grid-cols-4">
                <Input
                  value={novaLoja.nome}
                  onChange={(e) => setNovaLoja((l) => ({ ...l, nome: e.target.value }))}
                  placeholder="Nome da loja *"
                  required
                />
                <Input
                  value={novaLoja.rede}
                  onChange={(e) => setNovaLoja((l) => ({ ...l, rede: e.target.value }))}
                  placeholder="Rede"
                />
                <Input
                  value={novaLoja.endereco}
                  onChange={(e) => setNovaLoja((l) => ({ ...l, endereco: e.target.value }))}
                  placeholder="Endereço"
                />
                <Button type="submit">Adicionar</Button>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="p-3 font-medium">Nome</th>
                    <th className="p-3 font-medium">Rede</th>
                    <th className="p-3 font-medium">Endereço</th>
                    <th className="p-3 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {lojas.map((l) => (
                    <tr key={l.id} className="border-b last:border-0">
                      <td className="p-3">{l.nome}</td>
                      <td className="p-3">{l.rede || '—'}</td>
                      <td className="p-3">{l.endereco || '—'}</td>
                      <td className="p-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={async () => {
                            if (confirm(`Excluir ${l.nome}?`)) {
                              await deleteLoja(l.id)
                              loadData()
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {lojas.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-muted-foreground">
                        Nenhuma loja cadastrada.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="promotores" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Novo promotor</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={addPromotor} className="grid gap-2 sm:grid-cols-3">
                <Input
                  value={novoPromotor.nome}
                  onChange={(e) => setNovoPromotor((p) => ({ ...p, nome: e.target.value }))}
                  placeholder="Nome do promotor *"
                  required
                />
                <Input
                  value={novoPromotor.telefone}
                  onChange={(e) => setNovoPromotor((p) => ({ ...p, telefone: e.target.value }))}
                  placeholder="Telefone (WhatsApp)"
                />
                <Button type="submit">Adicionar</Button>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="p-3 font-medium">Nome</th>
                    <th className="p-3 font-medium">Telefone</th>
                    <th className="p-3 font-medium">Ativo</th>
                    <th className="p-3 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {promotores.map((p) => (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="p-3">{p.nome}</td>
                      <td className="p-3">{p.telefone || '—'}</td>
                      <td className="p-3">
                        <Switch
                          checked={p.ativo !== false}
                          onCheckedChange={async (v) => {
                            await import('@/services/ocorrencias').then((m) =>
                              m.updatePromotor(p.id, { ativo: v }),
                            )
                            loadData()
                          }}
                        />
                      </td>
                      <td className="p-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={async () => {
                            if (confirm(`Excluir ${p.nome}?`)) {
                              await deletePromotor(p.id)
                              loadData()
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {promotores.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-muted-foreground">
                        Nenhum promotor cadastrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="representantes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Novo representante</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={addRepresentante} className="grid gap-2 sm:grid-cols-5">
                <Input
                  value={novoRepresentante.nome}
                  onChange={(e) => setNovoRepresentante((r) => ({ ...r, nome: e.target.value }))}
                  placeholder="Nome do representante *"
                  required
                />
                <Input
                  value={novoRepresentante.email}
                  onChange={(e) => setNovoRepresentante((r) => ({ ...r, email: e.target.value }))}
                  placeholder="E-mail"
                  type="email"
                />
                <Input
                  value={novoRepresentante.telefone}
                  onChange={(e) =>
                    setNovoRepresentante((r) => ({ ...r, telefone: e.target.value }))
                  }
                  placeholder="Telefone (WhatsApp)"
                />
                <Select
                  value={novoRepresentante.industria_id}
                  onValueChange={(v) => setNovoRepresentante((r) => ({ ...r, industria_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Indústria (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {industrias.map((i) => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="submit">Adicionar</Button>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="p-3 font-medium">Nome</th>
                    <th className="p-3 font-medium">Contato</th>
                    <th className="p-3 font-medium">Indústria</th>
                    <th className="p-3 font-medium">Acesso</th>
                    <th className="p-3 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {representantes.map((r) => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="p-3">{r.nome}</td>
                      <td className="p-3">
                        {[r.telefone, r.email].filter(Boolean).join(' · ') || '—'}
                      </td>
                      <td className="p-3">{r.expand?.industria_id?.nome || '—'}</td>
                      <td className="p-3">
                        {r.expand?.user_id ? (
                          <Badge variant="secondary">login criado</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            sem acesso — criar usuário em Usuários (papel representante)
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={async () => {
                            if (confirm(`Excluir ${r.nome}?`)) {
                              await deleteRepresentante(r.id)
                              loadData()
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {representantes.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-muted-foreground">
                        Nenhum representante cadastrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mensagens" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Mensagens recebidas do WhatsApp (Umbler Talk)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {mensagens.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nenhuma mensagem recebida ainda. Configure o webhook no painel do Umbler Talk com
                  a URL do backend + token.
                </p>
              )}
              {mensagens.map((m) => (
                <div key={m.id} className="border rounded-lg p-3 space-y-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{fmtData(m.created)}</span>
                    <span>·</span>
                    <span>{m.remetente || 'remetente?'}</span>
                    <span>·</span>
                    {m.processada ? (
                      <span className="text-green-600">processada</span>
                    ) : (
                      <span className="text-amber-600">pendente</span>
                    )}
                  </div>
                  <pre className="whitespace-pre-wrap text-sm">
                    {m.conteudo || JSON.stringify(m)}
                  </pre>
                  {m.erro && <p className="text-xs text-destructive">{m.erro}</p>}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="importar" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Importar conversa do grupo (export do WhatsApp)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                No WhatsApp: segure o grupo &gt; Mais &gt; Exportar conversa &gt; Sem mídia. Envie o
                arquivo .txt aqui — cada mensagem no modelo padrão vira uma ocorrência com IA e SLA.
              </p>
              <Input
                type="file"
                accept=".txt,text/plain"
                onChange={(e) => lerArquivo(e.target.files?.[0] || null)}
              />
              <Textarea
                value={conversa}
                onChange={(e) => setConversa(e.target.value)}
                rows={8}
                placeholder="...ou cole o texto da conversa exportada aqui"
              />
              <Button type="button" onClick={() => importar(conversa)} disabled={importando}>
                <Upload className="h-4 w-4 mr-2" />
                {importando ? 'Importando...' : 'Importar ocorrências'}
              </Button>
              {resultadoImport && <p className="text-sm text-green-600">{resultadoImport}</p>}
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="usuarios" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Novo acesso</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={addUsuario} className="grid gap-2 sm:grid-cols-5">
                  <Input
                    value={novoUsuario.name}
                    onChange={(e) => setNovoUsuario((u) => ({ ...u, name: e.target.value }))}
                    placeholder="Nome *"
                    required
                  />
                  <Input
                    type="email"
                    value={novoUsuario.email}
                    onChange={(e) => setNovoUsuario((u) => ({ ...u, email: e.target.value }))}
                    placeholder="E-mail *"
                    required
                  />
                  <Input
                    type="password"
                    value={novoUsuario.senha}
                    onChange={(e) => setNovoUsuario((u) => ({ ...u, senha: e.target.value }))}
                    placeholder="Senha (mín. 8) *"
                    required
                    minLength={8}
                  />
                  <Select
                    value={novoUsuario.role}
                    onValueChange={(v) => setNovoUsuario((u) => ({ ...u, role: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="promotor">Promotor</SelectItem>
                      <SelectItem value="representante">Representante</SelectItem>
                      <SelectItem value="supervisao">Supervisão</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button type="submit">
                    <UserPlus className="h-4 w-4 mr-1" /> Criar acesso
                  </Button>
                </form>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="p-3 font-medium">Nome</th>
                      <th className="p-3 font-medium">E-mail</th>
                      <th className="p-3 font-medium">Perfil</th>
                      <th className="p-3 w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {usuarios.map((u) => (
                      <tr key={u.id} className="border-b last:border-0">
                        <td className="p-3">{u.name}</td>
                        <td className="p-3">{u.email}</td>
                        <td className="p-3">
                          {u.role === 'admin'
                            ? 'Administrador'
                            : u.role === 'supervisao'
                              ? 'Supervisão'
                              : 'Promotor'}
                        </td>
                        <td className="p-3">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeUsuario(u.id, u.name)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {usuarios.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-6 text-center text-muted-foreground">
                          Nenhum usuário listado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

export default Cadastros
