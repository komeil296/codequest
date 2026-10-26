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
  const [activeSection, setActiveSection] = useState<'overview' | 'students' | 'enrollments' | 'courses'>('overview')

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

  const activeCourse = availableCourses.find(course => course.id === selectedEnrollmentCourse)
  const activeNav = (section: typeof activeSection) => setActiveSection(section)

  return <div className="management-page institution-layout" dir="rtl">
    <aside className="institution-sidebar">
      <div className="institution-sidebar-brand"><span className="institution-brand-mark">C</span><div><strong>CodeQuest</strong><small>پنل مؤسسه</small></div></div>
      <div className="institution-user">
        <div className="institution-user-avatar">{auth.user.firstName.slice(0,1)}{auth.user.lastName.slice(0,1)}</div>
        <div><strong>{auth.user.firstName} {auth.user.lastName}</strong><small>مدیر مؤسسه</small></div>
      </div>
      <p className="institution-nav-caption">مدیریت آموزشی</p>
      <nav className="institution-nav" aria-label="منوی مدیریت مؤسسه">
        <button className={activeSection === 'overview' ? 'active' : ''} onClick={() => activeNav('overview')}><span>⌂</span> نمای کلی</button>
        <button className={activeSection === 'students' ? 'active' : ''} onClick={() => activeNav('students')}><span>♙</span> دانش‌آموزان <small>{students.length.toLocaleString('fa-IR')}</small></button>
        <button className={activeSection === 'enrollments' ? 'active' : ''} onClick={() => activeNav('enrollments')}><span>＋</span> ثبت‌نام در دوره</button>
        <button className={activeSection === 'courses' ? 'active' : ''} onClick={() => activeNav('courses')}><span>▣</span> دوره‌های مؤسسه <small>{availableCourses.length.toLocaleString('fa-IR')}</small></button>
      </nav>
      <div className="institution-sidebar-bottom">
        <p>برای شروع، از منوی بالا یک بخش را انتخاب کن.</p>
        <button onClick={onLogout}><span>↪</span> خروج از حساب</button>
      </div>
    </aside>

    <div className="institution-main">
      <header className="institution-topbar">
        <div><span className="institution-topbar-kicker">پنل مدیریت مؤسسه</span><strong>{activeSection === 'overview' ? 'نمای کلی' : activeSection === 'students' ? 'مدیریت دانش‌آموزان' : activeSection === 'enrollments' ? 'ثبت‌نام در دوره‌ها' : 'دوره‌های مؤسسه'}</strong></div>
        <div className="institution-topbar-actions"><span className="institution-current-user">{auth.user.firstName} {auth.user.lastName}</span><button className="secondary-button" onClick={onBack}>صفحه اصلی</button></div>
      </header>

      <main className="management-content institution-content">
        {error && <div className="notice error-notice" role="alert">{error}</div>}
        {message && <div className="notice success-notice" role="status">{message}</div>}

        {activeSection === 'overview' && <>
          <div className="institution-page-heading"><div><p className="management-eyebrow">خوش آمدی</p><h1>سلام {auth.user.firstName} عزیز</h1><p className="muted-text">از اینجا می‌توانی دانش‌آموزان مؤسسه و ثبت‌نام آن‌ها در دوره‌ها را مدیریت کنی.</p></div><button className="primary-button" onClick={() => activeNav('students')}>＋ ساخت دانش‌آموز جدید</button></div>
          <div className="institution-stat-grid">
            <button className="institution-stat-card" onClick={() => activeNav('students')}><span className="institution-stat-icon blue">♙</span><span>کل دانش‌آموزان</span><strong>{students.length.toLocaleString('fa-IR')}</strong><small>مشاهده و مدیریت حساب‌ها ←</small></button>
            <button className="institution-stat-card" onClick={() => activeNav('students')}><span className="institution-stat-icon green">✓</span><span>حساب‌های فعال</span><strong>{students.filter(student => student.isActive).length.toLocaleString('fa-IR')}</strong><small>مدیریت وضعیت دانش‌آموزان ←</small></button>
            <button className="institution-stat-card" onClick={() => activeNav('courses')}><span className="institution-stat-icon purple">▣</span><span>دوره‌های در دسترس</span><strong>{availableCourses.length.toLocaleString('fa-IR')}</strong><small>مشاهده دوره‌ها ←</small></button>
            <button className="institution-stat-card" onClick={() => activeNav('enrollments')}><span className="institution-stat-icon amber">＋</span><span>ثبت‌نام در دوره</span><strong>مدیریت</strong><small>افزودن دانش‌آموز به دوره ←</small></button>
          </div>
          <div className="institution-overview-grid">
            <section className="management-panel institution-quick-panel"><div className="panel-heading"><span className="panel-symbol">⚡</span><div><h2>دسترسی سریع</h2><p>کارهای رایج را از اینجا انجام بده</p></div></div>
              <button className="institution-quick-link" onClick={() => activeNav('students')}><span className="quick-link-icon">＋</span><span><strong>ساخت حساب دانش‌آموز</strong><small>نام و نام خانوادگی را وارد کن تا حساب ساخته شود.</small></span><b>←</b></button>
              <button className="institution-quick-link" onClick={() => activeNav('enrollments')}><span className="quick-link-icon">▣</span><span><strong>ثبت‌نام دانش‌آموز در دوره</strong><small>دوره را انتخاب کن و دانش‌آموزان را اضافه کن.</small></span><b>←</b></button>
              <button className="institution-quick-link" onClick={() => activeNav('courses')}><span className="quick-link-icon">☷</span><span><strong>مشاهده دوره‌های در دسترس</strong><small>فهرست دوره‌هایی که مدیر کل برای مؤسسه فعال کرده است.</small></span><b>←</b></button>
            </section>
            <section className="management-panel institution-recent-panel"><div className="panel-heading"><span className="panel-symbol">♙</span><div><h2>آخرین دانش‌آموزان</h2><p>آخرین حساب‌های موجود در مؤسسه</p></div><button className="secondary-button refresh-button" onClick={() => void loadStudents()}>به‌روزرسانی</button></div>
              {loading ? <div className="empty-state">در حال دریافت فهرست…</div> : students.length === 0 ? <div className="empty-state">هنوز دانش‌آموزی ثبت نشده است. از «ساخت دانش‌آموز جدید» شروع کن.</div> : <div className="student-list">{students.slice(0,5).map(student => <article className="student-row" key={student.id}><div className="student-avatar">{student.firstName.slice(0,1)}{student.lastName.slice(0,1)}</div><div className="student-info"><strong>{student.firstName} {student.lastName}</strong><span>{student.username}</span></div><span className={`status-pill ${student.isActive ? 'active-status' : 'inactive-status'}`}>{student.isActive ? 'فعال' : 'غیرفعال'}</span></article>)}</div>}
              {students.length > 5 && <button className="institution-view-all" onClick={() => activeNav('students')}>مشاهده همه دانش‌آموزان ←</button>}
            </section>
          </div>
        </>}

        {activeSection === 'students' && <>
          <div className="institution-page-heading"><div><p className="management-eyebrow">مدیریت حساب‌ها</p><h1>دانش‌آموزان</h1><p className="muted-text">در این بخش حساب بساز، اطلاعات ورود را تحویل بده و وضعیت حساب‌ها را مدیریت کن.</p></div><div className="institution-heading-count"><strong>{students.length.toLocaleString('fa-IR')}</strong><span>دانش‌آموز</span></div></div>
          {created && <section className="credential-card"><div><strong>اطلاعات ورود دانش‌آموز جدید</strong><p>این رمز فقط هنگام ساخت حساب نمایش داده می‌شود؛ آن را در جای امنی به دانش‌آموز تحویل بده.</p></div><div className="credential-grid"><label>نام کاربری <code>{created.student.username}</code></label><label>رمز موقت <code>{created.temporaryPassword}</code></label></div><button className="secondary-button" onClick={() => void navigator.clipboard?.writeText(`نام کاربری: ${created.student.username}\nرمز موقت: ${created.temporaryPassword}`)}>کپی اطلاعات ورود</button></section>}
          <div className="management-columns institution-student-columns">
            <section className="management-panel create-panel"><div className="panel-heading"><span className="panel-symbol">＋</span><div><h2>ساخت حساب دانش‌آموز</h2><p>حساب جدید برای مؤسسه شما بساز</p></div></div>
              <form className="management-form" onSubmit={createStudent}>
                <label>نام<input value={firstName} onChange={e => setFirstName(e.target.value)} maxLength={80} required /></label>
                <label>نام خانوادگی<input value={lastName} onChange={e => setLastName(e.target.value)} maxLength={100} required /></label>
                <label>شماره موبایل <span className="optional-label">(اختیاری)</span><input type="tel" inputMode="tel" value={mobile} onChange={e => setMobile(e.target.value)} maxLength={20} placeholder="مثلاً 09123456789" /></label>
                <p className="form-help">نام کاربری و رمز موقت به‌صورت خودکار ساخته می‌شوند. اگر موبایل وارد شود، پیش از ورود باید تأیید شود.</p>
                <button className="primary-button full-button" disabled={saving}>{saving ? 'در حال ثبت…' : 'ساخت حساب دانش‌آموز'}</button>
              </form>
            </section>
            <section className="management-panel roster-panel"><div className="panel-heading"><span className="panel-symbol">♙</span><div><h2>فهرست دانش‌آموزان</h2><p>مدیریت وضعیت و اطلاعات حساب‌ها</p></div><button className="secondary-button refresh-button" onClick={() => void loadStudents()}>به‌روزرسانی</button></div>
              {loading ? <div className="empty-state">در حال دریافت فهرست…</div> : students.length === 0 ? <div className="empty-state">هنوز دانش‌آموزی ثبت نشده است.</div> : <div className="student-list">{students.map(student => <article className="student-row" key={student.id}>
                <div className="student-avatar">{student.firstName.slice(0,1)}{student.lastName.slice(0,1)}</div><div className="student-info"><strong>{student.firstName} {student.lastName}</strong><span>نام کاربری: {student.username}</span><span>{student.mobile || 'شماره موبایل ثبت نشده'}</span></div>
                <span className={`status-pill ${student.isActive ? 'active-status' : 'inactive-status'}`}>{student.isActive ? 'فعال' : 'غیرفعال'}</span>
                <div className="student-actions"><button className="small-action" onClick={() => void changePassword(student)}>تغییر رمز</button>{student.isActive ? <button className="small-action" onClick={() => void deactivate(student)}>غیرفعال‌سازی</button> : <button className="small-action" onClick={() => void activate(student)}>فعال‌سازی مجدد</button>}<button className="small-action delete-action" onClick={() => void deleteStudent(student)}>حذف</button></div>
              </article>)}</div>}
            </section>
          </div>
        </>}

        {activeSection === 'courses' && <>
          <div className="institution-page-heading"><div><p className="management-eyebrow">دوره‌های قابل استفاده</p><h1>دوره‌های مؤسسه</h1><p className="muted-text">این دوره‌ها توسط مدیر کل برای مؤسسه فعال شده‌اند؛ برای افزودن دانش‌آموز به یک دوره، وارد بخش ثبت‌نام شو.</p></div><div className="institution-heading-count"><strong>{availableCourses.length.toLocaleString('fa-IR')}</strong><span>دوره در دسترس</span></div></div>
          {availableCourses.length === 0 ? <section className="management-panel"><div className="empty-state">در حال حاضر دوره‌ای برای مؤسسه شما آزاد نشده است. با مدیر کل تماس بگیر.</div></section> : <div className="institution-course-grid">{availableCourses.map(course => <article className="management-panel institution-course-card" key={course.id}><span className="institution-course-icon">▣</span><h2>{course.title}</h2><p>{course.description || 'برای این دوره توضیحی ثبت نشده است.'}</p><button className="primary-button" onClick={() => {setSelectedEnrollmentCourse(course.id);sessionStorage.setItem('codequest_institution_course',course.id);activeNav('enrollments')}}>مدیریت ثبت‌نام‌ها ←</button></article>)}</div>}
        </>}

        {activeSection === 'enrollments' && <>
          <div className="institution-page-heading"><div><p className="management-eyebrow">تخصیص دانش‌آموزان</p><h1>ثبت‌نام در دوره</h1><p className="muted-text">یک دوره را انتخاب کن، دانش‌آموزان موردنظر را علامت بزن و ثبت‌نام را انجام بده.</p></div></div>
          <section className="management-panel enrollment-panel">
            <div className="panel-heading"><span className="panel-symbol">▣</span><div><h2>انتخاب دوره</h2><p>فقط دوره‌هایی نمایش داده می‌شوند که مدیر کل برای مؤسسه شما آزاد کرده است.</p></div></div>
            {availableCourses.length === 0 ? <div className="empty-state">در حال حاضر دوره‌ای برای مؤسسه شما آزاد نشده است.</div> : <>
              <label className="enrollment-course-label">دوره موردنظر<select value={selectedEnrollmentCourse} onChange={e => {sessionStorage.setItem('codequest_institution_course',e.target.value);setSelectedEnrollmentCourse(e.target.value)}}>{availableCourses.map(course => <option key={course.id} value={course.id}>{course.title}</option>)}</select></label>
              {activeCourse && <p className="institution-selected-course">{activeCourse.title}{activeCourse.description ? ` — ${activeCourse.description}` : ''}</p>}
              <form onSubmit={enrollSelectedStudents}><div className="enrollment-layout">
                <div className="enrollment-student-picker"><h3>دانش‌آموزان قابل ثبت‌نام</h3><p className="form-help">فقط دانش‌آموزان فعال که هنوز در این دوره ثبت‌نام نشده‌اند.</p>
                  {students.filter(student => student.isActive && !courseEnrollments.some(item => item.student.id === student.id)).length === 0 ? <div className="empty-state">دانش‌آموز فعالی برای ثبت‌نام باقی نمانده است.</div> : <div className="enrollment-checkbox-list">{students.filter(student => student.isActive && !courseEnrollments.some(item => item.student.id === student.id)).map(student => <label className="enrollment-checkbox" key={student.id}><input type="checkbox" checked={selectedEnrollmentStudents.includes(student.id)} onChange={event => setSelectedEnrollmentStudents(current => event.target.checked ? [...current,student.id] : current.filter(id => id !== student.id))}/><span><strong>{student.firstName} {student.lastName}</strong><small>{student.username}</small></span></label>)}</div>}
                  <button className="primary-button full-button" disabled={saving || selectedEnrollmentStudents.length === 0}>{saving ? 'در حال ثبت‌نام…' : `ثبت‌نام ${selectedEnrollmentStudents.length.toLocaleString('fa-IR')} دانش‌آموز`}</button>
                </div>
                <div className="enrolled-students"><h3>ثبت‌نام‌شده‌های این دوره <span>{courseEnrollments.length.toLocaleString('fa-IR')}</span></h3>{courseEnrollments.length === 0 ? <div className="empty-state">هنوز دانش‌آموزی در این دوره ثبت‌نام نشده است.</div> : <div className="student-list">{courseEnrollments.map(item => <article className="enrolled-student-row" key={item.id}><div className="student-avatar">{item.student.firstName.slice(0,1)}{item.student.lastName.slice(0,1)}</div><div className="student-info"><strong>{item.student.firstName} {item.student.lastName}</strong><span>نام کاربری: {item.student.username}</span></div><span className={`status-pill ${item.student.isActive ? 'active-status' : 'inactive-status'}`}>{item.student.isActive ? 'فعال' : 'غیرفعال'}</span></article>)}</div>}</div>
              </div></form>
            </>}
          </section>
        </>}
      </main>
    </div>
  </div>
}
}
