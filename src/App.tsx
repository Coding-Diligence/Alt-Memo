import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import {
  ArrowLeft,
  ArrowDownUp,
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Clock3,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  LockKeyhole,
  Mail,
  MoreHorizontal,
  Plus,
  Search,
  Target,
  Trash2,
  X,
} from 'lucide-react'
import { supabase, supabaseConfigured } from './lib/supabase'

type Status = 'En attente' | 'À voir' | 'Accepté' | 'Refusé'
type Application = {
  id: string
  company: string
  role: string
  status: Status
  date: string
  website: string
  email: string
  contact: string
  notes: string
}

const STATUS_OPTIONS: Status[] = ['En attente', 'À voir', 'Accepté', 'Refusé']
const STORAGE_KEY = 'alt-memo-applications-v1'
const DEMO_IDS = new Set(['1', '2', '3', '4', '5'])
const day = (offset: number) => {
  const date = new Date()
  date.setDate(date.getDate() + offset)
  return date.toISOString().slice(0, 10)
}
function loadApplications(): Application[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed: unknown = JSON.parse(saved)
      if (Array.isArray(parsed)) return (parsed as Application[]).filter((item) => !DEMO_IDS.has(item.id))
    }
  } catch {
    // If browser storage is unavailable or corrupted, start with an empty list.
  }
  return []
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
}

function logoUrl(website: string, company: string) {
  let domain = website.trim()
  if (domain) {
    try {
      domain = new URL(domain.startsWith('http') ? domain : `https://${domain}`).hostname
    } catch {
      domain = domain.replace(/^https?:\/\//, '').split('/')[0]
    }
  } else {
    domain = `${company.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')}.com`
  }
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`
}

function formatDate(value: string) {
  if (!value) return 'Date non renseignée'
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${value}T12:00:00`))
}

const todayLabel = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  .format(new Date()).toLocaleUpperCase('fr-FR')

