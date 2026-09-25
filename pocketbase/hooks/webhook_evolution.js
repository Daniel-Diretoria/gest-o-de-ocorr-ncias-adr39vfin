// Webhook da Evolution API — recebe mensagens do WhatsApp em tempo real.
// URL para configurar na Evolution: <backend URL>/backend/v1/webhooks/whatsapp
// Autenticação: header x-webhook-token OU query ?token= com EVOLUTION_WEBHOOK_TOKEN.
// Formato esperado: evento messages.upsert (padrão Evolution API).
routerAdd(
  'POST',
  '/backend/v1/webhooks/whatsapp',
  (e) => {
    const SECRET = $secrets.get('EVOLUTION_WEBHOOK_TOKEN') || ''
    if (!SECRET) {
      return e.json(500, { error: 'EVOLUTION_WEBHOOK_TOKEN nao configurado no projeto' })
    }

    const info = e.requestInfo()
    const headers = info.headers || {}
    const query = info.query || {}
    const token =
      headers['x_webhook_token'] ||
      headers['x-webhook-token'] ||
      headers['X-Webhook-Token'] ||
      headers['X_WEBHOOK_TOKEN'] ||
      query.token ||
      ''
    if (token !== SECRET) {
      return e.unauthorizedError('Token invalido')
    }

    const body = info.body || {}
    const evento = String(body.event || '')
    const dados = body.data || {}

    if (evento !== 'messages.upsert') {
      return e.json(200, { ok: true, ignored: evento || 'sem_evento' })
    }

    const msg = (dados.data && dados.data.messages) || {}
    const key = msg.key || {}

    if (key.remoteJid === 'status@broadcast') {
      return e.json(200, { ok: true, ignored: 'status' })
    }
    if (key.fromMe) {
      return e.json(200, { ok: true, ignored: 'fromMe' })
    }

    const texto = String(
      (msg.message &&
        (msg.message.conversation ||
          (msg.message.extendedTextMessage && msg.message.extendedTextMessage.text))) ||
        '',
    )

    const remetente = String(key.participant || key.remoteJid || '')
    const chatId = String(key.remoteJid || '')
    const isGrupo = chatId.indexOf('@g.us') !== -1

    // Grava a mensagem bruta sempre — rastreabilidade total.
    const col = $app.findCollectionByNameOrId('mensagens_whatsapp')
    const rec = new Record(col)
    rec.set('origem', 'evolution_api')
    rec.set('evento', evento)
    rec.set('remetente', remetente)
    rec.set('grupo', isGrupo ? chatId : '')
    rec.set('conteudo', texto)
    rec.set('payload', body)
    rec.set('processada', false)

    // Modo grupo de ocorrências: só mensagem de GRUPO com o modelo padrão
    // vira ocorrência — conversa direta e papo solto ficam só no registro bruto.
    const baixo = texto.toLowerCase()
    const temModelo =
      baixo.indexOf('situacao') !== -1 ||
      baixo.indexOf('situação') !== -1 ||
      baixo.indexOf('ocorrencia') !== -1 ||
      baixo.indexOf('ocorrência') !== -1
    if (!isGrupo || !temModelo) {
      $app.save(rec)
      return e.json(200, {
        ok: true,
        ignorada: true,
        motivo: !isGrupo ? 'nao_e_grupo' : 'sem_modelo',
      })
    }

    const linhas = texto.split('\n')
    const pega = (rotulos) => {
      for (let i = 0; i < linhas.length; i++) {
        const linha = linhas[i].toLowerCase()
        for (let j = 0; j < rotulos.length; j++) {
          if (linha.indexOf(rotulos[j]) !== -1) {
            const idx = linha.indexOf(':')
            if (idx === -1) continue
            const valor = linhas[i].substring(idx + 1).trim()
            if (valor) return valor
          }
        }
      }
      return ''
    }

    const dataStr = pega(['data'])
    const repositor = pega(['repositor', 'promotor'])
    const loja = pega(['loja'])
    const industria = pega(['industria', 'indústria', 'cliente'])
    const produto = pega(['produto'])
    const situacao = pega(['situa', 'ocorr', 'problema'])
    const acao = pega([
      'ja foi feito',
      'já foi feito',
      'acao realizada',
      'ação realizada',
      'o que foi feito',
    ])
    const contato = pega(['com quem falou', 'contato'])
    const apoioLinha = pega(['precisa de apoio', 'apoio'])
    const precisaApoio = apoioLinha ? /sim|yes|true/i.test(apoioLinha) : false

    let dataOcorrencia = new Date().toISOString().replace('T', ' ')
    if (dataStr) {
      const m = dataStr.match(/(\d{2})\/(\d{2})\/(\d{4})/)
      if (m) {
        dataOcorrencia = m[3] + '-' + m[2] + '-' + m[1] + ' 12:00:00.000Z'
      }
    }

    let numero = 1
    try {
      const ultimas = $app.findRecordsByFilter('ocorrencias', '', '-numero', 1, 0)
      if (ultimas && ultimas.length > 0) {
        numero = (ultimas[0].get('numero') || 0) + 1
      }
    } catch (_) {}

    let ocorrenciaId = ''
    try {
      const colOc = $app.findCollectionByNameOrId('ocorrencias')
      const oc = new Record(colOc)
      oc.set('numero', numero)
      oc.set('data_ocorrencia', dataOcorrencia)
      oc.set('repositor_nome', repositor)
      oc.set('loja_nome', loja)
      oc.set('industria_nome', industria)
      oc.set('produto', produto)
      oc.set('situacao', situacao || texto.substring(0, 500))
      oc.set('acao_realizada', acao)
      oc.set('contato_loja', contato)
      oc.set('precisa_apoio', precisaApoio)
      oc.set('status', 'nova')
      oc.set('origem', 'whatsapp')
      oc.set('mensagem_bruta', texto)
      $app.save(oc)
      ocorrenciaId = oc.id
      rec.set('processada', true)
      rec.set('ocorrencia_id', ocorrenciaId)
    } catch (err) {
      $app.logger().error('webhook evolution: falha ao criar ocorrencia', 'error', String(err))
      rec.set('erro', String(err))
    }

    $app.save(rec)
    return e.json(200, { ok: true, ocorrencia_id: ocorrenciaId, numero: numero })
  },
  // Sem requireAuth: o webhook é autenticado pelo token próprio.
)
