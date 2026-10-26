import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { apiRequest, type AuthUser, type Student, type CreatedStudent } from './api'
import './Management.css'

type CourseOption = { id: string; title: string; description: string | null }
type CourseEnrollment = { id: string; createdAt: string; student: { id: string; firstName: string; lastName: string; username: string; isActive: boolean } }

type Props = {
  auth: { token: string; user: AuthUser }
  onBack: () => void
  onLogout: () => void
}

export default function StudentManagement({ auth, onBack, onLogout }: Props) {
  const [students, setStudents] = useState<Student[]>([])
  const [availableCourses, setAvailableCourses] = useState<CourseOption[]>([])
  const [selectedEnrollmentCourse, setSelectedEnrollmentCourse] = useState(() => sessionStorage.getItem('codequest_institution_course') || '')
  const [courseEnrollments, setCourseEnrollments] = useState<CourseEnrollment[]>([])
  const [selectedEnrollmentStudents, setSelectedEnrollmentStudents] = useState<string[]>([])
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

  const loadAvailableCourses = useCallback(async () => {
    const items = await request<CourseOption[]>('/course-enrollments/courses')
    setAvailableCourses(items)
    setSelectedEnrollmentCourse(current => {
      const nextCourse = current && items.some(item => item.id === current) ? current : items[0]?.id || ''
      if (nextCourse) sessionStorage.setItem('codequest_institution_course', nextCourse)
      else sessionStorage.removeItem('codequest_institution_course')
      return nextCourse
    })
  }, [request])

  const loadCourseEnrollments = useCallback(async (courseId: string) => {
    if (!courseId) { setCourseEnrollments([]); return }
    setCourseEnrollments(await request<CourseEnrollment[]>(`/course-enrollments/${courseId}`))
  }, [request])

  useEffect(() => { void loadStudents() }, [loadStudents])
  useEffect(() => {
    void loadAvailableCourses().catch(err => setError(err instanceof Error ? err.message : 'دریافت دوره‌های مجاز ناموفق بود.'))
  }, [loadAvailableCourses])
  useEffect(() => {
    setSelectedEnrollmentStudents([])
    void loadCourseEnrollments(selectedEnrollmentCourse).catch(err => setError(err instanceof Error ? err.message : 'دریافت ثبت‌نام‌های دوره ناموفق بود.'))
  }, [selectedEnrollmentCourse, loadCourseEnrollments])

  async function enrollSelectedStudents(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedEnrollmentCourse) { setError('برای مؤسسه شما دوره آزادی وجود ندارد.'); return }
    if (selectedEnrollmentStudents.length === 0) { setError('حداقل یک دانش‌آموز فعال را انتخاب کن.'); return }
    setError('')
    setMessage('')
    setSaving(true)
    try {
      const result = await request<{ enrolledCount: number; alreadyEnrolledCount: number }>(`/course-enrollments/${selectedEnrollmentCourse}`, {
        method: 'POST',
        body: JSON.stringify({ studentIds: selectedEnrollmentStudents }),
      })
      await loadCourseEnrollments(selectedEnrollmentCourse)
      setSelectedEnrollmentStudents([])
      setMessage(`ثبت‌نام انجام شد: ${result.enrolledCount} دانش‌آموز جدید؛ ${result.alreadyEnrolledCount} نفر از قبل ثبت‌نام بودند.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ثبت‌نام دانش‌آموزان ناموفق بود.')
    } finally {
      setSaving(false)
    }
  }

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
    if (!window.confirm(`حساب ${student.firstName} ${student.lastName} غیرفعال شود؟`)) return
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

  async function activate(student: Student) {
    if (!window.confirm(`حساب ${student.firstName} ${student.lastName} دوباره فعال شود؟`)) return
    setError('')
    setMessage('')
    try {
      await request(`/users/students/${student.id}/activate`, { method: 'PATCH' })
      setStudents(current => current.map(item => item.id === student.id ? { ...item, isActive: true } : item))
      setMessage('حساب دانش‌آموز دوباره فعال شد.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فعال‌سازی مجدد انجام نشد.')
    }
  }

  async function changePassword(student: Student) {
    const password = window.prompt(`رمز جدید برای ${student.firstName} ${student.lastName} را وارد کن (حداقل ۸ کاراکتر):`)
    if (password === null) return
    if (password.length < 8 || password.length > 72) {
      setError('رمز عبور باید بین ۸ تا ۷۲ کاراکتر باشد.')
      return
    }
    if (!window.confirm(`رمز عبور این دانش‌آموز تغییر کند؟`)) return
    setError('')
    setMessage('')
    try {
      await request(`/users/students/${student.id}/password`, {
        method: 'PATCH',
        body: JSON.stringify({ password }),
      })
      setMessage(`رمز عبور ${student.firstName} ${student.lastName} تغییر کرد.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تغییر رمز عبور انجام نشد.')
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
                <button className="small-action" onClick={() => void changePassword(student)}>تغییر رمز</button>
                {student.isActive
                  ? <button className="small-action" onClick={() => void deactivate(student)}>غیرفعال‌سازی</button>
                  : <button className="small-action" onClick={() => void activate(student)}>فعال‌سازی مجدد</button>}
                <button className="small-action delete-action" onClick={() => void deleteStudent(student)}>حذف</button>
              </div>
            </article>)}</div>
          }
        </section>
      </div>

      <section className="management-panel enrollment-panel">
        <div className="panel-heading">
          <span className="panel-symbol">▣</span>
          <div><h2>ثبت‌نام دانش‌آموز در دوره</h2><p>فقط دوره‌هایی نمایش داده می‌شوند که مدیر کل برای مؤسسه شما آزاد کرده است.</p></div>
        </div>
        {availableCourses.length === 0 ? <div className="empty-state">در حال حاضر دوره فعالی برای مؤسسه شما آزاد نشده است.</div> : <>
          <label className="enrollment-course-label">انتخاب دوره
            <select value={selectedEnrollmentCourse} onChange={e => {
              sessionStorage.setItem('codequest_institution_course', e.target.value)
              setSelectedEnrollmentCourse(e.target.value)
            }}>
              {availableCourses.map(course => <option key={course.id} value={course.id}>{course.title}</option>)}
            </select>
          </label>
          <form onSubmit={enrollSelectedStudents}>
            <div className="enrollment-layout">
              <div className="enrollment-student-picker">
                <h3>دانش‌آموزان قابل ثبت‌نام</h3>
                <p className="form-help">دانش‌آموزان غیرفعال یا ثبت‌نام‌شده در این فهرست نیستند.</p>
                {students.filter(student => student.isActive && !courseEnrollments.some(item => item.student.id === student.id)).length === 0
                  ? <div className="empty-state">دانش‌آموز فعالی برای ثبت‌نام باقی نمانده است.</div>
                  : <div className="enrollment-checkbox-list">
                    {students.filter(student => student.isActive && !courseEnrollments.some(item => item.student.id === student.id)).map(student => (
                      <label className="enrollment-checkbox" key={student.id}>
                        <input type="checkbox" checked={selectedEnrollmentStudents.includes(student.id)} onChange={event => setSelectedEnrollmentStudents(current => event.target.checked ? [...current, student.id] : current.filter(id => id !== student.id))} />
                        <span><strong>{student.firstName} {student.lastName}</strong><small>{student.username}</small></span>
                      </label>
                    ))}
                  </div>}
                <button className="primary-button full-button" disabled={saving || selectedEnrollmentStudents.length === 0}>{saving ? 'در حال ثبت‌نام…' : `ثبت‌نام ${selectedEnrollmentStudents.length.toLocaleString('fa-IR')} دانش‌آموز`} <span>←</span></button>
              </div>
              <div className="enrolled-students">
                <h3>ثبت‌نام‌شده‌های این دوره <span>{courseEnrollments.length.toLocaleString('fa-IR')}</span></h3>
                {courseEnrollments.length === 0 ? <div className="empty-state">هنوز دانش‌آموزی در این دوره ثبت‌نام نشده است.</div> :
                  <div className="student-list">{courseEnrollments.map(item => <article className="enrolled-student-row" key={item.id}>
                    <div className="student-avatar">{item.student.firstName.slice(0, 1)}{item.student.lastName.slice(0, 1)}</div>
                    <div className="student-info"><strong>{item.student.firstName} {item.student.lastName}</strong><span>نام کاربری: {item.student.username}</span></div>
                    <span className={`status-pill ${item.student.isActive ? 'active-status' : 'inactive-status'}`}>{item.student.isActive ? 'فعال' : 'غیرفعال'}</span>
                  </article>)}</div>}
              </div>
            </div>
          </form>
        </>}
      </section>
    </main>
  </div>
}
