import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from '@tanstack/react-router'
import { BrandMark } from '../components/icons.jsx'
import { login, emailAuthStatus, emailLogin } from '../lib/api.js'

export default function Login() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [emailAuth, setEmailAuth] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    emailAuthStatus().then((res) => setEmailAuth(res.enabled))
  }, [])

  const handleEmailLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await emailLogin(email, password)
      navigate({ to: '/' })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login">
      <div className="login__card">
        <BrandMark size={48} />
        <h1 className="login__title">RumaQ</h1>
        <p className="login__desc">{t('login.desc', 'Household shopping & inventory assistant')}</p>

        <button className="btn btn--primary btn--block login__btn" onClick={login}>
          {t('login.signIn', 'Sign in with Google')}
        </button>

        {emailAuth && (
          <>
            <div className="login__divider">
              <span>{t('login.or', 'or')}</span>
            </div>

            <form className="login__form" onSubmit={handleEmailLogin}>
              <label className="login__label" htmlFor="email">
                {t('login.email', 'Email')}
              </label>
              <input
                id="email"
                className="login__input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />

              <label className="login__label" htmlFor="password">
                {t('login.password', 'Password')}
              </label>
              <input
                id="password"
                className="login__input"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />

              {error && <p className="login__error">{error}</p>}

              <button
                className="btn btn--primary btn--block login__btn"
                type="submit"
                disabled={loading}
              >
                {loading
                  ? t('login.signingIn', 'Signing in…')
                  : t('login.signInEmail', 'Sign in with email')}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
