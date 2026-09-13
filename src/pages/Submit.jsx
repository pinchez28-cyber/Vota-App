import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import AuthModal from '../components/AuthModal'

const CATEGORIES = ['Politics', 'Environment', 'Infrastructure', 'Public Safety', 'General']

export default function Submit() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [showAuth, setShowAuth] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'General',
    closes_at: '',
    options: ['', '', '', ''],
  })

  const setField = (key, val) => setForm(f => ({ ...f, [key]: val }))
  const setOption = (i, val) => setForm(f => {
    const opts = [...f.options]
    opts[i] = val
    return { ...f, options: opts }
  })
  const addOption = () => form.options.length < 8 && setForm(f => ({ ...f, options: [...f.options, ''] }))
  const removeOption = (i) => form.options.length > 2 && setForm(f => ({
    ...f, options: f.options.filter((_, idx) => idx !== i)
  }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!session) { setShowAuth(true); return }

    const validOptions = form.options.map(o => o.trim()).filter(Boolean)
    if (validOptions.length < 2) { setError('Add at least 2 options.'); return }
    if (!form.title.trim()) { setError('Title is required.'); return }

    setLoading(true)
    setError('')

    // Insert survey (status = pending — admin approves)
    const { data: survey, error: surveyErr } = await supabase
      .from('surveys')
      .insert({
        title: form.title.trim(),
        description: form.description.trim() || null,
        category: form.category,
        status: 'pending',
        created_by: session.user.id,
        closes_at: form.closes_at || null,
      })
      .select()
      .single()

    if (surveyErr) { setError(surveyErr.message); setLoading(false); return }

    // Insert options
    const { error: optErr } = await supabase.from('options').insert(
      validOptions.map((label, position) => ({ survey_id: survey.id, label, position }))
    )

    if (optErr) { setError(optErr.message); setLoading(false); return }

    setLoading(false)
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <main className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Survey submitted!</h1>
        <p className="text-slate-500 mb-8">
          Your survey is under review. Once approved by an admin it will go live for the community to vote on.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => navigate('/')}
            className="bg-blue-700 text-white rounded-xl px-6 py-2.5 text-sm font-medium hover:bg-blue-800 transition-colors"
          >
            Back to surveys
          </button>
          <button
            onClick={() => { setSubmitted(false); setForm({ title: '', description: '', category: 'General', closes_at: '', options: ['', '', '', ''] }) }}
            className="border border-slate-200 text-slate-700 rounded-xl px-6 py-2.5 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            Submit another
          </button>
        </div>
      </main>
    )
  }

  return (
    <>
      <main className="max-w-xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Submit a survey</h1>
          <p className="text-slate-500 text-sm">Make your civic voice heard — your survey will be reviewed before going live.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Question / title *</label>
            <input
              type="text"
              value={form.title}
              onChange={e => setField('title', e.target.value)}
              placeholder="e.g. Should the city build a new library?"
              maxLength={200}
              required
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Description <span className="text-slate-400 font-normal">(optional)</span></label>
            <textarea
              value={form.description}
              onChange={e => setField('description', e.target.value)}
              rows={3}
              placeholder="Provide context that helps citizens make an informed choice."
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Category + Close date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Category</label>
              <select
                value={form.category}
                onChange={e => setField('category', e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Closes on <span className="text-slate-400 font-normal">(optional)</span></label>
              <input
                type="date"
                value={form.closes_at}
                onChange={e => setField('closes_at', e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Options */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Answer options *</label>
            <div className="flex flex-col gap-2">
              {form.options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 w-5 text-right flex-shrink-0">{i + 1}</span>
                  <input
                    type="text"
                    value={opt}
                    onChange={e => setOption(i, e.target.value)}
                    placeholder={`Option ${i + 1}`}
                    maxLength={150}
                    className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {form.options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOption(i)}
                      className="text-slate-400 hover:text-red-500 transition-colors text-lg leading-none flex-shrink-0"
                      aria-label="Remove option"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
            {form.options.length < 8 && (
              <button
                type="button"
                onClick={addOption}
                className="mt-3 text-sm text-blue-700 hover:underline"
              >
                + Add another option
              </button>
            )}
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-700 text-white rounded-xl py-3 text-sm font-medium hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Submitting…' : session ? 'Submit for review' : 'Sign in to submit'}
          </button>
        </form>
      </main>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  )
}
