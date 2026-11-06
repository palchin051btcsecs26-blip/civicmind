import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { Icon } from '../../components/Icon'
import { MapThumbnail } from '../../components/GoaMap'
import { Badge, Button, Card, CardBody, Field, LinkButton, Notice, PageHeader } from '../../components/ui'
import { api, useApi } from '../../lib/api'
import type { MetaPayload } from '../../lib/types'
import { CATEGORIES, CITIES, SEVERITY_META } from '../../lib/ui'
import type { Severity } from '../../lib/types'

interface Photo {
  id: string
  name: string
  url: string
}

interface SubmitResult {
  ref: string
  id: string
}

const SEVERITIES: Severity[] = ['low', 'medium', 'high', 'critical']

function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (value: number) => (value * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(h))
}

export function SubmitComplaint() {
  const { data: meta } = useApi<MetaPayload>('/api/meta')

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<string>('')
  const [city, setCity] = useState<string>('Panaji')
  const [locationId, setLocationId] = useState('')
  const [severity, setSeverity] = useState<Severity>('medium')
  const [photos, setPhotos] = useState<Photo[]>([])
  const [voiceNote, setVoiceNote] = useState(false)
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [micNotice, setMicNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<SubmitResult | null>(null)
  const [locating, setLocating] = useState(false)
  const [locationNotice, setLocationNotice] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const timerRef = useRef<number | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const demoRecordingRef = useRef(false)

  const locationsForCity = useMemo(
    () => (meta?.locations ?? []).filter((location) => location.city === city),
    [meta, city],
  )

  useEffect(() => {
    if (!locationId && locationsForCity.length) setLocationId(locationsForCity[0].id)
  }, [locationsForCity, locationId])

  useEffect(() => {
    if (!locationsForCity.some((location) => location.id === locationId)) {
      setLocationId(locationsForCity[0]?.id ?? '')
    }
  }, [locationsForCity, locationId])

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current)
      streamRef.current?.getTracks().forEach((track) => track.stop())
      photos.forEach((photo) => URL.revokeObjectURL(photo.url))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selectedLocation = meta?.locations.find((location) => location.id === locationId)

  function addPhotos(files: FileList | null) {
    if (!files) return
    const next: Photo[] = []
    Array.from(files)
      .filter((file) => file.type.startsWith('image/'))
      .slice(0, 4 - photos.length)
      .forEach((file) => {
        next.push({ id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 6)}`, name: file.name, url: URL.createObjectURL(file) })
      })
    setPhotos((current) => [...current, ...next])
  }

  function removePhoto(id: string) {
    setPhotos((current) => {
      const found = current.find((photo) => photo.id === id)
      if (found) URL.revokeObjectURL(found.url)
      return current.filter((photo) => photo.id !== id)
    })
  }

  function startTimer() {
    setSeconds(0)
    if (timerRef.current) window.clearInterval(timerRef.current)
    timerRef.current = window.setInterval(() => setSeconds((value) => value + 1), 1000)
  }

  function stopTimer() {
    if (timerRef.current) window.clearInterval(timerRef.current)
    timerRef.current = null
  }

  async function toggleRecording() {
    if (recording) {
      setRecording(false)
      stopTimer()
      demoRecordingRef.current = false
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.stop()
      }
      recorderRef.current?.stream.getTracks().forEach((track) => track.stop())
      streamRef.current?.getTracks().forEach((track) => track.stop())
      setVoiceNote(true)
      return
    }

    setRecording(true)
    setVoiceNote(false)
    setMicNotice(null)
    startTimer()

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      demoRecordingRef.current = true
      setMicNotice('Microphone capture is unavailable in this browser. A simulated voice note will be attached with the demo complaint.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data)
      }
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop())
      }
      recorder.start()
      recorderRef.current = recorder
    } catch {
      demoRecordingRef.current = true
      setMicNotice('Microphone permission was not granted. A simulated voice note will be attached instead.')
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setLocationNotice('Location access is unavailable in this browser. Choose a neighbourhood manually.')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nearest = (meta?.locations ?? [])
          .map((location) => ({ location, distance: haversine({ lat: position.coords.latitude, lng: position.coords.longitude }, location) }))
          .sort((a, b) => a.distance - b.distance)[0]
        if (nearest) {
          setCity(nearest.location.city)
          setLocationId(nearest.location.id)
          setLocationNotice(
            `Matched to ${nearest.location.name}, ${nearest.location.city} (${nearest.distance.toFixed(1)} km away). Demo locations are approximate.`,
          )
        }
        setLocating(false)
      },
      () => {
        setLocationNotice('Could not access your location. Choose a neighbourhood manually instead.')
        setLocating(false)
      },
      { timeout: 8000 },
    )
  }

  async function submit() {
    setError(null)
    if (title.trim().length < 8) return setError('Add a short title of at least 8 characters.')
    if (description.trim().length < 15) return setError('Describe the issue in at least 15 characters so the field team can act on it.')
    if (!category) return setError('Choose the category that best matches the issue.')
    if (!locationId) return setError('Choose a location for the complaint.')

    setSubmitting(true)
    try {
      const payload = await api<{ incident: { ref: string; id: string } }>('/api/incidents', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          category,
          city,
          locationId,
          severity,
          photoCount: photos.length,
          voiceNote,
          affectedPeople: severity === 'critical' ? 600 : severity === 'high' ? 320 : 140,
        }),
      })
      setResult(payload.incident)
      window.dispatchEvent(new Event('civicmind:data-changed'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The complaint could not be submitted. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (result) {
    return (
      <AppShell workspace="citizen">
        <Card className="success-panel">
          <span className="success-mark">
            <Icon name="check" />
          </span>
          <h1>Complaint received.</h1>
          <p>
            Your report has been logged in the Goa pilot dataset and routed to the municipal control room for triage. You can
            follow every status change from your complaint history.
          </p>
          <div className="success-ref">
            <span>Reference</span>
            {result.ref}
          </div>
          <div className="row-wrap" style={{ justifyContent: 'center' }}>
            <LinkButton to={`/citizen/reports?ref=${result.ref}`} variant="primary" iconRight="arrowRight">
              Track this complaint
            </LinkButton>
            <Button
              variant="ghost"
              icon="plus"
              onClick={() => {
                setResult(null)
                setTitle('')
                setDescription('')
                setCategory('')
                setPhotos([])
                setVoiceNote(false)
                setSeverity('medium')
                setSeconds(0)
              }}
            >
              File another
            </Button>
          </div>
          <div className="notice notice--info" style={{ marginTop: 22, textAlign: 'left' }}>
            <Icon name="alertCircle" />
            <div>
              This is a demonstration submission. It is stored in the local pilot database and is not sent to any government
              department.
            </div>
          </div>
        </Card>
      </AppShell>
    )
  }

  return (
    <AppShell workspace="citizen">
      <PageHeader
        eyebrow="New complaint"
        title="Tell us what needs fixing."
        sub="Photographs and a precise location help the field team verify the issue faster. You will receive a reference number as soon as it is logged."
        actions={<Badge tone="neutral">Demo intake · no live routing</Badge>}
      />

      <div className="complaint-layout">
        <div className="form-stack">
          <Card>
            <CardBody>
              <div className="form-step-head">
                <span className="form-step-num">01</span>
                <div>
                  <h2>The issue</h2>
                  <p>A clear title and description help triage route it correctly.</p>
                </div>
              </div>

              <div className="form-grid">
                <Field label="Complaint title" className="col-span-2" hint={`${title.length}/90 characters`}>
                  <input
                    className="input"
                    value={title}
                    maxLength={90}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="e.g. Storm drain overflowing near St. Inez market"
                  />
                </Field>

                <Field label="Category" className="col-span-2">
                  <div className="option-grid">
                    {CATEGORIES.map((option) => (
                      <button
                        type="button"
                        key={option}
                        className={`option${category === option ? ' is-active' : ''}`}
                        onClick={() => setCategory(option)}
                      >
                        <span className="dot" />
                        {option}
                      </button>
                    ))}
                  </div>
                </Field>

                <Field label="Description" className="col-span-2" hint="What is happening, for how long, and who is affected?">
                  <textarea
                    className="textarea"
                    value={description}
                    maxLength={900}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Describe the problem, when it started and any immediate risk to residents or traffic."
                  />
                </Field>

                <Field label="How urgent does it feel?" className="col-span-2" hint="Triage may adjust this after review.">
                  <div className="option-grid">
                    {SEVERITIES.map((option) => (
                      <button
                        type="button"
                        key={option}
                        className={`option${severity === option ? ' is-active' : ''}`}
                        onClick={() => setSeverity(option)}
                      >
                        <span
                          className="dot"
                          style={{
                            background:
                              option === 'critical' ? 'var(--coral-500)' : option === 'high' ? 'var(--amber-500)' : option === 'medium' ? 'var(--olive-500)' : 'var(--slate-300)',
                          }}
                        />
                        {SEVERITY_META[option].label}
                      </button>
                    ))}
                  </div>
                </Field>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <div className="form-step-head">
                <span className="form-step-num">02</span>
                <div>
                  <h2>Photographs &amp; voice note</h2>
                  <p>Optional, but strong evidence speeds up verification.</p>
                </div>
              </div>

              <div className="form-grid">
                <div className="field">
                  <span className="field-label">
                    Photographs <span>Up to 4 images</span>
                  </span>
                  <div
                    className="dropzone"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault()
                      addPhotos(event.dataTransfer.files)
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') fileInputRef.current?.click()
                    }}
                  >
                    <Icon name="camera" />
                    <strong>Add photos of the issue</strong>
                    <span>Drag and drop, or click to browse · JPG, PNG</span>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    hidden
                    onChange={(event) => {
                      addPhotos(event.target.files)
                      event.target.value = ''
                    }}
                  />
                  {photos.length ? (
                    <div className="upload-strip">
                      {photos.map((photo) => (
                        <div className="upload-thumb" key={photo.id} title={photo.name}>
                          <img src={photo.url} alt={photo.name} />
                          <button type="button" onClick={() => removePhoto(photo.id)} aria-label={`Remove ${photo.name}`}>
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="field-hint">No photos attached yet.</span>
                  )}
                </div>

                <div className="field">
                  <span className="field-label">
                    Voice complaint <span>Optional</span>
                  </span>
                  <div className="voice-panel">
                    <button
                      type="button"
                      className={`voice-btn${recording ? ' is-recording' : ''}`}
                      onClick={toggleRecording}
                      aria-label={recording ? 'Stop recording' : 'Start recording a voice note'}
                    >
                      <Icon name={recording ? 'close' : 'mic'} />
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="row-between">
                        <strong style={{ fontSize: 12 }}>{recording ? 'Recording…' : voiceNote ? 'Voice note attached' : 'Record a voice note'}</strong>
                        <span className="mono" style={{ fontSize: 10, color: 'var(--slate-400)' }}>
                          {String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}
                        </span>
                      </div>
                      <div className={`wave${recording ? ' is-live' : ''}`} aria-hidden="true">
                        {Array.from({ length: 28 }).map((_, index) => (
                          <span key={index} style={{ height: `${20 + ((index * 37) % 70)}%` }} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <span className="field-hint">
                    Say what is wrong and where. Transcription and AI summaries arrive with the Groq phase; this build stores the
                    note marker only.
                  </span>
                  {micNotice ? (
                    <div className="notice" style={{ marginTop: 8 }}>
                      <Icon name="alertCircle" />
                      <div>{micNotice}</div>
                    </div>
                  ) : null}
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <div className="form-step-head">
                <span className="form-step-num">03</span>
                <div>
                  <h2>Location</h2>
                  <p>Pick the closest neighbourhood, or let the browser find it.</p>
                </div>
              </div>

              <div className="form-grid">
                <Field label="City">
                  <select className="select" value={city} onChange={(event) => setCity(event.target.value)}>
                    {CITIES.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Neighbourhood / ward">
                  <select className="select" value={locationId} onChange={(event) => setLocationId(event.target.value)}>
                    {locationsForCity.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name} — {location.ward}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="row-wrap" style={{ marginTop: 14 }}>
                <Button variant="ghost" size="sm" icon="pin" onClick={useMyLocation} disabled={locating}>
                  {locating ? 'Locating…' : 'Use my current location'}
                </Button>
                <span className="mono" style={{ fontSize: 9.5, color: 'var(--slate-400)' }}>
                  {selectedLocation ? `${selectedLocation.lat.toFixed(4)}, ${selectedLocation.lng.toFixed(4)}` : 'No location selected'}
                </span>
              </div>
              {locationNotice ? (
                <div className="notice notice--info" style={{ marginTop: 12 }}>
                  <Icon name="pin" />
                  <div>{locationNotice}</div>
                </div>
              ) : null}
            </CardBody>
          </Card>

          {error ? (
            <Notice tone="error" icon="alertCircle">
              {error}
            </Notice>
          ) : null}

          <div className="form-actions">
            <span className="field-hint">You will receive a reference number for tracking.</span>
            <div className="row-wrap">
              <Link to="/citizen" className="btn btn--ghost">
                Cancel
              </Link>
              <Button variant="accent" iconRight="send" onClick={submit} disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit complaint'}
              </Button>
            </div>
          </div>
        </div>

        <aside className="sticky-summary">
          <Card dark>
            <CardBody>
              <div className="row-between">
                <span className="eyebrow" style={{ color: 'var(--teal-400)' }}>
                  Complaint summary
                </span>
                <Badge tone="dark" plain>
                  Draft
                </Badge>
              </div>
              <h3 style={{ marginTop: 10, fontSize: 15, fontWeight: 600 }}>{title || 'Untitled civic issue'}</h3>
              <p style={{ marginTop: 3, fontSize: 11.5, color: 'rgba(243,239,227,0.5)', lineHeight: 1.5 }}>
                {selectedLocation ? `${selectedLocation.name}, ${city}` : city} · {category || 'Category not selected'}
              </p>
              <div className="summary-map" style={{ marginTop: 14 }}>
                <MapThumbnail />
              </div>
              <div className="summary-list" style={{ marginTop: 16, color: 'rgba(243,239,227,0.6)' }}>
                <div>
                  <span style={{ color: 'rgba(243,239,227,0.45)' }}>Severity</span>
                  <strong style={{ color: 'var(--on-dark)' }}>{SEVERITY_META[severity].label}</strong>
                </div>
                <div>
                  <span style={{ color: 'rgba(243,239,227,0.45)' }}>Evidence</span>
                  <strong style={{ color: 'var(--on-dark)' }}>
                    {photos.length} photo{photos.length === 1 ? '' : 's'}
                    {voiceNote ? ' · voice' : ''}
                  </strong>
                </div>
                <div>
                  <span style={{ color: 'rgba(243,239,227,0.45)' }}>Intake channel</span>
                  <strong style={{ color: 'var(--on-dark)' }}>Citizen web portal</strong>
                </div>
              </div>
              <div style={{ marginTop: 18 }}>
                <Button variant="accent" block iconRight="arrowRight" onClick={submit} disabled={submitting}>
                  {submitting ? 'Submitting…' : 'Submit complaint'}
                </Button>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <span className="eyebrow">What happens next</span>
              <div className="stack gap-14" style={{ marginTop: 14 }}>
                {[
                  { icon: 'checkCircle' as const, title: 'Immediate receipt', copy: 'A reference number is generated for tracking.' },
                  { icon: 'layers' as const, title: 'Triage & priority', copy: 'Category, severity and recurrence produce a priority score.' },
                  { icon: 'building' as const, title: 'Department assignment', copy: 'The incident is routed with an SLA target.' },
                  { icon: 'check' as const, title: 'Resolution evidence', copy: 'Closure requires a summary and photographs.' },
                ].map((step, index) => (
                  <div className="row-wrap" key={step.title} style={{ alignItems: 'flex-start' }}>
                    <span className="form-step-num" style={{ width: 22, height: 22, fontSize: 9 }}>
                      {index + 1}
                    </span>
                    <div style={{ flex: 1 }}>
                      <strong style={{ fontSize: 12, display: 'block' }}>{step.title}</strong>
                      <span style={{ fontSize: 11.5, color: 'var(--slate-500)', lineHeight: 1.5 }}>{step.copy}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="disclosure" style={{ marginTop: 18 }}>
                <Icon name="alertCircle" />
                <div>This submits to the demonstration dataset only. No live municipal routing occurs.</div>
              </div>
            </CardBody>
          </Card>
        </aside>
      </div>
    </AppShell>
  )
}
