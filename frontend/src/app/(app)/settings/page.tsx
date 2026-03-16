'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Loader2, LogOut, Trash2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth.store';
import { updateProfile } from '@/services/profile';
import { changePassword, deleteAccount } from '@/services/settings';
import { LanguageSwitcher } from '@/components/shared/language-switcher';

// -- Profile form schema --
const profileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  birthdate: z.string().optional(),
  pubertyAge: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

// -- Change password form schema --
const passwordSchema = z
  .object({
    currentPassword: z.string().min(8, 'Password must be at least 8 characters'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(8, 'Password must be at least 8 characters'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type PasswordFormData = z.infer<typeof passwordSchema>;

// -- Delete account form schema --
const deleteSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

type DeleteFormData = z.infer<typeof deleteSchema>;

export default function SettingsPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const setAuth = useAuthStore((state) => state.setAuth);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  // Profile section state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password section state
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Delete section state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Profile form
  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      birthdate: user?.birthdate?.split('T')[0] || '',
      pubertyAge: user?.pubertyAge?.toString() || '',
    },
  });

  // Password form
  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  // Delete form
  const deleteForm = useForm<DeleteFormData>({
    resolver: zodResolver(deleteSchema),
    defaultValues: {
      password: '',
    },
  });

  async function onProfileSubmit(data: ProfileFormData) {
    setProfileError(null);
    setProfileSuccess(null);
    try {
      const pubertyAge = data.pubertyAge ? parseInt(data.pubertyAge, 10) : null;
      const updatedUser = await updateProfile({
        name: data.name,
        birthdate: data.birthdate || undefined,
        pubertyAge: pubertyAge && pubertyAge >= 9 && pubertyAge <= 17 ? pubertyAge : null,
      });
      if (accessToken && refreshToken) {
        setAuth(updatedUser, accessToken, refreshToken);
      }
      setProfileSuccess('Profile updated successfully');
      setIsEditingProfile(false);
    } catch (err: any) {
      setProfileError(err.response?.data?.message || 'Failed to update profile.');
    }
  }

  async function onPasswordSubmit(data: PasswordFormData) {
    setPasswordError(null);
    setPasswordSuccess(null);
    try {
      await changePassword(data.currentPassword, data.newPassword);
      setPasswordSuccess('Password changed successfully');
      passwordForm.reset();
    } catch (err: any) {
      setPasswordError(err.response?.data?.message || 'Failed to change password.');
    }
  }

  async function onDeleteSubmit(data: DeleteFormData) {
    setDeleteError(null);
    try {
      await deleteAccount(data.password);
      clearAuth();
      router.push('/login');
    } catch (err: any) {
      setDeleteError(err.response?.data?.message || 'Failed to delete account.');
    }
  }

  function handleSignOut() {
    clearAuth();
    router.push('/login');
  }

  const inputClassName =
    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Profile Section */}
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Profile</h2>
            <p className="text-sm text-muted-foreground">Your personal information</p>
          </div>
          {!isEditingProfile && (
            <Button variant="outline" onClick={() => setIsEditingProfile(true)}>
              Edit
            </Button>
          )}
        </div>

        {profileSuccess && (
          <div className="mt-4 flex items-center gap-2 rounded-md bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-400">
            <Check className="size-4" />
            {profileSuccess}
          </div>
        )}

        {profileError && (
          <div className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {profileError}
          </div>
        )}

        {isEditingProfile ? (
          <form
            onSubmit={profileForm.handleSubmit(onProfileSubmit)}
            className="mt-4 space-y-4"
          >
            <div className="space-y-2">
              <label htmlFor="profile-name" className="text-sm font-medium">
                Name
              </label>
              <input
                id="profile-name"
                type="text"
                className={inputClassName}
                {...profileForm.register('name')}
              />
              {profileForm.formState.errors.name && (
                <p className="text-sm text-destructive">
                  {profileForm.formState.errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="profile-email" className="text-sm font-medium">
                Email
              </label>
              <input
                id="profile-email"
                type="email"
                className={`${inputClassName} cursor-not-allowed opacity-60`}
                value={user?.email || ''}
                disabled
              />
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="profile-birthdate" className="text-sm font-medium">
                Date of Birth
              </label>
              <input
                id="profile-birthdate"
                type="date"
                className={inputClassName}
                max={new Date().toISOString().split('T')[0]}
                {...profileForm.register('birthdate')}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="profile-puberty-age" className="text-sm font-medium">
                Age of Puberty{' '}
                <span className="text-muted-foreground">(optional, 9-17)</span>
              </label>
              <input
                id="profile-puberty-age"
                type="number"
                min={9}
                max={17}
                className={inputClassName}
                placeholder="Leave empty if unsure"
                {...profileForm.register('pubertyAge')}
              />
            </div>

            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={profileForm.formState.isSubmitting}
              >
                <Loader2
                  className={`mr-2 size-4 animate-spin ${profileForm.formState.isSubmitting ? '' : 'hidden'}`}
                />
                Save Changes
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditingProfile(false);
                  setProfileError(null);
                  profileForm.reset();
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <div className="mt-4 space-y-3">
            <div className="flex justify-between border-b pb-2">
              <span className="text-sm text-muted-foreground">Name</span>
              <span className="text-sm font-medium">{user?.name || '-'}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-sm text-muted-foreground">Email</span>
              <span className="text-sm font-medium">{user?.email || '-'}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-sm text-muted-foreground">Date of Birth</span>
              <span className="text-sm font-medium">
                {user?.birthdate ? user.birthdate.split('T')[0] : 'Not set'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Age of Puberty</span>
              <span className="text-sm font-medium">
                {user?.pubertyAge ?? 'Not set'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Change Password Section */}
      <div className="rounded-lg border bg-card p-6">
        <div>
          <h2 className="text-lg font-semibold">Change Password</h2>
          <p className="text-sm text-muted-foreground">
            Update your account password
          </p>
        </div>

        {passwordSuccess && (
          <div className="mt-4 flex items-center gap-2 rounded-md bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-400">
            <Check className="size-4" />
            {passwordSuccess}
          </div>
        )}

        {passwordError && (
          <div className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {passwordError}
          </div>
        )}

        <form
          onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
          className="mt-4 space-y-4"
        >
          <div className="space-y-2">
            <label htmlFor="current-password" className="text-sm font-medium">
              Current Password
            </label>
            <input
              id="current-password"
              type="password"
              autoComplete="current-password"
              className={inputClassName}
              placeholder="Enter current password"
              {...passwordForm.register('currentPassword')}
            />
            {passwordForm.formState.errors.currentPassword && (
              <p className="text-sm text-destructive">
                {passwordForm.formState.errors.currentPassword.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="new-password" className="text-sm font-medium">
              New Password
            </label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              className={inputClassName}
              placeholder="Enter new password"
              {...passwordForm.register('newPassword')}
            />
            {passwordForm.formState.errors.newPassword && (
              <p className="text-sm text-destructive">
                {passwordForm.formState.errors.newPassword.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="confirm-password" className="text-sm font-medium">
              Confirm New Password
            </label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              className={inputClassName}
              placeholder="Confirm new password"
              {...passwordForm.register('confirmPassword')}
            />
            {passwordForm.formState.errors.confirmPassword && (
              <p className="text-sm text-destructive">
                {passwordForm.formState.errors.confirmPassword.message}
              </p>
            )}
          </div>

          <Button
            type="submit"
            disabled={passwordForm.formState.isSubmitting}
          >
            <Loader2
              className={`mr-2 size-4 animate-spin ${passwordForm.formState.isSubmitting ? '' : 'hidden'}`}
            />
            Change Password
          </Button>
        </form>
      </div>

      {/* Language Section */}
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Language</h2>
            <p className="text-sm text-muted-foreground">
              Switch between English and Arabic
            </p>
          </div>
          <LanguageSwitcher />
        </div>
      </div>

      {/* Danger Zone - Delete Account */}
      <div className="rounded-lg border border-destructive/30 bg-card p-6">
        <div>
          <h2 className="text-lg font-semibold text-destructive">Danger Zone</h2>
          <p className="text-sm text-muted-foreground">
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
        </div>

        {deleteError && (
          <div className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {deleteError}
          </div>
        )}

        {showDeleteConfirm ? (
          <form
            onSubmit={deleteForm.handleSubmit(onDeleteSubmit)}
            className="mt-4 space-y-4"
          >
            <div className="space-y-2">
              <label htmlFor="delete-password" className="text-sm font-medium">
                Enter your password to confirm
              </label>
              <input
                id="delete-password"
                type="password"
                autoComplete="current-password"
                className={inputClassName}
                placeholder="Enter your password"
                {...deleteForm.register('password')}
              />
              {deleteForm.formState.errors.password && (
                <p className="text-sm text-destructive">
                  {deleteForm.formState.errors.password.message}
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                type="submit"
                variant="destructive"
                disabled={deleteForm.formState.isSubmitting}
              >
                <Loader2
                  className={`mr-2 size-4 animate-spin ${deleteForm.formState.isSubmitting ? '' : 'hidden'}`}
                />
                <Trash2 className="mr-1.5 size-4" />
                Confirm Delete
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteError(null);
                  deleteForm.reset();
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <div className="mt-4">
            <Button
              variant="destructive"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="mr-1.5 size-4" />
              Delete Account
            </Button>
          </div>
        )}
      </div>

      {/* Sign Out */}
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Sign Out</h2>
            <p className="text-sm text-muted-foreground">
              Sign out of your account on this device
            </p>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="mr-1.5 size-4" />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}
