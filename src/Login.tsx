import { useState, type FormEvent } from 'react'
import { apiRequest, type AuthUser, type LoginResponse } from './api'
import './Management.css'

export default function Login({ onBack, onLogin }: {
  onBack: () => void
  onLogin: (result: LoginResponse) => void
}) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const result = await apiRequest<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: username.trim(), password }),
      })
      onLogin(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ورود انجام نشد.')
    } finally {
      setBusy(false)
    }
  }

  return <div className="management-page" dir="rtl">
    <header className="management-header">
      <button className="secondary-button" onClick={onBack}>← بازگشت به صفحه اصلی</button>
      <strong className="management-brand">Code<span>Quest</span></strong>
    </header>
    <main className="login-card">
      <div className="management-icon">🔐</div>
      <p className="management-eyebrow">ورود به پنل</p>
      <h1>خوش برگشتی!</h1>
      <p className="muted-text">با نام کاربری و رمز عبور حساب خود وارد شو.</p>
      <form onSubmit={submit} className="management-form">
        <label>نام کاربری
          <input autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} minLength={3} maxLength={50} required />
        </label>
        <label>رمز عبور
          <input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} minLength={8} maxLength={72} required />
        </label>
        {error && <div className="notice error-notice" role="alert">{error}</div>}
        <button className="primary-button full-button" disabled={busy}>{busy ? 'در حال ورود…' : 'ورود به حساب'} <span>←</span></button>
      </form>
      <p className="login-footnote">حساب‌های مدیر مؤسسه پس از ورود به پنل مدیریت دانش‌آموزان هدایت می‌شوند.</p>
    </main>
  </div>
}
