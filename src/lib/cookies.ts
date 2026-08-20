const isBrowser = typeof document !== "undefined";

export function setCookie(name: string, value: string, days = 30) {
  if (!isBrowser) return;
  const maxAge = days * 24 * 60 * 60;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax${secure}`;
}

export function getCookie(name: string): string | null {
  if (!isBrowser) return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function deleteCookie(name: string) {
  if (!isBrowser) return;
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}