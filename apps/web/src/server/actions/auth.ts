'use server';

import { cookies } from 'next/headers';
import { isLocale, type Locale } from '@dospa/i18n/config';
import { redirect } from '@/i18n/navigation';
import { getAuth } from '../auth-context';
import {
  confirmMfaSetup,
  login,
  logout,
  requestPasswordReset,
  resetPassword,
  saveLocalePreference,
  verifyMfa,
  type NextStep,
} from '../auth-service';
import { isSecureCookie, serverEnv } from '../env';
import { requestMeta } from '../request-meta';
import { SESSION_COOKIE } from '../session';

export interface FormState {
  error?: string;
  done?: boolean;
  recoveryCodes?: string[];
}

function localeFrom(formData: FormData): Locale {
  const value = formData.get('locale');
  return isLocale(value) ? value : 'fr';
}

async function setSessionCookie(token: string): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isSecureCookie(),
    sameSite: 'lax',
    path: '/',
    maxAge: serverEnv().SESSION_ABSOLUTE_HOURS * 3600,
  });
}

const NEXT_HREF: Record<NextStep, string> = { app: '/dashboard', mfa: '/mfa', mfa_setup: '/mfa/setup' };

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const locale = localeFrom(formData);
  const result = await login(
    { email: formData.get('email'), password: formData.get('password') },
    await requestMeta(),
  );
  if (!result.ok) return { error: result.code };
  await setSessionCookie(result.value.token);
  // La langue enregistrée de l'utilisateur prime sur celle de la page de connexion.
  return redirect({ href: NEXT_HREF[result.value.next], locale: result.value.locale ?? locale });
}

export async function mfaAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const locale = localeFrom(formData);
  const auth = await getAuth();
  if (!auth) return redirect({ href: '/login', locale });
  const result = await verifyMfa(auth.session, formData.get('code'), await requestMeta());
  if (!result.ok) return { error: result.code };
  await setSessionCookie(result.value.token);
  return redirect({ href: '/dashboard', locale });
}

export async function mfaSetupAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const locale = localeFrom(formData);
  const auth = await getAuth();
  if (!auth) return redirect({ href: '/login', locale });
  const result = await confirmMfaSetup(auth.session, formData.get('code'), await requestMeta());
  if (!result.ok) return { error: result.code };
  await setSessionCookie(result.value.token);
  return { done: true, recoveryCodes: result.value.recoveryCodes };
}

export async function logoutAction(formData: FormData): Promise<void> {
  const locale = localeFrom(formData);
  const auth = await getAuth();
  if (auth) await logout(auth.session, await requestMeta());
  (await cookies()).delete(SESSION_COOKIE);
  redirect({ href: '/login', locale });
}

export async function forgotPasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const locale = localeFrom(formData);
  const result = await requestPasswordReset({ email: formData.get('email') }, locale, await requestMeta());
  if (!result.ok) return { error: result.code };
  return { done: true };
}

export async function resetPasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const result = await resetPassword(
    { token: formData.get('token'), password: formData.get('password'), confirm: formData.get('confirm') },
    await requestMeta(),
  );
  if (!result.ok) return { error: result.code };
  return { done: true };
}

/** Enregistre la langue choisie si l'utilisateur est connecté (sinon seul le cookie de langue s'applique). */
export async function saveLocaleAction(locale: string): Promise<void> {
  if (!isLocale(locale)) return;
  const auth = await getAuth();
  if (auth) await saveLocalePreference(auth.userId, locale);
}
