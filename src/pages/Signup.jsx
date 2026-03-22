import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../config/api.js'
import { httpJson } from '../lib/http.js'

export default function Signup() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('PATIENT')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const body = {
      username: username.trim(),
      email: email.trim(),
      password,
      role,
    }

    if (!body.username || !body.email || !body.password) {
      setError('Username, email, and password are required.')
      return
    }

    try {
      setSubmitting(true)
      const res = await httpJson(`${api.authBase}/register`, {
        method: 'POST',
        body,
      })
      localStorage.setItem('auth_token', res.token)
      localStorage.setItem('auth_user', JSON.stringify(res.user))
      navigate('/')
    } catch (err) {
      setError(err?.message || 'Sign up failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="page">
      <h1>Sign up</h1>
      <p className="muted">Create an account to use the platform.</p>

      <form className="card form" onSubmit={onSubmit}>
        <label className="field">
          <span>Username</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
          />
        </label>

        <label className="field">
          <span>Email</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            autoComplete="email"
          />
        </label>

        <label className="field">
          <span>Password</span>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="new-password"
          />
        </label>

        <label className="field">
          <span>Role</span>
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="PATIENT">Patient</option>
            <option value="DOCTOR">Doctor</option>
            <option value="ADMIN">Admin</option>
          </select>
        </label>

        {error ? <div className="error">{error}</div> : null}

        <div className="row">
          <button className="btn" type="submit" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create account'}
          </button>
          <Link className="link" to="/login">
            Already have an account?
          </Link>
        </div>
      </form>
    </section>
  )
}
