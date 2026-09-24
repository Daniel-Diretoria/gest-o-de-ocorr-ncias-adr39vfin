// Seed da Fase 1 — usuários iniciais (Admin + Supervisão + Promotor)
// daniel@diretoriapromocoes.com.br / Ocorrencias@2026 (trocar no primeiro acesso)
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    const seedUser = (email, name, role, password) => {
      try {
        app.findAuthRecordByEmail('_pb_users_auth_', email)
        return // já existe
      } catch (_) {}
      const record = new Record(users)
      record.setEmail(email)
      record.setPassword(password)
      record.setVerified(true)
      record.set('name', name)
      record.set('role', role)
      app.save(record)
    }

    seedUser('daniel@diretoriapromocoes.com.br', 'Daniel Oliveira', 'admin', 'Ocorrencias@2026')
    seedUser(
      'felipe@diretoriapromocoes.com.br',
      'Felipe Trade Merchandising',
      'supervisao',
      'Ocorrencias@2026',
    )
    seedUser(
      'promotor.demo@diretoriapromocoes.com.br',
      'Promotor Demo',
      'promotor',
      'Ocorrencias@2026',
    )
  },
  (app) => {
    const del = (email) => {
      try {
        app.delete(app.findAuthRecordByEmail('_pb_users_auth_', email))
      } catch (_) {}
    }
    del('daniel@diretoriapromocoes.com.br')
    del('felipe@diretoriapromocoes.com.br')
    del('promotor.demo@diretoriapromocoes.com.br')
  },
)
