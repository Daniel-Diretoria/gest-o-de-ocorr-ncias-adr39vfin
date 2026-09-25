// Limpa dados de teste apos a verificacao da Fase 1 (base limpa para uso real)
migrate(
  (app) => {
    app.db().newQuery('DELETE FROM tratativas').execute()
    app.db().newQuery('DELETE FROM ocorrencias').execute()
    app.db().newQuery('DELETE FROM mensagens_whatsapp').execute()
  },
  (app) => {},
)