function App() {
  const [page, setPage] = useState<'dashboard' | 'applications' | 'statistics'>(() => {
    if (window.location.hash === '#statistiques') return 'statistics'
    return window.location.hash === '#candidatures' ? 'applications' : 'dashboard'
  })
  const [applications, setApplications] = useState<Application[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [applicationsLoading, setApplicationsLoading] = useState(true)
  const [dataError, setDataError] = useState('')
  const [query, setQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<'Toutes' | Status>('Toutes')
  const [sortOrder, setSortOrder] = useState<'date-desc' | 'date-asc' | 'name-asc'>('date-desc')
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Application | null>(null)
  const [menuId, setMenuId] = useState<string | null>(null)
  const [formError, setFormError] = useState('')
  const [form, setForm] = useState({ company: '', role: '', status: 'En attente' as Status, date: day(0), website: '', email: '', contact: '', notes: '' })

  useEffect(() => {
    if (!supabase) {
      setAuthReady(true)
      return
    }
    let active = true
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return
      if (error) setDataError(error.message)
      setUser(data.session?.user ?? null)
      setAuthReady(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return
      setUser(session?.user ?? null)
      setAuthReady(true)
    })
    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    const client = supabase
    if (!authReady) return
    if (!user || !client) {
      setApplications([])
      setApplicationsLoading(false)
      return
    }
    let active = true
    setApplicationsLoading(true)
    setDataError('')
    const loadCloudApplications = async () => {
      const { data, error } = await client.from('applications').select('id, company, role, status, date, website, email, contact, notes').order('date', { ascending: false })
      if (error) throw error
      let records = (data ?? []) as Application[]
      if (records.length === 0) {
        const localRecords = loadApplications()
        if (localRecords.length) {
          const { error: importError } = await client.from('applications').upsert(localRecords.map((item) => ({ ...item, user_id: user.id })))
          if (importError) throw importError
          records = localRecords
        }
      }
      if (active) setApplications(records)
    }
    loadCloudApplications().catch((error: unknown) => {
      if (active) setDataError(error instanceof Error ? error.message : 'Impossible de charger les candidatures.')
    }).finally(() => {
      if (active) setApplicationsLoading(false)
    })
    return () => { active = false }
  }, [authReady, user])

  useEffect(() => {
    const syncPage = () => {
      if (window.location.hash === '#statistiques') setPage('statistics')
      else setPage(window.location.hash === '#candidatures' ? 'applications' : 'dashboard')
    }
    window.addEventListener('hashchange', syncPage)
    return () => window.removeEventListener('hashchange', syncPage)
  }, [])

  useEffect(() => {
    const targetId = page === 'applications' ? 'candidatures' : page === 'statistics' ? 'statistiques' : 'tableau'
    document.getElementById(targetId)?.scrollIntoView({ block: 'start' })
  }, [page])

  useEffect(() => {
    const handleSearchShortcut = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleSearchShortcut)
    return () => window.removeEventListener('keydown', handleSearchShortcut)
  }, [])

  const filtered = useMemo(() => applications
    .filter((item) => activeFilter === 'Toutes' || item.status === activeFilter)
    .filter((item) => `${item.company} ${item.role} ${item.contact} ${item.email}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => {
      if (sortOrder === 'name-asc') return a.company.localeCompare(b.company, 'fr', { sensitivity: 'base' })
      return sortOrder === 'date-asc' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)
    }), [applications, activeFilter, query, sortOrder])

  const stats = useMemo(() => ({
    total: applications.length,
    waiting: applications.filter((item) => item.status === 'En attente').length,
    accepted: applications.filter((item) => item.status === 'Accepté').length,
    week: applications.filter((item) => item.date >= day(-6) && item.date <= day(0)).length,
  }), [applications])

  const openCreate = () => {
    setEditing(null)
    setFormError('')
    setForm({ company: '', role: '', status: 'En attente', date: day(0), website: '', email: '', contact: '', notes: '' })
    setModalOpen(true)
  }

  const openEdit = (item: Application) => {
    setEditing(item)
    setFormError('')
    setForm({ company: item.company, role: item.role, status: item.status, date: item.date, website: item.website, email: item.email, contact: item.contact, notes: item.notes })
    setMenuId(null)
    setModalOpen(true)
  }

  const saveApplication = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const client = supabase
    if (!client || !user) return
    const item: Application = { ...form, company: form.company.trim(), role: form.role.trim(), id: editing?.id ?? crypto.randomUUID() }
    setFormError('')
    try {
      const { error } = await client.from('applications').upsert({ ...item, user_id: user.id })
      if (error) throw error
      setApplications((current) => editing
        ? current.map((application) => application.id === editing.id ? item : application)
        : [item, ...current])
      setModalOpen(false)
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Impossible d’enregistrer la candidature.')
    }
  }

  const deleteApplication = async (id: string) => {
    const client = supabase
    if (!client || !user) return
    if (window.confirm('Supprimer cette candidature ?')) {
      try {
        const { error } = await client.from('applications').delete().eq('id', id).eq('user_id', user.id)
        if (error) throw error
        setApplications((current) => current.filter((item) => item.id !== id))
      } catch (error) {
        setDataError(error instanceof Error ? error.message : 'Impossible de supprimer la candidature.')
      }
    }
    setMenuId(null)
  }

  const setField = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }))

  const register = async (email: string, password: string): Promise<boolean> => {
    if (!supabase) throw new Error('La synchronisation n’est pas configurée.')
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: {
      emailRedirectTo: `${window.location.origin}${import.meta.env.BASE_URL}`,
    } })
    if (error) throw error
    if (!data.session) return false
    setUser(data.user)
    return true
  }

  const resendConfirmation = async (email: string) => {
    if (!supabase) throw new Error('La synchronisation n’est pas configurée.')
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}${import.meta.env.BASE_URL}` },
    })
    if (error) throw error
  }

  const signIn = async (email: string, password: string) => {
    if (!supabase) throw new Error('La synchronisation n’est pas configurée.')
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) throw error
    setUser(data.user)
  }

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut()
    setApplications([])
    setUser(null)
  }

  if (!supabaseConfigured) return <SetupScreen />
  if (!authReady) return <LoadingScreen message="Connexion sécurisée…" />
  if (!user) return <AuthScreen onLogin={signIn} onRegister={register} onResendConfirmation={resendConfirmation} />
  if (applicationsLoading) return <LoadingScreen message="Synchronisation de vos candidatures…" />
  if (dataError) return <DataErrorScreen message={dataError} onSignOut={signOut} />

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#accueil" aria-label="Alt-Memo, accueil">
          <span className="brand-mark"><img src={`${import.meta.env.BASE_URL}logo.png`} alt="" /></span>
          <span>alt<span className="brand-light">-memo</span><small>TON ALTERNANCE, EN VUE.</small></span>
        </a>
        <div className="workspace-label">ESPACE PERSONNEL</div>
        <nav className="side-nav" aria-label="Navigation principale">
          <a href="#tableau" className={`nav-item ${page === 'dashboard' ? 'active' : ''}`}><LayoutDashboard size={18} /> Tableau de bord</a>
          <a href="#candidatures" className={`nav-item ${page === 'applications' ? 'active' : ''}`}><BriefcaseBusiness size={18} /> Candidatures</a>
          <a href="#statistiques" className={`nav-item ${page === 'statistics' ? 'active' : ''}`}><BarChart3 size={18} /> Statistiques</a>
        </nav>
        <div className="sidebar-account">
          <span className="account-avatar">{(user.email ?? '').slice(0, 1).toUpperCase()}</span>
          <span className="account-email" title={user.email}>{user.email}</span>
          <button className="logout-button" onClick={signOut} aria-label="Se déconnecter" title="Se déconnecter"><LogOut size={16} /></button>
        </div>
      </aside>

      <main className="main-content">
        {page === 'statistics' ? <StatisticsPage applications={applications} /> : page === 'applications' ? <section className="all-applications-page" id="candidatures">
          <a className="back-link" href="#tableau"><ArrowLeft size={16} /> Retour au tableau de bord</a>
          <div className="all-applications-heading"><div><div className="eyebrow">VOTRE SUIVI, EN UN SEUL ENDROIT</div><h1>Toutes les candidatures</h1><p className="welcome-subtitle">Retrouvez, recherchez et triez toutes vos entreprises.</p></div><button className="primary-button" onClick={openCreate}><Plus size={18} /> Ajouter une candidature</button></div>
          <section className="applications-section all-applications-card">
            <div className="section-heading"><div><div className="section-title-line"><h2>Liste complète</h2><span className="total-pill">{filtered.length} / {applications.length}</span></div><p>Filtrez par statut ou recherchez une entreprise.</p></div></div>
            <div className="toolbar"><div className="filter-tabs" role="tablist" aria-label="Filtrer par statut">{(['Toutes', ...STATUS_OPTIONS] as const).map((filter) => <button key={filter} role="tab" aria-selected={activeFilter === filter} className={`filter-tab ${activeFilter === filter ? 'selected' : ''}`} onClick={() => setActiveFilter(filter)}>{filter === 'Refusé' ? 'Refus' : filter}{filter === 'Toutes' && <span>{applications.length}</span>}</button>)}</div><div className="toolbar-right"><label className="search-box"><Search size={16} /><input ref={searchInputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher une entreprise..." aria-label="Rechercher une entreprise" /><kbd>Ctrl K</kbd></label><label className="sort-control"><span className="sort-icon"><ArrowDownUp size={15} /></span><span className="sort-copy"><span className="sort-caption">TRIER PAR</span><select className="sort-select" aria-label="Trier les candidatures" value={sortOrder} onChange={(event) => setSortOrder(event.target.value as typeof sortOrder)}><option value="date-desc">Date de demande · récente</option><option value="date-asc">Date de demande · ancienne</option><option value="name-asc">Entreprise · A à Z</option></select></span><ChevronDown className="sort-chevron" size={14} /></label></div></div>
            <ApplicationResults items={filtered} query={query} menuId={menuId} setMenuId={setMenuId} openEdit={openEdit} deleteApplication={deleteApplication} openCreate={openCreate} />
          </section>
        </section> : <>
        <section className="welcome-row">
          <div><div className="eyebrow">{todayLabel}</div><h1>Bonjour !</h1><p className="welcome-subtitle">Chaque candidature te rapproche de la bonne opportunité.</p></div>
          <button className="primary-button" onClick={openCreate}><Plus size={18} strokeWidth={2.5} /> Ajouter une candidature</button>
        </section>

        <section className="stats-grid" aria-label="Résumé des candidatures">
          <StatCard label="Candidatures envoyées" value={stats.total} icon={<BriefcaseBusiness size={18} />} tone="lavender" detail="Toutes entreprises confondues" />
          <StatCard label="En attente" value={stats.waiting} icon={<Clock3 size={18} />} tone="amber" detail="On croise les doigts !" />
          <StatCard label="Entretiens / à voir" value={applications.filter((item) => item.status === 'À voir').length} icon={<Target size={18} />} tone="blue" detail="Les prochaines étapes" />
          <StatCard label="Réponses positives" value={stats.accepted} icon={<CheckCircle2 size={18} />} tone="green" detail="Ça avance, bravo !" />
        </section>

        <section className="applications-section" id="tableau" tabIndex={-1}>
          <div className="section-heading"><div><div className="section-title-line"><h2>Suivi des candidatures</h2><span className="total-pill">{filtered.length}</span></div><p>Retrouve toutes tes opportunités au même endroit.</p></div><a className="text-button" href="#candidatures" onClick={() => { setActiveFilter('Toutes'); setQuery('') }}>Voir tout <ArrowRight size={15} /></a></div>
          <div className="toolbar"><div className="filter-tabs" role="tablist" aria-label="Filtrer par statut">{(['Toutes', ...STATUS_OPTIONS] as const).map((filter) => <button key={filter} role="tab" aria-selected={activeFilter === filter} className={`filter-tab ${activeFilter === filter ? 'selected' : ''}`} onClick={() => setActiveFilter(filter)}>{filter === 'Refusé' ? 'Refus' : filter}{filter === 'Toutes' && <span>{applications.length}</span>}</button>)}</div><div className="toolbar-right"><label className="search-box"><Search size={16} /><input ref={searchInputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher une entreprise..." aria-label="Rechercher une entreprise" /><kbd>Ctrl K</kbd></label><label className="sort-control"><span className="sort-icon"><ArrowDownUp size={15} /></span><span className="sort-copy"><span className="sort-caption">TRIER PAR</span><select className="sort-select" aria-label="Trier les candidatures" value={sortOrder} onChange={(event) => setSortOrder(event.target.value as typeof sortOrder)}><option value="date-desc">Date de demande · récente</option><option value="date-asc">Date de demande · ancienne</option><option value="name-asc">Entreprise · A à Z</option></select></span><ChevronDown className="sort-chevron" size={14} /></label></div></div>

          <ApplicationResults items={filtered} query={query} menuId={menuId} setMenuId={setMenuId} openEdit={openEdit} deleteApplication={deleteApplication} openCreate={openCreate} />
        </section>

        </>}
      </main>

      {modalOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setModalOpen(false) }}><section className="application-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-header"><div><div className="modal-kicker"><BriefcaseBusiness size={13} /> TON SUIVI, TOUT SIMPLEMENT</div><h2 id="modal-title">{editing ? 'Modifier la candidature' : 'Nouvelle candidature'}</h2><p>Garde toutes les infos importantes à portée de main.</p></div><button className="icon-button close-button" aria-label="Fermer" onClick={() => setModalOpen(false)}><X size={20} /></button></div>
        <form onSubmit={saveApplication}><div className="form-grid">{formError && <p className="auth-error full-field" role="alert">{formError}</p>}<label className="form-field full-field"><span>Nom de l'entreprise <i>*</i></span><input autoFocus required value={form.company} onChange={(event) => setField('company', event.target.value)} placeholder="Ex. Studio Créatif" /></label><label className="form-field full-field"><span>Intitulé du poste</span><input value={form.role} onChange={(event) => setField('role', event.target.value)} placeholder="Ex. Assistant·e communication" /></label>
          <label className="form-field"><span>Date de demande</span><input type="date" value={form.date} onChange={(event) => setField('date', event.target.value)} /></label><label className="form-field"><span>Statut</span><select value={form.status} onChange={(event) => setField('status', event.target.value)}>{STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
          <label className="form-field full-field"><span>Site web <small>Pour retrouver le logo</small></span><div className="input-with-icon"><ExternalLink size={15} /><input type="url" value={form.website} onChange={(event) => setField('website', event.target.value)} placeholder="https://entreprise.fr" /></div><em>Le favicon du site sera affiché automatiquement si disponible.</em></label>
          <label className="form-field"><span>Nom du contact</span><input value={form.contact} onChange={(event) => setField('contact', event.target.value)} placeholder="Ex. Camille Dupont" /></label><label className="form-field"><span>E-mail du contact</span><input type="email" value={form.email} onChange={(event) => setField('email', event.target.value)} placeholder="camille@entreprise.fr" /></label>
          <label className="form-field full-field"><span>Notes <small>Optionnel</small></span><textarea rows={2} value={form.notes} onChange={(event) => setField('notes', event.target.value)} placeholder="Un détail à ne pas oublier ?" /></label>
        </div><div className="modal-actions"><button type="button" className="cancel-button" onClick={() => setModalOpen(false)}>Annuler</button><button type="submit" className="primary-button"><Check size={17} /> {editing ? 'Enregistrer les changements' : 'Enregistrer la candidature'}</button></div></form></section></div>}
    </div>
  )
}

