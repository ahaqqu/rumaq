import { useTranslation } from 'react-i18next'
import { usePersona } from '../context/PersonaContext.jsx'
import { personaText } from '../lib/persona.js'
import { Button } from './Button.jsx'
import { Panel } from './Panel.jsx'

export function RouteError({ error, reset }) {
  const { t } = useTranslation()
  const { persona } = usePersona()

  return (
    <Panel className="p-8 text-center max-w-lg mx-auto mt-8">
      <div className="text-2xl mb-2">😅</div>
      <div className="font-semibold text-lg text-text mb-2">
        {t('error.title', 'Something went wrong')}
      </div>
      <div className="text-text-muted text-sm mb-5">
        {personaText('errorFallback', persona, t) ||
          t('error.desc', 'We hit a snag. Try again in a moment.')}
      </div>
      {import.meta.env.DEV && error?.message && (
        <pre className="text-left text-xs bg-surface-sunken rounded-md p-3 overflow-auto mb-5">
          {error.message}
          {error.stack ? `\n${error.stack}` : ''}
        </pre>
      )}
      <Button onClick={reset}>{t('error.retry', 'Retry')}</Button>
    </Panel>
  )
}
