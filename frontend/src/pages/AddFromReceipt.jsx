import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from '@tanstack/react-router'
import { formatRp } from '../data/mock.js'
import { usePersona } from '../context/PersonaContext.jsx'
import { personaText } from '../lib/persona.js'
import { scanReceipt, createPurchase, getStores } from '../lib/api.js'
import {
  IconCamera,
  IconUpload,
  IconCheck,
  IconBolt,
  IconReceipt,
  IconWarning,
  IconArrowLeft,
  IconShop,
  IconCalendarBlank,
} from '../components/icons.jsx'

const MAX_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'image/webp']

export function AddFromReceipt({ onDone }) {
  const { t } = useTranslation()
  const { persona } = usePersona()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [phase, setPhase] = useState('capture')
  const [error, setError] = useState(null)
  const [items, setItems] = useState([])
  const [selectedStore, setSelectedStore] = useState(null)
  const [stores, setStores] = useState([])
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [imageKey, setImageKey] = useState(null)
  const [imageUrl, setImageUrl] = useState(null)
  const [creating, setCreating] = useState(false)

  const isNoKeyError =
    error &&
    (error.includes('AI provider not configured') || error.includes('Settings'))

  function triggerFileInput(captureMode) {
    if (fileInputRef.current) {
      if (captureMode) {
        fileInputRef.current.setAttribute('capture', 'environment')
      } else {
        fileInputRef.current.removeAttribute('capture')
      }
      fileInputRef.current.click()
    }
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (file) handleFileInner(file)
  }

  function handleDrop(e) {
    e.preventDefault()
    const file = e.dataTransfer?.files?.[0]
    if (file) handleFileInner(file)
  }

  function handleDragOver(e) {
    e.preventDefault()
  }

  async function handleFileInner(file) {
    setError(null)

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Unsupported file type. Accepted: JPEG, PNG, HEIC, WEBP.')
      return
    }
    if (file.size > MAX_SIZE) {
      setError('File too large. Maximum size is 5 MB.')
      return
    }

    setPhase('scanning')

    try {
      const result = await scanReceipt(file)
      setItems(result.items.map((it, i) => ({ ...it, _id: `item-${i}` })))
      setImageKey(result.imageKey)
      setImageUrl(result.imageUrl)
      if (result.storeGuess) {
        setSelectedStore(result.storeGuess.id)
      }
      if (result.dateGuess) {
        setDate(result.dateGuess)
      }

      try {
        const storesData = await getStores()
        setStores(storesData.stores || [])
      } catch {
        setStores([])
      }

      setPhase('review')
    } catch (err) {
      setError(err.message)
      setPhase('capture')
    }
  }

  function updateItem(id, field, value) {
    setItems((prev) =>
      prev.map((it) => (it._id === id ? { ...it, [field]: value } : it))
    )
  }

  async function handleConfirm() {
    setCreating(true)
    setError(null)

    try {
      const payload = {
        store_id: selectedStore || undefined,
        date,
        receipt_image_key: imageKey || undefined,
        items: items.map((it) => ({
          name: it.name,
          qty: Number(it.qty) || 1,
          unit: it.unit || 'pcs',
          price: Math.round(Number(it.price)) || 0,
        })),
      }

      await createPurchase(payload)
      setPhase('done')
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  function handleRetake() {
    setPhase('capture')
    setItems([])
    setError(null)
    setImageKey(null)
    setImageUrl(null)
  }

  const lineTotal = items.reduce((a, b) => a + (Number(b.price) || 0), 0)

  return (
    <>
      <div className="page__head">
        <p className="page__lead">{personaText('receiptLead', persona, t)}</p>
      </div>

      {error && (
        <div
          className="panel"
          style={{
            marginBottom: 'var(--sp-4)',
            padding: 'var(--sp-3)',
            background: 'var(--error-soft)',
            border: '1px solid var(--error-soft-border)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: 'var(--sp-2)',
              alignItems: 'flex-start',
            }}
          >
            <IconWarning
              size={18}
              style={{ color: 'var(--error)', flexShrink: 0, marginTop: 2 }}
            />
            <div>
              <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--error)' }}>
                {error}
              </p>
              {isNoKeyError && (
                <button
                  className="btn btn--ghost"
                  style={{ marginTop: 'var(--sp-2)', fontSize: 'var(--fs-sm)' }}
                  onClick={() => navigate({ to: '/settings' })}
                >
                  {t('addReceipt.goToSettings') || 'Go to Settings'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {phase === 'capture' && (
        <div
          className="dropzone"
          role="button"
          tabIndex={0}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => triggerFileInput(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') triggerFileInput(false)
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/heic,image/webp"
            style={{ display: 'none' }}
            onChange={handleFileChange}
            data-testid="file-input"
          />
          <div className="dropzone__icon">
            <IconCamera size={26} />
          </div>
          <div className="dropzone__title">{t('addReceipt.takePhoto')}</div>
          <div className="dropzone__hint">{t('addReceipt.dropHint')}</div>
          <div
            style={{
              marginTop: 'var(--sp-5)',
              display: 'flex',
              gap: 'var(--sp-3)',
              justifyContent: 'center',
            }}
          >
            <button
              className="btn btn--primary"
              onClick={(e) => {
                e.stopPropagation()
                triggerFileInput(true)
              }}
            >
              <IconCamera size={18} /> {t('addReceipt.openCamera')}
            </button>
            <button
              className="btn btn--secondary"
              onClick={(e) => {
                e.stopPropagation()
                triggerFileInput(false)
              }}
            >
              <IconUpload size={18} /> {t('addReceipt.uploadFile')}
            </button>
          </div>
        </div>
      )}

      {phase === 'scanning' && (
        <div
          className="panel"
          style={{ padding: 'var(--sp-9)', textAlign: 'center' }}
        >
          <div style={{ margin: '0 auto var(--sp-5)', color: 'var(--accent)' }}>
            <IconBolt size={32} className="spin" />
          </div>
          <div style={{ fontWeight: 600, fontSize: 'var(--fs-md)' }}>
            {t('addReceipt.scanningTitle')}
          </div>
          <div
            style={{
              color: 'var(--text-muted)',
              fontSize: 'var(--fs-sm)',
              marginTop: 'var(--sp-2)',
            }}
          >
            {t('addReceipt.scanningDesc')}
          </div>
          <div style={{ maxWidth: 360, margin: 'var(--sp-5) auto 0' }}>
            <SkeletonLines />
          </div>
        </div>
      )}

      {phase === 'review' && (
        <>
          <div className="receipt-meta">
            {selectedStore && (
              <span className="chip chip--loc">
                <IconShop size={14} />{' '}
                {stores.find((s) => s.id === selectedStore)?.label ||
                  selectedStore}
              </span>
            )}
            <span className="chip">
              <IconCalendarBlank size={14} /> {date}
            </span>
            <span className="chip">
              {t('addReceipt.itemsRead', { count: items.length })}
            </span>
            <span style={{ flex: 1 }} />
            <span
              className="chip"
              style={{
                background: 'var(--accent-soft)',
                color: 'var(--accent-hover)',
                border: '1px solid var(--accent-soft-border)',
              }}
            >
              {t('addReceipt.aiReview')}
            </span>
          </div>

          {imageUrl && (
            <div
              style={{
                marginBottom: 'var(--sp-4)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                maxHeight: 200,
              }}
            >
              <img
                src={imageUrl}
                alt="Receipt"
                style={{
                  width: '100%',
                  height: 'auto',
                  objectFit: 'contain',
                  maxHeight: 200,
                }}
              />
            </div>
          )}

          <div className="panel" style={{ marginBottom: 'var(--sp-4)' }}>
            <div
              className="panel__body"
              style={{ display: 'flex', gap: 'var(--sp-3)', flexWrap: 'wrap' }}
            >
              <div style={{ flex: 1, minWidth: 150 }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: 'var(--fs-xs)',
                    color: 'var(--text-muted)',
                    marginBottom: 'var(--sp-1)',
                  }}
                >
                  {t('history.store') || 'Store'}
                </label>
                <select
                  value={selectedStore || ''}
                  onChange={(e) => setSelectedStore(e.target.value || null)}
                  style={{ width: '100%' }}
                >
                  <option value="">
                    {t('addReceipt.selectStore') || 'Select store...'}
                  </option>
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1, minWidth: 150 }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: 'var(--fs-xs)',
                    color: 'var(--text-muted)',
                    marginBottom: 'var(--sp-1)',
                  }}
                >
                  {t('history.date') || 'Date'}
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel__head">
              <h2>{t('addReceipt.reviewTitle')}</h2>
              <span className="hint">{t('addReceipt.editHint')}</span>
            </div>
            <div className="panel__body">
              {items.map((it) => (
                <div className="parsed-row" key={it._id}>
                  <input
                    value={it.name}
                    onChange={(e) => updateItem(it._id, 'name', e.target.value)}
                    aria-label={t('history.item')}
                  />
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={it.qty}
                    onChange={(e) => updateItem(it._id, 'qty', e.target.value)}
                    aria-label={t('common.from')}
                    style={{ width: 70 }}
                  />
                  <input
                    value={it.unit}
                    onChange={(e) => updateItem(it._id, 'unit', e.target.value)}
                    aria-label="Unit"
                    style={{ width: 60 }}
                  />
                  <input
                    type="number"
                    min="0"
                    value={it.price}
                    onChange={(e) =>
                      updateItem(it._id, 'price', e.target.value)
                    }
                    aria-label={t('history.price')}
                    style={{ width: 90 }}
                  />
                </div>
              ))}
            </div>
            <div className="panel__foot">
              <div
                style={{
                  marginRight: 'auto',
                  color: 'var(--text-muted)',
                  fontSize: 'var(--fs-sm)',
                }}
              >
                {t('addReceipt.total')}{' '}
                <strong style={{ color: 'var(--text)' }}>
                  {formatRp(lineTotal)}
                </strong>
              </div>
              <button className="btn btn--ghost" onClick={handleRetake}>
                <IconArrowLeft size={18} /> {t('addReceipt.retake')}
              </button>
              <button
                className="btn btn--primary"
                onClick={handleConfirm}
                disabled={creating}
              >
                {creating ? (
                  <IconBolt size={18} className="spin" />
                ) : (
                  <IconCheck size={18} />
                )}{' '}
                {t('addReceipt.confirmAdd')}
              </button>
            </div>
          </div>
        </>
      )}

      {phase === 'done' && (
        <div
          className="panel"
          style={{ padding: 'var(--sp-9)', textAlign: 'center' }}
        >
          <div style={{ margin: '0 auto var(--sp-5)', color: 'var(--ok)' }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'var(--ok-soft)',
                display: 'grid',
                placeItems: 'center',
                margin: '0 auto',
              }}
            >
              <IconCheck size={28} />
            </div>
          </div>
          <div style={{ fontWeight: 600, fontSize: 'var(--fs-lg)' }}>
            {t('addReceipt.stockAdded', { count: items.length })}
          </div>
          <div
            style={{
              color: 'var(--text-muted)',
              fontSize: 'var(--fs-sm)',
              marginTop: 'var(--sp-2)',
            }}
          >
            {t('addReceipt.stockUpdatedDesc')}
          </div>
          <div
            style={{
              marginTop: 'var(--sp-5)',
              display: 'flex',
              gap: 'var(--sp-3)',
              justifyContent: 'center',
            }}
          >
            <button className="btn btn--secondary" onClick={handleRetake}>
              <IconReceipt size={18} /> {t('addReceipt.addAnother')}
            </button>
            <button className="btn btn--primary" onClick={onDone}>
              {t('addReceipt.done')}
            </button>
          </div>
        </div>
      )}
    </>
  )
}

function SkeletonLines() {
  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}
    >
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          style={{ display: 'flex', gap: 'var(--sp-3)', alignItems: 'center' }}
        >
          <div className="skeleton" style={{ height: 14, flex: 1 }} />
          <div className="skeleton" style={{ height: 14, width: 60 }} />
          <div className="skeleton" style={{ height: 14, width: 70 }} />
        </div>
      ))}
    </div>
  )
}
