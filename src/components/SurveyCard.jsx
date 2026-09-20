@'
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
    const [liveIndicator, setLiveIndicator] = useState(false)
  const channelRef = useRef(null)

  useEffect(() => {
    channelRef.current = supabase
      .channel(`survey-${survey.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'options', filter: `survey_id=eq.${survey.id}` },
        (payload) => {
          setLocalOptions(prev => prev.map(o => o.id === payload.new.id ? { ...o, vote_count: payload.new.vote_count } : o))
          setLiveIndicator(true)
          setTimeout(() => setLiveIndicator(false), 1500)
        }
      ).subscribe()
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current) }
  }, [survey.id])
'@ | Set-Content src\components\SurveyCard.jsx -Encoding UTF8