function LoadingScreen({ message }: { message: string }) {
  return <main className="auth-page"><section className="auth-card loading-card" aria-live="polite"><a className="auth-brand" href="#accueil"><span className="brand-mark"><img src={`${import.meta.env.BASE_URL}logo.png`} alt="" /></span><span>alt<span className="brand-light">-memo</span><small>TON ALTERNANCE, EN VUE.</small></span></a><div className="loading-indicator" /><p>{message}</p></section></main>
}

function SetupScreen() {
  return <main className="auth-page"><section className="auth-card setup-card" aria-labelledby="setup-title"><a className="auth-brand" href="#accueil"><span className="brand-mark"><img src={`${import.meta.env.BASE_URL}logo.png`} alt="" /></span><span>alt<span className="brand-light">-memo</span><small>TON ALTERNANCE, EN VUE.</small></span></a><div className="auth-heading"><div className="auth-icon"><LockKeyhole size={20} /></div><h1 id="setup-title">Synchronisation à configurer</h1><p>Ajoutez les identifiants du projet Supabase pour activer les comptes et sauvegarder vos candidatures sur tous vos appareils.</p></div><ol className="setup-steps"><li>Créez un projet Supabase.</li><li>Exécutez le script <strong>supabase/schema.sql</strong> dans le SQL Editor.</li><li>Copiez <strong>.env.example</strong> vers <strong>.env.local</strong> et renseignez l’URL du projet et sa clé publique.</li><li>Redémarrez le serveur de développement.</li></ol><p className="setup-security-note">Ne mettez jamais de clé <em>service_role</em> dans l’application. Seule la clé publique Supabase est utilisée, avec des règles d’accès par utilisateur.</p></section></main>
}

