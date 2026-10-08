import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Submit from './pages/Submit'
import Admin from './pages/Admin'
import Analytics from './pages/Analytics'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-slate-50">
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/submit" element={<Submit />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/analytics" element={<Analytics />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  )
}
