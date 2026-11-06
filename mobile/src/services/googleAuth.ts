// Official Google Identity Services (GIS) Web Integration

// Standard TaskFlow Google Cloud OAuth 2.0 Web Client ID
// (Can be overridden via EXPO_PUBLIC_GOOGLE_CLIENT_ID or in-app settings)
const DEFAULT_GOOGLE_CLIENT_ID =
  (process.env as any).EXPO_PUBLIC_GOOGLE_CLIENT_ID ||
  '320661593835-8tumgns0bbuvngkle64h4glvm4lnhhbt.apps.googleusercontent.com';

const CLIENT_ID_STORAGE_KEY = 'taskflow_custom_google_client_id';

export function getGoogleClientId(): string {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const custom = window.localStorage.getItem(CLIENT_ID_STORAGE_KEY);
      if (custom && custom.trim().length > 0) return custom.trim();
    }
  } catch (e) {}
  return DEFAULT_GOOGLE_CLIENT_ID;
}

export function isGoogleConfigured(): boolean {
  const id = getGoogleClientId();
  return (
    Boolean(id) &&
    !id.includes('abc123taskflowdevclientid') &&
    !id.includes('placeholderclientid') &&
    id.endsWith('.apps.googleusercontent.com')
  );
}

export function setCustomGoogleClientId(clientId: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      if (!clientId.trim()) {
        window.localStorage.removeItem(CLIENT_ID_STORAGE_KEY);
      } else {
        window.localStorage.setItem(CLIENT_ID_STORAGE_KEY, clientId.trim());
      }
    }
  } catch (e) {}
}

export function loadGoogleScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      return resolve();
    }

    if ((window as any).google?.accounts?.id) {
      return resolve();
    }

    const existing = document.getElementById('google-gsi-client');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-gsi-client';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = (err) => {
      console.warn('Failed to load Google GIS script:', err);
      resolve(); // Do not block app loading if offline
    };
    document.head.appendChild(script);
  });
}

export function initializeGoogleSignIn(
  clientId: string,
  onCredentialReceived: (credential: string) => void
): boolean {
  if (typeof window === 'undefined') return false;

  const google = (window as any).google;
  if (!google?.accounts?.id) {
    return false;
  }

  try {
    google.accounts.id.initialize({
      client_id: clientId || getGoogleClientId(),
      callback: (response: { credential: string }) => {
        if (response && response.credential) {
          onCredentialReceived(response.credential);
        }
      },
      auto_select: false,
      cancel_on_tap_outside: true,
    });
    return true;
  } catch (err) {
    console.error('Error initializing Google Sign-In:', err);
    return false;
  }
}

export function renderGoogleButton(
  containerElement: HTMLElement,
  options?: any
): void {
  if (typeof window === 'undefined') return;
  const google = (window as any).google;
  if (!google?.accounts?.id || !containerElement) return;

  try {
    google.accounts.id.renderButton(containerElement, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'rectangular',
      logo_alignment: 'left',
      width: 300,
      ...options,
    });
  } catch (e) {
    console.warn('Failed to render official Google button:', e);
  }
}

export function triggerGoogleOneTap(): void {
  if (typeof window === 'undefined') return;
  const google = (window as any).google;
  if (google?.accounts?.id) {
    google.accounts.id.prompt();
  }
}

export function disableGoogleAutoSelect(): void {
  if (typeof window === 'undefined') return;
  const google = (window as any).google;
  if (google?.accounts?.id) {
    google.accounts.id.disableAutoSelect();
  }
}
