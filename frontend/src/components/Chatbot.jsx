import { useEffect, useRef, useState } from 'react'
import { Bot, Check, Clock3, ExternalLink, Languages, MessageCircle, Mic, Minus, Send, Sparkles, Square, Trash2, Volume2, X } from 'lucide-react'
import { useAlerts } from '../App.jsx'
import { request } from '../services/api.js'
import { formatTime } from '../utils/format.js'
import { chatLanguages } from '../../../shared/chatLanguages.js'
import { chatText } from '../../../shared/chatLocaleText.js'

const QUICK_QUESTIONS = [
  { key: 'active', en: 'What alerts are active?' },
  { key: 'weather', en: 'What is the weather in Mumbai?' },
  { key: 'rainTomorrow', en: 'Will it rain tomorrow in Mumbai?' },
  { key: 'forecast', en: 'What is the 7-day forecast in Mumbai?' },
  { key: 'umbrella', en: 'Should I carry an umbrella in Mumbai today?' },
  { key: 'flood', en: 'What should I do during a flood?' },
  { key: 'cyclone', en: 'What should I do during a cyclone?' },
  { key: 'severity', en: 'How severe is the current alert?' },
  { key: 'mumbai', en: 'Show alerts near Mumbai' },
  { key: 'kit', en: 'What should I keep in an emergency kit?' },
  { key: 'explain', en: 'Explain this disaster alert' },
]
const SPEAK_LABELS = { en: 'Read aloud', hi: 'जवाब सुनें', mr: 'उत्तर ऐका', ta: 'பதிலைக் கேளுங்கள்', te: 'సమాధానం వినండి', bn: 'উত্তর শুনুন' }

function newConversationId() {
  const existing = localStorage.getItem('dah-chat-session-live-v2')
  if (existing) return existing
  const id = globalThis.crypto?.randomUUID?.()
  if (!id) throw new Error('Secure conversation ID generation is unavailable.')
  localStorage.setItem('dah-chat-session-live-v2', id)
  return id
}

function readLanguage() {
  const saved = localStorage.getItem('dah-chat-language')
  return saved === 'auto' || chatLanguages.some((item) => item.code === saved) ? saved : 'auto'
}

function makeWelcome(language) {
  return { role: 'assistant', content: chatText(language).welcome, timestamp: new Date().toISOString(), sources: [], language }
}

function initialMessages(language) {
  try {
    const saved = JSON.parse(localStorage.getItem('dah-chat-messages-live-v2') || 'null')
    if (Array.isArray(saved) && saved.length) return saved
  } catch { /* Use the welcome message when stored demo history is invalid. */ }
  return [makeWelcome(language)]
}

function getRecognitionConstructor() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null
}

