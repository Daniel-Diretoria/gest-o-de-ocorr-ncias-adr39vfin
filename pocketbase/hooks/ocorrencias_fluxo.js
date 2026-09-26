// Fase 2 — execução do fluxo: classificação IA, direcionamento com SLA,
// cobrança automática de pendências e dashboard.
// Regra do guia de hooks: helpers vivem DENTRO de cada callback (a callback
// roda em VM que não enxerga declarações de topo).

// ========= 1) Criação via API (frontend): numero, tratativa inicial =========
onRecordCreateRequest((e) => {
  const rec = e.record
  const body = e.requestInfo().body || {}

  // numero sequencial quando não veio do frontend
  let numero = Number(rec.get('numero') || body.numero || 0)
  if (!numero) {
    try {
      const ultimas = $app.findRecordsByFilter('ocorrencias', '', '-numero', 1, 0)
      numero = ultimas && ultimas.length > 0 ? Number(ultimas[0].get('numero') || 0) + 1 : 1
    } catch (_) {
      numero = 1
    }
    rec.set('numero', numero)
  }

  e.next()

  // Tratativa inicial opcional enviada junto da criação (body._tratativa)
  const t = body._tratativa
  if (t && t.descricao) {
    try {
      const col = $app.findCollectionByNameOrId('tratativas')
      const tr = new Record(col)
      tr.set('ocorrencia_id', rec.id)
      tr.set('autor_id', e.auth && e.auth.id ? e.auth.id : '')
      tr.set('tipo', t.tipo || 'observacao')
      tr.set('descricao', String(t.descricao).slice(0, 5000))
      $app.save(tr)
    } catch (err) {
      $app.logger().warn('tratativa inicial falhou', 'error', String(err))
    }
  }
}, 'ocorrencias')

// ========= 2) Atualização via API: guardas de status e fechamento com histórico =========
onRecordUpdateRequest((e) => {
  const rec = e.record
  const body = e.requestInfo().body || {}
  // e.record já chega com o body aplicado — o status ORIGINAL vem do banco
  let atual = ''
  try {
    atual = String($app.findRecordById('ocorrencias', rec.id).get('status') || '')
  } catch (_) {
    atual = String(rec.get('status') || '')
  }
  const novo = String(body.status || atual)

  const FECHADAS = ['resolvida', 'cancelada', 'improcedente']

  // Ocorrência fechada não reabre — histórico preservado
  if (FECHADAS.indexOf(atual) !== -1 && novo !== atual) {
    return e.json(400, {
      error:
        'Ocorrência ' +
        atual +
        ' não muda de status. Registre uma nova ocorrência para tratar o caso de novo.',
    })
  }

  // Resolver exige tratativa registrada — campo furado não fecha
  if (novo === 'resolvida' && atual !== 'resolvida') {
    const trs = $app.findRecordsByFilter('tratativas', 'ocorrencia_id = {:id}', '-created', 1, 0, {
      id: rec.id,
    })
    if (!trs || trs.length === 0) {
      return e.json(400, {
        error:
          'Registre uma tratativa (contato, ação ou evidência) antes de marcar como resolvida.',
      })
    }
    rec.set('resolvida_em', new Date().toISOString())
    const inicio = new Date(
      rec.get('data_ocorrencia') || rec.get('created') || Date.now(),
    ).getTime()
    rec.set('tempo_resolucao_min', Math.round((Date.now() - inicio) / 60000))
  }

  e.next()
}, 'ocorrencias')

