/** Browser runtime adapter for `node:net` (`isIP` only). */
const IPV4 = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;

function isIPv4(value: string): boolean {
  return IPV4.test(value);
}

function isIPv6(value: string): boolean {
  const address = value.split("%")[0];
  if (!address.includes(":") || /[^0-9a-fA-F:.]/.test(address)) return false;
  const embedded = address.match(/^(.*:)(\d+\.\d+\.\d+\.\d+)$/);
  const head = embedded ? `${embedded[1]}0:0` : address;
  if (embedded && !isIPv4(embedded[2])) return false;
  const doubleColons = head.split("::").length - 1;
  if (doubleColons > 1) return false;
  const groups = head.split(":");
  if (doubleColons === 0 && groups.length !== 8) return false;
  if (doubleColons === 1 && groups.filter(Boolean).length > 7) return false;
  return groups.every((group, index) => {
    if (group === "") return doubleColons === 1 || index === 0 || index === groups.length - 1;
    return /^[0-9a-fA-F]{1,4}$/.test(group);
  });
}

export function isIP(value: string): 0 | 4 | 6 {
  if (isIPv4(value)) return 4;
  if (isIPv6(value)) return 6;
  return 0;
}

export default { isIP };
