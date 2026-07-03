import { useTranslation } from 'react-i18next'
import { BrandMark } from '../components/icons.jsx'
import { login } from '../lib/api.js'

export default function Login() {
  const { t } = useTranslation()

  return (
    <div className="login">
      <div className="login__card">
        <BrandMark size={48} />
        <h1 className="login__title">RumaQ</h1>
        <p className="login__desc">{t('login.desc', 'Household shopping & inventory assistant')}</p>
        <button className="btn btn--primary btn--block login__btn" onClick={login}>
          {t('login.signIn', 'Sign in with Google')}
        </button>
      </div>
    </div>
  )
}
