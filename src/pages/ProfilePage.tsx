import { useState, type FormEvent } from 'react';
import { Mail, User as UserIcon, Calendar, Shield } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/services/supabase';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { initials, formatDate } from '@/utils';

export function ProfilePage() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      const { error } = await supabase.auth.updateUser({
        email,
        data: { name },
      });
      if (error) throw error;
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="bg-neutral-50">
      <div className="border-b border-neutral-200 bg-white">
        <div className="container-app py-10">
          <h1 className="font-display text-3xl font-bold text-neutral-900">Your profile</h1>
          <p className="mt-2 text-neutral-600">Manage your account details and preferences.</p>
        </div>
      </div>

      <div className="container-app py-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Profile summary */}
          <Card className="lg:col-span-1">
            <CardBody className="flex flex-col items-center text-center">
              <span className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary-600 text-2xl font-bold text-white">
                {initials(user.name)}
              </span>
              <h2 className="mt-4 font-display text-xl font-bold text-neutral-900">{user.name}</h2>
              <p className="text-sm text-neutral-500">{user.email}</p>
              <Badge tone="primary" className="mt-3 capitalize">{user.role}</Badge>
            </CardBody>
          </Card>

          {/* Edit form */}
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>Account details</CardTitle></CardHeader>
            <CardBody>
              <form onSubmit={handleSubmit} className="space-y-5">
                <Input
                  label="Full name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  leftIcon={<UserIcon className="h-4 w-4" />}
                />
                <Input
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  leftIcon={<Mail className="h-4 w-4" />}
                />
                <div className="flex items-center gap-3">
                  <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</Button>
                  {saved && <span className="text-sm font-medium text-success-600">Saved successfully</span>}
                  {saveError && <span className="text-sm font-medium text-error-600">{saveError}</span>}
                </div>
              </form>
            </CardBody>
          </Card>
        </div>

        {/* Account meta */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Card>
            <CardBody className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-600">
                <Calendar className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Member since</p>
                <p className="text-sm font-semibold text-neutral-900">{formatDate(user.createdAt)}</p>
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-600">
                <Shield className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Account type</p>
                <p className="text-sm font-semibold text-neutral-900 capitalize">{user.role}</p>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
