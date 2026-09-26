// Treino da IA: quando supervisão/admin corrige a classificação de uma
// ocorrência (categoria/gravidade/prioridade), grava um exemplo em ia_treino.
// A classificação IA (criação e sugestão) usa os últimos exemplos corrigidos
// como few-shot — a IA aprende o padrão da casa conforme vocês direcionam.
// Tudo inline nos callbacks (escopo do JSVM).

// 1) Correção de classificação → exemplo de treino
onRecordUpdateRequest((e) => {
  const rec = e.record
  const body = e.requestInfo().body || {}
  const role = (e.auth && String(e.auth.get('role') || '')) || ''
  if (role !== 'admin' && role !== 'supervisao') {
    e.next()
    return
  }

  const mudou = ['categoria', 'gravidade', 'prioridade'].some((c) => {
    const novo = body[c]
    return novo !== undefined && novo !== null && String(novo) !== ''
  })
  if (!mudou || !String(rec.get('situacao') || '')) {
    e.next()
    return
  }

  try {
    const col = $app.findCollectionByNameOrId('ia_treino')
    const t = new Record(col)
    t.set('ocorrencia_id', rec.id)
    t.set('situacao', String(rec.get('situacao') || '').slice(0, 2000))
    t.set('categoria', String(body.categoria || rec.get('categoria') || ''))
    t.set('gravidade', String(body.gravidade || rec.get('gravidade') || ''))
    t.set('prioridade', String(body.prioridade || rec.get('prioridade') || ''))
    t.set('industria_nome', String(rec.get('industria_nome') || ''))
    t.set('corrigido_por', e.auth && e.auth.id ? e.auth.id : '')
    $app.save(t)
  } catch (err) {
    $app.logger().warn('ia_treino: falha ao gravar exemplo', 'error', String(err))
  }
  e.next()
}, 'ocorrencias')

// 2) Contador de exemplos (para acompanhar o aprendizado)
routerAdd(
  'POST',
  '/backend/v1/ia/treino-stats',
  (e) => {
    const role = (e.auth && String(e.auth.get('role') || '')) || ''
    if (role !== 'admin' && role !== 'supervisao') {
      return e.json(403, { error: 'Sem permissão.' })
    }
    const n = $app.findRecordsByFilter('ia_treino', '', '-created', 500, 0).length
    return e.json(200, { exemplos: n })
  },
  $apis.requireAuth(),
)
