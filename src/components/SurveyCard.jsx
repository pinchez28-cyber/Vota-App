import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function SurveyCard({ survey, userVoteOptionId, onVoteCast, onAuthRequired }) {
  const { session } = useAuth()
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [localVote, setLocalVote] = useState(userVoteOptionId || null)
  const [localOptions, setLocalOptions] = useState(survey.options)
  const [liveIndicator, setLiveIndicator] = useState(false)
  const channelRef = useRef(null)

  // Real-time subscription to vote count changes
  useEffect(() => {
    channelRef.current = supabase
      .channel(`survey-${survey.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'options',
          filter: `survey_id=eq.${survey.id}`,
        },
        (payload) => {
          setLocalOptions(prev =>
            prev.map(o => o.id === payload.new.id ? { ...o, vote_count: payload.new.vote_count } : o)
          )
          setLiveIndicator(true)
          setTimeout(() => setLiveIndicator(false), 1500)
        }
      )
      .subscribe()

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
    }
  }, [survey.id])

  const hasVoted = !!localVote
  const totalVotes = localOptions.reduce((sum, o) => sum + o.vote_count, 0)
  const winnerCount = Math.max(...localOptions.map(o => o.vote_count))

  const pct = (count) => totalVotes === 0 ? 0 : Math.round((count / totalVotes) * 100)

  const closesLabel = survey.closes_at
    ? `Closes ${new Date(survey.closes_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    : null

  const handleVote = async () => {
    if (!session) { onAuthRequired(); return }
    if (!selected || loading) return
    setLoading(true)
    setError('')

    const { error } = await supabase.rpc('cast_vote', {
      p_survey_id: survey.id,
      p_option_id: selected,
    })

    if (error) {
      setError(error.message.includes('unique') ? 'You have already voted on this survey.' : error.message)
      setLoading(false)
      return
    }

    setLocalOptions(prev => prev.map(o => o.id === selected ? { ...o, vote_count: o.vote_count + 1 } : o))
    setLocalVote(selected)
    setLoading(false)
    onVoteCast?.()
  }

  const handleShare = async () => {
    const url = `${window.location.origin}/?survey=${survey.id}`
    if (navigator.share) {
      await navigator.share({ title: survey.title, url })
    } else {
      await navigator.clipboard.writeText(url)
      alert('Link copied to clipboard!')
    }
  }

  return (
    <article className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-xs font-medium bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full">
              {survey.category}
            </span>
            <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
              survey.status === 'open'
                ? 'bg-green-50 text-green-700'
                : 'bg-slate-100 text-slate-500'
            }`}>
              {survey.status === 'open' ? 'Open' : 'Closed'}
            </span>
            {/* Live indicator */}
            <span className={`flex items-center gap-1 text-xs font-medium transition-opacity duration-500 ${liveIndicator ? 'opacity-100 text-green-600' : 'opacity-0'}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
              Live update
            </span>
          </div>
          <h3 className="font-semibold text-slate-900 text-base leading-snug">{survey.title}</h3>
        </div>
        {/* Share button */}
        <button
          onClick={handleShare}
          className="flex-shrink-0 text-slate-400 hover:text-blue-600 transition-colors p-1"
          aria-label="Share survey"
          title="Share this survey"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
        </button>
      </div>

      {survey.description && (
        <p className="text-sm text-slate-500 leading-relaxed -mt-2">{survey.description}</p>
      )}

      {/* Options */}
      <div className="flex flex-col gap-2">
        {localOptions.map(option => {
          const p = pct(option.vote_count)
          const isSelected = selected === option.id
          const isMyVote = localVote === option.id
          const isWinner = hasVoted && option.vote_count === winnerCount

          return (
            <button
              key={option.id}
              onClick={() => !hasVoted && survey.status === 'open' && setSelected(option.id)}
              disabled={hasVoted || survey.status !== 'open'}
              className={`relative w-full text-left rounded-xl border px-4 py-3 overflow-hidden transition-all ${
                hasVoted
                  ? 'cursor-default border-slate-200'
                  : isSelected
                  ? 'border-blue-500 border-2 bg-blue-50'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 cursor-pointer'
              }`}
            >
              {hasVoted && (
                <div
                  className="absolute inset-y-0 left-0 bg-blue-50 rounded-xl transition-all duration-700"
                  style={{ width: `${p}%` }}
                />
              )}

              <div className="relative flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  {!hasVoted && (
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      isSelected ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                    }`}>
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  )}
                  <span className={`text-sm font-medium ${isMyVote ? 'text-blue-700' : 'text-slate-800'}`}>
                    {option.label}
                  </span>
                  {isWinner && <span className="text-xs">🏆</span>}
                  {isMyVote && <span className="text-xs text-blue-600 font-medium">Your vote</span>}
                </div>
                {hasVoted && (
                  <div className="text-right flex-shrink-0">
                    <span className="text-sm font-semibold text-blue-700">{p}%</span>
                    <span className="text-xs text-slate-400 ml-1.5">{option.vote_count.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Action */}
      {survey.status === 'open' && (
        hasVoted ? (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="text-green-600">✓</span>
            <span>Vote recorded · {totalVotes.toLocaleString()} total responses</span>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <button
              onClick={handleVote}
              disabled={!selected || loading}
              className="w-full bg-blue-700 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Casting vote¦' : session ? 'Cast my vote' : 'Sign in to vote'}
            </button>
            {error && <p className="text-xs text-red-600 text-center">{error}</p>}
          </div>
        )
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-100">
        <span>{totalVotes.toLocaleString()} responses</span>
        {closesLabel && <span>{closesLabel}</span>}
      </div>
    </article>
  )
}
