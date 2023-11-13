export const supportedCDNs = (
  ["jsdelivr", "jsdelivrFastly", "unpkg", "npmmirror"] as const
).toSorted();

export type SupportedCDN = (typeof supportedCDNs)[number];

type ResolveCDNUrl = (
  cdn: SupportedCDN,
  name: string,
  version: string,
  pathname?: string,
) => string;

export const resolveCDNUrl: ResolveCDNUrl = (cdn, name, version, pathname) => {
  const trailingPathname = pathname ? `/${pathname}` : "";
  switch (cdn) {
    case "jsdelivr":
      return `https://cdn.jsdelivr.net/npm/${name}@${version}${trailingPathname}`;
    case "jsdelivrFastly":
      return `https://fastly.jsdelivr.net/npm/${name}@${version}${trailingPathname}`;
    case "npmmirror":
      return `https://registry.npmmirror.com/${name}/${version}/files${trailingPathname}`;
    case "unpkg":
      return `https://unpkg.com/${name}@${version}${trailingPathname}`;
    default:
      throw new Error(`Unrecognized CDN: ${cdn satisfies never}`);
  }
};
