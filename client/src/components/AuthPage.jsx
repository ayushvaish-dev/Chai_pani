import { useEffect, useState } from 'react'
import logoImg from '../assets/logo.png'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { authRequest, setAuthState } from '../utils/auth'

function AuthPage({ mode }) {
  const isSignup = mode === 'signup'
  const isLogin = mode === 'login'
  const isForgotPassword = mode === 'forgot-password'
  const isResetPassword = mode === 'reset-password'
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const resetToken = searchParams.get('token') || ''

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'employee',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (location.state?.message) {
      setMessage(location.state.message)
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [location.pathname, location.state, navigate])

  function onChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function onSubmit(event) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      if (isResetPassword) {
        if (!resetToken) {
          throw new Error('This password reset link is invalid or incomplete')
        }

        if (form.password !== form.confirmPassword) {
          throw new Error('New password and confirm password must match')
        }
      }

      const endpoint = isSignup
        ? '/api/auth/register'
        : isLogin
          ? '/api/auth/login'
          : isForgotPassword
            ? '/api/auth/forgot-password'
            : '/api/auth/reset-password'

      const payload = isSignup
        ? {
            name: form.name,
            email: form.email,
            password: form.password,
            role: form.role,
          }
        : isLogin
          ? {
            email: form.email,
            password: form.password,
          }
          : isForgotPassword
            ? {
                email: form.email,
              }
            : {
                token: resetToken,
                password: form.password,
              }

      const data = await authRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      if (isLogin || isSignup) {
        setAuthState({ token: data.token, user: data.user })
        navigate(data.redirectPath || (data.user?.role === 'vendor' ? '/vendor-dashboard' : '/employee-dashboard'))
        return
      }

      setMessage(data.message)

      if (isResetPassword) {
        setForm((current) => ({ ...current, password: '', confirmPassword: '' }))
        navigate('/login', { replace: true, state: { message: data.message } })
      }
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  const title = isSignup
    ? 'Create account'
    : isLogin
      ? 'Welcome back'
      : isForgotPassword
        ? 'Recover password'
        : 'Create new password'

  const subtitle = isSignup
    ? 'Start with role-based access for employee and vendor dashboards.'
    : isLogin
      ? 'Login to continue to your personalized dashboard.'
      : isForgotPassword
        ? 'Enter your email and we will send a password reset link.'
        : 'Set a new password for your account using the link sent to your email.'

  const submitLabel = loading
    ? 'Please wait...'
    : isSignup
      ? 'Create Account'
      : isLogin
        ? 'Login'
        : isForgotPassword
          ? 'Send Reset Link'
          : 'Update Password'

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fffdf8] px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-7 shadow-xl shadow-amber-100/50">
        <div className="mb-4 flex justify-center">
          <div className="flex items-center rounded-full border border-[#D8CFC6] bg-[#FFF9F2] p-2 pr-5 shadow-[0_18px_36px_-28px_rgba(62,44,35,0.8)]">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[radial-gradient(circle_at_top,_#fffdf8,_#efe6dd)] ring-1 ring-[#E3D8CE]">
              <img src={logoImg} alt="Aaj Ki Chai" className="h-9 w-auto object-contain" />
            </span>
            <span className="ml-3 text-sm font-semibold uppercase tracking-[0.22em] text-[#8B5E3C]">
              AKC
            </span>
          </div>
        </div>
        <h1 className="mt-3 text-3xl font-bold text-stone-900">{title}</h1>
        <p className="mt-2 text-sm text-stone-600">{subtitle}</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          {isSignup && (
            <label className="block text-sm font-medium text-stone-700">
              Name
              <input
                type="text"
                name="name"
                required
                value={form.name}
                onChange={onChange}
                className="mt-2 w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none transition focus:border-amber-300 focus:bg-white"
              />
            </label>
          )}

          <label className="block text-sm font-medium text-stone-700">
            Email
            <input
              type="email"
              name="email"
              required
              value={form.email}
              onChange={onChange}
              className="mt-2 w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none transition focus:border-amber-300 focus:bg-white"
            />
          </label>

          {!isForgotPassword && (
            <label className="block text-sm font-medium text-stone-700">
              {isResetPassword ? 'New Password' : 'Password'}
              <input
                type="password"
                name="password"
                required
                minLength={6}
                value={form.password}
                onChange={onChange}
                className="mt-2 w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none transition focus:border-amber-300 focus:bg-white"
              />
            </label>
          )}

          {isResetPassword && (
            <label className="block text-sm font-medium text-stone-700">
              Confirm Password
              <input
                type="password"
                name="confirmPassword"
                required
                minLength={6}
                value={form.confirmPassword}
                onChange={onChange}
                className="mt-2 w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none transition focus:border-amber-300 focus:bg-white"
              />
            </label>
          )}

          {isSignup && (
            <label className="block text-sm font-medium text-stone-700">
              Role
              <select
                name="role"
                required
                value={form.role}
                onChange={onChange}
                className="mt-2 w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none transition focus:border-amber-300 focus:bg-white"
              >
                <option value="employee">Employee</option>
                <option value="vendor">Vendor</option>
              </select>
            </label>
          )}

          {message && <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}

          {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-amber-400 px-4 py-3 text-sm font-semibold text-white transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitLabel}
          </button>
        </form>

        {isLogin && (
          <div className="mt-4 flex items-center justify-between gap-3 text-sm">
            <Link className="font-medium text-amber-700 hover:text-amber-800" to="/forgot-password">
              Forgot password?
            </Link>
            <span className="text-stone-500">Recover it by email</span>
          </div>
        )}

        {(isLogin || isSignup) && (
          <p className="mt-5 text-sm text-stone-600">
            {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
            <Link className="font-semibold text-amber-700 hover:text-amber-800" to={isSignup ? '/login' : '/signup'}>
              {isSignup ? 'Login' : 'Signup'}
            </Link>
          </p>
        )}

        {(isForgotPassword || isResetPassword) && (
          <p className="mt-5 text-sm text-stone-600">
            Remembered your password?{' '}
            <Link className="font-semibold text-amber-700 hover:text-amber-800" to="/login">
              Back to login
            </Link>
          </p>
        )}

        <Link className="mt-3 inline-block text-sm text-stone-500 hover:text-stone-700" to="/">
          Back to landing page
        </Link>
      </div>
    </main>
  )
}

export default AuthPage