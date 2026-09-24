import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { User, LogOut, LayoutDashboard, ClipboardList, Settings } from 'lucide-react'

const roleLabel: Record<string, string> = {
  admin: 'Administrador',
  supervisao: 'Supervisão',
  promotor: 'Promotor',
}

export default function Layout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const navItems = [
    { to: '/', label: 'Início', icon: LayoutDashboard },
    { to: '/ocorrencias', label: 'Ocorrências', icon: ClipboardList },
    { to: '/cadastros', label: 'Cadastros', icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background sticky top-0 z-10">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <button
              className="font-semibold cursor-pointer hover:opacity-80 whitespace-nowrap"
              onClick={() => navigate('/')}
            >
              Ocorrências{' '}
              <span className="text-muted-foreground font-normal hidden sm:inline">
                · Diretoria Promoções
              </span>
            </button>
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const active =
                  item.to === '/'
                    ? location.pathname === '/'
                    : location.pathname.startsWith(item.to)
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`px-3 py-1.5 rounded-md text-sm ${
                      active ? 'bg-muted font-medium' : 'text-muted-foreground hover:bg-muted/50'
                    }`}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </div>
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-xs">
                      {(user.name || user.email || '?').slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline text-sm">{user.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span>{user.name}</span>
                    <span className="text-xs text-muted-foreground font-normal">
                      {roleLabel[user.role] || user.role} · {user.email}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/perfil')}>
                  <User className="h-4 w-4 mr-2" /> Perfil
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    signOut()
                    navigate('/login')
                  }}
                >
                  <LogOut className="h-4 w-4 mr-2" /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>
      <main className="container mx-auto px-4 py-6">
        <Outlet />
      </main>
      <nav className="md:hidden border-t bg-background sticky bottom-0 z-10">
        <div className="flex">
          {navItems.map((item) => {
            const active =
              item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)
            const Icon = item.icon
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex-1 flex flex-col items-center py-2 text-xs ${
                  active ? 'text-foreground font-medium' : 'text-muted-foreground'
                }`}
              >
                <Icon className="h-4 w-4" /> {item.label}
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
