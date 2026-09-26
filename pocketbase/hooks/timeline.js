// Timeline da ocorrência — linha do tempo completa: criação, direcionamento,
// tratativas, autorizações, lembretes e status atual. Alimenta a visão
// "onde está parado, com qual responsável, até finalizar".
// GET /backend/v1/ocorrencias/{id}/timeline
routerAdd(
  'GET',
  '/backend/v1/ocorrencias/{id}/timeline',
  (e) => {
    const id = e.request.pathValue('id')
    let oc
    try {
      oc = $app.findRecordById('ocorrencias', id)
    } catch (_) {
      return e.json(404, { error: 'Ocorrência não encontrada.' })
    }

    const eventos = []

    // Criação
    eventos.push({
      quando: String(oc.get('created') || ''),
      tipo: 'criacao',
      titulo: 'Ocorrência aberta',
      detalhe:
        'Origem: ' + (String(oc.get('origem') || 'manual') === 'whatsapp' ? 'WhatsApp' : 'Manual'),
      autor: String(oc.get('repositor_nome') || ''),
    })

    // Direcionamento (SLA definido)
    const prazo = String(oc.get('sla_prazo') || '')
    if (prazo && prazo.indexOf('0001-01-01') === -1) {
      eventos.push({
        quando: prazo,
        tipo: 'sla',
        titulo: 'SLA definido — ' + String(oc.get('prioridade') || 'sem prioridade'),
        detalhe:
          'Responsável esperado: ' +
          (String(oc.get('responsavel_nome') || '') || 'a definir') +
          ' · Área: ' +
          (String(oc.get('area') || '') || 'não classificada'),
        autor: '',
      })
    }

    // Tratativas
    try {
      const trs = $app.findRecordsByFilter(
        'tratativas',
        'ocorrencia_id = {:id}',
        'created',
        500,
        0,
        { id: id },
      )
      for (let i = 0; i < trs.length; i++) {
        const t = trs[i]
        let autorNome = ''
        try {
          const a = $app.findRecordById('users', String(t.get('autor_id') || ''))
          autorNome = String(a.get('name') || '')
        } catch (_) {}
        eventos.push({
          quando: String(t.get('created') || ''),
          tipo: 'tratativa',
          titulo: 'Tratativa: ' + String(t.get('tipo') || 'observacao'),
          detalhe: String(t.get('descricao') || ''),
          autor: autorNome,
        })
      }
    } catch (_) {}

    // Lembretes de SLA
    try {
      const lems = $app.findRecordsByFilter(
        'lembretes',
        'ocorrencia_id = {:id}',
        'created',
        100,
        0,
        { id: id },
      )
      for (let i = 0; i < lems.length; i++) {
        eventos.push({
          quando: String(lems[i].get('created') || ''),
          tipo: 'lembrete',
          titulo: 'Lembrete automático (' + String(lems[i].get('destinatario_tipo') || '') + ')',
          detalhe: String(lems[i].get('mensagem') || ''),
          autor: String(lems[i].get('destinatario_nome') || ''),
        })
      }
    } catch (_) {}

    eventos.sort((a, b) => Date.parse(a.quando || '') - Date.parse(b.quando || ''))

    // Onde está parado agora
    const st = String(oc.get('status') || '')
    const STATUS_RESP = {
      nova: 'Supervisão (direcionar)',
      em_analise: 'Supervisão (analisar)',
      direcionada: String(oc.get('responsavel_nome') || '') || 'Responsável esperado (IA)',
      em_tratativa: String(oc.get('responsavel_nome') || '') || 'Responsável em ação',
      aguardando_loja: 'Loja',
      aguardando_industria: 'Indústria',
      aguardando_representante: 'Representante (autorizar)',
      resolvida: '—',
      cancelada: '—',
      improcedente: '—',
    }

    return e.json(200, {
      numero: oc.get('numero'),
      status: st,
      parado_com: STATUS_RESP[st] || st,
      area: String(oc.get('area') || ''),
      responsavel_esperado: String(oc.get('responsavel_nome') || ''),
      eventos: eventos,
    })
  },
  $apis.requireAuth(),
)