// ========= 3) Direcionar: define responsável, SLA e classificação (supervisão/admin) =========
routerAdd(
  'POST',
  '/backend/v1/ocorrencias/{id}/direcionar',
  (e) => {
    const auth = e.auth
    const role = (auth && String(auth.get('role') || '')) || ''
    if (role !== 'admin' && role !== 'supervisao') {
      return e.json(403, { error: 'Apenas supervisão ou admin podem direcionar.' })
    }

    const id = e.request.pathValue('id')
    let oc
    try {
      oc = $app.findRecordById('ocorrencias', id)
    } catch (_) {
      return e.json(404, { error: 'Ocorrência não encontrada.' })
    }

    const FECHADAS = ['resolvida', 'cancelada', 'improcedente']
    if (FECHADAS.indexOf(String(oc.get('status') || '')) !== -1) {
      return e.json(400, { error: 'Ocorrência fechada não pode ser direcionada.' })
    }

    const body = e.requestInfo().body || {}
    if (body.responsavel_id) {
      try {
        $app.findRecordById('users', String(body.responsavel_id))
      } catch (_) {
        return e.json(400, { error: 'Responsável inválido.' })
      }
      oc.set('responsavel_id', String(body.responsavel_id))
    }
    if (body.sla_prazo) oc.set('sla_prazo', String(body.sla_prazo))
    if (body.prioridade) oc.set('prioridade', String(body.prioridade))
    if (body.gravidade) oc.set('gravidade', String(body.gravidade))
    if (body.visibilidade) oc.set('visibilidade', String(body.visibilidade))
    if (body.categoria) oc.set('categoria', String(body.categoria))
    oc.set('status', 'direcionada')
    $app.save(oc)

    // Tratativa de direcionamento — histórico do fluxo
    try {
      const col = $app.findCollectionByNameOrId('tratativas')
      const tr = new Record(col)
      tr.set('ocorrencia_id', oc.id)
      tr.set('autor_id', auth && auth.id ? auth.id : '')
      tr.set('tipo', 'acao')
      tr.set(
        'descricao',
        'Ocorrência direcionada' +
          (body.responsavel_id ? ' com responsável definido' : '') +
          ' e SLA iniciado.',
      )
      $app.save(tr)
    } catch (err) {
      $app.logger().warn('tratativa de direcionamento falhou', 'error', String(err))
    }

    return e.json(200, { ok: true, id: oc.id })
  },
  $apis.requireAuth(),
)

// ========= 4) Sugerir classificação com IA (revisão humana antes de aplicar) =========
routerAdd(
  'POST',
  '/backend/v1/ocorrencias/{id}/sugerir-classificacao',
  (e) => {
    const auth = e.auth
    const role = (auth && String(auth.get('role') || '')) || ''
    if (role !== 'admin' && role !== 'supervisao') {
      return e.json(403, { error: 'Apenas supervisão ou admin podem pedir sugestão.' })
    }

    const id = e.request.pathValue('id')
    let oc
    try {
      oc = $app.findRecordById('ocorrencias', id)
    } catch (_) {
      return e.json(404, { error: 'Ocorrência não encontrada.' })
    }

    const partes = []
    if (oc.get('situacao')) partes.push('Situação: ' + oc.get('situacao'))
    if (oc.get('produto')) partes.push('Produto: ' + oc.get('produto'))
    if (oc.get('acao_realizada')) partes.push('O que já foi feito: ' + oc.get('acao_realizada'))
    if (oc.get('loja_nome')) partes.push('Loja: ' + oc.get('loja_nome'))
    if (oc.get('industria_nome')) partes.push('Indústria: ' + oc.get('industria_nome'))
    if (partes.length === 0) {
      return e.json(400, { error: 'Ocorrência sem conteúdo para classificar.' })
    }

    const reply = $ai.chat({
      model: 'fast',
      messages: [
        {
          role: 'system',
          content:
            'Você classifica ocorrências de merchandising em supermercados e farmácias. ' +
            'Responda SOMENTE com um JSON válido, sem texto fora do JSON, no formato: ' +
            '{"categoria":"...","gravidade":"...","prioridade":"...","visibilidade":"...","justificativa":"..."}. ' +
            'categoria: estrutura|ruptura|validade|avaria|reposicao|equipamento|atendimento|operacional|outro ' +
            '(operacional = problema da LOJA/OPERAÇÃO que afeta o setor todo, sem indústria específica). ' +
            'gravidade: baixa|media|alta|critica. prioridade: baixa|media|alta|urgente. ' +
            'visibilidade: interno|representante|industria. justificativa: 1 frase curta.',
        },
        { role: 'user', content: partes.join(' | ') },
      ],
    })

    const texto =
      (reply &&
        reply.choices &&
        reply.choices[0] &&
        reply.choices[0].message &&
        reply.choices[0].message.content) ||
      ''
    const m = texto.match(/\{[\s\S]*\}/)
    if (!m) {
      return e.json(502, { error: 'IA não devolveu classificação válida. Tente novamente.' })
    }
    let j
    try {
      j = JSON.parse(m[0])
    } catch (err) {
      return e.json(502, { error: 'IA não devolveu classificação válida. Tente novamente.' })
    }
    return e.json(200, { sugestao: j })
  },
  $apis.requireAuth(),
)