export default function Chatbot() {
  const { chatOpen, setChatOpen, chatPrompt, setChatPrompt, mockDataEnabled } = useAlerts()
  const [selectedLanguage, setSelectedLanguage] = useState(readLanguage)
  const initialLanguage = selectedLanguage === 'auto' ? 'en' : selectedLanguage
  const [currentLanguage, setCurrentLanguage] = useState(initialLanguage)
  const [conversationId, setConversationId] = useState(newConversationId)
  const [messages, setMessages] = useState(() => initialMessages(initialLanguage))
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const [voiceMode, setVoiceMode] = useState(false)
  const [listening, setListening] = useState(false)
  const [speakingId, setSpeakingId] = useState(null)
  const [voiceStatus, setVoiceStatus] = useState('')
  const scrollRef = useRef(null)
  const inputRef = useRef(null)
  const recognitionRef = useRef(null)
  const recognitionTimerRef = useRef(null)
  const voiceModeRef = useRef(false)
  const selectedAlertIdRef = useRef(null)
  const language = selectedLanguage === 'auto' ? currentLanguage : selectedLanguage
  const text = chatText(language)
  const selectedMeta = chatLanguages.find((item) => item.code === language) || chatLanguages[0]

  useEffect(() => { localStorage.setItem('dah-chat-messages-live-v2', JSON.stringify(messages)) }, [messages])
  useEffect(() => { localStorage.setItem('dah-chat-language', selectedLanguage) }, [selectedLanguage])
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }) }, [messages, typing, chatOpen, voiceStatus])
  useEffect(() => { if (chatOpen && !minimized) inputRef.current?.focus() }, [chatOpen, minimized])

  const speakText = (content, languageCode, messageIndex) => {
    if (!('speechSynthesis' in window) || !window.SpeechSynthesisUtterance) {
      setVoiceStatus(chatText(languageCode).speechUnsupported)
      return
    }
    try {
      window.speechSynthesis.cancel()
      const utterance = new window.SpeechSynthesisUtterance(content)
      const metadata = chatLanguages.find((item) => item.code === languageCode) || chatLanguages[0]
      const voices = window.speechSynthesis.getVoices()
      const prefix = metadata.speechCode.split('-')[0].toLowerCase()
      const voice = voices.find((item) => item.lang.toLowerCase() === metadata.speechCode.toLowerCase())
        || voices.find((item) => item.lang.toLowerCase().startsWith(`${prefix}-`))
        || voices.find((item) => item.lang.toLowerCase().startsWith('en-in'))
        || voices.find((item) => item.default)
        || voices[0]
      utterance.lang = voice?.lang || metadata.speechCode
      if (voice) utterance.voice = voice
      utterance.onstart = () => { setSpeakingId(messageIndex); setVoiceStatus(chatText(languageCode).speaking) }
      utterance.onend = () => { setSpeakingId(null); setVoiceStatus('') }
      utterance.onerror = () => { setSpeakingId(null); setVoiceStatus(chatText(languageCode).speechUnsupported) }
      window.speechSynthesis.speak(utterance)
    } catch { setSpeakingId(null); setVoiceStatus(chatText(languageCode).speechUnsupported) }
  }

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
    setSpeakingId(null)
    setVoiceStatus('')
  }

  const send = async (messageText, alertId, forcedLanguage) => {
    const content = messageText.trim()
    if (!content || typing) return
    const timestamp = new Date().toISOString()
    const chosenLanguage = forcedLanguage || selectedLanguage
    setMessages((current) => [...current, { role: 'user', content, timestamp, language: chosenLanguage === 'auto' ? undefined : chosenLanguage }])
    setInput('')
    setTyping(true)
    setVoiceStatus(chatText(language).processing)
    try {
      const result = await request('/chat', { method: 'POST', body: JSON.stringify({ message: content, conversationId, language: chosenLanguage, ...(alertId ? { alertId } : {}) }) })
      const replyLanguage = result.language || (chosenLanguage === 'auto' ? result.detectedLanguage : chosenLanguage) || language
      setCurrentLanguage(replyLanguage)
      const reply = { role: 'assistant', content: result.reply, timestamp: result.timestamp || new Date().toISOString(), sources: result.sources || [], language: replyLanguage }
      setMessages((current) => [...current, reply])
      setVoiceStatus('')
      if (voiceModeRef.current) speakText(reply.content, replyLanguage, messages.length + 1)
    } catch {
      const errorReply = { role: 'assistant', content: text.error || chatText('en').error, timestamp: new Date().toISOString(), sources: [], language }
      setMessages((current) => [...current, errorReply])
      setVoiceStatus('')
    } finally { setTyping(false) }
  }

  const startListening = async (autoSend = voiceMode) => {
    const Recognition = getRecognitionConstructor()
    if (!Recognition) { setVoiceStatus(text.micUnsupported); return }
    if (!navigator.mediaDevices?.getUserMedia) { setVoiceStatus(text.micUnsupported); return }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach((track) => track.stop())
    } catch (error) {
      setVoiceStatus(error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError' ? text.micDenied : text.voiceError)
      return
    }

    try {
      const recognition = new Recognition()
      recognitionRef.current = recognition
      recognition.lang = selectedMeta.speechCode
      recognition.continuous = false
      recognition.interimResults = false
      recognition.maxAlternatives = 1
      let gotSpeech = false
      let hadRecognitionError = false
      recognition.onstart = () => { setListening(true); setVoiceStatus(text.listen) }
      recognition.onresult = (event) => {
        const spoken = event.results?.[0]?.[0]?.transcript?.trim()
        if (!spoken) return
        gotSpeech = true
        setInput(spoken)
        setVoiceStatus('')
        if (autoSend) send(spoken, undefined, selectedLanguage === 'auto' ? undefined : selectedLanguage)
      }
      recognition.onerror = (event) => {
        hadRecognitionError = true
        setListening(false)
        window.clearTimeout(recognitionTimerRef.current)
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') setVoiceStatus(text.micDenied)
        else if (event.error === 'no-speech') setVoiceStatus(text.noSpeech)
        else if (event.error === 'language-not-supported') setVoiceStatus(text.micUnsupported)
        else setVoiceStatus(text.voiceError)
      }
      recognition.onend = () => {
        setListening(false)
        window.clearTimeout(recognitionTimerRef.current)
        if (!gotSpeech && !hadRecognitionError && !recognition.__cancelledByUser) setVoiceStatus(text.noSpeech)
      }
      recognitionTimerRef.current = window.setTimeout(() => {
        if (recognitionRef.current === recognition) {
          recognition.stop()
          setVoiceStatus(text.noSpeech)
        }
      }, 12000)
      recognition.start()
    } catch {
      setListening(false)
      setVoiceStatus(text.micUnsupported)
    }
  }

  const stopListening = () => {
    window.clearTimeout(recognitionTimerRef.current)
    if (recognitionRef.current) recognitionRef.current.__cancelledByUser = true
    recognitionRef.current?.stop()
    recognitionRef.current = null
    setListening(false)
    if (voiceStatus === text.listen) setVoiceStatus('')
  }

  const closeChat = () => {
    stopListening()
    stopSpeaking()
    setVoiceMode(false)
    voiceModeRef.current = false
    setChatOpen(false)
  }

  const minimizeChat = () => {
    stopListening()
    stopSpeaking()
    setVoiceMode(false)
    voiceModeRef.current = false
    setMinimized(true)
  }

  const toggleVoiceMode = () => {
    const next = !voiceMode
    setVoiceMode(next)
    voiceModeRef.current = next
    if (next) startListening(true)
    else { stopListening(); stopSpeaking() }
  }

  useEffect(() => () => {
    window.clearTimeout(recognitionTimerRef.current)
    recognitionRef.current?.abort?.()
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
  }, [])

  useEffect(() => {
    if (!chatPrompt || !chatOpen) return
    const prompt = chatPrompt
    selectedAlertIdRef.current = prompt.alertId || selectedAlertIdRef.current
    setChatPrompt(null)
    setMinimized(false)
    send(prompt.message, prompt.alertId)
  }, [chatPrompt, chatOpen])

  const clearConversation = () => {
    stopListening()
    stopSpeaking()
    const id = globalThis.crypto?.randomUUID?.()
    if (!id) {
      setVoiceStatus('Secure conversation ID generation is unavailable.')
      return
    }
    localStorage.setItem('dah-chat-session-live-v2', id)
    setConversationId(id)
    setMessages([makeWelcome(language)])
    setInput('')
  }

  const chooseLanguage = (value) => {
    setSelectedLanguage(value)
    const nextLanguage = value === 'auto' ? currentLanguage : value
    if (messages.length === 1 && messages[0].role === 'assistant') setMessages([makeWelcome(nextLanguage)])
    if (listening) stopListening()
    stopSpeaking()
  }

  const quickPrompt = (item) => {
    const local = chatText(language)
    return local[item.key] || item.en
  }

  return <div className="chatbot-root">
    {chatOpen && !minimized && <section className="chat-window" aria-label="DisasterAssist AI chat" aria-live="polite">
      <header className="chat-header"><span className="chat-avatar"><Bot size={21} /></span><div className="chat-title"><strong>DisasterAssist</strong><span><i className="chat-online-dot" />{mockDataEnabled ? text.online : 'Live SACHET alert answers'}</span></div><div className="chat-header-actions"><label className="chat-language-control" title={text.language}><Languages size={15} /><select aria-label={text.language} value={selectedLanguage} onChange={(event) => chooseLanguage(event.target.value)}><option value="auto">Auto detect · English</option>{chatLanguages.map((item) => <option key={item.code} value={item.code}>{item.nativeName}</option>)}</select></label><button type="button" className={voiceMode ? 'voice-mode-button voice-mode-active' : 'voice-mode-button'} title={voiceMode ? text.stopVoice : text.startVoice} aria-label={voiceMode ? text.stopVoice : text.startVoice} onClick={toggleVoiceMode}><Mic size={15} /><span>{text.voiceMode}</span></button><button type="button" title={text.clear} aria-label={text.clear} onClick={clearConversation}><Trash2 size={15} /></button><button type="button" title={text.minimize} aria-label={text.minimize} onClick={minimizeChat}><Minus size={17} /></button><button type="button" title={text.close} aria-label={text.close} onClick={closeChat}><X size={17} /></button></div></header>
      <div className="chat-demo-note"><Sparkles size={13} /><span>{mockDataEnabled ? text.demo : 'Answers include current SACHET CAP records, configured-city weather, and general preparedness steps. Official links are shown with sourced alert and weather answers.'}</span></div>
      <div className="chat-history" ref={scrollRef} aria-label="Chat messages" dir={selectedMeta.direction}>
        {messages.map((message, index) => <article className={`chat-message chat-${message.role}`} key={`${message.timestamp}-${index}`}><span className="message-avatar">{message.role === 'assistant' ? <Bot size={14} /> : 'You'}</span><div className="message-body"><div className="message-bubble">{message.content}</div><div className="message-meta"><time><Clock3 size={10} />{formatTime(message.timestamp, message.language || language)}</time>{message.role === 'assistant' && message.sources?.map((source, sourceIndex) => typeof source === 'string' ? <span key={`${source}-${sourceIndex}`}><Check size={10} /> {source === 'alerts' ? 'Alert data' : source === 'weather-demo' ? 'Mock weather' : 'Safety guide'}</span> : source.url ? <a key={`${source.url}-${sourceIndex}`} href={source.url} target="_blank" rel="noreferrer"><ExternalLink size={10} />{source.name}{source.timestamp ? ` · ${source.timestamp}` : ''}</a> : <span key={`${source.name}-${sourceIndex}`}>{source.name}</span>)}</div>{message.role === 'assistant' && <div className="message-voice-actions">{speakingId === index ? <button type="button" onClick={stopSpeaking} aria-label={text.stopSpeaking}><Square size={12} />{text.stopSpeaking}</button> : <button type="button" onClick={() => speakText(message.content, message.language || language, index)} aria-label={`${SPEAK_LABELS[language] || SPEAK_LABELS.en} ${index + 1}`}><Volume2 size={13} />{SPEAK_LABELS[language] || SPEAK_LABELS.en}</button>}</div>}</div></article>)}
        {messages.length === 1 && <div className="quick-questions"><span>{text.quick}</span>{QUICK_QUESTIONS.map((item) => <button key={item.key} type="button" onClick={() => send(quickPrompt(item), item.key === 'explain' ? selectedAlertIdRef.current : undefined, selectedLanguage)}>{quickPrompt(item)}</button>)}</div>}
        {typing && <div className="chat-message chat-assistant"><span className="message-avatar"><Bot size={14} /></span><div className="message-bubble typing-bubble" aria-label={text.processing}><i /><i /><i /></div></div>}
      </div>
      <div className="chat-composer"><form onSubmit={(event) => { event.preventDefault(); send(input) }}><button className={`chat-mic ${listening ? 'chat-mic-active' : ''}`} type="button" onClick={() => listening ? stopListening() : startListening(false)} aria-label={listening ? text.stopVoice : 'Start voice input'} title={listening ? text.stopVoice : 'Start voice input'}><Mic size={19} /></button><input ref={inputRef} value={input} onChange={(event) => setInput(event.target.value)} placeholder={text.placeholder} aria-label="Message DisasterAssist AI" maxLength={1000} /><button className="chat-send" type="submit" disabled={!input.trim() || typing} aria-label={text.send}><Send size={16} /></button></form><div className="chat-status-row" aria-live="polite"><span className={listening ? 'chat-status-listening' : ''}>{voiceStatus || text.emergency}</span>{voiceMode && <span className="voice-mode-status"><Mic size={11} />{listening ? text.listen : typing ? text.processing : speakingId !== null ? text.speaking : text.startVoice}</span>}</div></div>
    </section>}
    {chatOpen && minimized && <div className="chat-minimized"><button className="chat-mini-open" onClick={() => setMinimized(false)}><Bot size={16} /> DisasterAssist AI</button><button className="chat-mini-close" onClick={() => { setChatOpen(false); setMinimized(false) }} aria-label={text.close}><X size={14} /></button></div>}
    {!chatOpen && <button className="chat-launcher" onClick={() => { setChatOpen(true); setMinimized(false) }} aria-label="Open DisasterAssist AI"><span className="chat-launch-icon"><MessageCircle size={20} /><Sparkles size={10} /></span><span>DisasterAssist AI</span></button>}
  </div>
}