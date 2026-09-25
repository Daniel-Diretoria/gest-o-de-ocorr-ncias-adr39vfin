// Webhook do Digisac — recebe mensagens do WhatsApp em tempo real.
// URL para configurar no Digisac: <backend URL>/backend/v1/webhooks/digisac
// Autenticação: header x-webhook-token OU query ?token= com DIGISAC_WEBHOOK_TOKEN.
// Evento esperado: message.received (padrão Digisac Open API).
// A doc pública do Digisac não expõe o payload exato do webhook; o receptor é
// defensivo (variações prováveis) e grava o payload bruto completo — o formato
// real se confirma na 1ª mensagem (aba Mensagens WhatsApp) e a extração se ajusta.
routerAdd(
  'POST',
  '/backend/v1/webhooks/digisac',
  (e) => {
    const SECRET = $secrets.get('DIGISAC_WEBHOOK_TOKEN') || ''
    if (!SECRET) {
      return e.json(500, { error: 'DIGISAC_WEBHOOK_TOKEN nao configurado no projeto' })
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
    const evento = String(
      body.event ||
        body.eventType ||
        body.type ||
        (body.trigger && body.trigger.alias) ||
        'message.received',
    )

    // Só mensagens recebidas; envio/eco do próprio número é ignorado.
    if (
      evento.indexOf('message.received') === -1 &&
      evento.indexOf('received') === -1 &&
      evento !== 'chat' &&
      evento !== 'messages.upsert'
    ) {
      return e.json(200, { ok: true, ignored: evento })
    }

    // Payload defensivo: message pode vir em data.message, data, message ou direto no body.
    const msg = (body.data && (body.data.message || body.data)) || body.message || body
    const texto = String(
      msg.text || msg.body || msg.content || msg.mensagem || msg.messageText || '',
    )

    // Autor: Digisac usa ticket com contact; participant/number como fallback.
    const ticket = (body.data && body.data.ticket) || body.ticket || {}
    const contact = ticket.contact || body.contact || {}
    const remetente = String(
      contact.number ||
        contact.phone ||
        body.from ||
        msg.from ||
        (msg.user && msg.user.number) ||
        '',
    )
    const nomeRemetente = String(contact.name || msg.pushName || '')

    // Grupo: JID @g.us no chatId/number; campo isGroup quando existir.
    const chatId = String(ticket.chatId || contact.chatId || msg.chatId || ticket.number || '')
    const isGrupo =
      chatId.indexOf('@g.us') !== -1 ||
      chatId.indexOf('-') !== -1 ||
      String(msg.isGroup || body.isGroup || 'false') === 'true'

    // Grava a mensagem bruta sempre — rastreabilidade total.
    const col = $app.findCollectionByNameOrId('mensagens_whatsapp')
    const rec = new Record(col)
    rec.set('origem', 'digisac')
    rec.set('evento', evento)
    rec.set('remetente', remetente)
    rec.set('grupo', isGrupo ? String(ticket.subject || msg.groupName || '') || chatId : '')
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
      rec.set('ocorrencia_id', ocorrencia_id_fix(ocorrenciaId))
    } catch (err) {
      $app.logger().error('webhook digisac: falha ao criar ocorrencia', 'error', String(err))
      rec.set('erro', String(err))
    }

    $app.save(rec)
    return e.json(200, { ok: true, ocorrencia_id: ocorrenciaId, numero: numero })
  },
  // Sem requireAuth: autenticado pelo token próprio.
)

// helper mínimo para evitar warning de variável não usada
function ocorrencia_id_fix(id) {
  return id
}
