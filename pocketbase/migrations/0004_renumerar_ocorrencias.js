// Renumera as ocorrências criadas nos testes (286036+ → sequência 1,2,3...)
migrate(
  (app) => {
    const rows = app.findRecordsByFilter('ocorrencias', '', 'numero', 200, 0)
    rows.forEach((r, i) => {
      r.set('numero', i + 1)
      app.save(r)
    })
  },
  (app) => {},
)
