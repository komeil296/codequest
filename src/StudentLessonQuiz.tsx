import { useCallback, useEffect, useState } from 'react'
import { apiRequest, type AuthUser } from './api'

type Question = {
  id: string
  prompt: string
  options: string[]
  points: number
  coins: number
  answered: boolean
  isCorrect: boolean | null
  awardedPoints: number
  awardedCoins: number
  selectedOptionIndex: number | null
}
type Result = { message: string }

type Props = { auth: { token: string; user: AuthUser }; lessonId: string }

export default function StudentLessonQuiz({ auth, lessonId }: Props) {
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [submitting, setSubmitting] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setError('')
    setQuestions(await apiRequest<Question[]>('/student-courses/lessons/' + lessonId + '/questions', { token: auth.token }))
  }, [auth.token, lessonId])

  useEffect(() => { void load().catch(err => setError(err instanceof Error ? err.message : 'دریافت آزمون‌ها ناموفق بود.')) }, [load])

  async function submit(question: Question) {
    const selectedOptionIndex = answers[question.id]
    if (selectedOptionIndex === undefined || question.answered) return
    setSubmitting(question.id)
    setMessage('')
    setError('')
    try {
      const result = await apiRequest<Result>('/student-courses/questions/' + question.id + '/answer', {
        method: 'POST', token: auth.token, body: JSON.stringify({ selectedOptionIndex }),
      })
      setMessage(result.message)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ثبت پاسخ ناموفق بود.')
    } finally {
      setSubmitting(null)
    }
  }

  const earnedPoints = questions.reduce((sum, question) => sum + question.awardedPoints, 0)
  const earnedCoins = questions.reduce((sum, question) => sum + question.awardedCoins, 0)

  return <section className="student-quiz-section">
    <div className="student-quiz-heading">
      <div><span className="management-eyebrow">تمرین امتیازدار</span><h3>آزمون چهارگزینه‌ای</h3><p>پاسخ هر سؤال فقط یک‌بار ثبت می‌شود.</p></div>
      <div className="student-quiz-reward-summary"><strong>⭐ {earnedPoints.toLocaleString('fa-IR')}</strong><span>امتیاز</span><strong>🪙 {earnedCoins.toLocaleString('fa-IR')}</strong><span>سکه این درس</span></div>
    </div>
    {error && <div className="notice error-notice" role="alert">{error}</div>}
    {message && <div className="notice success-notice" role="status">{message}</div>}
    {questions.map((question, index) => <article className="student-quiz-card" key={question.id}>
      <div className="student-quiz-question-title"><span>{(index + 1).toLocaleString('fa-IR')}</span><strong>{question.prompt}</strong></div>
      <div className="student-quiz-options">{question.options.map((option, optionIndex) => <label key={optionIndex} className={question.answered && question.selectedOptionIndex === optionIndex ? (question.isCorrect ? 'chosen correct' : 'chosen incorrect') : ''}>
        <input type="radio" name={question.id} checked={question.answered ? question.selectedOptionIndex === optionIndex : answers[question.id] === optionIndex} disabled={question.answered || submitting === question.id} onChange={() => setAnswers(current => ({ ...current, [question.id]: optionIndex }))} />
        <span>{option}</span>
      </label>)}</div>
      <div className="student-quiz-footer"><small>{question.points.toLocaleString('fa-IR')} امتیاز · {question.coins.toLocaleString('fa-IR')} سکه</small>
        {question.answered ? <span className={question.isCorrect ? 'quiz-result correct' : 'quiz-result incorrect'}>{question.isCorrect ? 'پاسخ صحیح · +' + question.awardedPoints + ' امتیاز · +' + question.awardedCoins + ' سکه' : 'پاسخ ثبت شد؛ جایزه‌ای دریافت نشد'}</span> : <button className="student-quiz-submit" disabled={answers[question.id] === undefined || submitting === question.id} onClick={() => void submit(question)}>{submitting === question.id ? 'در حال ثبت…' : 'ثبت پاسخ'}</button>}
      </div>
    </article>)}
    {questions.length === 0 && !error && <div className="empty-state">برای این درس هنوز آزمون چهارگزینه‌ای ثبت نشده است.</div>}
  </section>
}
