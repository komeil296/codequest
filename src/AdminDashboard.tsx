import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { apiRequest, type AuthUser } from './api'
import './AdminDashboard.css'

type Props = { auth: { token: string; user: AuthUser }; onLogout: () => void; onBack: () => void }
type Course = { id: string; title: string; description: string | null; isActive: boolean; createdAt: string }
type Lesson = { id: string; courseId?: string; title: string; description: string | null; sortOrder: number; isActive: boolean }
type Institution = { id: string; name: string; isActive: boolean; createdAt: string }
type Student = { id: string; firstName: string; lastName: string; username: string; mobile: string | null; institutionId: string | null; institutionName?: string | null; isActive: boolean; createdAt: string }
type CreatedStudent = { student: Student; temporaryPassword: string }
type InstitutionAdmin = { id: string; firstName: string; lastName: string; username: string; mobile: string; institutionId: string | null; institutionName?: string | null; isActive: boolean; createdAt: string }
type Tab = 'overview' | 'courses' | 'lessons' | 'students' | 'institutions' | 'institution-admins'

export default function AdminDashboard({ auth, onLogout, onBack }: Props) {
  const [tab, setTab] = useState<Tab>('overview')
  const [courses, setCourses] = useState<Course[]>([])
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [institutionAdmins, setInstitutionAdmins] = useState<InstitutionAdmin[]>([])
  const [selectedCourse, setSelectedCourse] = useState('')
  const [courseTitle, setCourseTitle] = useState('')
  const [courseDescription, setCourseDescription] = useState('')
  const [lessonTitle, setLessonTitle] = useState('')
  const [lessonDescription, setLessonDescription] = useState('')
  const [lessonOrder, setLessonOrder] = useState('0')
  const [institutionName, setInstitutionName] = useState('')
  const [adminFirstName, setAdminFirstName] = useState('')
  const [adminLastName, setAdminLastName] = useState('')
  const [adminMobile, setAdminMobile] = useState('')
  const [adminUsername, setAdminUsername] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [adminInstitution, setAdminInstitution] = useState('')
  const [studentFirstName, setStudentFirstName] = useState('')
  const [studentLastName, setStudentLastName] = useState('')
  const [studentMobile, setStudentMobile] = useState('')
  const [studentInstitution, setStudentInstitution] = useState('')
  const [createdStudent, setCreatedStudent] = useState<CreatedStudent | null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const request = useCallback(<T,>(path: string, init: RequestInit = {}) =>
    apiRequest<T>(path, { ...init, token: auth.token }), [auth.token])

  const loadCourses = useCallback(async () => {
    const items = await request<Course[]>('/courses')
    setCourses(items)
    setSelectedCourse(current => current || items[0]?.id || '')
  }, [request])

  const loadInstitutions = useCallback(async () => {
    setInstitutions(await request<Institution[]>('/institutions/admin/all'))
  }, [request])

  const loadStudents = useCallback(async () => {
    setStudents(await request<Student[]>('/users/admin/students'))
  }, [request])

  const loadInstitutionAdmins = useCallback(async () => {
    setInstitutionAdmins(await request<InstitutionAdmin[]>('/users/admin/institution-admins'))
  }, [request])

  const loadLessons = useCallback(async (courseId: string) => {
    if (!courseId) { setLessons([]); return }
    setLessons(await request<Lesson[]>(`/courses/${courseId}/lessons`))
  }, [request])

  const refreshAll = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [courseItems, institutionItems, studentItems, adminItems] = await Promise.all([
        request<Course[]>('/courses'),
        request<Institution[]>('/institutions/admin/all'),
        request<Student[]>('/users/admin/students'),
        request<InstitutionAdmin[]>('/users/admin/institution-admins'),
      ])
      setCourses(courseItems)
      setInstitutions(institutionItems)
      setStudents(studentItems)
      setInstitutionAdmins(adminItems)
      setSelectedCourse(current => current && courseItems.some(item => item.id === current) ? current : courseItems[0]?.id || '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'دریافت اطلاعات پنل ناموفق بود.')
    } finally {
      setLoading(false)
    }
  }, [request])

  useEffect(() => { void refreshAll() }, [refreshAll])
  useEffect(() => {
    if (!selectedCourse) { setLessons([]); return }
    void loadLessons(selectedCourse).catch(err => setError(err instanceof Error ? err.message : 'دریافت درس‌ها ناموفق بود.'))
  }, [selectedCourse, loadLessons])

  async function runAction(action: () => Promise<unknown>, success: string) {
    setError('')
    setMessage('')
    setSaving(true)
    try {
      await action()
      setMessage(success)
      await refreshAll()
      if (selectedCourse) await loadLessons(selectedCourse)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'عملیات انجام نشد.')
    } finally {
      setSaving(false)
    }
  }

  async function createCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await runAction(async () => {
      await request<Course>('/courses', { method: 'POST', body: JSON.stringify({ title: courseTitle.trim(), description: courseDescription.trim() || undefined }) })
      setCourseTitle('')
      setCourseDescription('')
    }, 'دوره جدید با موفقیت ساخته شد.')
  }

  async function createLesson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedCourse) { setError('ابتدا یک دوره انتخاب یا ایجاد کن.'); return }
    await runAction(async () => {
      await request<Lesson>(`/courses/${selectedCourse}/lessons`, { method: 'POST', body: JSON.stringify({ title: lessonTitle.trim(), description: lessonDescription.trim() || undefined, sortOrder: Number(lessonOrder) }) })
      setLessonTitle('')
      setLessonDescription('')
      setLessonOrder(String(lessons.length + 1))
    }, 'درس جدید به دوره اضافه شد.')
  }

  async function createInstitution(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await runAction(async () => {
      await request<Institution>('/institutions', { method: 'POST', body: JSON.stringify({ name: institutionName.trim() }) })
      setInstitutionName('')
    }, 'مؤسسه ساخته شد و برای استفاده باید فعال شود.')
  }

  async function createInstitutionAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!adminInstitution) { setError('برای مدیر، یک مؤسسه فعال انتخاب کن.'); return }
    await runAction(async () => {
      await request<InstitutionAdmin>('/users/institution-admin', {
        method: 'POST',
        body: JSON.stringify({
          firstName: adminFirstName.trim(),
          lastName: adminLastName.trim(),
          mobile: adminMobile.trim(),
          username: adminUsername.trim(),
          password: adminPassword,
          institutionId: adminInstitution,
        }),
      })
      setAdminFirstName('')
      setAdminLastName('')
      setAdminMobile('')
      setAdminUsername('')
      setAdminPassword('')
    }, 'حساب مدیر مؤسسه ساخته شد.')
  }

  async function toggleInstitutionAdmin(admin: InstitutionAdmin) {
    await runAction(
      () => request(`/users/admin/institution-admins/${admin.id}/${admin.isActive ? 'deactivate' : 'activate'}`, { method: 'PATCH' }),
      admin.isActive ? 'حساب مدیر مؤسسه غیرفعال شد.' : 'حساب مدیر مؤسسه فعال شد.',
    )
  }

  async function createStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!studentInstitution) { setError('برای دانش‌آموز یک مؤسسه انتخاب کن.'); return }
    await runAction(async () => {
      const result = await request<CreatedStudent>('/users/admin/students', {
        method: 'POST',
        body: JSON.stringify({ firstName: studentFirstName.trim(), lastName: studentLastName.trim(), ...(studentMobile.trim() ? { mobile: studentMobile.trim() } : {}), institutionId: studentInstitution }),
      })
      setCreatedStudent(result)
      setStudentFirstName('')
      setStudentLastName('')
      setStudentMobile('')
    }, 'حساب دانش‌آموز ساخته شد.')
  }

  async function toggleCourse(course: Course) {
    await runAction(() => request(`/courses/${course.id}/${course.isActive ? 'deactivate' : 'activate'}`, { method: 'PATCH' }), course.isActive ? 'دوره غیرفعال شد.' : 'دوره فعال شد.')
  }

  async function editCourse(course: Course) {
    const title = window.prompt('عنوان دوره:', course.title)
    if (title === null) return
    const description = window.prompt('توضیحات دوره (خالی برای پاک‌کردن):', course.description || '')
    if (description === null) return
    await runAction(() => request(`/courses/${course.id}`, { method: 'PATCH', body: JSON.stringify({ title: title.trim(), description: description.trim() || null }) }), 'دوره به‌روزرسانی شد.')
  }

  async function toggleLesson(lesson: Lesson) {
    await runAction(() => request(`/lessons/${lesson.id}/${lesson.isActive ? 'deactivate' : 'activate'}`, { method: 'PATCH' }), lesson.isActive ? 'درس غیرفعال شد.' : 'درس فعال شد.')
  }

  async function editLesson(lesson: Lesson) {
    const title = window.prompt('عنوان درس:', lesson.title)
    if (title === null) return
    const description = window.prompt('توضیحات درس:', lesson.description || '')
    if (description === null) return
    const order = window.prompt('ترتیب نمایش (عدد):', String(lesson.sortOrder))
    if (order === null || !Number.isInteger(Number(order)) || Number(order) < 0) return
    await runAction(() => request(`/lessons/${lesson.id}`, { method: 'PATCH', body: JSON.stringify({ title: title.trim(), description: description.trim() || null, sortOrder: Number(order) }) }), 'درس به‌روزرسانی شد.')
  }

  async function editInstitution(institution: Institution) {
    const name = window.prompt('نام مؤسسه:', institution.name)
    if (name === null) return
    if (name.trim().length < 2 || name.trim().length > 150) {
      setError('نام مؤسسه باید بین ۲ تا ۱۵۰ کاراکتر باشد.')
      return
    }
    await runAction(
      () => request(`/institutions/${institution.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: name.trim() }),
      }),
      'نام مؤسسه به‌روزرسانی شد.',
    )
  }

  async function toggleInstitution(institution: Institution) {
    await runAction(() => request(`/institutions/${institution.id}/${institution.isActive ? 'deactivate' : 'activate'}`, { method: 'PATCH' }), institution.isActive ? 'مؤسسه غیرفعال شد.' : 'مؤسسه فعال شد.')
  }

  async function toggleStudent(student: Student) {
    await runAction(() => request(`/users/admin/students/${student.id}/${student.isActive ? 'deactivate' : 'activate'}`, { method: 'PATCH' }), student.isActive ? 'دانش‌آموز غیرفعال شد.' : 'دانش‌آموز فعال شد.')
  }

  async function changeStudentPassword(student: Student) {
    const password = window.prompt(`رمز جدید برای ${student.firstName} ${student.lastName} (حداقل ۸ کاراکتر):`)
    if (password === null) return
    if (password.length < 8 || password.length > 72) { setError('رمز عبور باید بین ۸ تا ۷۲ کاراکتر باشد.'); return }
    await runAction(() => request(`/users/admin/students/${student.id}/password`, { method: 'PATCH', body: JSON.stringify({ password }) }), 'رمز عبور تغییر کرد.')
  }

  async function deleteStudent(student: Student) {
    if (!window.confirm(`حذف دائمی دانش‌آموز ${student.firstName} ${student.lastName}؟ این کار قابل بازگشت نیست.`)) return
    await runAction(() => request(`/users/admin/students/${student.id}`, { method: 'DELETE' }), 'دانش‌آموز حذف شد.')
  }

  const filteredStudents = students.filter(student => `${student.firstName} ${student.lastName} ${student.username} ${student.institutionName || ''}`.toLowerCase().includes(search.toLowerCase()))
  const filteredAdmins = institutionAdmins.filter(admin => `${admin.firstName} ${admin.lastName} ${admin.username} ${admin.mobile} ${admin.institutionName || ''}`.toLowerCase().includes(search.toLowerCase()))
  const filteredInstitutions = institutions.filter(item => item.name.toLowerCase().includes(search.toLowerCase()))
  const filteredCourses = courses.filter(item => item.title.toLowerCase().includes(search.toLowerCase()))
  const nav: { id: Tab; label: string; icon: string }[] = [
    { id: 'overview', label: 'نمای کلی', icon: '◈' },
    { id: 'courses', label: 'دوره‌ها', icon: '▣' },
    { id: 'lessons', label: 'درس‌ها', icon: '▤' },
    { id: 'students', label: 'دانش‌آموزان', icon: '♙' },
    { id: 'institutions', label: 'مؤسسات', icon: '⌂' },
    { id: 'institution-admins', label: 'مدیران مؤسسات', icon: '♧' },
  ]

  return <div className="admin-shell" dir="rtl">
    <aside className="admin-sidebar">
      <a className="admin-brand" href="#admin-home"><span className="admin-brand-mark">C</span><span>Code<span>Quest</span></span></a>
      <div className="admin-user"><div className="admin-avatar">{auth.user.firstName.slice(0, 1)}</div><div><strong>{auth.user.firstName} {auth.user.lastName}</strong><small>مدیر کل سیستم</small></div><span className="admin-role">ADMIN</span></div>
      <p className="admin-nav-label">مدیریت آموزش</p>
      <nav className="admin-nav">{nav.map(item => <button key={item.id} className={tab === item.id ? 'active' : ''} onClick={() => { setTab(item.id); setSearch('') }}><span>{item.icon}</span>{item.label}<b>←</b></button>)}</nav>
      <div className="admin-sidebar-bottom"><div className="admin-sidebar-note"><span>✦</span><div><strong>فضای مدیریت</strong><small>ساخت مسیرهای یادگیری</small></div></div><button className="admin-logout" onClick={onLogout}>↪ خروج از حساب</button></div>
    </aside>
    <main className="admin-main" id="admin-home">
      <header className="admin-topbar"><div><p>پنل مدیریت CodeQuest</p><h1>{nav.find(item => item.id === tab)?.label}</h1></div><div className="admin-top-actions"><span className="admin-online"><i /> اتصال به پنل</span><button onClick={() => void refreshAll()} disabled={loading}>↻ تازه‌سازی</button><button onClick={onBack}>صفحه اصلی</button></div></header>
      {error && <div className="admin-notice admin-error" role="alert">{error}</div>}
      {message && <div className="admin-notice admin-success" role="status">{message}</div>}
      {loading && <div className="admin-loading">در حال دریافت اطلاعات…</div>}
      {tab === 'overview' && <section className="admin-overview">
        <div className="admin-welcome"><div><span className="admin-kicker">مرکز فرماندهی</span><h2>آماده‌ای مسیر یادگیری بسازی؟</h2><p>دوره‌ها، درس‌ها، دانش‌آموزان و مؤسسات را از یکجا مدیریت کن.</p><button onClick={() => setTab('courses')}>مدیریت دوره‌ها <span>←</span></button></div><div className="admin-welcome-art"><span>✦</span><b>{'{ }'}</b><i>⌘</i></div></div>
        <div className="admin-stat-grid"><article><span className="admin-stat-icon purple">▣</span><div><small>کل دوره‌ها</small><strong>{courses.length.toLocaleString('fa-IR')}</strong><em>{courses.filter(x => x.isActive).length.toLocaleString('fa-IR')} دوره فعال</em></div></article><article><span className="admin-stat-icon blue">▤</span><div><small>درس‌های دوره منتخب</small><strong>{lessons.length.toLocaleString('fa-IR')}</strong><em>دوره انتخاب‌شده</em></div></article><article><span className="admin-stat-icon green">♙</span><div><small>دانش‌آموزان</small><strong>{students.length.toLocaleString('fa-IR')}</strong><em>{students.filter(x => x.isActive).length.toLocaleString('fa-IR')} حساب فعال</em></div></article><article><span className="admin-stat-icon amber">⌂</span><div><small>مؤسسات</small><strong>{institutions.length.toLocaleString('fa-IR')}</strong><em>{institutions.filter(x => x.isActive).length.toLocaleString('fa-IR')} مؤسسه فعال</em></div></article></div>
        <div className="admin-quick-grid"><button onClick={() => setTab('courses')}><span>＋</span><strong>ساخت دوره جدید</strong><small>تعریف یک مسیر آموزشی</small><b>←</b></button><button onClick={() => setTab('lessons')}><span>▤</span><strong>مدیریت درس‌ها</strong><small>مرتب‌سازی محتوای دوره‌ها</small><b>←</b></button><button onClick={() => setTab('students')}><span>♙</span><strong>ثبت دانش‌آموز</strong><small>ایجاد حساب و تعیین مؤسسه</small><b>←</b></button></div>
      </section>}
      {tab === 'courses' && <section className="admin-work-grid"><form className="admin-panel admin-create-form" onSubmit={createCourse}><div className="admin-panel-heading"><span>＋</span><div><h2>ساخت دوره</h2><p>یک دوره آموزشی تازه تعریف کن.</p></div></div><label>عنوان دوره<input value={courseTitle} onChange={e => setCourseTitle(e.target.value)} minLength={2} maxLength={150} required placeholder="مثلاً JavaScript مقدماتی" /></label><label>توضیحات<textarea value={courseDescription} onChange={e => setCourseDescription(e.target.value)} maxLength={5000} rows={4} placeholder="این دوره درباره چیست؟" /></label><button className="admin-primary" disabled={saving}>{saving ? 'در حال ذخیره…' : 'ساخت دوره'} <span>←</span></button></form><section className="admin-panel admin-list-panel"><div className="admin-panel-heading"><span>▣</span><div><h2>فهرست دوره‌ها</h2><p>{courses.length.toLocaleString('fa-IR')} دوره ثبت‌شده</p></div><input className="admin-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="جست‌وجوی دوره…" /></div><div className="admin-table-wrap"><table><thead><tr><th>عنوان دوره</th><th>وضعیت</th><th>عملیات</th></tr></thead><tbody>{filteredCourses.map(course => <tr key={course.id}><td><strong>{course.title}</strong><small>{course.description || 'بدون توضیحات'}</small></td><td><span className={`admin-status ${course.isActive ? 'is-active' : 'is-inactive'}`}>{course.isActive ? 'فعال' : 'غیرفعال'}</span></td><td><div className="admin-row-actions"><button onClick={() => { setSelectedCourse(course.id); setTab('lessons') }}>درس‌ها</button><button onClick={() => void editCourse(course)}>ویرایش</button><button onClick={() => void toggleCourse(course)}>{course.isActive ? 'غیرفعال' : 'فعال‌سازی'}</button></div></td></tr>)}</tbody></table>{filteredCourses.length === 0 && <div className="admin-empty">هنوز دوره‌ای ثبت نشده است.</div>}</div></section></section>}
      {tab === 'lessons' && <section className="admin-work-grid"><form className="admin-panel admin-create-form" onSubmit={createLesson}><div className="admin-panel-heading"><span>＋</span><div><h2>تعریف درس</h2><p>ابتدا دوره و سپس مشخصات درس را وارد کن.</p></div></div><label>دوره<select value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)} required><option value="">انتخاب دوره</option>{courses.map(course => <option key={course.id} value={course.id}>{course.title}{course.isActive ? '' : ' (غیرفعال)'}</option>)}</select></label><label>عنوان درس<input value={lessonTitle} onChange={e => setLessonTitle(e.target.value)} minLength={2} maxLength={150} required placeholder="مثلاً آشنایی با متغیرها" /></label><label>توضیحات<textarea value={lessonDescription} onChange={e => setLessonDescription(e.target.value)} maxLength={5000} rows={3} placeholder="خلاصه‌ای از درس" /></label><label>ترتیب نمایش<input type="number" min="0" max="100000" value={lessonOrder} onChange={e => setLessonOrder(e.target.value)} required /></label><button className="admin-primary" disabled={saving || !selectedCourse}>{saving ? 'در حال ذخیره…' : 'افزودن درس'} <span>←</span></button></form><section className="admin-panel admin-list-panel"><div className="admin-panel-heading"><span>▤</span><div><h2>درس‌های دوره</h2><p>{courses.find(c => c.id === selectedCourse)?.title || 'یک دوره انتخاب کن'}</p></div></div><div className="admin-lesson-list">{lessons.map(lesson => <article key={lesson.id}><span className="admin-lesson-order">{(lesson.sortOrder + 1).toLocaleString('fa-IR')}</span><div className="admin-lesson-info"><strong>{lesson.title}</strong><small>{lesson.description || 'بدون توضیحات'}</small></div><span className={`admin-status ${lesson.isActive ? 'is-active' : 'is-inactive'}`}>{lesson.isActive ? 'فعال' : 'غیرفعال'}</span><div className="admin-row-actions"><button onClick={() => void editLesson(lesson)}>ویرایش</button><button onClick={() => void toggleLesson(lesson)}>{lesson.isActive ? 'غیرفعال' : 'فعال‌سازی'}</button></div></article>)}{lessons.length === 0 && <div className="admin-empty">برای این دوره هنوز درسی تعریف نشده است.</div>}</div></section></section>}
      {tab === 'students' && <section className="admin-work-grid"><form className="admin-panel admin-create-form" onSubmit={createStudent}><div className="admin-panel-heading"><span>＋</span><div><h2>ثبت دانش‌آموز</h2><p>حساب دانش‌آموز را به یک مؤسسه فعال وصل کن.</p></div></div><label>نام<input value={studentFirstName} onChange={e => setStudentFirstName(e.target.value)} maxLength={80} required /></label><label>نام خانوادگی<input value={studentLastName} onChange={e => setStudentLastName(e.target.value)} maxLength={100} required /></label><label>شماره موبایل <small>اختیاری</small><input value={studentMobile} onChange={e => setStudentMobile(e.target.value)} maxLength={20} /></label><label>مؤسسه<select value={studentInstitution} onChange={e => setStudentInstitution(e.target.value)} required><option value="">انتخاب مؤسسه فعال</option>{institutions.filter(x => x.isActive).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><button className="admin-primary" disabled={saving || !institutions.some(x => x.isActive)}>{saving ? 'در حال ذخیره…' : 'ساخت حساب دانش‌آموز'} <span>←</span></button></form><section className="admin-panel admin-list-panel"><div className="admin-panel-heading"><span>♙</span><div><h2>همه دانش‌آموزان</h2><p>{students.length.toLocaleString('fa-IR')} حساب در تمام مؤسسات</p></div><input className="admin-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="جست‌وجو…" /></div>{createdStudent && <div className="admin-credentials"><strong>اطلاعات ورود — این رمز را ذخیره کن</strong><p>نام کاربری: <code>{createdStudent.student.username}</code></p><p>رمز موقت: <code>{createdStudent.temporaryPassword}</code></p><button onClick={() => void navigator.clipboard?.writeText(`نام کاربری: ${createdStudent.student.username}\nرمز موقت: ${createdStudent.temporaryPassword}`)}>کپی اطلاعات ورود</button></div>}<div className="admin-table-wrap"><table><thead><tr><th>دانش‌آموز</th><th>مؤسسه</th><th>وضعیت</th><th>عملیات</th></tr></thead><tbody>{filteredStudents.map(student => <tr key={student.id}><td><strong>{student.firstName} {student.lastName}</strong><small>{student.username} · {student.mobile || 'بدون موبایل'}</small></td><td>{student.institutionName || 'بدون مؤسسه'}</td><td><span className={`admin-status ${student.isActive ? 'is-active' : 'is-inactive'}`}>{student.isActive ? 'فعال' : 'غیرفعال'}</span></td><td><div className="admin-row-actions"><button onClick={() => void changeStudentPassword(student)}>تغییر رمز</button><button onClick={() => void toggleStudent(student)}>{student.isActive ? 'غیرفعال' : 'فعال‌سازی'}</button><button className="admin-danger" onClick={() => void deleteStudent(student)}>حذف</button></div></td></tr>)}</tbody></table>{filteredStudents.length === 0 && <div className="admin-empty">دانش‌آموزی پیدا نشد.</div>}</div></section></section>}
      {tab === 'institution-admins' && <section className="admin-work-grid"><form className="admin-panel admin-create-form" onSubmit={createInstitutionAdmin}><div className="admin-panel-heading"><span>＋</span><div><h2>ساخت مدیر مؤسسه</h2><p>برای هر مؤسسه حساب مدیریتی بساز.</p></div></div><label>نام<input value={adminFirstName} onChange={e => setAdminFirstName(e.target.value)} maxLength={80} required /></label><label>نام خانوادگی<input value={adminLastName} onChange={e => setAdminLastName(e.target.value)} maxLength={100} required /></label><label>شماره موبایل<input value={adminMobile} onChange={e => setAdminMobile(e.target.value)} maxLength={20} required /></label><label>نام کاربری<input value={adminUsername} onChange={e => setAdminUsername(e.target.value)} maxLength={50} required /></label><label>رمز عبور <small>حداقل ۱۰ کاراکتر</small><input type="password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} minLength={10} maxLength={72} required /></label><label>مؤسسه<select value={adminInstitution} onChange={e => setAdminInstitution(e.target.value)} required><option value="">انتخاب مؤسسه فعال</option>{institutions.filter(item => item.isActive).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><button className="admin-primary" disabled={saving || !institutions.some(item => item.isActive)}>{saving ? 'در حال ذخیره…' : 'ساخت حساب مدیر'} <span>←</span></button><p className="admin-help">نام کاربری و رمز عبور را در اختیار مدیر مؤسسه قرار بده.</p></form><section className="admin-panel admin-list-panel"><div className="admin-panel-heading"><span>♧</span><div><h2>مدیران مؤسسات</h2><p>{institutionAdmins.length.toLocaleString('fa-IR')} حساب مدیر ثبت‌شده</p></div><input className="admin-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="جست‌وجوی مدیر…" /></div><div className="admin-table-wrap"><table><thead><tr><th>مدیر</th><th>مؤسسه</th><th>وضعیت</th><th>عملیات</th></tr></thead><tbody>{filteredAdmins.map(admin => <tr key={admin.id}><td><strong>{admin.firstName} {admin.lastName}</strong><small>{admin.username} · {admin.mobile}</small></td><td>{admin.institutionName || 'بدون مؤسسه'}</td><td><span className={`admin-status ${admin.isActive ? 'is-active' : 'is-inactive'}`}>{admin.isActive ? 'فعال' : 'غیرفعال'}</span></td><td><div className="admin-row-actions"><button onClick={() => void toggleInstitutionAdmin(admin)}>{admin.isActive ? 'غیرفعال‌سازی' : 'فعال‌سازی'}</button></div></td></tr>)}</tbody></table>{filteredAdmins.length === 0 && <div className="admin-empty">مدیر مؤسسه‌ای پیدا نشد.</div>}</div></section></section>}
      {tab === 'institutions' && <section className="admin-work-grid"><form className="admin-panel admin-create-form" onSubmit={createInstitution}><div className="admin-panel-heading"><span>＋</span><div><h2>ثبت مؤسسه</h2><p>مؤسسه جدید پس از ساخت غیرفعال خواهد بود.</p></div></div><label>نام مؤسسه<input value={institutionName} onChange={e => setInstitutionName(e.target.value)} minLength={2} maxLength={150} required placeholder="مثلاً آموزشگاه فنی" /></label><button className="admin-primary" disabled={saving}>{saving ? 'در حال ذخیره…' : 'ساخت مؤسسه'} <span>←</span></button><p className="admin-help">پس از فعال‌سازی مؤسسه، می‌توانی دانش‌آموزان را به آن اختصاص بدهی.</p></form><section className="admin-panel admin-list-panel"><div className="admin-panel-heading"><span>⌂</span><div><h2>فهرست مؤسسات</h2><p>{institutions.length.toLocaleString('fa-IR')} مؤسسه ثبت‌شده</p></div><input className="admin-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="جست‌وجوی مؤسسه…" /></div><div className="admin-table-wrap"><table><thead><tr><th>نام مؤسسه</th><th>تاریخ ایجاد</th><th>وضعیت</th><th>عملیات</th></tr></thead><tbody>{filteredInstitutions.map(item => <tr key={item.id}><td><strong>{item.name}</strong></td><td>{new Date(item.createdAt).toLocaleDateString('fa-IR')}</td><td><span className={`admin-status ${item.isActive ? 'is-active' : 'is-inactive'}`}>{item.isActive ? 'فعال' : 'غیرفعال'}</span></td><td><div className="admin-row-actions"><button onClick={() => void editInstitution(item)}>ویرایش</button><button onClick={() => void toggleInstitution(item)}>{item.isActive ? 'غیرفعال‌سازی' : 'فعال‌سازی'}</button></div></td></tr>)}</tbody></table>{filteredInstitutions.length === 0 && <div className="admin-empty">مؤسسه‌ای پیدا نشد.</div>}</div></section></section>}
      <footer className="admin-footer"><span>CodeQuest</span><span>مدیریت مسیرهای یادگیری، یک قدم در هر بار ✦</span></footer>
    </main>
  </div>
}
