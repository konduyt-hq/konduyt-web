'use client'
import { useState, useEffect } from 'react'
import { useApi } from '../../lib/useApi'
import styles from './PeopleTab.module.css'

const ROLES = ['employee','contractor','freelancer','influencer','affiliate']
const FREQS = ['monthly','biweekly','weekly','once']
const ROLE_COLORS = { employee:'#22C55E', contractor:'#0BA4DB', freelancer:'#F59E0B', influencer:'#A855F7', affiliate:'#FF5C35' }

export default function PeopleTab({ projectId }) {
  const api = useApi()
  const [people, setPeople]   = useState([])
  const [links, setLinks]     = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showLinkForm, setShowLinkForm] = useState(false)
  const [paying, setPaying]   = useState(null)
  const [form, setForm]       = useState({ name:'', email:'', phone:'', role:'employee', currency:'KES', amount:'', frequency:'monthly', vendor:'' })
  const [linkForm, setLinkForm] = useState({ handle:'', title:'', description:'', currency:'KES', amount:'' })
  const [error, setError]     = useState('')

  useEffect(() => { load() }, [projectId])

  async function load() {
    try {
      const [p, l] = await Promise.all([
        api.get('/people/' + projectId + '/people'),
        api.get('/people/' + projectId + '/links'),
      ])
      setPeople(p); setLinks(l)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  async function addPerson(e) {
    e.preventDefault(); setError('')
    try {
      const p = await api.post('/people/' + projectId + '/people', { ...form, amount: parseFloat(form.amount) })
      setPeople(prev => [...prev, p]); setShowForm(false)
      setForm({ name:'', email:'', phone:'', role:'employee', currency:'KES', amount:'', frequency:'monthly', vendor:'' })
    } catch (e) { setError(e.message) }
  }

  async function addLink(e) {
    e.preventDefault(); setError('')
    try {
      const l = await api.post('/people/' + projectId + '/links', { ...linkForm, amount: linkForm.amount ? parseFloat(linkForm.amount) : null })
      setLinks(prev => [...prev, l]); setShowLinkForm(false)
      setLinkForm({ handle:'', title:'', description:'', currency:'KES', amount:'' })
    } catch (e) { setError(e.message) }
  }

  async function payPerson(personId, name) {
    setPaying(personId)
    try {
      const result = await api.post('/people/' + projectId + '/people/' + personId + '/pay', {})
      alert(result.status === 'success' ? name + ' has been paid.' : 'Payment failed: ' + (result.error?.message || 'Unknown error'))
      load()
    } catch (e) { alert('Error: ' + e.message) }
    finally { setPaying(null) }
  }

  if (loading) return <div className={styles.loading}>Loading...</div>

  return (
    <div className={styles.wrap}>

      {error && <p className={styles.error}>{error}</p>}

      {/* ── People section ── */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>People</h2>
            <p className={styles.sectionSub}>Employees, contractors, freelancers, affiliates. Pay anyone, anywhere.</p>
          </div>
          <button className={styles.addBtn} onClick={() => setShowForm(true)}>+ Add person</button>
        </div>

        {showForm && (
          <form onSubmit={addPerson} className={styles.form}>
            <div className={styles.formGrid}>
              <div className={styles.field}><label>Name</label><input required value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Jane Doe" /></div>
              <div className={styles.field}><label>Role</label>
                <select value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))}>
                  {ROLES.map(r=><option key={r} value={r}>{r.charAt(0).toUpperCase()+r.slice(1)}</option>)}
                </select>
              </div>
              <div className={styles.field}><label>Email</label><input type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="jane@example.com" /></div>
              <div className={styles.field}><label>Phone (M-Pesa)</label><input value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} placeholder="+254712345678" /></div>
              <div className={styles.field}><label>Amount</label><input type="number" required value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} placeholder="50000" /></div>
              <div className={styles.field}><label>Currency</label><input value={form.currency} onChange={e=>setForm(f=>({...f,currency:e.target.value}))} placeholder="KES" maxLength={3} /></div>
              <div className={styles.field}><label>Frequency</label>
                <select value={form.frequency} onChange={e=>setForm(f=>({...f,frequency:e.target.value}))}>
                  {FREQS.map(fr=><option key={fr} value={fr}>{fr.charAt(0).toUpperCase()+fr.slice(1)}</option>)}
                </select>
              </div>
              <div className={styles.field}><label>Pay via</label><input value={form.vendor} onChange={e=>setForm(f=>({...f,vendor:e.target.value}))} placeholder="mpesa (or leave blank for auto)" /></div>
            </div>
            <div className={styles.formActions}>
              <button type="submit" className={styles.saveBtn}>Add person</button>
              <button type="button" className={styles.cancelBtn} onClick={()=>setShowForm(false)}>Cancel</button>
            </div>
          </form>
        )}

        {people.length === 0 && !showForm ? (
          <div className={styles.empty}>
            <p>No people yet. Add your first employee, contractor, or affiliate.</p>
          </div>
        ) : (
          <div className={styles.list}>
            {people.map(p => (
              <div key={p.id} className={styles.personRow}>
                <div className={styles.personLeft}>
                  <div className={styles.avatar}>{p.name[0].toUpperCase()}</div>
                  <div>
                    <div className={styles.personName}>{p.name}</div>
                    <div className={styles.personMeta}>{p.email || p.phone || 'No contact'}</div>
                  </div>
                </div>
                <div className={styles.personMid}>
                  <span className={styles.roleBadge} style={{ color: ROLE_COLORS[p.role], background: ROLE_COLORS[p.role] + '18' }}>
                    {p.role}
                  </span>
                  <span className={styles.amount}>{p.currency} {p.amount.toLocaleString()}</span>
                  <span className={styles.freq}>/ {p.frequency}</span>
                </div>
                <div className={styles.personRight}>
                  {p.last_paid_at && <span className={styles.lastPaid}>Last paid {new Date(p.last_paid_at).toLocaleDateString()}</span>}
                  <button
                    className={styles.payBtn}
                    onClick={() => payPerson(p.id, p.name)}
                    disabled={paying === p.id}
                  >
                    {paying === p.id ? 'Paying...' : 'Pay now'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Payment links (Creator) ── */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Payment links</h2>
            <p className={styles.sectionSub}>Public links anyone can use to pay you. No login required for the payer.</p>
          </div>
          <button className={styles.addBtn} onClick={() => setShowLinkForm(true)}>+ Create link</button>
        </div>

        {showLinkForm && (
          <form onSubmit={addLink} className={styles.form}>
            <div className={styles.formGrid}>
              <div className={styles.field}><label>Handle</label><input required value={linkForm.handle} onChange={e=>setLinkForm(f=>({...f,handle:e.target.value.toLowerCase().replace(/\s/g,'-')}))} placeholder="ian" /><span className={styles.fieldHint}>konduyt.dev/pay/{linkForm.handle || 'ian'}</span></div>
              <div className={styles.field}><label>Title</label><input required value={linkForm.title} onChange={e=>setLinkForm(f=>({...f,title:e.target.value}))} placeholder="Support my work" /></div>
              <div className={styles.field}><label>Description</label><input value={linkForm.description} onChange={e=>setLinkForm(f=>({...f,description:e.target.value}))} placeholder="Optional message to payers" /></div>
              <div className={styles.field}><label>Currency</label><input value={linkForm.currency} onChange={e=>setLinkForm(f=>({...f,currency:e.target.value}))} placeholder="KES" maxLength={3} /></div>
              <div className={styles.field}><label>Amount (leave blank to let payer choose)</label><input type="number" value={linkForm.amount} onChange={e=>setLinkForm(f=>({...f,amount:e.target.value}))} placeholder="500" /></div>
            </div>
            <div className={styles.formActions}>
              <button type="submit" className={styles.saveBtn}>Create link</button>
              <button type="button" className={styles.cancelBtn} onClick={()=>setShowLinkForm(false)}>Cancel</button>
            </div>
          </form>
        )}

        {links.length === 0 && !showLinkForm ? (
          <div className={styles.empty}><p>No payment links yet. Create one to start accepting payments from anyone.</p></div>
        ) : (
          <div className={styles.list}>
            {links.map(l => (
              <div key={l.id} className={styles.linkRow}>
                <div>
                  <div className={styles.linkTitle}>{l.title}</div>
                  <a href={l.url} target="_blank" rel="noopener" className={styles.linkUrl}>{l.url}</a>
                </div>
                <div className={styles.linkAmount}>
                  {l.amount ? l.currency + ' ' + l.amount.toLocaleString() : 'Open amount'}
                </div>
                <button className={styles.copyBtn} onClick={()=>navigator.clipboard.writeText(l.url)}>Copy link</button>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
