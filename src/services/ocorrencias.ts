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
