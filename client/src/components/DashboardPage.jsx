import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { authRequest, clearAuthState, getAuthState } from '../utils/auth'
import EmployeeDashboard from './employee/EmployeeDashboard'

function DashboardPage({ requiredRole }) {
  const navigate = useNavigate()
  const { token, user } = getAuthState()
  const [message, setMessage] = useState('Loading dashboard...')
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadProtectedData() {
      setError('')

      try {
        const endpoint = requiredRole === 'vendor' ? '/api/vendor-dashboard' : '/api/employee-dashboard'
        const response = await authRequest(endpoint)

        setMessage(response.message)
      } catch (requestError) {
        setError(requestError.message)
      }
    }

    if (token) {
      loadProtectedData()
    }
  }, [requiredRole, token])

  if (!token || !user) {
    return <Navigate to="/login" replace />
  }

  if (user.role !== requiredRole) {
    return <Navigate to={user.role === 'vendor' ? '/vendor-dashboard' : '/employee-dashboard'} replace />
  }

  // Employee gets the full dashboard UI
  if (requiredRole === 'employee') {
    return <EmployeeDashboard />
  }

  function logout() {
    clearAuthState()
    navigate('/login')
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fffdf8] px-4 py-12">
      <div className="w-full max-w-2xl rounded-2xl border border-stone-200 bg-white p-8 shadow-xl shadow-amber-100/50">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">{requiredRole} dashboard</p>
            <h1 className="mt-2 text-3xl font-bold text-stone-900">Hi, {user.name}</h1>
            <p className="mt-2 text-sm text-stone-600">{message}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="rounded-xl border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 hover:border-amber-300 hover:text-amber-700"
          >
            Logout
          </button>
        </div>

        {error && <p className="mt-5 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <div className="mt-6 rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
          <p><strong>Name:</strong> {user.name}</p>
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Role:</strong> {user.role}</p>
        </div>

        <Link className="mt-5 inline-block text-sm text-stone-500 hover:text-stone-700" to="/">
          Back to landing page
        </Link>
      </div>
    </main>
  )
}

export default DashboardPage