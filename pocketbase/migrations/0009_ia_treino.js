// Categoria 'operacional' (problema da loja que afeta o setor todo, sem
// indústria específica) + coleção ia_treino (correções da supervisão que
// viram exemplos few-shot na classificação das próximas ocorrências).
migrate(
  (app) => {
    // 1) ocorrencias.categoria ganha 'operacional'
    const ocorrencias = app.findCollectionByNameOrId('ocorrencias')
    const cat = ocorrencias.fields.getByName('categoria')
    if (cat && cat.values.indexOf('operacional') === -1) {
      cat.values.push('operacional')
      app.save(ocorrencias)
    }

    // 2) ia_treino — criado por hook quando supervisão/admin corrige classificação
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    const treino = new Collection({
      name: 'ia_treino',
      type: 'base',
      listRule:
        "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'supervisao')",
      viewRule:
        "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'supervisao')",
      createRule: null,
      updateRule: null,
      deleteRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
      fields: [
        {
          name: 'ocorrencia_id',
          type: 'relation',
          collectionId: ocorrencias.id,
          maxSelect: 1,
        },
        { name: 'situacao', type: 'text', required: true },
        { name: 'categoria', type: 'text' },
        { name: 'gravidade', type: 'text' },
        { name: 'prioridade', type: 'text' },
        { name: 'industria_nome', type: 'text' },
        { name: 'corrigido_por', type: 'relation', collectionId: users.id, maxSelect: 1 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_ia_treino_created ON ia_treino (created)'],
    })
    app.save(treino)
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('ia_treino'))
    const ocorrencias = app.findCollectionByNameOrId('ocorrencias')
    const cat = ocorrencias.fields.getByName('categoria')
    if (cat) {
      const i = cat.values.indexOf('operacional')
      if (i !== -1) cat.values.splice(i, 1)
      app.save(ocorrencias)
    }
  },
)
