'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../utils/apiClient';

const messageOf = (error: unknown) => error instanceof Error ? error.message : 'Something went wrong';

export default function ResetPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [complete, setComplete] = useState(false);
  const [token, setToken] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setToken(new URLSearchParams(window.location.search).get('token') || '');
      setReady(true);
    });
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    if (data.password !== data.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await api('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password: data.password }),
      });
      setComplete(true);
      form.reset();
    } catch (submitError) {
      setError(messageOf(submitError));
    } finally {
      setLoading(false);
    }
  };

  return <main><section className="auth-page page shell"><div><span className="kicker">ACCOUNT RECOVERY</span><h2>Choose a new<br /><em>password.</em></h2><p>Use at least eight characters. After resetting it, you can sign in with your new password.</p></div><form onSubmit={submit}>{!ready ? <div className="reset-complete" role="status"><p>Loading reset link…</p></div> : complete ? <div className="reset-complete" role="status"><h3>Password updated</h3><p>Your password has been reset successfully.</p><Link className="primary" href="/">Return to sign in →</Link></div> : <fieldset disabled={loading}><h3>Reset password</h3>{!token && <div className="form-error" role="alert">This reset link is missing its security token. Request a new link.</div>}<label>New password *<input name="password" type="password" minLength={8} maxLength={72} autoComplete="new-password" required /></label><label>Confirm new password *<input name="confirmPassword" type="password" minLength={8} maxLength={72} autoComplete="new-password" required /></label>{error && <div className="form-error" role="alert">{error}</div>}<button type="submit" className="primary" disabled={loading || !token}>{loading ? 'Updating…' : 'Update password →'}</button><Link className="back-to-login" href="/">← Back to sign in</Link></fieldset>}</form></section></main>;
}
