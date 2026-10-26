export type UserRole = 'SUPER_ADMIN' | 'INSTITUTION_ADMIN' | 'STUDENT'

export type AuthUser = {
  id: string
  firstName: string
  lastName: string
  username: string
  role: UserRole
  institutionId: string | null
}

export type LoginResponse = {
  accessToken: string
  user: AuthUser
}

export type Student = {
  id: string
  firstName: string
  lastName: string
  mobile: string | null
  username: string
  role: 'STUDENT'
  institutionId: string
  mobileVerified: boolean
  isActive: boolean
  createdAt: string
}

export type CreatedStudent = {
  student: Student
  temporaryPassword: string
}

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '')

export async function apiRequest<T>(path: string, init: RequestInit & { token?: string } = {}): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (init.body) headers.set('Content-Type', 'application/json')
  if (init.token) headers.set('Authorization', `Bearer ${init.token}`)

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers, credentials: 'include' })
  } catch {
    throw new Error('ارتباط با سرور برقرار نشد. مطمئن شو بک‌اند روی پورت 3000 در حال اجراست.')
  }

  if (!response.ok) {
    let serverMessage = ''
    try {
      const body = await response.json() as { message?: string | string[] }
      if (Array.isArray(body.message)) serverMessage = body.message.join('، ')
      else if (body.message) serverMessage = body.message
    } catch { /* پاسخ ممکن است JSON نباشد */ }

    if (response.status === 401) {
      if (path === '/auth/login') {
        if (serverMessage === 'Mobile number is not verified') {
          throw new Error('شماره موبایل این حساب هنوز تأیید نشده است.')
        }
        throw new Error('نام کاربری یا رمز عبور اشتباه است، یا حساب غیرفعال شده است.')
      }
      throw new Error('ورود معتبر نیست یا نشست شما منقضی شده است. دوباره وارد شوید.')
    }

    throw new Error(serverMessage || `خطای سرور (${response.status})`)
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}
