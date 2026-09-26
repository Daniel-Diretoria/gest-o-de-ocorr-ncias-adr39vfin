import pb from '@/lib/pocketbase/client'

// ===== Ocorrências =====
export interface Ocorrencia {
  id: string
  numero: number
  data_ocorrencia: string
  promotor_id?: string
  repositor_nome?: string
  loja_id?: string
  loja_nome?: string
  industria_id?: string
  industria_nome?: string
  produto?: string
  situacao: string
  acao_realizada?: string
  contato_loja?: string
  precisa_apoio?: boolean
  midia?: string[]
  categoria?: string
  gravidade?: string
  prioridade?: string
  visibilidade?: string
  responsavel_id?: string
  sla_prazo?: string
  status: string
  resolvida_em?: string
  tempo_resolucao_min?: number
  origem?: string
  mensagem_bruta?: string
  created?: string
  updated?: string
  expand?: {
    promotor_id?: { id: string; nome: string }
    loja_id?: { id: string; nome: string }
    industria_id?: { id: string; nome: string }
    responsavel_id?: { id: string; name: string }
  }
}

export const getOcorrencias = (options?: any) =>
  pb.collection('ocorrencias').getFullList({
    sort: '-numero',
    expand: 'promotor_id,loja_id,industria_id,responsavel_id',
    ...options,
  })

export const getOcorrencia = (id: string) =>
  pb
    .collection('ocorrencias')
    .getOne(id, { expand: 'promotor_id,loja_id,industria_id,responsavel_id' })

export const createOcorrencia = (data: Partial<Ocorrencia>) =>
  pb.collection('ocorrencias').create(data)

export const updateOcorrencia = (id: string, data: Partial<Ocorrencia>) =>
  pb.collection('ocorrencias').update(id, data)

export const deleteOcorrencia = (id: string) => pb.collection('ocorrencias').delete(id)

export const nextNumero = async (): Promise<number> => {
  const items = await pb
    .collection('ocorrencias')
    .getList(1, 1, { sort: '-numero', fields: 'numero' })
  return (items.items[0]?.numero || 0) + 1
}

// ===== Tratativas =====
export interface Tratativa {
  id: string
  ocorrencia_id: string
  autor_id?: string
  tipo?: string
  descricao: string
  previsao?: string
  evidencia?: string[]
  created?: string
  expand?: { autor_id?: { id: string; name: string } }
}

export const getTratativas = (ocorrenciaId: string) =>
  pb.collection('tratativas').getFullList({
    filter: pb.filter('ocorrencia_id = {:id}', { id: ocorrenciaId }),
    sort: 'created',
    expand: 'autor_id',
  })

export const createTratativa = (data: Partial<Tratativa>) =>
  pb.collection('tratativas').create(data)

// ===== Indústrias =====
export interface Industria {
  id: string
  nome: string
  ativa?: boolean
}

export const getIndustrias = () => pb.collection('industrias').getFullList({ sort: 'nome' })
export const createIndustria = (data: Partial<Industria>) =>
  pb.collection('industrias').create(data)
export const updateIndustria = (id: string, data: Partial<Industria>) =>
  pb.collection('industrias').update(id, data)
export const deleteIndustria = (id: string) => pb.collection('industrias').delete(id)

// ===== Lojas =====
export interface Loja {
  id: string
  nome: string
  rede?: string
  endereco?: string
  ativa?: boolean
}

export const getLojas = () => pb.collection('lojas').getFullList({ sort: 'nome' })
export const createLoja = (data: Partial<Loja>) => pb.collection('lojas').create(data)
export const updateLoja = (id: string, data: Partial<Loja>) =>
  pb.collection('lojas').update(id, data)
export const deleteLoja = (id: string) => pb.collection('lojas').delete(id)

// ===== Promotores =====
export interface Promotor {
  id: string
  nome: string
  telefone?: string
  ativo?: boolean
  user_id?: string
  industria_id?: string
  expand?: { user_id?: { id: string; name: string }; industria_id?: { id: string; nome: string } }
}

export const getPromotores = () =>
  pb.collection('promotores').getFullList({ sort: 'nome', expand: 'user_id,industria_id' })
export const createPromotor = (data: Partial<Promotor>) => pb.collection('promotores').create(data)
export const updatePromotor = (id: string, data: Partial<Promotor>) =>
  pb.collection('promotores').update(id, data)
export const deletePromotor = (id: string) => pb.collection('promotores').delete(id)

// ===== Mensagens WhatsApp =====
export interface MensagemWhats {
  id: string
  origem?: string
  evento?: string
  remetente?: string
  conteudo?: string
  processada?: boolean
  erro?: string
  ocorrencia_id?: string
  created?: string
}

export const getMensagens = (options?: any) =>
  pb.collection('mensagens_whatsapp').getFullList({ sort: '-created', ...options })

// ===== URL de arquivo =====
export const fileUrl = (record: any, filename: string) => pb.files.getURL(record, filename)

// ===== Fase 2: direcionamento, sugestão IA e dashboard =====
export interface SugestaoClassificacao {
  categoria?: string
  gravidade?: string
  prioridade?: string
  visibilidade?: string
  justificativa?: string
}

export const sugerirClassificacao = (id: string) =>
  pb.send<SugestaoClassificacao>(`/backend/v1/ocorrencias/${id}/sugerir-classificacao`, {
    method: 'POST',
  })

export const direcionarOcorrencia = (
  id: string,
  data: {
    responsavel_id?: string
    sla_prazo?: string
    prioridade?: string
    gravidade?: string
    visibilidade?: string
    categoria?: string
  },
) => pb.send(`/backend/v1/ocorrencias/${id}/direcionar`, { method: 'POST', body: data })

export interface DashboardData {
  abertas: number
  resolvidas: number
  fora_sla: number
  proximas_24h: number
  sem_prazo: number
  apoio: number
  resolvidas_no_prazo: number
  resolvidas_com_prazo: number
  tempo_medio_primeira_acao_min: number | null
  tempo_medio_resolucao_min: number | null
  por_status: Record<string, number>
  por_categoria: Record<string, number>
  por_industria: Array<{ nome: string; qtd: number }>
  pendencias: Array<{
    id: string
    numero: number
    loja: string
    industria: string
    status: string
    prazo: string
    situacao: string
  }>
}

export const getDashboard = () => pb.send<DashboardData>('/backend/v1/dashboard', { method: 'GET' })

export const importarConversa = (conversa: string) =>
  pb.send('/backend/v1/ocorrencias/importar-conversa', {
    method: 'POST',
    body: { conversa },
  })

export const getUsuarios = () =>
  pb.collection('users').getFullList({ sort: 'name', fields: 'id,name,email,role,created' })

export interface NovoUsuario {
  name: string
  email: string
  senha: string
  role: string
}

export const createUsuario = (u: NovoUsuario) =>
  pb.collection('users').create({
    name: u.name,
    email: u.email,
    password: u.senha,
    passwordConfirm: u.senha,
    role: u.role,
  })

export const deleteUsuario = (id: string) => pb.collection('users').delete(id)
