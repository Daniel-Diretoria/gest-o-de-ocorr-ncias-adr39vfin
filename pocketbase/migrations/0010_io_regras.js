// IO — Inteligência Operacional: área da ocorrência, responsável esperado
// (regras do Daniel), visibilidade múltipla e coleção de regras de
// direcionamento que a IA usa para mensurar os responsáveis.
migrate(
  (app) => {
    const ocorrencias = app.findCollectionByNameOrId('ocorrencias')
    if (!ocorrencias.fields.getByName('area')) {
      ocorrencias.fields.add(
        new SelectField({
          name: 'area',
          values: ['io', 'operacao_loja', 'merchandising', 'pontos_extras', 'acesso_loja', 'outro'],
          maxSelect: 1,
        }),
      )
    }
    if (!ocorrencias.fields.getByName('responsavel_nome')) {
      ocorrencias.fields.add(new TextField({ name: 'responsavel_nome' }))
    }
    if (!ocorrencias.fields.getByName('visibilidade_multi')) {
      ocorrencias.fields.add(
        new SelectField({
          name: 'visibilidade_multi',
          values: ['interno', 'representante', 'industria'],
          maxSelect: 3,
        }),
      )
    }
    app.save(ocorrencias)

    // Regras de direcionamento (palavras-chave → área → responsável esperado)
    const regras = new Collection({
      name: 'regras_direcionamento',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule:
        "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'supervisao')",
      updateRule:
        "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'supervisao')",
      deleteRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
      fields: [
        {
          name: 'area',
          type: 'select',
          values: ['io', 'operacao_loja', 'merchandising', 'pontos_extras', 'acesso_loja', 'outro'],
          maxSelect: 1,
          required: true,
        },
        { name: 'palavras_chave', type: 'text', required: true },
        { name: 'responsavel_nome', type: 'text', required: true },
        { name: 'descricao', type: 'text' },
        { name: 'ativa', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_regras_area ON regras_direcionamento (area)'],
    })
    app.save(regras)

    // Seed — regras definidas pelo Daniel (26/09)
    const seeds = [
      {
        area: 'io',
        palavras_chave:
          'troca,trocas,validade,validades,ruptura,rupturas,estoque virtual,relatorio,IO',
        responsavel_nome: 'Rhuan',
        descricao: 'IO — Inteligência Operacional: trocas, validades, rupturas e relatórios',
      },
      {
        area: 'operacao_loja',
        palavras_chave:
          'empilhadeira,empilhador,palete,paletes,camera fria,camara,desorganizacao,abastecimento,fila,loja desorganizada,limpeza,freezer desligado',
        responsavel_nome: 'Fernando',
        descricao: 'Operação de loja: empilhadeira, produtos, desorganização',
      },
      {
        area: 'merchandising',
        palavras_chave:
          'splash,precificacao,preco,merchandising,ponto extra nao,acao de merchandising,cartaz,encarte,promocao',
        responsavel_nome: 'Felipe',
        descricao: 'Merchandising: Splash, precificação, conexão loja-indústria',
      },
      {
        area: 'pontos_extras',
        palavras_chave:
          'ponto extra,pontos extras,aumento de espaco,espaco,ganho no pdv,negociacao de espaço',
        responsavel_nome: 'Gabriel Oliveira, Gabriel Luz e Arthur',
        descricao: 'Pontos extras, aumento de espaços, ganhos no PDV',
      },
      {
        area: 'acesso_loja',
        palavras_chave: 'qr code,qrcode,betina,entrada,saida,acesso a loja,cracha,tc nao funciona',
        responsavel_nome: 'Carol',
        descricao: 'QR Code, Betina, entrada e saída em loja',
      },
    ]
    for (let i = 0; i < seeds.length; i++) {
      const r = new Record(regras)
      r.set('area', seeds[i].area)
      r.set('palavras_chave', seeds[i].palavras_chave)
      r.set('responsavel_nome', seeds[i].responsavel_nome)
      r.set('descricao', seeds[i].descricao)
      r.set('ativa', true)
      app.save(r)
    }
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('regras_direcionamento'))
    const ocorrencias = app.findCollectionByNameOrId('ocorrencias')
    for (const f of ['visibilidade_multi', 'responsavel_nome', 'area']) {
      if (ocorrencias.fields.getByName(f)) ocorrencias.fields.removeByName(f)
    }
    app.save(ocorrencias)
  },
)
