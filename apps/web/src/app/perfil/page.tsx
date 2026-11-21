import type { Metadata } from 'next';
import { UserAvatar } from '@/components/user-avatar';
import { requireUser } from '@/lib/session';
import { AccountSecurity } from './account-security';
import { MarketingPreference } from './marketing-preference';
import { PasswordForm } from './password-form';
import { ProfileNameForm } from './profile-name-form';

export const metadata: Metadata = {
  title: 'Perfil · Amigo Secreto',
};

export default async function ProfilePage() {
  const user = await requireUser('/perfil');

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-8 px-4 py-8">
      <h1 className="text-h1">Perfil</h1>

      <div className="flex items-center gap-3">
        <UserAvatar name={user.name} avatarUrl={user.avatarUrl} size="lg" />
        <div className="flex min-w-0 flex-col">
          <p className="truncate text-body font-semibold">{user.name}</p>
          <p className="truncate text-body-sm text-muted-foreground">
            {user.email}
          </p>
        </div>
      </div>

      <ProfileNameForm name={user.name} />
      <MarketingPreference marketingOptIn={user.marketingOptIn} />
      <PasswordForm hasPassword={user.hasPassword} />
      <AccountSecurity hasPassword={user.hasPassword} />
    </main>
  );
}
