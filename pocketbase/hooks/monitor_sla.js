// Monitor IA de SLA — a IA acompanha as ocorrências abertas e gera lembretes
// para promotor/responsável conforme o SLA combinado, para nada ficar parado.
// O disparo real é por WhatsApp (Digisac) quando a conexão for concluída;
// até lá os lembretes ficam na fila com status pendente (visível na ocorrência).
//
// Lógica por ocorrência aberta (nova/em_analise/direcionada/em_tratativa/
// aguardando_*):
//   sem resposta nenhuma + SLA vencido            → lembrete URGENTE (1º)
//   sem resposta nenhuma + SLA vence em <24h      → lembrete de prazo
//   tratativas existem + última > SLA combinado   → lembrete de retorno
//   última tratativa > 2x SLA (ou 7 dias)         → escala: aguardando_industria
//   ocorrência com representante e sem autorização → lembrete p/ representante
// Anti-spam: 1 lembrete a cada 12h por ocorrência (lembretes_enviados + created).

var monitorSlaExecutando = false
cronAdd('monitor_sla_ia', '*/20 * * * *', () => {
  if (monitorSlaExecutando) return
  monitorSlaExecutando = true
  try {
    executarMonitor()
  } finally {
    monitorSlaExecutando = false
  }
})

function executarMonitor() {
  const agora = Date.now()
  const FECHADAS = ['resolvida', 'cancelada', 'improcedente']

  const ocs = $app.findRecordsByFilter('ocorrencias', '', '-numero', 2000, 0)
  const colTrat = $app.findCollectionByNameOrId('tratativas')
  const colLemb = $app.findCollectionByNameOrId('lembretes')

  // telefones por nome de promotor/representante (para o disparo futuro)
  const promotores = $app.findRecordsByFilter('promotores', '', '', 1000, 0)
  const telefonePromotor = {}
  for (let i = 0; i < promotores.length; i++) {
    telefonePromotor[
      String(promotores[i].get('nome') || '')
        .trim()
        .toLowerCase()
    ] = String(promotores[i].get('telefone') || '')
  }
  const representantes = $app.findRecordsByFilter('representantes', '', '', 1000, 0)
  const telefoneRepresentante = {}
  for (let i = 0, j = representantes.length; i < j; i++) {
    telefoneRepresentante[
      String(representantes[i].get('nome') || '')
        .trim()
        .toLowerCase()
    ] = String(representantes[i].get('telefone') || '')
  }

  let gerados = 0
  let escaladas = 0

  for (let i = 0; i < ocs.length; i++) {
    const oc = ocs[i]
    const st = String(oc.get('status') || '')
    if (FECHADAS.indexOf(st) !== -1) continue

    const prazo = String(oc.get('sla_prazo') || '')
    const temPrazo = prazo && prazo.indexOf('0001-01-01') === -1
    const prazoMs = temPrazo ? Date.parse(prazo) : 0

    // SLA combinado = prazo restante OU 72h quando não há prazo definido
    const slaMs = temPrazo ? prazoMs - agora : 72 * 3600000

    // última tratativa = última resposta registrada na ocorrência
    let ultima = 0
    let qtdTrat = 0
    try {
      const trs = $app.findRecordsByFilter(
        'tratativas',
        'ocorrencia_id = {:id}',
        '-created',
        1,
        0,
        { id: oc.id },
      )
      qtdTrat = trs.length
      if (trs.length > 0) {
        ultima = Date.parse(String(trs[0].get('created') || '')) || 0
      }
    } catch (_) {}

    // anti-spam: último lembrete desta ocorrência
    let ultimoLembrete = 0
    try {
      const lems = $app.findRecordsByFilter(
        'lembretes',
        'ocorrencia_id = {:id}',
        '-created',
        1,
        0,
        { id: oc.id },
      )
      if (lems.length > 0) {
        ultimoLembrete = Date.parse(String(lems[0].get('created') || '')) || 0
      }
    } catch (_) {}
    if (agora - ultimoLembrete < 12 * 3600000) continue // menos de 12h desde o último

    // destinatário: promotor (pelo nome) ou responsável (usuário do sistema)
    let destTipo = 'promotor'
    let destNome = String(oc.get('repositor_nome') || '')
    let destFone = telefonePromotor[destNome.trim().toLowerCase()] || ''
    const respId = String(oc.get('responsavel_id') || '')
    if (respId) {
      try {
        const resp = $app.findRecordById('users', respId)
        destTipo = 'responsavel'
        destNome = String(resp.get('name') || '')
        destFone = ''
      } catch (_) {}
    }

    const numOc = String(oc.get('numero') || '')
    const loja = String(oc.get('loja_nome') || '')
    let motivo = ''
    let acao = ''

    if (qtdTrat === 0 && temPrazo && prazoMs < agora) {
      motivo =
        'SLA vencido em ' + prazo.substring(0, 16).replace('T', ' ') + ' sem nenhuma resposta.'
      acao = 'Responder com a tratativa o quanto antes.'
    } else if (qtdTrat === 0 && temPrazo && prazoMs - agora < 24 * 3600000) {
      motivo = 'SLA vence em menos de 24h e a ocorrência segue sem resposta.'
      acao = 'Registrar a tratativa antes do prazo.'
    } else if (qtdTrat > 0 && ultima && agora - ultima > Math.max(slaMs, 24 * 3600000)) {
      motivo =
        'Última resposta foi em ' +
        new Date(ultima).toISOString().substring(0, 16).replace('T', ' ') +
        ' — passou do SLA combinado sem retorno.'
      acao = 'Dar retorno no acompanhamento da ocorrência.'
    } else if (qtdTrat > 0 && ultima && agora - ultima > Math.max(slaMs * 2, 7 * 24 * 3600000)) {
      // escala para a indústria quando o retorno dobra o SLA
      oc.set('status', 'aguardando_industria')
      $app.save(oc)
      escaladas++
      try {
        const tr = new Record(colTrat)
        tr.set('ocorrencia_id', oc.id)
        tr.set('tipo', 'observacao')
        tr.set(
          'descricao',
          'Monitor SLA: sem retorno além do dobro do SLA combinado. Ocorrência escalada para a indústria.',
        )
        $app.save(tr)
      } catch (_) {}
      continue
    } else {
      continue // nada a cobrar agora
    }

    // ocorrência com representante definido e ainda sem autorização → cobra o representante
    const repId = String(oc.get('representante_id') || '')
    const autRep = String(oc.get('autorizado_representante') || '')
    if (repId && !autRep) {
      try {
        const rep = $app.findRecordById('representantes', repId)
        destTipo = 'representante'
        destNome = String(rep.get('nome') || '')
        destFone = String(rep.get('telefone') || '')
        motivo = 'Troca aguardando autorização do representante há além do SLA.'
        acao = 'Autorizar ou recusar a troca na ocorrência #' + numOc + '.'
      } catch (_) {}
    }

    const msg =
      'Ocorrência #' +
      numOc +
      (loja ? ' — ' + loja : '') +
      ': ' +
      motivo +
      ' ' +
      acao +
      ' (Diretoria Promoções — monitor automático de SLA).'

    const lem = new Record(colLemb)
    lem.set('ocorrencia_id', oc.id)
    lem.set('destinatario_tipo', destTipo)
    lem.set('destinatario_nome', destNome)
    lem.set('destinatario_telefone', destFone)
    lem.set('mensagem', msg)
    lem.set('status', 'pendente')
    $app.save(lem)

    oc.set('lembretes_enviados', Number(oc.get('lembretes_enviados') || 0) + 1)
    $app.save(oc)
    gerados++
  }

  if (gerados > 0 || escaladas > 0) {
    $app.logger().info('monitor_sla_ia: ' + gerados + ' lembrete(s), ' + escaladas + ' escalada(s)')
  }
}

// helper para evitar warning de variável não usada
function monitor_sla_ref() {
  return monitorSlaExecutando
}
monitor_sla_ref()
