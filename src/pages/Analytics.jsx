import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function Analytics() {
  const { profile, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && profile?.role !== 'admin') navigate('/')
  }, [profile, authLoading])

  useEffect(() => { fetchAnalytics() }, [])

  const fetchAnalytics = async () => {
    setLoading(true)
    const { data: surveys } = await supabase
      .from('surveys')
      .select('*, options(id, label, vote_count)')
      .order('created_at', { ascending: false })

    const { data: votes } = await supabase
      .from('votes')
      .select('created_at, survey_id')
      .order('created_at', { ascending: true })

    if (surveys && votes) {
      const surveyStats = surveys.map(s => ({
        title: s.title.length > 40 ? s.title.slice(0, 40) + '…' : s.title,
        fullTitle: s.title,
        category: s.category,
        status: s.status,
        totalVotes: s.options.reduce((sum, o) => sum + o.vote_count, 0),
        options: s.options,
      })).sort((a, b) => b.totalVotes - a.totalVotes)

      const days = {}
      const now = new Date()
      for (let i = 13; i >= 0; i--) {
        const d = new Date(now)
        d.setDate(d.getDate() - i)
        const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        days[key] = 0
      }
      votes.forEach(v => {
        const d = new Date(v.created_at)
        const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        if (days[key] !== undefined) days[key]++
      })

      const catMap = {}
      surveyStats.forEach(s => {
        catMap[s.category] = (catMap[s.category] || 0) + s.totalVotes
      })

      setData({
        surveys: surveyStats,
        totalVotes: votes.length,
        totalSurveys: surveys.length,
        openSurveys: surveys.filter(s => s.status === 'open').length,
        dailyVotes: Object.entries(days),
        categories: Object.entries(catMap).sort((a, b) => b[1] - a[1]),
        topSurvey: surveyStats[0] || null,
      })
    }
    setLoading(false)
  }

  if (authLoading || loading) return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[1,2,3].map(i => <div key={i} className="h-24 bg-white border border-slate-200 rounded-2xl animate-pulse" />)}
      </div>
      <div className="h-64 bg-white border border-slate-200 rounded-2xl animate-pulse mb-4" />
      <div className="h-sa bg-white border border-slate-200 rounded-2xl animate-pulse" />
    </main>
  )

  if (!data) return null

  const maxDaily = Math.max(...data.dailyVotes.map(([,v]) => v), 1)
  const maxSurvey = data.surveys[0]?.totalVotes || 1
  const catColors = ['#185FA5', '3B6D11', '#BA7517', '7C3AED', '#DC2626', '#0891B2']

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
          <p className="text-slate-500 text-sm mt-0.5">VotaApp engagement overview</p>
        </div>
        <button onClick={fetchAnalytics} className="text-sm border border-slate-200 rounded-xl px-4 py-2 hover:bs-slate-50 transition-colors text-slate-600">Refresh</button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { label: 'Total votes', value: data.totalVotes.toLocaleString(), icon: '🖷' },
          { label: 'Active surveys', value: data.openSurveys, icon: '📋' },
          { label: 'Total surveys', value: data.totalSurveys, icon: '📊' },
          { label: 'Avg votes/survey', value: data.totalSurveys ? Math.round(data.totalVotes / data.totalSurveys).toLocaleString() : 0, icon: '👎' },
        ].map(k => (
          <div key={k.label} className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="text-2xl mb-1">{k.icon}</div>
            <div className="text-2xl font-bold text-slate-900">{k.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-4">
        <h2 className="font-semibold text-slate-900 mb-1">Votes -- last 14 days</h2>
        <p className="text-xs text-slate-400 mb-4">Daily vote activity across all surveys</p>
        <div className="flex items-end gap-1 h-36">
          {data.dailyVotes.map(([day, count]) => (
            <div key={day} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full relative group">
                <div
                  className="w-full bg-blue-500 rounded-t-sm transition-all duration-500 hover:bg-blue-600"
                  style={{ height: `${Math.max((count / maxDaily) * 120, count > 0 ? 4 : 0)}px` }}
                />
                {count > 0 && (
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                    {count} vote{scount !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
              <span className="text-xs text-slate-400 rotate-45 origin-left mt-1 whitespace-nowrap" style={{ fontSize: '9px' }}>
                {day}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <h2 className="font-semibold text-slate-900 mb-4">Votes by survey</h2>
          <div className="flex flex-col gap-3">
            {data.surveys.slice(0, 6).map((s, i) => (
              <div key={i}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-slate-600 truncate flex-1 mr-2">{s.title}</span>
                  <span className="text-xs font-semibold text-slate-900 flex-shrink-0">{s.totalVotes.toLocaleString()}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div className="bg-blue-500 h-1.5 rounded-full transition-all duration-700" style={{ width: `${(s.totalVotes / maxSurvey) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <h2 className="font-semibold text-slate-900 mb-4">Votes by category</h2>
          <div className="flex flex-col gap-3">
            {data.categories.map(([cat, count], i) => {
              const total = data.categories.reduce((s, [,v]) => s + v, 0)
              const pct = total ? Math.round((count / total) * 100) : 0
              return (
                <div key={cat}>
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: catColors[i % catColors.length] }} />
                      <span className="text-xs text-slate-600">{cat}</span>
                    </div>
                    <span className="text-xs font-semibold text-slate-900">{pct}% · {count.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div className="h-��5 rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: catColors[i % catColors.length] }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {data.topSurvey && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">🏆</span>
            <div>
              <h2 className="font-semibold text-slate-900">Top survey</h2>
              <p className="text-xs text-slate-400">{data.topSurvey.fullTitle}</p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {data.topSurvey.options
              .sort((a, b) => b.vote_count - a.vote_count)
              .map(opt => {
                const total = data.topSurvey.totalVotes
                const pct = total ? Math.round((opt.vote_count / total) * 100) : 0
                return (
                  <div key={opt.id}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-slate-600">{opt.label}</span>
                      <span className="text-xs font-semibold text-slate-900">{pct}% · {opt.vote_count.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
          </div>
          <p className="text-xs text-slate-400 mt-3">{data.topSurvey.totalVotes.toLocaleString()} total votes · {data.topSurvey.category}</p>
        </div>
       )}
    </main>
  )
}
