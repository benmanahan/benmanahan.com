/** Resolve local paths for both a Pages subdirectory and a custom domain. */
export function withBase(path = ''): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;
}
