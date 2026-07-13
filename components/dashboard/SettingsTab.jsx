'use client'
import { useState } from 'react'
import styles from './SettingsTab.module.css'

export default function SettingsTab({ project, org }) {
  const [name, setName]       = useState(project?.name || '')
  const [website, setWebsite] = useState(project?.website || '')
  const [saved, setSaved]     = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')

  async function saveProject() {
    const token = localStorage.getItem('token')
    await fetch(`/api/projects/${project?.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name, website }),
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className={styles.wrap}>

      {/* Project */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Project</h2>
        <div className={styles.card}>
          <div className={styles.field}>
            <label htmlFor="pname">Project name</label>
            <input id="pname" type="text" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className={styles.field}>
            <label htmlFor="psite">Website URL</label>
            <input id="psite" type="url" value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://myapp.com" />
          </div>
          <button className={styles.saveBtn} onClick={saveProject}>
            {saved ? '✓ Saved' : 'Save changes'}
          </button>
        </div>
      </section>

      {/* Jurisdiction */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Jurisdiction</h2>
        <div className={styles.card}>
          <div className={styles.jurisdictionRow}>
            <div>
              <div className={styles.jurisdictionName}>🇰🇪 Kenya</div>
              <div className={styles.jurisdictionNote}>Home country · Free forever</div>
            </div>
            <span className={styles.freeBadge}>Free</span>
          </div>
          <div className={styles.divider} />
          <button className={styles.addJurisdiction}>
            + Add country <span className={styles.globalBadge}>Global $49/mo</span>
          </button>
        </div>
      </section>

      {/* Team */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Team</h2>
        <div className={styles.card}>
          <div className={styles.memberRow}>
            <div className={styles.memberLeft}>
              <div className={styles.memberAvatar}>IK</div>
              <div>
                <div className={styles.memberName}>Ian Nzioka</div>
                <div className={styles.memberEmail}>ian@konduyt.dev</div>
              </div>
            </div>
            <span className={styles.ownerBadge}>Owner</span>
          </div>
          <div className={styles.divider} />
          <button className={styles.inviteBtn}>+ Invite team member</button>
        </div>
      </section>

      {/* Billing */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Billing</h2>
        <div className={styles.card}>
          <div className={styles.billingRow}>
            <div>
              <div className={styles.planName}>Local — Free</div>
              <div className={styles.planNote}>1 jurisdiction · Unlimited vendors</div>
            </div>
            <a href="/pricing" className={styles.upgradeLink}>Upgrade to Global →</a>
          </div>
        </div>
      </section>

      {/* Danger zone */}
      <section className={styles.section}>
        <h2 className={`${styles.sectionTitle} ${styles.danger}`}>Danger zone</h2>
        <div className={`${styles.card} ${styles.dangerCard}`}>
          <p className={styles.dangerNote}>
            Deleting this project is permanent. All API keys, vendor connections, and transaction history will be lost.
          </p>
          <div className={styles.deleteConfirmRow}>
            <input
              type="text"
              placeholder={`Type "${project?.name}" to confirm`}
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
              className={styles.deleteInput}
            />
            <button
              className={styles.deleteBtn}
              disabled={deleteConfirm !== project?.name}
            >
              Delete project
            </button>
          </div>
        </div>
      </section>

    </div>
  )
}
