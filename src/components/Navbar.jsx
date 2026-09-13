import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import AuthModal from './AuthModal'

export default function Navbar() {
  const { session, profile, signOut } = useAuth()
  const [showAuth, setShowAuth] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  const navLinks = [
    { to: '/', label: 'Surveys' },
    { to: '/submit', label: 'Submit a survey' },
    ...(profile?.role === 'admin' ? [{ to: '/admin', label: 'Admin' }] : []),
  ]

  return (
    <>
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-slate-900">
            <span className="text-xl">🗳</span>
            <div className="flex flex-col leading-tight">
              <span className="font-bold text-base text-blue-700">VotaApp</span>
              <span className="text-xs text-slate-400 font-medium">Your Civic Voice</span>
            </div>
          </Link>

          {/* Desktop nav */}
          <div className="hidden sm:flex items-center gap-6">
            {navLinks.map(l => (
              <Link
                key={l.to}
                to={l.to}
                className={`text-sm font-medium transition-colors ${
                  location.pathname === l.to
                    ? 'text-blue-700'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {l.label}
              </Link>
            ))}
            {session ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-500">{profile?.display_name}</span>
                <button
                  onClick={signOut}
                  className="text-sm text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg px-3 py-1.5 transition-colors hover:bg-slate-50"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                className="text-sm font-medium bg-blue-700 text-white rounded-lg px-4 py-1.5 hover:bg-blue-800 transition-colors"
              >
                Sign in
              </button>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="sm:hidden text-slate-600 hover:text-slate-900"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {menuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              }
            </svg>
          </button>
        </div>

        {/* Mobile dropdown */}
        {menuOpen && (
          <div className="sm:hidden border-t border-slate-100 bg-white px-4 py-3 flex flex-col gap-3">
            {navLinks.map(l => (
              <Link key={l.to} to={l.to} className="text-sm text-slate-700" onClick={() => setMenuOpen(false)}>
                {l.label}
              </Link>
            ))}
            {session ? (
              <button onClick={signOut} className="text-sm text-left text-slate-600">Sign out</button>
            ) : (
              <button onClick={() => { setShowAuth(true); setMenuOpen(false) }} className="text-sm text-blue-700 font-medium text-left">
                Sign in
              </button>
            )}
          </div>
        )}
      </nav>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  )
}