function DataErrorScreen({ message, onSignOut }: { message: string; onSignOut: () => void }) {
  return <main className="auth-page"><section className="auth-card" role="alert"><div className="auth-heading"><div className="auth-icon"><LockKeyhole size={20} /></div><h1>Synchronisation impossible</h1><p>{message}</p></div><button className="auth-submit" onClick={() => window.location.reload()}>Réessayer</button><div className="auth-switch"><button onClick={onSignOut}>Se déconnecter</button></div></section></main>
}

function AuthScreen({ onLogin, onRegister, onResendConfirmation }: {
  onLogin: (email: string, password: string) => Promise<void>
  onRegister: (email: string, password: string) => Promise<boolean>
  onResendConfirmation: (email: string) => Promise<void>
}) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [confirmationRequired, setConfirmationRequired] = useState(false)
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setNotice('')
    if (mode === 'register' && password !== confirmation) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }
    setBusy(true)
    try {
      if (mode === 'login') {
        await onLogin(email, password)
      } else if (!await onRegister(email, password)) {
        setMode('login')
        setPassword('')
        setConfirmation('')
        setConfirmationRequired(true)
        setNotice('Compte créé. Confirmez votre adresse avec le lien reçu par e-mail, puis connectez-vous.')
      }
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : ''
      if (/email not confirmed|email_not_confirmed/i.test(message)) {
        setConfirmationRequired(true)
        setNotice('Confirmez votre adresse e-mail avant de vous connecter.')
        setError('')
      } else if (message === 'Invalid login credentials') {
        setError('Adresse e-mail ou mot de passe incorrect.')
      } else {
        setError(message || 'Une erreur est survenue. Réessayez.')
      }
    } finally {
      setBusy(false)
    }
  }

  const resendConfirmationEmail = async () => {
    setBusy(true)
    setError('')
    try {
      await onResendConfirmation(email)
      setNotice('Un nouveau lien de confirmation vient de vous être envoyé.')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossible de renvoyer le lien. Réessayez.')
    } finally {
      setBusy(false)
    }
  }

  return <main className="auth-page">
    <div className="auth-decoration auth-decoration-one" /><div className="auth-decoration auth-decoration-two" />
    <section className="auth-card" aria-labelledby="auth-title">
      <a className="auth-brand" href="#accueil" aria-label="Alt-Memo, accueil"><span className="brand-mark"><img src={`${import.meta.env.BASE_URL}logo.png`} alt="" /></span><span>alt<span className="brand-light">-memo</span><small>TON ALTERNANCE, EN VUE.</small></span></a>
      <div className="auth-heading"><div className="auth-icon"><LockKeyhole size={20} /></div><h1 id="auth-title">{mode === 'login' ? 'Bon retour !' : 'Créer mon compte'}</h1><p>{mode === 'login' ? 'Connectez-vous pour retrouver votre suivi.' : 'Créez votre espace personnel Alt-Memo.'}</p></div>
      <form className="auth-form" onSubmit={submit}>
        <label className="auth-field"><span>Adresse e-mail</span><div className="auth-input-wrap"><Mail size={16} /><input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="vous@exemple.fr" /></div></label>
        <label className="auth-field"><span>Mot de passe</span><div className="auth-input-wrap"><LockKeyhole size={16} /><input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="8 caractères minimum" /></div></label>
        {mode === 'register' && <label className="auth-field"><span>Confirmer le mot de passe</span><div className="auth-input-wrap"><LockKeyhole size={16} /><input type="password" autoComplete="new-password" minLength={8} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="Retapez votre mot de passe" /></div></label>}
        {notice && <p className="auth-success" role="status">{notice}</p>}
        {error && <p className="auth-error" role="alert">{error}</p>}
        {confirmationRequired && <button className="auth-resend" type="button" onClick={resendConfirmationEmail} disabled={busy}>Renvoyer le lien de confirmation</button>}
        <button className="auth-submit" type="submit" disabled={busy}>{busy ? 'Veuillez patienter…' : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}<ArrowRight size={17} /></button>
      </form>
      <div className="auth-switch">{mode === 'login' ? 'Pas encore de compte ?' : 'Vous avez déjà un compte ?'} <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}>{mode === 'login' ? 'Créer un compte' : 'Se connecter'}</button></div>
    </section>
  </main>
}

