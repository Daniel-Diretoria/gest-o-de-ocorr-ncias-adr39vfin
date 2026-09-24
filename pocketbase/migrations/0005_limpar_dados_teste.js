// Limpa dados de teste (ocorrencias 286036+ e mensagens de teste) — base limpa para uso real.
migrate(
  (app) => {
    app.db().newQuery('DELETE FROM tratativas').execute()
    app.db().newQuery('DELETE FROM ocorrencias').execute()
    app.db().newQuery('DELETE FROM mensagens_whatsapp').execute()
  },
  (app) => {},
)
