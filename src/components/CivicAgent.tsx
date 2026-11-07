import { useEffect, useRef, useState } from 'react'
import { Icon } from './Icon'
import { Badge, Card, CardBody, CardHead, Notice } from './ui'
import { api } from '../lib/api'
import type { AgentResult, Incident, Role } from '../lib/types'

interface Attachment {
  kind: 'image' | 'audio'
  data: string
  mimeType: string
  name: string
  preview?: string
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  result?: AgentResult
  attachment?: { kind: 'image' | 'audio'; preview?: string }
}

interface AgentProps {
  incidents: Incident[]
  role: Role
  userName?: string
  contextIncident: Incident | null
  contextNonce: number
  onHighlight: (ids: string[]) => void
  onOpenIncident: (incident: Incident) => void
}

function greetingFor(role: Role, userName?: string) {
  const hour = new Date().getHours()
  const partOfDay = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = userName?.trim().split(/\s+/)[0]
  const greeting = firstName ? `${partOfDay}, ${firstName}.` : `${partOfDay}.`

  if (role === 'citizen') {
    return `${greeting} I am your CivicMind civic agent. Describe a new issue, ask me what is happening with your complaints, or open an incident on the map and send it to me for a priority and department recommendation.`
  }
  if (role === 'admin') {
    return `${greeting} I am your CivicMind triage agent. Describe an incident for a priority, duplicate and department recommendation, or select a marker on the live map and ask me to analyse it. I can also explain the public incident index; I never change a case myself.`
  }
  return `${partOfDay}. You are browsing as a guest, so I can explain public incident data and the live map only. Citizen reports, personal complaint histories and authority actions stay private.`
}

function suggestionsFor(role: Role) {
  if (role === 'citizen') {
    return [
      'What is the status of my complaints?',
      'Sewage is overflowing near Campal and children walk through it.',
      'Streetlights are out along the Baga beach road at night.',
      'Find recurring waste complaints around Calangute beach.',
    ]
  }
  if (role === 'admin') {
    return [
      'Sewage is overflowing near Campal and children walk through it.',
      'Find recurring waste complaints around Calangute beach.',
      'Streetlights are out along the Baga beach road at night.',
      'There is illegal debris dumping along the Ribandar causeway.',
    ]
  }
  return [
    'Show recurring waste complaints around Calangute beach.',
    'Streetlights are out along the Baga beach road at night.',
    'Sewage is overflowing near Campal.',
  ]
}

function newId() {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function readAsData(file: Blob): Promise<{ data: string; preview?: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result ?? '')
      const data = result.includes(',') ? result.split(',')[1] : ''
      resolve({ data, preview: file.type.startsWith('image/') ? result : undefined })
    }
    reader.onerror = () => reject(new Error('The file could not be read.'))
    reader.readAsDataURL(file)
  })
}

