import { useState } from 'react';

interface FormState {
  usability: number;
  route_clarity: number;
  alert_usefulness: number;
  would_use: boolean | null;
  comments: string;
}

const INITIAL: FormState = {
  usability: 0,
  route_clarity: 0,
  alert_usefulness: 0,
  would_use: null,
  comments: '',
};

function StarRating({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="uat-field">
      <label className="uat-label">{label}</label>
      <div className="star-row">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            className={`star-btn ${n <= value ? 'star-filled' : ''}`}
            onClick={() => onChange(n)}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
          >
            ★
          </button>
        ))}
        {value > 0 && <span className="star-hint">{value}/5</span>}
      </div>
    </div>
  );
}

export function UatPage() {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  function setRating(field: keyof Pick<FormState, 'usability' | 'route_clarity' | 'alert_usefulness'>) {
    return (v: number) => setForm((f) => ({ ...f, [field]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (form.usability === 0 || form.route_clarity === 0 || form.alert_usefulness === 0) {
      setError('Please fill in all star ratings.');
      return;
    }
    if (form.would_use === null) {
      setError('Please answer the "Would you use this?" question.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/uat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(await res.text());
      setDone(true);
    } catch (err) {
      setError(String(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="uat-wrap">
        <div className="uat-thanks">
          <div className="thanks-icon">✓</div>
          <h2>Thank you!</h2>
          <p>Your feedback has been recorded and will help improve E-Iwas Baha.</p>
          <button className="btn-admin-primary" onClick={() => { setForm(INITIAL); setDone(false); }}>
            Submit another response
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="uat-wrap">
      <div className="uat-card">
        <h2>E-Iwas Baha — User Evaluation</h2>
        <p className="uat-intro">
          Please rate your experience with the app. Your answers are anonymous and will be
          used for academic evaluation only.
        </p>

        <form onSubmit={submit}>
          <StarRating
            label="1. How easy was the app to use? (Usability)"
            value={form.usability}
            onChange={setRating('usability')}
          />
          <StarRating
            label="2. How clear was the displayed evacuation route? (Route Clarity)"
            value={form.route_clarity}
            onChange={setRating('route_clarity')}
          />
          <StarRating
            label="3. How useful were the flood alerts? (Alert Usefulness)"
            value={form.alert_usefulness}
            onChange={setRating('alert_usefulness')}
          />

          <div className="uat-field">
            <label className="uat-label">4. Would you use this app during an actual flood?</label>
            <div className="yn-row">
              <button
                type="button"
                className={`yn-btn ${form.would_use === true ? 'yn-selected' : ''}`}
                onClick={() => setForm((f) => ({ ...f, would_use: true }))}
              >
                Yes
              </button>
              <button
                type="button"
                className={`yn-btn ${form.would_use === false ? 'yn-selected' : ''}`}
                onClick={() => setForm((f) => ({ ...f, would_use: false }))}
              >
                No
              </button>
            </div>
          </div>

          <div className="uat-field">
            <label className="uat-label" htmlFor="comments">
              5. Additional comments or suggestions (optional)
            </label>
            <textarea
              id="comments"
              className="uat-textarea"
              rows={4}
              maxLength={1000}
              placeholder="Your feedback…"
              value={form.comments}
              onChange={(e) => setForm((f) => ({ ...f, comments: e.target.value }))}
            />
          </div>

          {error && <p className="error-msg">{error}</p>}

          <button type="submit" className="btn-admin-primary btn-submit" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit Evaluation'}
          </button>
        </form>
      </div>
    </div>
  );
}
