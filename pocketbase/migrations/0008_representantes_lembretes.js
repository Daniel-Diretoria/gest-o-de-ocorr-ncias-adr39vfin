// Cadastro de Representantes, acompanhamento da indústria e fila de lembretes SLA.
migrate(
  (app) => {
    // 1) users.role ganha 'representante'
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    const roleField = users.fields.getByName('role')
    if (roleField && roleField.values.indexOf('representante') === -1) {
      roleField.values.push('representante')
      app.save(users)
    }

    // 2) representantes
    const industrias = app.findCollectionByNameOrId('industrias')
    const representantes = new Collection({
      name: 'representantes',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule:
        "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'supervisao')",
      updateRule:
        "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'supervisao' || @request.auth.role = 'representante')",
      deleteRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
      fields: [
        { name: 'nome', type: 'text', required: true },
        { name: 'email', type: 'text' },
        { name: 'telefone', type: 'text' },
        { name: 'industria_id', type: 'relation', collectionId: industrias.id, maxSelect: 1 },
        { name: 'ativo', type: 'bool' },
        {
          name: 'user_id',
          type: 'relation',
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_representantes_nome ON representantes (nome)'],
    })
    app.save(representantes)

    // 3) ocorrencias: acompanhamento_industria, representante_id, autorizações
    const ocorrencias = app.findCollectionByNameOrId('ocorrencias')
    if (!ocorrencias.fields.getByName('acompanhamento_industria')) {
      ocorrencias.fields.add(new BoolField({ name: 'acompanhamento_industria' }))
    }
    if (!ocorrencias.fields.getByName('representante_id')) {
      ocorrencias.fields.add(
        new RelationField({
          name: 'representante_id',
          collectionId: representantes.id,
          maxSelect: 1,
        }),
      )
    }
    if (!ocorrencias.fields.getByName('autorizado_representante')) {
      ocorrencias.fields.add(new DateField({ name: 'autorizado_representante' }))
    }
    if (!ocorrencias.fields.getByName('lembretes_enviados')) {
      ocorrencias.fields.add(new NumberField({ name: 'lembretes_enviados', onlyInt: true }))
    }
    app.save(ocorrencias)

    // 4) lembretes — fila de cobrança SLA (disparo WhatsApp quando Digisac conectar)
    const lembretes = new Collection({
      name: 'lembretes',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: null,
      updateRule: null,
      deleteRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
      fields: [
        {
          name: 'ocorrencia_id',
          type: 'relation',
          collectionId: ocorrencias.id,
          required: true,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'destinatario_tipo',
          type: 'select',
          values: ['promotor', 'responsavel', 'representante'],
          maxSelect: 1,
        },
        { name: 'destinatario_nome', type: 'text' },
        { name: 'destinatario_telefone', type: 'text' },
        { name: 'mensagem', type: 'text', required: true },
        {
          name: 'status',
          type: 'select',
          values: ['pendente', 'enviado', 'erro'],
          maxSelect: 1,
        },
        { name: 'erro', type: 'text' },
        { name: 'enviado_em', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_lembretes_status ON lembretes (status)'],
    })
    app.save(lembretes)
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('lembretes'))
    const ocorrencias = app.findCollectionByNameOrId('ocorrencias')
    for (const f of [
      'lembretes_enviados',
      'autorizado_representante',
      'representante_id',
      'acompanhamento_industria',
    ]) {
      if (ocorrencias.fields.getByName(f)) ocorrencias.fields.removeByName(f)
    }
    app.save(ocorrencias)
    app.delete(app.findCollectionByNameOrId('representantes'))
  },
)
