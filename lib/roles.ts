/** Role helpers used to hide actions the API would reject anyway. */
export function canWrite(role?: string) {
  return role === 'admin' || role === 'company_a' || role === 'company_b';
}
