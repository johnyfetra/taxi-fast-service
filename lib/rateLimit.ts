const ipMap = new Map<string, number[]>()

export function checkRateLimit(
  ip: string,
  windowMs = 3_600_000,
  max = 3
): boolean {
  const now = Date.now()
  const timestamps = (ipMap.get(ip) ?? []).filter((t) => now - t < windowMs)
  if (timestamps.length >= max) return false
  ipMap.set(ip, [...timestamps, now])
  return true
}
