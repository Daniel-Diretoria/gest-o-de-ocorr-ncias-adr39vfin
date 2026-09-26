// Fluxo de autorização de troca: representante autoriza/recusa → indústria.
// POST /backend/v1/ocorrencias/{id}/autorizar-representante  { acao: 'autorizar'|'recusar', nota? }
// Regra do Daniel: ocorrência (principalmente de troca) vai primeiro para o
// representante; depois que ele autorizar, segue para a indústria.
routerAdd(
  'POST',
  '/backend/v1/ocorrencias/{id}/autorizar-representante',
  (e) => {
    const auth = e.auth
    const role = (auth && String(auth.get('role') || '')) || ''
    if (role !== 'admin' && role !== 'supervisao' && role !== 'representante') {
      return e.json(403, { error: 'Sem permissão para autorizar.' })
    }

    const id = e.request.pathValue('id')
    let oc
    try {
      oc = $app.findRecordById('ocorrencias', id)
    } catch (_) {
      return e.json(404, { error: 'Ocorrência não encontrada.' })
    }

    const body = e.requestInfo().body || {}
    const acao = String(body.acao || '')
    if (acao !== 'autorizar' && acao !== 'recusar') {
      return e.json(400, { error: "acao deve ser 'autorizar' ou 'recusar'." })
    }

    const FECHADAS = ['resolvida', 'cancelada', 'improcedente']
    if (FECHADAS.indexOf(String(oc.get('status') || '')) !== -1) {
      return e.json(400, { error: 'Ocorrência fechada.' })
    }

    if (acao === 'autorizar') {
      oc.set('autorizado_representante', new Date().toISOString().replace('T', ' '))
      // autorizado → segue para a indústria (acompanhamento) ou volta à tratativa
      if (oc.get('acompanhamento_industria')) {
        oc.set('status', 'aguardando_industria')
      } else {
        oc.set('status', 'em_tratativa')
      }
    } else {
      oc.set('status', 'em_tratativa')
    }
    $app.save(oc)

    // histórico da decisão
    try {
      const col = $app.findCollectionByNameOrId('tratativas')
      const tr = new Record(col)
      tr.set('ocorrencia_id', oc.id)
      tr.set('autor_id', auth && auth.id ? auth.id : '')
      tr.set('tipo', 'retorno')
      tr.set(
        'descricao',
        (acao === 'autorizar'
          ? 'Representante AUTORIZOU a troca.'
          : 'Representante RECUSOU a troca.') +
          (body.nota ? ' Nota: ' + String(body.nota).slice(0, 500) : ''),
      )
      $app.save(tr)
    } catch (err) {
      $app.logger().warn('autorizar-representante: tratativa falhou', 'error', String(err))
    }

    return e.json(200, {
      ok: true,
      status: String(oc.get('status') || ''),
      autorizado: acao === 'autorizar',
    })
  },
  $apis.requireAuth(),
)
