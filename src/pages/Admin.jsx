import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const STATUS_COLORS = {
  pending: 'bg-amber-50 text-amber-700',
  open:    'bg-green-50 text-green-700',
  closed:  'bg-slate-100 text-slate-500',
}

export default function Admin() {
  const { profile, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [surveys, setSurveys] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')

  useEffect(() => {
    if (!authLoading && profile?.role !== 'admin') navigate('/')
  }, [profile, authLoading])

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('surveys')
      .select('*, options(id, vote_count)')
      .order('created_at', { ascending: false })
    setSurveys(data || [])
    setLoading(false)
  }

  const updateStatus = async (id, status) => {
    await supabase.from('surveys').update({ status }).eq('id', id)
    setSurveys(prev => prev.map(s => s.id === id ? { ...s, status } : s))
  }

  const deleteSurvey = async (id) => {
    if (!confirm('Delete this survey and all its votes?')) return
    await supabase.from('surveys').delete().eq('id', id)
    setSurveys(prev => prev.filter(s => s.id !== id))
  }

  const filtered = surveys.filter(s => filter === 'all' || s.status === filter)
  const counts = { pending: 0, open: 0, closed: 0 }
  surveys.forEach(s => counts[s.status] = (counts[s.status] || 0) + 1)

  if (authLoading) return null

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admin panel</h1>
          <p className="text-slate-500 text-sm mt-0.5">Review and manage all surveys</p>
        </div>
        <div className="flex gap-2 text-sm">
          {[['pending', 'Pending'], ['open', 'Open'], ['closed', 'Closed'], ['all', 'All']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setFilter(val)}
              className={`px-3 py-1.5 rounded-full border transition-colors font-medium ${
                filter === val ? 'bg-blue-700 text-white border-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {label} {val !== 'all' && counts[val] > 0 && <span className="ml-1 opacity-70">{counts[val]}</span>}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-white rounded-2xl border border-slate-200 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p>No surveys in this category.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(survey => {
            const totalVotes = survey.options?.reduce((sum, o) => sum + o.vote_count, 0) || 0
            return (
              <div key={survey.id} className="bg-white border border-slate-200 rounded-2xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${STATUS_COLORS[survey.status]}`}>
                        {survey.status}
                      </span>
                      <span className="text-xs text-slate-400">{survey.category}</span>
                      <span className="text-xs text-slate-400">·</span>
                      <span className="text-xs text-slate-400">{totalVotes.toLocaleString()} votes</span>
                      <span className="text-xs text-slate-400">·</span>
                      <span className="text-xs text-slate-400">
                        {new Date(survey.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="font-medium text-slate-900 text-sm leading-snug">{survey.title}</h3>
                    {survey.description && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{survey.description}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {survey.status === 'pending' && (
                      <button
                        onClick={() => updateStatus(survey.id, 'open')}
                        className="text-xs font-medium bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Approve
                      </button>
                    )}
                    {survey.status === 'open' && (
                      <button
                        onClick={() => updateStatus(survey.id, 'closed')}
                        className="text-xs font-medium border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        Close
                      </button>
                    )}
                    {survey.status === 'closed' && (
                      <button
                        onClick={() => updateStatus(survey.id, 'open')}
                        className="text-xs font-medium border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        Reopen
                      </button>
                    )}
                    <button
                      onClick={() => deleteSurvey(survey.id)}
                      className="text-xs font-medium text-red-500 hover:text-red-700 px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
