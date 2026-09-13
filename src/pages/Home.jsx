import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import SurveyCard from '../components/SurveyCard'
import AuthModal from '../components/AuthModal'

const CATEGORIES = ['All', 'Politics', 'Environment', 'Infrastructure', 'Public Safety', 'General']

export default function Home() {
  const { session } = useAuth()
  const [surveys, setSurveys] = useState([])
  const [userVotes, setUserVotes] = useState({}) // { survey_id: option_id }
  const [category, setCategory] = useState('All')
  const [loading, setLoading] = useState(true)
  const [showAuth, setShowAuth] = useState(false)

  useEffect(() => {
    fetchSurveys()
  }, [])

  useEffect(() => {
    if (session?.user) fetchUserVotes()
    else setUserVotes({})
  }, [session])

  const fetchSurveys = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('surveys')
      .select('*, options(id, label, vote_count, position)')
      .eq('status', 'open')
      .order('created_at', { ascending: false })

    if (!error) {
      const sorted = (data || []).map(s => ({
        ...s,
        options: [...s.options].sort((a, b) => a.position - b.position)
      }))
      setSurveys(sorted)
    }
    setLoading(false)
  }

  const fetchUserVotes = async () => {
    const { data } = await supabase
      .from('votes')
      .select('survey_id, option_id')
      .eq('user_id', session.user.id)

    if (data) {
      const map = {}
      data.forEach(v => { map[v.survey_id] = v.option_id })
      setUserVotes(map)
    }
  }

  const filtered = category === 'All' ? surveys : surveys.filter(s => s.category === category)

  const stats = {
    total: surveys.length,
    voted: Object.keys(userVotes).length,
    responses: surveys.reduce((sum, s) => sum + s.options.reduce((a, o) => a + o.vote_count, 0), 0),
  }

  return (
    <>
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Your community, your voice</h1>
          <p className="text-slate-500 text-base max-w-lg mx-auto">
            Vote on local surveys and see where your community stands in real time.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { label: 'Active surveys', value: stats.total },
            { label: 'Your votes', value: stats.voted },
            { label: 'Total responses', value: stats.responses.toLocaleString() },
          ].map(s => (
            <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-slate-900">{s.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-6 scrollbar-hide">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`flex-shrink-0 text-sm font-medium px-4 py-2 rounded-full border transition-colors ${
                category === cat
                  ? 'bg-blue-700 text-white border-blue-700'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Survey grid */}
        {loading ? (
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 h-64 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <div className="text-4xl mb-3">🗳️</div>
            <p className="font-medium text-slate-600">No surveys in this category</p>
            <p className="text-sm mt-1">Check back soon or submit one yourself.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filtered.map(survey => (
              <SurveyCard
                key={survey.id}
                survey={survey}
                userVoteOptionId={userVotes[survey.id]}
                onVoteCast={fetchUserVotes}
                onAuthRequired={() => setShowAuth(true)}
              />
            ))}
          </div>
        )}
      </main>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  )
}