// ========= 5) Dashboard: números do fluxo para a supervisão =========
routerAdd(
  'GET',
  '/backend/v1/dashboard',
  (e) => {
    const ocs = $app.findRecordsByFilter('ocorrencias', '', '-numero', 10000, 0)
    const trs = $app.findRecordsByFilter('tratativas', '', '-created', 20000, 0)

    const inds = $app.findRecordsByFilter('industrias', '', '-created', 1000, 0)
    const indNome = {}
    for (let i = 0; i < inds.length; i++) indNome[inds[i].id] = String(inds[i].get('nome') || '')
    const ljs = $app.findRecordsByFilter('lojas', '', '-created', 5000, 0)
    const ljsNome = {}
    for (let i = 0; i < ljs.length; i++) ljsNome[ljs[i].id] = String(ljs[i].get('nome') || '')

    const FECHADAS = ['resolvida', 'cancelada', 'improcedente']
    const agora = Date.now()

    // primeira tratativa por ocorrência — tempo de primeira ação
    const primeiraAcao = {}
    for (let i = 0; i < trs.length; i++) {
      const oid = String(trs[i].get('ocorrencia_id') || '')
      if (!oid) continue
      const c = Date.parse(String(trs[i].get('created') || ''))
      if (!c) continue
      if (!primeiraAcao[oid] || c < primeiraAcao[oid]) primeiraAcao[oid] = c
    }

    let abertas = 0
    let resolvidas = 0
    let foraSla = 0
    let proximas24 = 0
    let semPrazo = 0
    let apoio = 0
    let somaResol = 0
    let nResol = 0
    let noPrazo = 0
    let comPrazo = 0
    let somaAcao = 0
    let nAcao = 0
    const porStatus = {}
    const porCategoria = {}
    const porIndustria = {}
    const porArea = {}
    const porResponsavel = {}
    const respPend = {}
    const pendencias = []

    for (let i = 0; i < ocs.length; i++) {
      const o = ocs[i]
      const st = String(o.get('status') || '')
      porStatus[st] = (porStatus[st] || 0) + 1
      const aberta = FECHADAS.indexOf(st) === -1

      if (aberta) {
        abertas++
        const prazo = o.get('sla_prazo') ? String(o.get('sla_prazo')) : ''
        let atrasada = false
        if (!prazo) {
          semPrazo++
        } else {
          const p = Date.parse(prazo)
          if (p && p < agora) {
            foraSla++
            atrasada = true
          } else if (p && p - agora < 86400000) {
            proximas24++
          }
        }
        if (o.get('precisa_apoio')) apoio++

        const cat = String(o.get('categoria') || '') || 'sem_classificacao'
        porCategoria[cat] = (porCategoria[cat] || 0) + 1

        const ind =
          String(o.get('industria_nome') || '') ||
          indNome[String(o.get('industria_id') || '')] ||
          ''
        if (ind) porIndustria[ind] = (porIndustria[ind] || 0) + 1

        if (atrasada) {
          pendencias.push({
            id: o.id,
            numero: Number(o.get('numero') || 0),
            loja: String(o.get('loja_nome') || '') || ljsNome[String(o.get('loja_id') || '')] || '',
            industria: ind,
            status: st,
            prazo: prazo,
            situacao: String(o.get('situacao') || '').slice(0, 140),
          })
        }
      } else if (st === 'resolvida') {
        resolvidas++
        const t = Number(o.get('tempo_resolucao_min') || 0)
        if (t > 0) {
          somaResol += t
          nResol++
        }
        const prazo = o.get('sla_prazo') ? String(o.get('sla_prazo')) : ''
        const re = o.get('resolvida_em') ? String(o.get('resolvida_em')) : ''
        if (prazo && re) {
          comPrazo++
          if (Date.parse(re) <= Date.parse(prazo)) noPrazo++
        }
      }

      const pa = primeiraAcao[o.id]
      if (pa) {
        const cri = Date.parse(String(o.get('created') || ''))
        if (cri && pa >= cri) {
          somaAcao += (pa - cri) / 60000
          nAcao++
        }
      }
    }

    pendencias.sort((a, b) => Date.parse(a.prazo || '') - Date.parse(b.prazo || ''))
    const topIndustrias = Object.keys(porIndustria)
      .map((nome) => ({ nome: nome, qtd: porIndustria[nome] }))
      .sort((a, b) => b.qtd - a.qtd)
      .slice(0, 8)

    return e.json(200, {
      abertas: abertas,
      resolvidas: resolvidas,
      fora_sla: foraSla,
      proximas_24h: proximas24,
      sem_prazo: semPrazo,
      apoio: apoio,
      resolvidas_no_prazo: noPrazo,
      resolvidas_com_prazo: comPrazo,
      tempo_medio_primeira_acao_min: nAcao > 0 ? Math.round(somaAcao / nAcao) : null,
      tempo_medio_resolucao_min: nResol > 0 ? Math.round(somaResol / nResol) : null,
      por_status: porStatus,
      por_categoria: porCategoria,
      por_industria: topIndustrias,
      por_area: porArea,
      por_responsavel: Object.keys(porResponsavel)
        .map((nome) => ({
          responsavel: nome,
          abertas: porResponsavel[nome],
          fora_sla: (respPend[nome] && respPend[nome].fora_sla) || 0,
        }))
        .sort((a, b) => b.abertas - a.abertas),
      pendencias: pendencias.slice(0, 10),
    })
  },
  $apis.requireAuth(),
)

