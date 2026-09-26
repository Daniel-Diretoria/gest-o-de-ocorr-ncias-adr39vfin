// Promotor vê só as ocorrências dele — regra de acesso na coleção (RLS).
// admin/supervisão veem tudo; promotor vê por promotor_id.user_id OU nome no repositor_nome.
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('ocorrencias')
    col.listRule =
      "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'supervisao' || promotor_id.user_id = @request.auth.id || repositor_nome ~ @request.auth.name)"
    col.viewRule =
      "@request.auth.id != '' && (@request.auth.role = 'admin' || @request.auth.role = 'supervisao' || promotor_id.user_id = @request.auth.id || repositor_nome ~ @request.auth.name)"
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('ocorrencias')
    col.listRule = "@request.auth.id != ''"
    col.viewRule = "@request.auth.id != ''"
    app.save(col)
  },
)
