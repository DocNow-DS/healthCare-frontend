import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../config/api.js'
import { httpJson } from '../lib/http.js'

export default function Login() {
  const navigate = useNavigate()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const trimmed = identifier.trim()
    if (!trimmed || !password) {
      setError('Username/email and password are required.')
      return
    }

    const isEmail = trimmed.includes('@')
    const body = isEmail
      ? { email: trimmed, password }
      : { username: trimmed, password }

    try {
      setSubmitting(true)
      const res = await httpJson(`${api.authBase}/login`, {
        method: 'POST',
        body,
      })
      localStorage.setItem('auth_token', res.token)
      localStorage.setItem('auth_user', JSON.stringify(res.user))
      navigate('/')
    } catch (err) {
      setError(err?.message || 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="page">
      <h1>Login</h1>
      <p className="muted">Use your username or email.</p>

      <form className="card form" onSubmit={onSubmit}>
        <label className="field">
          <span>Username or Email</span>
          <input
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            autoComplete="username"
            placeholder="e.g. nimal or nimal@example.com"
          />
        </label>

        <label className="field">
          <span>Password</span>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="current-password"
          />
        </label>

        {error ? <div className="error">{error}</div> : null}

        <div className="row">
          <button className="btn" type="submit" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
          <Link className="link" to="/signup">
            Create an account
          </Link>
        </div>
      </form>
    </section>
  )
}