// ========= 6) Hook de modelo: IA + SLA + direcionamento em TODA criação
// (request do frontend E gravação direta do webhook da Umbler Talk) =========
onRecordCreate((e) => {
  const rec = e.record

  const situacao = String(rec.get('situacao') || '')
  const categoria = String(rec.get('categoria') || '')

  if (!categoria && situacao) {
    try {
      // Few-shot: últimos exemplos corrigidos pela supervisão — a IA aprende
      // o padrão da casa (ex.: sem indústria e afeta o setor = operacional).
      let exemplos = ''
      try {
        const ts = $app.findRecordsByFilter('ia_treino', '', '-created', 10, 0)
        for (let i = 0; i < ts.length; i++) {
          exemplos +=
            'Situação: ' +
            String(ts[i].get('situacao') || '').slice(0, 200) +
            ' => categoria: ' +
            String(ts[i].get('categoria') || '') +
            ', gravidade: ' +
            String(ts[i].get('gravidade') || '') +
            ', prioridade: ' +
            String(ts[i].get('prioridade') || '') +
            '\n'
        }
      } catch (_) {}
      const reply = $ai.chat({
        model: 'fast',
        messages: [
          {
            role: 'system',
            content:
              'Você classifica ocorrências de merchandising em supermercados e farmácias. ' +
              'Responda SOMENTE com um JSON válido, sem texto fora do JSON, no formato: ' +
              '{"categoria":"...","gravidade":"...","prioridade":"..."}. ' +
              'categoria: estrutura|ruptura|validade|avaria|reposicao|equipamento|atendimento|operacional|outro ' +
              '(operacional = problema da LOJA/OPERAÇÃO que afeta o setor todo, sem indústria específica — ' +
              'ex.: empilhador quebrado, fila para descarregar, sistema da loja fora do ar, acesso demorado). ' +
              'gravidade: baixa|media|alta|critica. prioridade: baixa|media|alta|urgente. ' +
              (exemplos
                ? 'Exemplos já corrigidos pela supervisão desta empresa (siga este padrão):\n' +
                  exemplos
                : ''),
          },
          { role: 'user', content: 'Situação reportada: ' + situacao },
        ],
      })
      const texto =
        (reply &&
          reply.choices &&
          reply.choices[0] &&
          reply.choices[0].message &&
          reply.choices[0].message.content) ||
        ''
      const m = texto.match(/\{[\s\S]*\}/)
      if (m) {
        const j = JSON.parse(m[0])
        const cats = [
          'estrutura',
          'ruptura',
          'validade',
          'avaria',
          'reposicao',
          'equipamento',
          'atendimento',
          'outro',
        ]
        const gravs = ['baixa', 'media', 'alta', 'critica']
        const pris = ['baixa', 'media', 'alta', 'urgente']
        if (cats.indexOf(j.categoria) !== -1) rec.set('categoria', j.categoria)
        if (gravs.indexOf(j.gravidade) !== -1) rec.set('gravidade', j.gravidade)
        if (pris.indexOf(j.prioridade) !== -1) rec.set('prioridade', j.prioridade)
      }
    } catch (err) {
      $app.logger().warn('classificacao IA falhou (modelo)', 'error', String(err))
    }
  }

  const prazoAtual = String(rec.get('sla_prazo') || '')
  if (!prazoAtual || prazoAtual.indexOf('0001-01-01') !== -1) {
    const p = String(rec.get('prioridade') || '')
    const horas = p === 'urgente' ? 4 : p === 'alta' ? 24 : p === 'baixa' ? 168 : 72
    rec.set('sla_prazo', new Date(Date.now() + horas * 3600000).toISOString().replace('T', ' '))
  }

  const st = String(rec.get('status') || 'nova')
  if ((st === 'nova' || !st) && String(rec.get('prioridade') || '')) {
    rec.set('status', 'direcionada')
  }

  // IO — área + responsável esperado: a IA lê a situação com as regras do
  // Daniel (quem responde pelo quê) e grava em area/responsavel_nome.
  if (!String(rec.get('area') || '') && situacao) {
    try {
      const replyArea = $ai.chat({
        model: 'fast',
        messages: [
          {
            role: 'system',
            content:
              'Você direciona ocorrências de merchandising por ÁREA de responsabilidade. ' +
              'Responda SOMENTE com JSON: {"area":"...","responsavel":"..."}. ' +
              'Áreas e responsáveis (siga EXATAMENTE): ' +
              'io (Rhuan) = trocas, validades, rupturas, estoque virtual, relatórios — tudo de Inteligência Operacional; ' +
              'operacao_loja (Fernando) = empilhadeira/empilhador, paletes, câmara fria, desorganização de loja, abastecimento demorado, fila; ' +
              'merchandising (Felipe) = Splash, precificação, cartaz, encarte, ação de merchandising, conexão loja-indústria; ' +
              'pontos_extras (Gabriel Oliveira, Gabriel Luz e Arthur) = ponto extra, aumento de espaço, ganhos no PDV; ' +
              'acesso_loja (Carol) = QR Code, Betina, entrada e saída em loja, crachá; ' +
              'outro = não se encaixa. ' +
              'Regra: problema da LOJA que afeta o setor todo e não pertence a ninguém acima = operacao_loja.',
          },
          { role: 'user', content: 'Situação: ' + situacao.slice(0, 800) },
        ],
      })
      const tA =
        (replyArea &&
          replyArea.choices &&
          replyArea.choices[0] &&
          replyArea.choices[0].message &&
          replyArea.choices[0].message.content) ||
        ''
      const mA = tA.match(/\{[\s\S]*\}/)
      if (mA) {
        const jA = JSON.parse(mA[0])
        const areas = [
          'io',
          'operacao_loja',
          'merchandising',
          'pontos_extras',
          'acesso_loja',
          'outro',
        ]
        if (areas.indexOf(jA.area) !== -1) rec.set('area', jA.area)
        if (jA.responsavel) rec.set('responsavel_nome', String(jA.responsavel).slice(0, 120))
      }
    } catch (err) {
      $app.logger().warn('IA de área falhou', 'error', String(err))
    }
  }

  e.next()
}, 'ocorrencias')

