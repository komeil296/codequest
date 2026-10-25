import { useCallback, useEffect, useState } from 'react'
import { apiRequest, type AuthUser } from './api'
import './Management.css'

type StudentCourse = {
  enrollmentId: string
  enrolledAt: string
  id: string
  title: string
  description: string | null
  isActive: boolean
}
type CourseLesson = {
  id: string
  title: string
  description: string | null
  content: string | null
  sortOrder: number
}
type CourseLessonsResponse = {
  course: { id: string; title: string; description: string | null }
  lessons: CourseLesson[]
}

type Props = {
  auth: { token: string; user: AuthUser }
  onBack: () => void
  onLogout: () => void
}

export default function StudentCourses({ auth, onBack, onLogout }: Props) {
  const [courses, setCourses] = useState<StudentCourse[]>([])
  const [selectedCourse, setSelectedCourse] = useState<StudentCourse | null>(null)
  const [lessons, setLessons] = useState<CourseLesson[]>([])
  const [selectedLesson, setSelectedLesson] = useState<CourseLesson | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const request = useCallback(<T,>(path: string) =>
    apiRequest<T>(path, { token: auth.token }), [auth.token])

  const loadCourses = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const items = await request<StudentCourse[]>('/student-courses')
      setCourses(items)
      setSelectedCourse(current => current ? items.find(item => item.id === current.id) || null : null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'دریافت دوره‌ها ناموفق بود.')
    } finally {
      setLoading(false)
    }
  }, [request])

  useEffect(() => { void loadCourses() }, [loadCourses])

  async function openCourse(course: StudentCourse) {
    setSelectedCourse(course)
    setSelectedLesson(null)
    setLessons([])
    setError('')
    try {
      const result = await request<CourseLessonsResponse>(`/student-courses/${course.id}/lessons`)
      setLessons(result.lessons)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'دریافت درس‌های دوره ناموفق بود.')
    }
  }

  return (
    <div className="management-page student-courses-page" dir="rtl">
      <header className="management-header">
        <button className="secondary-button" onClick={onBack}>بازگشت به خانه</button>
        <div className="management-brand">Code<span>Quest</span></div>
        <button className="secondary-button" onClick={onLogout}>خروج از حساب</button>
      </header>
      <main className="management-content">
        <div className="management-title-row">
          <div>
            <p className="management-eyebrow">مسیر یادگیری من</p>
            <h1>{selectedCourse ? selectedCourse.title : 'دوره‌های من'}</h1>
            <p className="muted-text">{selectedCourse ? selectedCourse.description || 'درس‌های این دوره را دنبال کن و قدم‌به‌قدم یاد بگیر.' : 'اینجا فقط دوره‌هایی را می‌بینی که در آن‌ها ثبت‌نام شده‌ای.'}</p>
          </div>
          <div className="student-count"><strong>{(selectedCourse ? lessons.length : courses.length).toLocaleString('fa-IR')}</strong><span>{selectedCourse ? 'درس دوره' : 'دوره من'}</span></div>
        </div>

        {error && <div className="notice error-notice">{error}</div>}
        {selectedCourse ? (
          <section className="management-panel">
            <div className="panel-heading">
              <span className="panel-symbol">▣</span>
              <div><h2>درس‌های دوره</h2><p>برای دیدن محتوای هر درس، آن را انتخاب کن.</p></div>
              <button className="secondary-button refresh-button" onClick={() => { setSelectedCourse(null); setSelectedLesson(null); setLessons([]) }}>همه دوره‌ها</button>
            </div>
            {lessons.length === 0 ? <div className="empty-state">هنوز درس فعالی برای این دوره ثبت نشده است.</div> : (
              <div className="student-course-lessons">
                <div className="student-course-lesson-list">
                  {lessons.map((lesson, index) => (
                    <button key={lesson.id} className={`student-course-lesson ${selectedLesson?.id === lesson.id ? 'selected' : ''}`} onClick={() => setSelectedLesson(lesson)}>
                      <span className="student-course-lesson-number">{(index + 1).toLocaleString('fa-IR')}</span>
                      <span><strong>{lesson.title}</strong><small>{lesson.description || 'درس آموزشی'}</small></span>
                      <span>←</span>
                    </button>
                  ))}
                </div>
                <article className="student-course-lesson-content">
                  {selectedLesson ? <>
                    <p className="management-eyebrow">درس انتخاب‌شده</p>
                    <h2>{selectedLesson.title}</h2>
                    {selectedLesson.description && <p className="muted-text">{selectedLesson.description}</p>}
                    <div className="lesson-content-text">{selectedLesson.content?.trim() || 'محتوای این درس هنوز آماده نشده است.'}</div>
                  </> : <div className="empty-state">یک درس را از فهرست انتخاب کن.</div>}
                </article>
              </div>
            )}
          </section>
        ) : loading ? <div className="empty-state">در حال دریافت دوره‌های تو…</div> : courses.length === 0 ? (
          <section className="management-panel empty-state">هنوز در دوره‌ای ثبت‌نام نشده‌ای. از مدیر مؤسسه بخواه تو را در یک دوره ثبت‌نام کند.</section>
        ) : (
          <div className="student-course-grid">
            {courses.map(course => (
              <button className="student-course-card" key={course.id} onClick={() => void openCourse(course)}>
                <span className="student-course-card-icon">⌘</span>
                <span className="student-course-card-status">{course.isActive ? 'دوره فعال' : 'دوره غیرفعال'}</span>
                <strong>{course.title}</strong>
                <span className="student-course-card-description">{course.description || 'برای مشاهده درس‌ها وارد این دوره شو.'}</span>
                <span className="student-course-card-action">مشاهده درس‌ها ←</span>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
