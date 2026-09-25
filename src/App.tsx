/* Main App Component - Handles routing (using react-router-dom), query client and other providers - use this file to add all routes */
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/hooks/use-auth'
import ProtectedRoute from '@/components/ProtectedRoute'
import Layout from './components/Layout'
import Index from './pages/Index'
import Login from './pages/Login'
import Ocorrencias from './pages/Ocorrencias'
import OcorrenciaDetalhe from './pages/OcorrenciaDetalhe'
import NovaOcorrencia from './pages/NovaOcorrencia'
import Cadastros from './pages/Cadastros'
import Painel from './pages/Painel'
import Direcionar from './pages/Direcionar'
import Perfil from './pages/Perfil'
import NotFound from './pages/NotFound'

// ONLY IMPORT AND RENDER WORKING PAGES, NEVER ADD PLACEHOLDER COMPONENTS OR PAGES IN THIS FILE
// AVOID REMOVING ANY CONTEXT PROVIDERS FROM THIS FILE (e.g. TooltipProvider, Toaster, Sonner)

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Index />} />
            <Route path="/ocorrencias" element={<Ocorrencias />} />
            <Route path="/ocorrencias/nova" element={<NovaOcorrencia />} />
            <Route path="/ocorrencias/:id" element={<OcorrenciaDetalhe />} />
            <Route path="/cadastros" element={<Cadastros />} />
            <Route path="/painel" element={<Painel />} />
            <Route path="/ocorrencias/:id/direcionar" element={<Direcionar />} />
            <Route path="/perfil" element={<Perfil />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