// ========= 7) Cobrança automática: SLA vencido em tratativa escala para a indústria =========
cronAdd('cobranca_sla', '*/30 * * * *', () => {
  const limite = new Date().toISOString().replace('T', ' ')
  let vencidas = []
  try {
    vencidas = $app.findRecordsByFilter(
      'ocorrencias',
      "status = 'em_tratativa' && sla_prazo < '" + limite + "'",
      '-sla_prazo',
      100,
      0,
    )
  } catch (err) {
    $app.logger().error('cobranca_sla: falha ao buscar vencidas', 'error', String(err))
    return
  }

  let escaladas = 0
  for (let i = 0; i < vencidas.length; i++) {
    const v = vencidas[i]
    try {
      v.set('status', 'aguardando_industria')
      $app.save(v)

      const col = $app.findCollectionByNameOrId('tratativas')
      const tr = new Record(col)
      tr.set('ocorrencia_id', v.id)
      tr.set('tipo', 'observacao')
      tr.set(
        'descricao',
        'SLA vencido em ' +
          String(v.get('sla_prazo') || '') +
          ' sem resolução. Cobrança automática: ocorrência escalada para a indústria.',
      )
      $app.save(tr)
      escaladas++
    } catch (err) {
      $app.logger().warn('cobranca_sla: falha ao escalar', 'id', v.id, 'error', String(err))
    }
  }
  if (escaladas > 0) {
    $app.logger().info('cobranca_sla', 'escaladas', String(escaladas))
  }
})