function StatisticsPage({ applications }: { applications: Application[] }) {
  const [visibleStatuses, setVisibleStatuses] = useState<Status[]>(STATUS_OPTIONS)
  const monthFormatter = new Intl.DateTimeFormat('fr-FR', { month: 'short' })
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date()
    date.setDate(1)
    date.setMonth(date.getMonth() - (5 - index))
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const entries = applications.filter((application) => application.date.startsWith(key))
    return {
      key,
      label: monthFormatter.format(date).replace('.', ''),
      total: entries.length,
      waiting: entries.filter((item) => item.status === 'En attente').length,
      review: entries.filter((item) => item.status === 'À voir').length,
      accepted: entries.filter((item) => item.status === 'Accepté').length,
      refused: entries.filter((item) => item.status === 'Refusé').length,
    }
  })
  const statusCounts = STATUS_OPTIONS.map((status) => ({
    status,
    count: applications.filter((application) => application.status === status).length,
    tone: status === 'En attente' ? 'waiting' : status === 'À voir' ? 'review' : status === 'Accepté' ? 'accepted' : 'refused',
  }))
  const currentMonth = new Date().toISOString().slice(0, 7)
  const addedThisMonth = applications.filter((item) => item.date.startsWith(currentMonth)).length
  const maxCount = Math.max(1, ...months.map((month) => month.total))
  const chartScale = Math.max(3, Math.ceil(maxCount / 3) * 3)
  const chartTop = 18
  const chartHeight = 172
  const baseline = chartTop + chartHeight
  const chartWidth = 720
  const groupWidth = chartWidth / months.length
  const linePoints = months.map((month, index) => ({
    x: 44 + groupWidth * (index + 0.5),
    y: baseline - (month.total / chartScale) * chartHeight,
  }))
  const linePath = linePoints.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
  const areaPath = `${linePath} L ${linePoints[linePoints.length - 1]?.x ?? 0} ${baseline} L ${linePoints[0]?.x ?? 0} ${baseline} Z`
  const chartSeries = [
    { key: 'total', label: 'Candidatures faites', color: '#756bd0', values: months.map((month) => month.total) },
    { key: 'En attente', label: 'En attente', color: '#e6ad62', values: months.map((month) => month.waiting) },
    { key: 'À voir', label: 'À voir', color: '#7b9ddd', values: months.map((month) => month.review) },
    { key: 'Accepté', label: 'Accepté', color: '#70b58a', values: months.map((month) => month.accepted) },
    { key: 'Refusé', label: 'Refus', color: '#df8985', values: months.map((month) => month.refused) },
  ]

  return <section className="statistics-page" id="statistiques">
    <div className="statistics-heading"><div><span className="statistics-kicker"><BarChart3 size={14} /> VOTRE RECHERCHE EN CHIFFRES</span><h1>Statistiques</h1><p className="welcome-subtitle">Suivez vos candidatures et visualisez leur évolution.</p></div><a className="back-link statistics-back" href="#tableau"><ArrowLeft size={16} /> Retour au tableau de bord</a></div>

    <div className="statistics-overview">
      <article className="overview-card overview-total"><span className="overview-icon"><BriefcaseBusiness size={18} /></span><span className="overview-label">Candidatures ajoutées</span><strong>{applications.length}</strong><small>Depuis le début du suivi</small></article>
      <article className="overview-card overview-month"><span className="overview-icon"><CalendarDays size={18} /></span><span className="overview-label">Ce mois-ci</span><strong>{addedThisMonth}</strong><small>Candidature{addedThisMonth > 1 ? 's' : ''} avec une date ce mois</small></article>
      <article className="overview-card overview-waiting"><span className="overview-icon"><Clock3 size={18} /></span><span className="overview-label">En attente</span><strong>{statusCounts.find((item) => item.status === 'En attente')?.count ?? 0}</strong><small>Réponses à suivre</small></article>
      <article className="overview-card overview-accepted"><span className="overview-icon"><CheckCircle2 size={18} /></span><span className="overview-label">Acceptées</span><strong>{statusCounts.find((item) => item.status === 'Accepté')?.count ?? 0}</strong><small>Bonne nouvelle !</small></article>
    </div>

    <div className="statistics-grid">
      <section className="chart-card monthly-chart-card" aria-labelledby="monthly-chart-title">
        <div className="chart-heading"><div><h2 id="monthly-chart-title">Évolution des candidatures</h2><p>Candidatures envoyées par mois · 6 derniers mois</p></div><span className="chart-period">6 mois</span></div>
        {applications.length ? <>
          <div className="monthly-chart-wrap"><svg className="monthly-chart" viewBox="0 0 760 230" role="img" aria-labelledby="monthly-chart-title monthly-chart-desc" preserveAspectRatio="xMidYMid meet">
            <desc id="monthly-chart-desc">Graphique en lignes comparant le total des candidatures faites et chaque statut par mois.</desc>
            {[0, 1, 2, 3].map((step) => {
              const value = Math.round(chartScale * (3 - step) / 3)
              const y = chartTop + step * (chartHeight / 3)
              return <g key={step}><line x1="44" x2="748" y1={y} y2={y} className="chart-grid-line" /><text x="34" y={y + 4} textAnchor="end" className="chart-axis-label">{value}</text></g>
            })}
            <line x1="44" x2="748" y1={baseline} y2={baseline} className="chart-baseline" />
            <path d={areaPath} className="chart-area" />
            {chartSeries.filter((series) => series.key === 'total' || visibleStatuses.includes(series.key as Status)).map((series) => {
              const points = series.values.map((value, index) => ({ x: 44 + groupWidth * (index + 0.5), y: baseline - (value / chartScale) * chartHeight }))
              const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
              return <g key={series.key}>
                <path d={path} className={`chart-series-line ${series.key === 'total' ? 'total-series-line' : ''}`} style={{ stroke: series.color }} />
                {points.map((point, index) => <circle key={months[index].key} cx={point.x} cy={point.y} r={series.key === 'total' ? 4.5 : 3.5} className={`chart-series-point ${series.key === 'total' ? 'total-series-point' : ''}`} style={{ fill: '#fff', stroke: series.color }}><title>{`${months[index].label} · ${series.label} : ${series.values[index]}`}</title></circle>)}
              </g>
            })}
            {months.map((month, index) => <text key={month.key} x={44 + groupWidth * (index + 0.5)} y={baseline + 25} textAnchor="middle" className="chart-month-label">{month.label}</text>)}
          </svg></div>
          <div className="chart-legend"><span><i className="legend-line total-legend-line" /> Candidatures faites</span><span className="legend-hint">Activez les statuts à droite pour afficher leurs courbes</span></div>
        </> : <div className="chart-empty"><span className="empty-illustration"><BriefcaseBusiness size={23} /></span><strong>Votre graphique apparaîtra ici</strong><p>Ajoutez une candidature pour voir son évolution par mois.</p></div>}
      </section>

      <section className="chart-card status-chart-card" aria-labelledby="status-chart-title">
        <div className="chart-heading"><div><h2 id="status-chart-title">Répartition par statut</h2><p>Où en sont vos candidatures ?</p></div><span className="status-total">{applications.length} au total</span></div>
        <div className="status-chart-list">{statusCounts.map((item) => {
          const percentage = applications.length ? Math.round(item.count / applications.length * 100) : 0
          const isVisible = visibleStatuses.includes(item.status)
          return <button type="button" className={`status-chart-row status-toggle ${isVisible ? '' : 'is-hidden'}`} key={item.status} aria-pressed={isVisible} aria-label={`${isVisible ? 'Masquer' : 'Afficher'} la courbe ${item.status}`} onClick={() => setVisibleStatuses((current) => isVisible ? current.filter((status) => status !== item.status) : [...current, item.status])}><span className="status-chart-label"><span className={`status-line-key ${item.tone}`} />{item.status === 'Refusé' ? 'Refus' : item.status}<strong>{item.count}</strong></span><span className="status-track"><span className={`status-fill ${item.tone}`} style={{ width: `${percentage}%` }} /></span><small>{percentage}%</small></button>
        })}</div>
        <div className="status-chart-footer"><span>Taux de réponse positive</span><strong>{applications.length ? Math.round((statusCounts.find((item) => item.status === 'Accepté')?.count ?? 0) / applications.length * 100) : 0}%</strong></div>
      </section>
    </div>
  </section>
}

