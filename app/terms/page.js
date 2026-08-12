'use client';

import { useState } from 'react';
import Link from 'next/link';
import { DOCUMENTS } from './termsData';

function Section({ s }) {
  return (
    <div className="legal-section">
      {s.h && <h2>{s.h}</h2>}
      {(s.p || []).map((para, i) => <p key={`p${i}`}>{para}</p>)}
      {s.ul && <ul className="legal-list">{s.ul.map((li, i) => <li key={`u${i}`}>{li}</li>)}</ul>}
      {s.ol && <ol className="legal-list legal-ol">{s.ol.map((li, i) => <li key={`o${i}`}>{li}</li>)}</ol>}
      {s.table && (
        <div className="legal-table-wrap">
          <table className="legal-table">
            <thead><tr>{s.table.head.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
            <tbody>{s.table.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
          </table>
        </div>
      )}
      {(s.after || []).map((para, i) => <p key={`a${i}`}>{para}</p>)}
    </div>
  );
}

export default function Terms() {
  const [docId, setDocId] = useState('tos');
  const doc = DOCUMENTS.find((d) => d.id === docId) || DOCUMENTS[0];

  return (
    <div className="legal-root">
      <nav className="legal-nav">
        <Link href="/" className="legal-logo">Konduyt</Link>
        <Link href="/" className="legal-navlink">← Back to Konduyt</Link>
      </nav>

      <div className="legal-layout">
        {/* Document switcher */}
        <aside className="legal-side">
          <div className="legal-side-label">Legal</div>
          {DOCUMENTS.map((d) => (
            <button key={d.id} type="button"
              className={d.id === docId ? 'legal-side-link active' : 'legal-side-link'}
              onClick={() => { setDocId(d.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
              {d.title.replace('Konduyt ', '')}
            </button>
          ))}
        </aside>

        <div className="legal-wrap">
          <header className="legal-head">
            <h1>{doc.title}</h1>
            <p className="legal-updated">{doc.meta}</p>
          </header>

          {(doc.intro || []).map((para, i) => <p key={`i${i}`} className="legal-intro-p">{para}</p>)}

          {doc.sections.map((s, i) => <Section key={i} s={s} />)}

          <footer className="legal-foot">
            <Link href="/" className="legal-navlink">← Back to Konduyt</Link>
            <span className="legal-copy">© 2026 Konduyt</span>
          </footer>
        </div>
      </div>
    </div>
  );
}
