import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User as UserIcon, ArrowRight, Check } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ROUTES } from '@/constants';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (!name || !email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      const hasSession = await register({ name, email, password });
      if (hasSession) {
        navigate(ROUTES.DASHBOARD, { replace: true });
      } else {
        setNotice('Check your email to confirm your account, then sign in.');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to create your account. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in-up">
      <h1 className="font-display text-3xl font-bold text-neutral-900">Create your account</h1>
      <p className="mt-2 text-neutral-600">Access your football prediction dashboard.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <Input
          label="Full name"
          type="text"
          name="name"
          placeholder="Alex Morgan"
          value={name}
          onChange={(e) => setName(e.target.value)}
          leftIcon={<UserIcon className="h-4 w-4" />}
          autoComplete="name"
        />
        <Input
          label="Email"
          type="email"
          name="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          leftIcon={<Mail className="h-4 w-4" />}
          autoComplete="email"
        />
        <Input
          label="Password"
          type="password"
          name="password"
          placeholder="At least 6 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          leftIcon={<Lock className="h-4 w-4" />}
          autoComplete="new-password"
          hint="Use 6 or more characters."
        />

        {error && (
          <div className="rounded-xl bg-error-50 px-4 py-3 text-sm text-error-700 ring-1 ring-error-200">
            {error}
          </div>
        )}
        {notice && (
          <div className="rounded-xl bg-success-50 px-4 py-3 text-sm text-success-700 ring-1 ring-success-200">
            {notice}
          </div>
        )}

        <Button type="submit" className="w-full" size="lg" loading={loading} rightIcon={!loading ? <ArrowRight className="h-5 w-5" /> : undefined}>
          {loading ? 'Creating account…' : 'Create account'}
        </Button>
      </form>

      <ul className="mt-6 space-y-2 text-sm text-neutral-500">
        {['Browse upcoming fixtures', 'Compare match outcome probabilities', 'Manage your account profile'].map((perk) => (
          <li key={perk} className="flex items-center gap-2">
            <Check className="h-4 w-4 text-success-500" /> {perk}
          </li>
        ))}
      </ul>

      <p className="mt-6 text-center text-sm text-neutral-600">
        Already have an account?{' '}
        <Link to={ROUTES.LOGIN} className="font-semibold text-primary-600 hover:text-primary-700">
          Sign in
        </Link>
      </p>
    </div>
  );
}
