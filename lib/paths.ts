// next/link prefixes route links automatically. Use this only for native <a>
// links and assets in public/, whose paths need an explicit project prefix.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function sitePath(path: `/${string}`): string {
  return `${basePath}${path}`;
}