export function CivicAgent({ incidents, role, userName, contextIncident, contextNonce, onHighlight, onOpenIncident }: AgentProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'greeting', role: 'assistant', content: greetingFor(role, userName) },
  ])
  const [input, setInput] = useState('')
  const [image, setImage] = useState<Attachment | null>(null)
  const [audio, setAudio] = useState<Attachment | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [micNotice, setMicNotice] = useState<string | null>(null)

  const threadRef = useRef<HTMLDivElement | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<number | null>(null)
  const contextSentRef = useRef(0)

  const lastResult = [...messages].reverse().find((message) => message.result)?.result
  const source = lastResult?.source
  const badgeLabel =
    lastResult?.kind === 'records' ? 'Your records' : source === 'groq' ? 'Groq live' : source === 'local' ? 'Demo reasoner' : 'Groq-ready'

  useEffect(() => {
    const thread = threadRef.current
    if (!thread) return
    thread.scrollTo({ top: thread.scrollHeight, behavior: 'smooth' })
  }, [messages, busy])

  useEffect(() => {
    if (!contextIncident || !contextNonce || contextSentRef.current === contextNonce) return
    contextSentRef.current = contextNonce
    void send(`Explain ${contextIncident.ref} — ${contextIncident.title}. What priority, department and next step do you recommend?`, contextIncident)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextIncident, contextNonce])

  useEffect(() => {
    if (recording && seconds >= 20) void toggleRecording()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds, recording])

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current)
      streamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  async function addPhoto(files: FileList | null) {
    const file = files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Attach a PNG, JPEG or WebP image.')
      return
    }
    if (file.size > 4_000_000) {
      setError('Use an image smaller than 4 MB.')
      return
    }
    setError(null)
    try {
      const { data, preview } = await readAsData(file)
      setImage({ kind: 'image', data, mimeType: file.type, name: file.name, preview })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The image could not be attached.')
    }
  }

  async function toggleRecording() {
    if (recording) {
      setRecording(false)
      if (timerRef.current) window.clearInterval(timerRef.current)
      timerRef.current = null
      if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop()
      recorderRef.current?.stream.getTracks().forEach((track) => track.stop())
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      return
    }

    setMicNotice(null)
    setError(null)
    setSeconds(0)

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setMicNotice('Microphone capture is unavailable in this browser. Typing the issue still works.')
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
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop())
        if (recorder.mimeType.includes('video') || recorder.mimeType.includes('audio')) {
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
          if (!blob.size) return
          try {
            const { data } = await readAsData(blob)
            setAudio({ kind: 'audio', data, mimeType: blob.type || 'audio/webm', name: 'civic-note.webm' })
            setMicNotice('Voice note attached. Add a sentence describing it if you want the text analysed too.')
          } catch {
            setMicNotice('The recording finished but could not be attached.')
          }
        }
      }
      recorder.start()
      recorderRef.current = recorder
      setRecording(true)
      setSeconds(0)
      timerRef.current = window.setInterval(() => setSeconds((value) => value + 1), 1000)
    } catch {
      setMicNotice('Microphone permission was not granted. Typing the issue still works.')
    }
  }

  async function send(text: string, incidentOverride?: Incident | null) {
    if (busy) return
    const message = text.trim()
    if (!message && !image && !audio) return

    const context = incidentOverride ?? contextIncident
    const history = messages
      .filter((entry) => entry.id !== 'greeting')
      .slice(-6)
      .map((entry) => ({ role: entry.role, content: entry.content }))

    const userAttachment = image
      ? { kind: 'image' as const, preview: image.preview }
      : audio
        ? { kind: 'audio' as const }
        : undefined

    setMessages((current) => [
      ...current,
      {
        id: newId(),
        role: 'user',
        content: message || (image ? 'Analyse the attached photo.' : 'Analyse the attached voice note.'),
        attachment: userAttachment,
      },
    ])
    setInput('')
    setBusy(true)
    setError(null)

    try {
      const payload: Record<string, unknown> = {
        message: message || (image ? 'Look at the attached civic issue photo.' : 'Analyse the attached voice note.'),
        history,
        incidentId: context?.id ?? null,
      }
      if (image) payload.image = { data: image.data, mimeType: image.mimeType }
      if (audio) payload.audio = { data: audio.data, mimeType: audio.mimeType }

      const result = await api<AgentResult>('/api/ai/agent', { method: 'POST', body: JSON.stringify(payload) })
      setMessages((current) => [...current, { id: newId(), role: 'assistant', content: result.reply, result }])
      onHighlight(result.matchedIncidentIds)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The agent could not answer. Try again.')
    } finally {
      setBusy(false)
      setImage(null)
      setAudio(null)
    }
  }

  function submit() {
    void send(input)
  }

  return (
    <Card className="agent-card">
      <CardHead
        title="CivicMind AI agent"
        sub="Classify, de-duplicate and route — with the map as its evidence board."
        action={
          <Badge tone={source === 'groq' ? 'progress' : 'neutral'} plain>
            {badgeLabel}
          </Badge>
        }
      />
      <CardBody className="agent-body">
        <div className="agent-thread" ref={threadRef} aria-live="polite">
          {messages.map((message) => (
            <div key={message.id} className={`agent-message agent-message--${message.role}`}>
              {message.role === 'assistant' ? (
                <span className="agent-avatar">
                  <Icon name="sparkle" size={14} />
                </span>
              ) : null}
              <div className="agent-bubble">
                <p>{message.content}</p>
                {message.attachment?.kind === 'image' && message.attachment.preview ? (
                  <img className="agent-bubble__image" src={message.attachment.preview} alt="Attached complaint evidence" />
                ) : null}
                {message.attachment?.kind === 'audio' ? (
                  <span className="agent-bubble__audio">
                    <Icon name="mic" size={13} /> Voice note attached
                  </span>
                ) : null}

                {message.result ? (
                  <>
                    {message.result.findings ? (
                      <div className="agent-findings">
                        <div>
                          <span>Category</span>
                          <strong>{message.result.findings.category}</strong>
                        </div>
                        <div>
                          <span>Priority</span>
                          <strong>
                            {message.result.findings.priority}/100 · {message.result.findings.severity}
                          </strong>
                        </div>
                        <div>
                          <span>Department</span>
                          <strong>{message.result.findings.department}</strong>
                        </div>
                        <div>
                          <span>Location</span>
                          <strong>{message.result.findings.location ?? message.result.findings.city ?? 'Not specified'}</strong>
                        </div>
                        <div>
                          <span>Confidence</span>
                          <strong>{Math.round(message.result.findings.confidence * 100)}%</strong>
                        </div>
                        <div>
                          <span>Source</span>
                          <strong>{message.result.source === 'groq' ? 'Groq' : message.result.kind === 'records' ? 'Your records' : 'Local demo'}</strong>
                        </div>
                      </div>
                    ) : null}

                    {message.result.duplicates.length ? (
                      <div className="agent-dupes">
                        <span>Possible duplicates</span>
                        {message.result.duplicates.map((duplicate) => {
                          const target = incidents.find((incident) => incident.id === duplicate.id)
                          return target ? (
                            <button key={duplicate.id} type="button" onClick={() => onOpenIncident(target)}>
                              <span>{duplicate.ref}</span>
                              {duplicate.title}
                              <Icon name="chevronRight" size={12} />
                            </button>
                          ) : null
                        })}
                      </div>
                    ) : null}

                    {message.result.matchedIncidentIds.length ? (
                      <div className="agent-result-actions">
                        <button type="button" className="btn btn--ghost btn--xs" onClick={() => onHighlight(message.result?.matchedIncidentIds ?? [])}>
                          <Icon name="map" size={13} />
                          {message.result.kind === 'records'
                            ? `Highlight my ${message.result.matchedIncidentIds.length} complaint${message.result.matchedIncidentIds.length === 1 ? '' : 's'}`
                            : `Highlight ${message.result.matchedIncidentIds.length} on map`}
                        </button>
                      </div>
                    ) : null}

                    {message.result.notice ? <p className="agent-notice">{message.result.notice}</p> : null}
                  </>
                ) : null}
              </div>
            </div>
          ))}

          {busy ? (
            <div className="agent-message agent-message--assistant">
              <span className="agent-avatar">
                <Icon name="sparkle" size={14} />
              </span>
              <div className="agent-bubble agent-bubble--thinking">
                <span className="spinner spinner--sm" />
                Reading the report and checking the incident index…
              </div>
            </div>
          ) : null}
        </div>

        {messages.length === 1 ? (
          <div className="agent-suggestions">
            {suggestionsFor(role).map((suggestion) => (
              <button key={suggestion} type="button" onClick={() => void send(suggestion)}>
                {suggestion}
              </button>
            ))}
          </div>
        ) : null}

        {error ? (
          <Notice tone="error" icon="alertCircle">
            {error}
          </Notice>
        ) : null}
        {micNotice ? (
          <Notice tone="info" icon="mic">
            {micNotice}
          </Notice>
        ) : null}

        {contextIncident ? (
          <div className="agent-context">
            <Icon name="pin" size={12} /> Map context: <strong>{contextIncident.ref}</strong> {contextIncident.title}
          </div>
        ) : null}

        {image || audio ? (
          <div className="agent-attachments">
            {image ? (
              <span className="agent-attachment">
                {image.preview ? <img src={image.preview} alt="Attached evidence preview" /> : <Icon name="camera" size={14} />}
                {image.name}
                <button type="button" aria-label="Remove image" onClick={() => setImage(null)}>
                  <Icon name="close" size={11} />
                </button>
              </span>
            ) : null}
            {audio ? (
              <span className="agent-attachment">
                <Icon name="mic" size={14} /> Voice note · {seconds}s
                <button type="button" aria-label="Remove voice note" onClick={() => setAudio(null)}>
                  <Icon name="close" size={11} />
                </button>
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="agent-composer">
          <textarea
            className="textarea agent-input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                submit()
              }
            }}
            placeholder="Describe the civic issue, or ask what to do next…"
            aria-label="Message the CivicMind AI agent"
            rows={2}
          />
          <div className="agent-composer__actions">
            <div className="agent-composer__icons">
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="visually-hidden"
                tabIndex={-1}
                aria-hidden="true"
                onChange={(event) => {
                  void addPhoto(event.target.files)
                  event.target.value = ''
                }}
              />
              <button type="button" className="icon-btn" onClick={() => fileRef.current?.click()} aria-label="Attach a photo" title="Attach a photo">
                <Icon name="camera" size={16} />
              </button>
              <button
                type="button"
                className={`icon-btn${recording ? ' is-recording' : ''}`}
                onClick={() => void toggleRecording()}
                aria-label={recording ? 'Stop recording' : 'Record a voice note'}
                title={recording ? `Stop recording (${seconds}s)` : 'Record a voice note'}
              >
                <Icon name="mic" size={16} />
              </button>
              {recording ? <span className="agent-recording">Recording {seconds}s</span> : null}
            </div>
            <button type="button" className="btn btn--accent btn--sm" onClick={submit} disabled={busy || (!input.trim() && !image && !audio)}>
              <Icon name="send" size={14} /> Ask
            </button>
          </div>
        </div>

        <p className="agent-disclaimer">
          Groq reasoning is enabled when <code>GROQ_API_KEY</code> is configured; otherwise a local demo reasoner answers.
          AI output is decision support on simulated data, not an official municipal determination.
        </p>
      </CardBody>
    </Card>
  )
}
