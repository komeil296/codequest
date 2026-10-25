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
    response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers })
  } catch {
    throw new Error('ارتباط با سرور برقرار نشد. مطمئن شو بک‌اند روی پورت 3000 در حال اجراست.')
  }

  if (!response.ok) {
    let message = `خطای سرور (${response.status})`
    try {
      const body = await response.json() as { message?: string | string[] }
      if (Array.isArray(body.message)) message = body.message.join('، ')
      else if (body.message) message = body.message
    } catch { /* پاسخ ممکن است JSON نباشد */ }
    if (response.status === 401) message = 'ورود معتبر نیست یا نشست شما منقضی شده است. دوباره وارد شوید.'
    if (response.status === 403) message = 'این حساب اجازه انجام این کار را ندارد.'
    throw new Error(message)
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}
