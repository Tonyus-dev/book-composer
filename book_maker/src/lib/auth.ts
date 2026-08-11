export interface AuthSession {
  authenticated: boolean;
}

export async function getAuthSession(): Promise<AuthSession> {
  if (import.meta.env.DEV) return { authenticated: true };
  try {
    const response = await fetch("/api/auth/session", { headers: { accept: "application/json" } });
    if (!response.ok) return { authenticated: false };
    return (await response.json()) as AuthSession;
  } catch {
    return { authenticated: false };
  }
}

export async function loginOwner(password: string): Promise<boolean> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify({ password }),
  });
  return response.ok;
}

export async function logoutOwner(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST", headers: { accept: "application/json" } });
}
