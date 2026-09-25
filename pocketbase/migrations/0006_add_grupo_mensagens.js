// Campo 'grupo' em mensagens_whatsapp — identifica o grupo de origem (JID g.us)
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('mensagens_whatsapp')
    if (!col.fields.getByName('grupo')) {
      col.fields.add(new TextField({ name: 'grupo' }))
      app.save(col)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('mensagens_whatsapp')
    const f = col.fields.getByName('grupo')
    if (f) {
      col.fields.removeByName('grupo')
      app.save(col)
    }
  },
)
