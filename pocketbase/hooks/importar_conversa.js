// Importação de conversa exportada do WhatsApp (histórico do grupo de ocorrências).
// POST /backend/v1/ocorrencias/importar-conversa  { conversa: "texto do export" }
// Formato do export: "DD/MM/AAAA HH:MM - Autor: mensagem" (Android) ou
// "[DD/MM/AAAA HH:MM:SS] Autor: mensagem" (iOS); linhas sem timestamp continuam a msg anterior.
routerAdd(
  'POST',
  '/backend/v1/ocorrencias/importar-conversa',
  (e) => {
    const auth = e.auth
    const role = (auth && String(auth.get('role') || '')) || ''
    if (role !== 'admin' && role !== 'supervisao') {
      return e.json(403, { error: 'Apenas supervisão ou admin podem importar conversas.' })
    }

    const body = e.requestInfo().body || {}
    const conversa = String(body.conversa || '')
    if (!conversa.trim()) {
      return e.json(400, { error: 'Envie o texto da conversa exportada.' })
    }

    // 1) Divide a conversa em mensagens (timestamp + autor + texto)
    const linhas = conversa.split('\n')
    const reInicio =
      /^\[?(\d{1,2})\/(\d{1,2})\/(\d{2,4})[ ,]+(\d{1,2}):(\d{2})(?::(\d{2}))?\]?\s*[-–]\s*([^:]{1,60}):\s?([\s\S]*)$/
    const mensagens = []
    let atual = null
    for (let i = 0; i < linhas.length; i++) {
      const linha = linhas[i]
      const m = linha.match(reInicio)
      if (m) {
        if (atual) mensagens.push(atual)
        atual = {
          dia: m[1],
          mes: m[2],
          ano: m[3],
          hora: m[4] + ':' + m[5],
          autor: m[7].trim(),
          texto: m[8] || '',
        }
      } else if (atual) {
        atual.texto += '\n' + linha
      }
    }
    if (atual) mensagens.push(atual)

    if (mensagens.length === 0) {
      return e.json(400, {
        error:
          'Nenhuma mensagem reconhecida. Use a conversa exportada do WhatsApp (Opções do grupo > Mais > Exportar conversa).',
      })
    }

    // 2) Para cada mensagem com o modelo padrão, cria a ocorrência
    const pega = (texto, rotulos) => {
      const ls = texto.split('\n')
      for (let i = 0; i < ls.length; i++) {
        const linha = ls[i].toLowerCase()
        for (let j = 0; j < rotulos.length; j++) {
          if (linha.indexOf(rotulos[j]) !== -1) {
            const idx = linha.indexOf(':')
            if (idx === -1) continue
            const valor = ls[i].substring(idx + 1).trim()
            if (valor) return valor
          }
        }
      }
      return ''
    }

    const colOc = $app.findCollectionByNameOrId('ocorrencias')
    let numero = 1
    try {
      const ultimas = $app.findRecordsByFilter('ocorrencias', '', '-numero', 1, 0)
      if (ultimas && ultimas.length > 0) {
        numero = Number(ultimas[0].get('numero') || 0) + 1
      }
    } catch (_) {}

    const criadas = []
    let ignoradas = 0
    const LIMITE = 300

    for (let i = 0; i < mensagens.length && criadas.length < LIMITE; i++) {
      const m = mensagens[i]
      const texto = m.texto.trim()
      if (!texto) continue
      const baixo = texto.toLowerCase()
      const temModelo =
        baixo.indexOf('situacao') !== -1 ||
        baixo.indexOf('situação') !== -1 ||
        baixo.indexOf('ocorrencia') !== -1 ||
        baixo.indexOf('ocorrência') !== -1
      if (!temModelo) {
        ignoradas++
        continue
      }

      const repositor = pega(texto, ['repositor', 'promotor']) || m.autor
      const loja = pega(texto, ['loja'])
      const industria = pega(texto, ['industria', 'indústria', 'cliente'])
      const produto = pega(texto, ['produto'])
      const situacao = pega(texto, ['situa', 'ocorr', 'problema']) || texto.substring(0, 500)
      const acao = pega(texto, [
        'ja foi feito',
        'já foi feito',
        'acao realizada',
        'ação realizada',
        'o que foi feito',
      ])
      const contato = pega(texto, ['com quem falou', 'contato'])
      const apoioLinha = pega(texto, ['precisa de apoio', 'apoio'])
      const precisaApoio = apoioLinha ? /sim|yes|true/i.test(apoioLinha) : false

      let ano = m.ano
      if (ano.length === 2) ano = '20' + ano
      const dataOcorrencia =
        ano +
        '-' +
        m.mes.padStart(2, '0') +
        '-' +
        m.dia.padStart(2, '0') +
        ' ' +
        m.hora +
        ':00.000Z'

      // Classificação IA (falha silenciosa — importação continua)
      let categoria = ''
      let gravidade = ''
      let prioridade = ''
      try {
        const reply = $ai.chat({
          model: 'fast',
          messages: [
            {
              role: 'system',
              content:
                'Você classifica ocorrências de merchandising em supermercados e farmácias. ' +
                'Responda SOMENTE com um JSON válido, sem texto fora do JSON, no formato: ' +
                '{"categoria":"...","gravidade":"...","prioridade":"..."}. ' +
                'categoria: estrutura|ruptura|validade|avaria|reposicao|equipamento|atendimento|outro. ' +
                'gravidade: baixa|media|alta|critica. prioridade: baixa|media|alta|urgente.',
            },
            { role: 'user', content: 'Situação reportada: ' + situacao },
          ],
        })
        const t =
          (reply &&
            reply.choices &&
            reply.choices[0] &&
            reply.choices[0].message &&
            reply.choices[0].message.content) ||
          ''
        const mm = t.match(/\{[\s\S]*\}/)
        if (mm) {
          const j = JSON.parse(mm[0])
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
          if (cats.indexOf(j.categoria) !== -1) categoria = j.categoria
          if (gravs.indexOf(j.gravidade) !== -1) gravidade = j.gravidade
          if (pris.indexOf(j.prioridade) !== -1) prioridade = j.prioridade
        }
      } catch (err) {
        $app.logger().warn('import: IA falhou', 'error', String(err))
      }

      const horas =
        prioridade === 'urgente'
          ? 4
          : prioridade === 'alta'
            ? 24
            : prioridade === 'baixa'
              ? 168
              : 72
      const sla = new Date(Date.now() + horas * 3600000).toISOString().replace('T', ' ')

      try {
        const oc = new Record(colOc)
        oc.set('numero', numero)
        oc.set('data_ocorrencia', dataOcorrencia)
        oc.set('repositor_nome', repositor)
        oc.set('loja_nome', loja)
        oc.set('industria_nome', industria)
        oc.set('produto', produto)
        oc.set('situacao', situacao)
        oc.set('acao_realizada', acao)
        oc.set('contato_loja', contato)
        oc.set('precisa_apoio', precisaApoio)
        oc.set('categoria', categoria)
        oc.set('gravidade', gravidade)
        oc.set('prioridade', prioridade)
        if (prioridade) oc.set('status', 'direcionada')
        else oc.set('status', 'nova')
        oc.set('sla_prazo', sla)
        oc.set('origem', 'whatsapp')
        oc.set('mensagem_bruta', texto)
        oc.set('criado_por', auth && auth.id ? auth.id : '')
        $app.save(oc)
        criadas.push(numero)
        numero++
      } catch (err) {
        $app.logger().warn('import: falha ao criar ocorrencia', 'error', String(err))
        ignoradas++
      }
    }

    return e.json(200, {
      ok: true,
      mensagens_reconhecidas: mensagens.length,
      ocorrencias_criadas: criadas.length,
      numeros: criadas,
      ignoradas: ignoradas,
    })
  },
  $apis.requireAuth(),
)
