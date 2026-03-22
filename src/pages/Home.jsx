import { Link } from 'react-router-dom'

export default function Home() {
  const token = localStorage.getItem('auth_token')
  const userRaw = localStorage.getItem('auth_user')
  let user = null
  if (userRaw) {
    try {
      user = JSON.parse(userRaw)
    } catch {
      user = null
    }
  }

  return (
    <section className="page">
      <h1>Healthcare Platform</h1>
      <p className="muted">
        Book appointments, join video consultations, and manage reports.
      </p>

      <div className="card" style={{ marginTop: 24 }}>
        {token ? (
          <>
            <h2 style={{ marginTop: 0 }}>Signed in</h2>
            <p className="muted">
              {user?.username ? `Hello, ${user.username}` : 'You are logged in.'}
            </p>
            <div className="row" style={{ marginTop: 16 }}>
              <button
                className="btn"
                type="button"
                onClick={() => {
                  localStorage.removeItem('auth_token')
                  localStorage.removeItem('auth_user')
                  window.location.reload()
                }}
              >
                Log out
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 style={{ marginTop: 0 }}>Get started</h2>
            <div className="row" style={{ marginTop: 16 }}>
              <Link className="btn" to="/login">
                Login
              </Link>
              <Link className="btn btn-secondary" to="/signup">
                Sign up
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
