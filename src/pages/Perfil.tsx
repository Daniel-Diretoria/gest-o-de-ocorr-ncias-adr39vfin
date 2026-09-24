import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import pb from '@/lib/pocketbase/client'

const Perfil = () => {
  const { user } = useAuth()
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [msg, setMsg] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  const trocarSenha = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg('')
    setErro('')
    if (novaSenha !== confirmar) {
      setErro('A confirmação não confere com a nova senha.')
      return
    }
    if (novaSenha.length < 8) {
      setErro('A nova senha precisa ter pelo menos 8 caracteres.')
      return
    }
    setLoading(true)
    try {
      await pb.collection('users').update(user.id, {
        oldPassword: senhaAtual,
        password: novaSenha,
        passwordConfirm: confirmar,
      })
      setMsg('Senha alterada com sucesso.')
      setSenhaAtual('')
      setNovaSenha('')
      setConfirmar('')
    } catch (err) {
      setErro(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-2xl font-bold">Perfil</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Seus dados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>
            <span className="text-muted-foreground">Nome:</span> {user?.name}
          </p>
          <p>
            <span className="text-muted-foreground">E-mail:</span> {user?.email}
          </p>
          <p>
            <span className="text-muted-foreground">Perfil de acesso:</span> {user?.role}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Trocar senha</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={trocarSenha} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Senha atual</Label>
              <Input
                type="password"
                value={senhaAtual}
                onChange={(e) => setSenhaAtual(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nova senha</Label>
              <Input
                type="password"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Confirmar nova senha</Label>
              <Input
                type="password"
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                required
              />
            </div>
            {msg && <p className="text-sm text-green-600">{msg}</p>}
            {erro && <p className="text-sm text-destructive">{erro}</p>}
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Trocar senha'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default Perfil
