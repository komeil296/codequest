
import { useEffect, useState } from 'react'
import './App.css'
import Mission from './Mission'
import Login from './Login'
import StudentManagement from './StudentManagement'
import StudentCourses from './StudentCourses'
import AdminDashboard from './AdminDashboard'
import { logoutSession, restoreSession, setAccessToken, type AuthUser } from './api'
type Lesson = {
  id: number
  title: string
  description: string
  project: string
  status: 'completed' | 'current' | 'locked'
  icon: string
}

const lessons: Lesson[] = [
  { id: 1, title: 'اولین جرقه', description: 'آشنایی با JavaScript و رویدادها', project: 'زنده کردن یک صفحه وب', status: 'completed', icon: '⚡' },
  { id: 2, title: 'جادوی متغیرها', description: 'ذخیره و تغییر اطلاعات', project: 'ساخت سیستم امتیازدهی', status: 'current', icon: '🧪' },
  { id: 3, title: 'منطق قهرمان', description: 'تصمیم‌گیری با شرط‌ها', project: 'بازی حدس عدد', status: 'locked', icon: '🧠' },
  { id: 4, title: 'قدرت توابع', description: 'ساخت دستورهای قابل استفاده مجدد', project: 'جعبه ابزار جادویی', status: 'locked', icon: '🛠️' },
  { id: 5, title: 'شکارچی داده‌ها', description: 'آرایه‌ها و حلقه‌ها', project: 'فهرست محصولات', status: 'locked', icon: '🎯' },
  { id: 6, title: 'دنیای آبجکت‌ها', description: 'مدیریت اطلاعات مرتبط', project: 'شناسنامه محصولات', status: 'locked', icon: '🧩' },
  { id: 7, title: 'جان دادن به صفحه', description: 'آشنایی با DOM', project: 'تغییر زنده صفحه', status: 'locked', icon: '🎨' },
  { id: 8, title: 'شکار رویدادها', description: 'کلیک و تعامل کاربر', project: 'سبد خرید تعاملی', status: 'locked', icon: '🛒' },
  { id: 9, title: 'بازار هوشمند', description: 'ترکیب داده‌ها و رابط کاربری', project: 'ساخت فروشگاه کوچک', status: 'locked', icon: '🏪' },
  { id: 10, title: 'حافظه قهرمان', description: 'JSON و ذخیره‌سازی', project: 'ذخیره اطلاعات', status: 'locked', icon: '💾' },
  { id: 11, title: 'شکار باگ‌ها', description: 'اشکال‌زدایی و آزمایش', project: 'ارتقای پروژه', status: 'locked', icon: '🔍' },
  { id: 12, title: 'مرحله نهایی', description: 'ترکیب مهارت‌ها', project: 'ساخت پروژه اختصاصی', status: 'locked', icon: '🏆' },
]