function StatCard({ label, value, icon, tone, detail }: { label: string; value: number; icon: ReactNode; tone: string; detail: string }) {
  return <article className="stat-card"><div className={`stat-icon ${tone}`}>{icon}</div><div className="stat-label">{label}</div><div className="stat-value">{value}<span className="stat-trend">↗</span></div><div className="stat-detail">{detail}</div></article>
}

function ApplicationResults({ items, query, menuId, setMenuId, openEdit, deleteApplication, openCreate }: {
  items: Application[]
  query: string
  menuId: string | null
  setMenuId: (id: string | null) => void
  openEdit: (item: Application) => void
  deleteApplication: (id: string) => void
  openCreate: () => void
}) {
  if (!items.length) {
    return <div className="empty-state"><div className="empty-illustration"><BriefcaseBusiness size={25} /></div><h3>{query ? 'Aucun résultat trouvé' : 'Pas encore de candidature'}</h3><p>{query ? 'Essaie avec un autre nom d’entreprise ou de poste.' : 'Ajoute ta première entreprise pour commencer à organiser ta recherche.'}</p>{!query && <button className="primary-button" onClick={openCreate}><Plus size={17} /> Ajouter une candidature</button>}</div>
  }

  return <div className="application-list">{items.map((item) => <article className="application-card" key={item.id}>
    <CompanyLogo item={item} />
    <div className="company-main"><div className="company-title-row"><h3>{item.company}</h3><a className="company-site" href={item.website || '#'} target="_blank" rel="noreferrer" aria-label={`Ouvrir le site de ${item.company}`} onClick={(event) => { if (!item.website) event.preventDefault() }}>{item.website ? <ExternalLink size={13} /> : null}</a></div><p className="role-title">{item.role || 'Poste à préciser'}</p><div className="contact-line">{item.contact ? <span><span className="contact-dot">{initials(item.contact)}</span>{item.contact}</span> : <span className="muted-contact"><CircleHelp size={13} /> Contact à ajouter</span>}{item.email && <a href={`mailto:${item.email}`}><Mail size={13} />{item.email}</a>}</div></div>
    <div className="application-date"><span className="date-label">DATE DE DEMANDE</span><span className="date-value"><CalendarDays size={14} /> {formatDate(item.date)}</span></div>
    <div className="card-status"><StatusBadge status={item.status} /></div>
    <div className="card-menu-wrap"><button className="icon-button more-button" aria-label={`Actions pour ${item.company}`} onClick={() => setMenuId(menuId === item.id ? null : item.id)}><MoreHorizontal size={19} /></button>{menuId === item.id && <div className="action-menu"><button onClick={() => openEdit(item)}>Modifier</button><button className="danger-action" onClick={() => deleteApplication(item.id)}><Trash2 size={14} /> Supprimer</button></div>}</div>
  </article>)}</div>
}

function StatusBadge({ status }: { status: Status }) {
  const dot = status === 'Accepté' ? '✓' : status === 'Refusé' ? '×' : status === 'À voir' ? '↗' : '•'
  return <span className={`status-badge status-${status.toLowerCase().replace(' ', '-')}`}><span>{dot}</span>{status === 'Refusé' ? 'Refus' : status}</span>
}

function CompanyLogo({ item }: { item: Application }) {
  const [imageFailed, setImageFailed] = useState(false)
  return <div className={`company-logo logo-${initials(item.company).toLowerCase()}`}>{!imageFailed && <img src={logoUrl(item.website, item.company)} alt="" onError={() => setImageFailed(true)} />}{imageFailed && <span>{initials(item.company)}</span>}</div>
}

export default App
