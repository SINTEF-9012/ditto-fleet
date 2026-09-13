// Must order versions exactly as `dpkg --compare-versions` does (Debian Policy 5.6.12):
// Ditto's RQL compares version strings lexicographically, so "3.0.9-1" would sort after "3.0.14-1".

function parse(version) {
  const trimmed = String(version).trim();
  const epochMatch = /^(\d+):/.exec(trimmed);
  const epoch = epochMatch ? Number(epochMatch[1]) : 0;
  const rest = epochMatch ? trimmed.slice(epochMatch[0].length) : trimmed;
  const dash = rest.lastIndexOf("-");
  return dash === -1
    ? { epoch, upstream: rest, revision: "" }
    : { epoch, upstream: rest.slice(0, dash), revision: rest.slice(dash + 1) };
}

const isDigit = (c) => c !== undefined && c >= "0" && c <= "9";
const isAlpha = (c) =>
  c !== undefined && ((c >= "a" && c <= "z") || (c >= "A" && c <= "Z"));

function order(c) {
  if (c === undefined || isDigit(c)) return 0;
  if (isAlpha(c)) return c.charCodeAt(0);
  if (c === "~") return -1;
  return c.charCodeAt(0) + 256;
}

function verrevcmp(a, b) {
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    while (
      (i < a.length && !isDigit(a[i])) ||
      (j < b.length && !isDigit(b[j]))
    ) {
      const diff = order(a[i]) - order(b[j]);
      if (diff !== 0) return diff;
      i++;
      j++;
    }
    while (a[i] === "0") i++;
    while (b[j] === "0") j++;
    let firstDiff = 0;
    while (isDigit(a[i]) && isDigit(b[j])) {
      if (!firstDiff) firstDiff = a.charCodeAt(i) - b.charCodeAt(j);
      i++;
      j++;
    }
    if (isDigit(a[i])) return 1;
    if (isDigit(b[j])) return -1;
    if (firstDiff) return firstDiff;
  }
  return 0;
}

/** Negative, zero or positive, with the same sign as `dpkg --compare-versions a b`. */
export function compareVersions(a, b) {
  const va = parse(a);
  const vb = parse(b);
  if (va.epoch !== vb.epoch) return va.epoch - vb.epoch;
  return (
    verrevcmp(va.upstream, vb.upstream) || verrevcmp(va.revision, vb.revision)
  );
}

export function isVersionLower(a, b) {
  return compareVersions(a, b) < 0;
}
