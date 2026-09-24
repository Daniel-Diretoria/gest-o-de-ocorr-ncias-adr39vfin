// Schema da Fase 1 — Gestão de Ocorrências
// Coleções: users(+role), industrias, lojas, promotores, ocorrencias, tratativas, mensagens_whatsapp
migrate(
  (app) => {
    // 1) users ganha campo de perfil (role)
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    if (!users.fields.getByName('role')) {
      users.fields.add(
        new SelectField({
          name: 'role',
          values: ['admin', 'supervisao', 'promotor'],
          maxSelect: 1,
          required: true,
        }),
      )
      app.save(users)
    }

    // 2) industrias
    const industrias = new Collection({
      name: 'industrias',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule:
        "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'supervisao')",
      updateRule:
        "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'supervisao')",
      deleteRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
      fields: [
        { name: 'nome', type: 'text', required: true },
        { name: 'ativa', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_industrias_nome ON industrias (nome)'],
    })
    app.save(industrias)

    // 3) lojas
    const lojas = new Collection({
      name: 'lojas',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule:
        "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'supervisao')",
      updateRule:
        "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'supervisao')",
      deleteRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
      fields: [
        { name: 'nome', type: 'text', required: true },
        { name: 'rede', type: 'text' },
        { name: 'endereco', type: 'text' },
        { name: 'ativa', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_lojas_nome ON lojas (nome)'],
    })
    app.save(lojas)

    // 4) promotores
    const promotores = new Collection({
      name: 'promotores',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule:
        "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'supervisao')",
      updateRule:
        "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'supervisao')",
      deleteRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
      fields: [
        { name: 'nome', type: 'text', required: true },
        { name: 'telefone', type: 'text' },
        { name: 'ativo', type: 'bool' },
        {
          name: 'user_id',
          type: 'relation',
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
        },
        {
          name: 'industria_id',
          type: 'relation',
          collectionId: industrias.id,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_promotores_nome ON promotores (nome)'],
    })
    app.save(promotores)

    // 5) ocorrencias
    const ocorrencias = new Collection({
      name: 'ocorrencias',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
      fields: [
        { name: 'numero', type: 'number', onlyInt: true },
        { name: 'data_ocorrencia', type: 'date', required: true },
        {
          name: 'promotor_id',
          type: 'relation',
          collectionId: promotores.id,
          maxSelect: 1,
        },
        { name: 'repositor_nome', type: 'text' },
        {
          name: 'loja_id',
          type: 'relation',
          collectionId: lojas.id,
          maxSelect: 1,
        },
        { name: 'loja_nome', type: 'text' },
        {
          name: 'industria_id',
          type: 'relation',
          collectionId: industrias.id,
          maxSelect: 1,
        },
        { name: 'industria_nome', type: 'text' },
        { name: 'produto', type: 'text' },
        { name: 'situacao', type: 'text', required: true },
        { name: 'acao_realizada', type: 'text' },
        { name: 'contato_loja', type: 'text' },
        { name: 'precisa_apoio', type: 'bool' },
        {
          name: 'midia',
          type: 'file',
          maxSelect: 5,
          maxSize: 20971520,
          mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime'],
        },
        {
          name: 'categoria',
          type: 'select',
          values: [
            'estrutura',
            'ruptura',
            'validade',
            'avaria',
            'reposicao',
            'equipamento',
            'atendimento',
            'outro',
          ],
          maxSelect: 1,
        },
        {
          name: 'gravidade',
          type: 'select',
          values: ['baixa', 'media', 'alta', 'critica'],
          maxSelect: 1,
        },
        {
          name: 'prioridade',
          type: 'select',
          values: ['baixa', 'media', 'alta', 'urgente'],
          maxSelect: 1,
        },
        {
          name: 'visibilidade',
          type: 'select',
          values: ['interno', 'representante', 'industria'],
          maxSelect: 1,
        },
        {
          name: 'responsavel_id',
          type: 'relation',
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
        },
        { name: 'sla_prazo', type: 'date' },
        {
          name: 'status',
          type: 'select',
          values: [
            'nova',
            'em_analise',
            'direcionada',
            'em_tratativa',
            'aguardando_loja',
            'aguardando_industria',
            'aguardando_representante',
            'resolvida',
            'cancelada',
            'improcedente',
          ],
          maxSelect: 1,
        },
        { name: 'resolvida_em', type: 'date' },
        { name: 'tempo_resolucao_min', type: 'number', onlyInt: true },
        {
          name: 'origem',
          type: 'select',
          values: ['whatsapp', 'manual'],
          maxSelect: 1,
        },
        { name: 'mensagem_bruta', type: 'text' },
        {
          name: 'criado_por',
          type: 'relation',
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_ocorrencias_numero ON ocorrencias (numero)',
        'CREATE INDEX idx_ocorrencias_status ON ocorrencias (status)',
        'CREATE INDEX idx_ocorrencias_industria ON ocorrencias (industria_id)',
        'CREATE INDEX idx_ocorrencias_loja ON ocorrencias (loja_id)',
      ],
    })
    app.save(ocorrencias)

    // 6) tratativas
    const tratativas = new Collection({
      name: 'tratativas',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule:
        "@request.auth.id != '' && (autor_id = @request.auth.id || @request.auth.role = 'admin' || @request.auth.role = 'supervisao')",
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
          name: 'autor_id',
          type: 'relation',
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
        },
        {
          name: 'tipo',
          type: 'select',
          values: ['contato', 'acao', 'retorno', 'observacao', 'evidencia'],
          maxSelect: 1,
        },
        { name: 'descricao', type: 'text', required: true },
        { name: 'previsao', type: 'date' },
        {
          name: 'evidencia',
          type: 'file',
          maxSelect: 3,
          maxSize: 20971520,
          mimeTypes: [
            'image/jpeg',
            'image/png',
            'image/webp',
            'video/mp4',
            'video/quicktime',
            'application/pdf',
          ],
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_tratativas_ocorrencia ON tratativas (ocorrencia_id)'],
    })
    app.save(tratativas)

    // 7) mensagens_whatsapp (payload bruto do webhook da Umbler Talk)
    const mensagens = new Collection({
      name: 'mensagens_whatsapp',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: null,
      updateRule: null,
      deleteRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
      fields: [
        { name: 'origem', type: 'text' },
        { name: 'evento', type: 'text' },
        { name: 'remetente', type: 'text' },
        { name: 'conteudo', type: 'text' },
        { name: 'payload', type: 'json', maxSize: 2097152 },
        { name: 'processada', type: 'bool' },
        { name: 'erro', type: 'text' },
        {
          name: 'ocorrencia_id',
          type: 'relation',
          collectionId: ocorrencias.id,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_mensagens_processada ON mensagens_whatsapp (processada)'],
    })
    app.save(mensagens)
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('mensagens_whatsapp'))
    app.delete(app.findCollectionByNameOrId('tratativas'))
    app.delete(app.findCollectionByNameOrId('ocorrencias'))
    app.delete(app.findCollectionByNameOrId('promotores'))
    app.delete(app.findCollectionByNameOrId('lojas'))
    app.delete(app.findCollectionByNameOrId('industrias'))
  },
)
