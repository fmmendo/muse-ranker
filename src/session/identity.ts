// Anonymous, account-free identity: a random GUID kept in localStorage, used to
// attribute a browser's comparisons for aggregation. No login, no personal data.
// Clearing storage / a new browser yields a new id (identities never merge).

const STORAGE_KEY = 'ranker:userId'

export function getUserId(): string {
  try {
    const existing = localStorage.getItem(STORAGE_KEY)
    if (existing) return existing
    const id = crypto.randomUUID()
    localStorage.setItem(STORAGE_KEY, id)
    return id
  } catch {
    // localStorage/crypto unavailable — fall back to an ephemeral id.
    return crypto.randomUUID()
  }
}
