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
let accessTokenInMemory: string | null = null
let refreshPromise: Promise<LoginResponse> | null = null

export function setAccessToken(token: string | null) {
  accessTokenInMemory = token
}

function readCookie(name: string): string | null {
  const item = document.cookie.split(';').map(value => value.trim()).find(value => value.startsWith(`${name}=`))
  if (!item) return null
  try {
    return decodeURIComponent(item.slice(name.length + 1))
  } catch {
    return null
  }
}

function refreshAccessToken(): Promise<LoginResponse> {
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    const csrfToken = readCookie('codequest_csrf')
    if (!csrfToken) throw new Error('نشست شما منقضی شده است. دوباره وارد شوید.')
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { Accept: 'application/json', 'X-CSRF-Token': csrfToken },
    })
    if (!response.ok) {
      setAccessToken(null)
      throw new Error('نشست شما منقضی شده است. دوباره وارد شوید.')
    }
    const result = await response.json() as LoginResponse
    setAccessToken(result.accessToken)
    return result
  })()

  const currentPromise = refreshPromise
  return currentPromise.finally(() => {
    if (refreshPromise === currentPromise) refreshPromise = null
  })
}

export async function restoreSession(): Promise<LoginResponse | null> {
  try {
    return await refreshAccessToken()
  } catch {
    setAccessToken(null)
    return null
  }
}

export async function logoutSession(): Promise<void> {
  const csrfToken = readCookie('codequest_csrf')
  try {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : {},
    })
  } finally {
    setAccessToken(null)
  }
}

export async function apiRequest<T>(path: string, init: RequestInit & { token?: string } = {}): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (init.body) headers.set('Content-Type', 'application/json')
  const csrfToken = path === '/auth/refresh' || path === '/auth/logout' ? readCookie('codequest_csrf') : null
  if (csrfToken) headers.set('X-CSRF-Token', csrfToken)

  const makeRequest = () => {
    const requestHeaders = new Headers(headers)
    const effectiveToken = accessTokenInMemory
    if (effectiveToken) requestHeaders.set('Authorization', `Bearer ${effectiveToken}`)
    else requestHeaders.delete('Authorization')
    return fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: requestHeaders,
      credentials: 'include',
    })
  }

  let response: Response
  try {
    response = await makeRequest()
    if (
      response.status === 401 &&
      path !== '/auth/login' &&
      path !== '/auth/refresh' &&
      path !== '/auth/logout'
    ) {
      try {
        await refreshAccessToken()
        response = await makeRequest()
      } catch {
        throw new Error('ورود شما منقضی شده است. دوباره وارد شوید.')
      }
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('منقضی شده')) throw error
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