function App() {
  const [activeLesson, setActiveLesson] = useState(2)
  const [showAll, setShowAll] = useState(false)
  const [auth, setAuth] = useState<{ token: string; user: AuthUser } | null>(null)

  useEffect(() => {
    localStorage.removeItem('codequest_token')
    let cancelled = false
    restoreSession().then(result => {
      if (cancelled) return
      if (!result) {
        localStorage.removeItem('codequest_user')
        setAuth(null)
        return
      }
      setAccessToken(result.accessToken)
      localStorage.setItem('codequest_user', JSON.stringify(result.user))
      setAuth({ token: result.accessToken, user: result.user })
      setPage(result.user.role === 'INSTITUTION_ADMIN' ? 'students' : result.user.role === 'SUPER_ADMIN' ? 'admin' : 'student-courses')
    })
    return () => { cancelled = true }
  }, [])
  const [page, setPage] = useState<'dashboard' | 'mission' | 'login' | 'students' | 'admin' | 'student-courses'>(() => {
    const rawUser = localStorage.getItem('codequest_user')
    if (!rawUser) return 'dashboard'
    try {
      const user = JSON.parse(rawUser) as AuthUser
      if (user.role === 'INSTITUTION_ADMIN') return 'students'
      if (user.role === 'SUPER_ADMIN') return 'admin'
      if (user.role === 'STUDENT') return 'student-courses'
    } catch { /* اطلاعات ذخیره‌شده معتبر نیست */ }
    return 'dashboard'
  })

if (page === 'mission') {
  return <Mission onBack={() => setPage('dashboard')} />
}

  if (page === 'login') {
    return <Login onBack={() => setPage('dashboard')} onLogin={(result) => {
      setAccessToken(result.accessToken)
      localStorage.setItem('codequest_user', JSON.stringify(result.user))
      setAuth({ token: result.accessToken, user: result.user })
      setPage(result.user.role === 'INSTITUTION_ADMIN' ? 'students' : result.user.role === 'SUPER_ADMIN' ? 'admin' : 'student-courses')
    }} />
  }

  if (page === 'admin' && auth?.user.role === 'SUPER_ADMIN') {
    return <AdminDashboard auth={auth} onBack={() => setPage('dashboard')} onLogout={() => {
      void logoutSession()
      localStorage.removeItem('codequest_user')
      setAuth(null)
      setPage('dashboard')
    }} />
  }

  if (page === 'student-courses' && auth?.user.role === 'STUDENT') {
    return <StudentCourses auth={auth} onBack={() => setPage('dashboard')} onLogout={() => {
      void logoutSession()
      localStorage.removeItem('codequest_user')
      setAuth(null)
      setPage('dashboard')
    }} />
  }

  if (page === 'students' && auth) {
    return <StudentManagement auth={auth} onBack={() => setPage('dashboard')} onLogout={() => {
      void logoutSession()
      localStorage.removeItem('codequest_user')
      setAuth(null)
      setPage('dashboard')
    }} />
  }
  const completedCount = lessons.filter(
    (lesson) => lesson.status === 'completed',
  ).length

  const selectedLesson = lessons.find(
    (lesson) => lesson.id === activeLesson,
  )!

  const visibleLessons = showAll ? lessons : lessons.slice(0, 6)

  return (
    <div className="app-shell" dir="rtl">
      <aside className="sidebar">
        <a className="brand" href="#home" aria-label="CodeQuest صفحه اصلی">
          <span className="brand-mark">C</span>
          <span>Code<span className="brand-accent">Quest</span></span>
        </a>

        <div className="profile-card">
          <div className="avatar">🚀</div>
          <div>
            <strong>قهرمان تازه‌کار</strong>
            <span>ماجراجوی کد</span>
          </div>
          <span className="level-badge">LV. ۱</span>
        </div>

        <p className="nav-label">فضای یادگیری</p>
        <nav className="side-nav" aria-label="ناوبری اصلی">
          <a className="nav-item active" href="#missions"><span>◈</span> نقشه مأموریت‌ها</a>
          <a className="nav-item" href="#projects"><span>▣</span> پروژه‌های من</a>
          <a className="nav-item" href="#achievements"><span>✧</span> دستاوردها</a>
        </nav>

        <div className="sidebar-bottom">
          <div className="streak-card">
            <span className="streak-icon">🔥</span>
            <div>
              <strong>شروع فوق‌العاده!</strong>
              <p>هر روز یک قدم جلوتر</p>
            </div>
          </div>
          <p className="sidebar-footnote">هر متخصصی یک روز از صفر شروع کرده.</p>
        </div>
      </aside>

      <main className="main-content" id="home">
        <header className="topbar">
          <div>
            <p className="eyebrow">آماده‌ای چیزی بسازی؟</p>
            <h1>سلام، قهرمان! <span>👋</span></h1>
          </div>
          <button className="teacher-button" onClick={() => setPage(auth?.user.role === 'INSTITUTION_ADMIN' ? 'students' : auth?.user.role === 'SUPER_ADMIN' ? 'admin' : auth?.user.role === 'STUDENT' ? 'student-courses' : 'login')}>
            <span>♙</span> {auth?.user.role === 'INSTITUTION_ADMIN' ? 'مدیریت دانش‌آموزان' : auth?.user.role === 'SUPER_ADMIN' ? 'ورود به پنل مدیریت' : auth?.user.role === 'STUDENT' ? 'دوره‌های من' : 'ورود مدیر / معلم'}
          </button>
        </header>

        <section className="welcome-banner">
          <div className="banner-content">
            <span className="banner-tag">مأموریت امروز</span>
            <h2>از ایده تا کد؛<br />ماجراجویی تو شروع شده!</h2>
            <p>با حل هر چالش، یک مهارت واقعی یاد می‌گیری.<br />اشتباه کن، کشف کن و دوباره بساز.</p>
            <button className="primary-button" onClick={() => document.getElementById('current-mission')?.scrollIntoView({ behavior: 'smooth' })}>
              ادامه ماجراجویی <span>←</span>
            </button>
          </div>
          <div className="banner-art" aria-hidden="true">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="planet">JS</div>
            <span className="floating-symbol symbol-one">{'{ }'}</span>
            <span className="floating-symbol symbol-two">&lt;/&gt;</span>
            <span className="floating-star">✦</span>
          </div>
        </section>

        <section className="stats-grid" aria-label="آمار یادگیری">
          <div className="stat-card">
            <span className="stat-icon purple">◈</span>
            <div><span>پیشرفت دوره</span><strong>{Math.round(completedCount / lessons.length * 100)}٪</strong></div>
            <div className="mini-progress"><span style={{ width: `${completedCount / lessons.length * 100}%` }} /></div>
          </div>
          <div className="stat-card">
            <span className="stat-icon yellow">⚡</span>
            <div><span>امتیاز تجربه</span><strong>۱۲۰ XP</strong></div>
            <small className="stat-note">شروع کردی؛ ادامه بده!</small>
          </div>
          <div className="stat-card">
            <span className="stat-icon green">✓</span>
            <div><span>مأموریت تکمیل‌شده</span><strong>{completedCount} از ۱۲</strong></div>
            <small className="stat-note">هر قدم مهمه</small>
          </div>
        </section>

        <section className="lessons-section" id="missions">
          <div className="section-heading">
            <div>
              <p className="eyebrow">نقشه راه تو</p>
              <h2>۱۲ مرحله تا استاد کد شدن</h2>
              <p className="section-description">هر مرحله یک مهارت تازه و یک پروژه واقعی داره.</p>
            </div>
            <button className="text-button" onClick={() => setShowAll(!showAll)}>
              {showAll ? 'نمایش کمتر ↑' : 'همه مرحله‌ها ↓'}
            </button>
          </div>

          <div className="lesson-grid">
            {visibleLessons.map((lesson) => (
              <button
                key={lesson.id}
                className={`lesson-card ${lesson.status} ${activeLesson === lesson.id ? 'selected' : ''}`}
                onClick={() => setActiveLesson(lesson.id)}
              >
                <div className="lesson-card-top">
                  <span className="lesson-number">مرحله {lesson.id.toLocaleString('fa-IR')}</span>
                  <span className="lesson-icon">{lesson.icon}</span>
                </div>
                <h3>{lesson.title}</h3>
                <p>{lesson.description}</p>
                <div className="lesson-card-bottom">
                  <span>{lesson.status === 'completed' ? '✓ تکمیل شده' : lesson.status === 'current' ? '● آماده شروع' : '🔒 قفل شده'}</span>
                  <span>←</span>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="current-mission" id="current-mission">
          <div className="mission-copy">
            <span className="banner-tag">جزئیات مرحله انتخاب‌شده</span>
            <h2>{selectedLesson.icon} {selectedLesson.title}</h2>
            <p>{selectedLesson.description}</p>
            <div className="mission-project"><span>🎯</span><div><small>پروژه این مرحله</small><strong>{selectedLesson.project}</strong></div></div>
            <button
              className="primary-button"
              disabled={selectedLesson.status === 'locked'}
             onClick={() => setPage('mission')}
            >
              {selectedLesson.status === 'completed' ? 'مرور مرحله' : selectedLesson.status === 'current' ? 'شروع مأموریت' : 'هنوز قفل است'}
              <span>←</span>
            </button>
          </div>
          <div className="mission-illustration" aria-hidden="true">
            <div className="code-window">
              <div className="window-dots"><i /><i /><i /></div>
              <code><span>let</span> score = <b>0</b>;</code>
              <code>score <span>+=</span> <b>10</b>;</code>
              <code><span>console</span>.log(score);</code>
            </div>
            <div className="mission-spark">✦</div>
          </div>
        </section>

        <footer className="footer">
          <span>CodeQuest</span>
          <span>یاد بگیر، بساز، شگفتی خلق کن ✨</span>
        </footer>
      </main>
    </div>
  )
}

export default App
