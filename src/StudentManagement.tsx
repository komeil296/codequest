import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { apiRequest, type AuthUser, type Student, type CreatedStudent } from './api'
import './Management.css'

type Props = {
  auth: { token: string; user: AuthUser }
  onBack: () => void
  onLogout: () => void
}

export default function StudentManagement({ auth, onBack, onLogout }: Props) {
  const [students, setStudents] = useState<Student[]>([])
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [mobile, setMobile] = useState('')
  const [created, setCreated] = useState<CreatedStudent | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const request = useCallback(<T,>(path: string, init: RequestInit = {}) =>
    apiRequest<T>(path, { ...init, token: auth.token }), [auth.token])

  const loadStudents = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setStudents(await request<Student[]>('/users/students'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'دریافت فهرست دانش‌آموزان ناموفق بود.')
    } finally {
      setLoading(false)
    }
  }, [request])

  useEffect(() => { void loadStudents() }, [loadStudents])

  async function createStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')
    setCreated(null)
    setSaving(true)
    try {
      const result = await request<CreatedStudent>('/users/students', {
        method: 'POST',
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          ...(mobile.trim() ? { mobile: mobile.trim() } : {}),
        }),
      })
      setCreated(result)
      setStudents(current => [result.student, ...current])
      setFirstName('')
      setLastName('')
      setMobile('')
      setMessage('حساب دانش‌آموز ساخته شد. نام کاربری و رمز موقت را همین حالا یادداشت کن.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ثبت دانش‌آموز انجام نشد.')
    } finally {
      setSaving(false)
    }
  }

  async function deactivate(student: Student) {
    if (student.isActive && !window.confirm(`حساب ${student.firstName} ${student.lastName} غیرفعال شود؟`)) return
    setError('')
    setMessage('')
    try {
      await request(`/users/students/${student.id}/deactivate`, { method: 'PATCH' })
      setStudents(current => current.map(item => item.id === student.id ? { ...item, isActive: false } : item))
      setMessage('حساب دانش‌آموز غیرفعال شد.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تغییر وضعیت انجام نشد.')
    }
  }

  async function deleteStudent(student: Student) {
    if (!window.confirm(`حذف دائمی حساب ${student.firstName} ${student.lastName}؟ این کار قابل بازگشت نیست.`)) return
    setError('')
    setMessage('')
    try {
      await request(`/users/students/${student.id}`, { method: 'DELETE' })
      setStudents(current => current.filter(item => item.id !== student.id))
      setMessage('حساب دانش‌آموز حذف شد.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حذف دانش‌آموز انجام نشد.')
    }
  }

  return <div className="management-page" dir="rtl">
    <header className="management-header">
      <button className="secondary-button" onClick={onBack}>← صفحه اصلی</button>
      <strong className="management-brand">Code<span>Quest</span></strong>
      <button className="secondary-button" onClick={onLogout}>خروج از حساب</button>
    </header>
    <main className="management-content">
      <div className="management-title-row">
        <div>
          <p className="management-eyebrow">پنل مدیر مؤسسه</p>
          <h1>مدیریت دانش‌آموزان</h1>
          <p className="muted-text">سلام {auth.user.firstName} {auth.user.lastName}؛ این فهرست فقط دانش‌آموزان مؤسسه شما را نمایش می‌دهد.</p>
        </div>
        <div className="student-count"><strong>{students.length.toLocaleString('fa-IR')}</strong><span>دانش‌آموز</span></div>
      </div>

      {error && <div className="notice error-notice" role="alert">{error}</div>}
      {message && <div className="notice success-notice" role="status">{message}</div>}

      {created && <section className="credential-card">
        <div><strong>اطلاعات ورود دانش‌آموز جدید</strong><p>این رمز فقط هنگام ساخت حساب نمایش داده می‌شود؛ آن را در جای امنی به دانش‌آموز تحویل بده.</p></div>
        <div className="credential-grid">
          <label>نام کاربری <code>{created.student.username}</code></label>
          <label>رمز موقت <code>{created.temporaryPassword}</code></label>
        </div>
        <button className="secondary-button" onClick={() => void navigator.clipboard?.writeText(`نام کاربری: ${created.student.username}\nرمز موقت: ${created.temporaryPassword}`)}>کپی اطلاعات ورود</button>
      </section>}

      <div className="management-columns">
        <section className="management-panel create-panel">
          <div className="panel-heading"><span className="panel-symbol">＋</span><div><h2>ثبت دانش‌آموز</h2><p>حساب جدید برای مؤسسه شما بساز</p></div></div>
          <form className="management-form" onSubmit={createStudent}>
            <label>نام
              <input value={firstName} onChange={e => setFirstName(e.target.value)} maxLength={80} required />
            </label>
            <label>نام خانوادگی
              <input value={lastName} onChange={e => setLastName(e.target.value)} maxLength={100} required />
            </label>
            <label>شماره موبایل <span className="optional-label">(اختیاری)</span>
              <input type="tel" inputMode="tel" value={mobile} onChange={e => setMobile(e.target.value)} maxLength={20} placeholder="مثلاً 09123456789" />
            </label>
            <p className="form-help">نام کاربری و رمز موقت به‌صورت خودکار ساخته می‌شوند. اگر موبایل وارد شود، پیش از ورود باید تأیید شود.</p>
            <button className="primary-button full-button" disabled={saving}>{saving ? 'در حال ثبت…' : 'ساخت حساب دانش‌آموز'} <span>←</span></button>
          </form>
        </section>

        <section className="management-panel roster-panel">
          <div className="panel-heading"><span className="panel-symbol">♙</span><div><h2>فهرست دانش‌آموزان</h2><p>وضعیت حساب‌ها و مدیریت دسترسی</p></div><button className="secondary-button refresh-button" onClick={() => void loadStudents()}>به‌روزرسانی</button></div>
          {loading ? <div className="empty-state">در حال دریافت فهرست…</div> : students.length === 0 ? <div className="empty-state">هنوز دانش‌آموزی ثبت نشده است.</div> :
            <div className="student-list">{students.map(student => <article className="student-row" key={student.id}>
              <div className="student-avatar">{student.firstName.slice(0, 1)}{student.lastName.slice(0, 1)}</div>
              <div className="student-info"><strong>{student.firstName} {student.lastName}</strong><span>نام کاربری: {student.username}</span><span>{student.mobile || 'شماره موبایل ثبت نشده'}</span></div>
              <span className={`status-pill ${student.isActive ? 'active-status' : 'inactive-status'}`}>{student.isActive ? 'فعال' : 'غیرفعال'}</span>
              <div className="student-actions">
                {student.isActive && <button className="small-action" onClick={() => void deactivate(student)}>غیرفعال‌سازی</button>}
                <button className="small-action delete-action" onClick={() => void deleteStudent(student)}>حذف</button>
              </div>
            </article>)}</div>
          }
        </section>
      </div>
    </main>
  </div>
}
