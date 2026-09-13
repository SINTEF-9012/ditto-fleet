import { runInTarget } from "./system.js";

const DEB_NAME = /^[a-z0-9][a-z0-9+.-]*$/;
const DEB_VERSION = /^[A-Za-z0-9][A-Za-z0-9.+~:-]*$/;
const APT_ENV = { DEBIAN_FRONTEND: "noninteractive" };
const DPKG_FORMAT = "'${Package} ${db:Status-Status} ${Version}\\n'";
const TLS_PORT = 44330;

const TLS_HANDSHAKE_SCRIPT = [
  "d=$(mktemp -d)",
  "trap 'rm -rf \"$d\"' EXIT",
  'openssl req -x509 -newkey ec -pkeyopt ec_paramgen_curve:prime256v1 -nodes -keyout "$d/key.pem" -out "$d/cert.pem" -days 1 -subj /CN=localhost >/dev/null 2>&1 || exit 1',
  `openssl s_server -accept 127.0.0.1:${TLS_PORT} -cert "$d/cert.pem" -key "$d/key.pem" -naccept 1 -quiet >/dev/null 2>&1 &`,
  "srv=$!",
  "ok=1",
  `for i in 1 2 3 4 5 6 7 8 9 10; do if echo Q | openssl s_client -connect 127.0.0.1:${TLS_PORT} -brief > "$d/out" 2>&1; then ok=0; break; fi; sleep 0.2; done`,
  "kill $srv 2>/dev/null",
  "wait $srv 2>/dev/null",
  "[ $ok -eq 0 ] && grep -q 'Protocol version' \"$d/out\"",
].join("\n");

function assertSafeNames(debs) {
  for (const deb of debs) {
    if (!DEB_NAME.test(deb)) throw new Error(`refusing unsafe package name: ${deb}`);
  }
}

// Names and versions come from the twin, i.e. from the network, and end up in shell commands.
export function assertSafePackageSet(debs, version) {
  assertSafeNames(debs);
  if (!DEB_VERSION.test(String(version))) {
    throw new Error(`refusing unsafe version: ${version}`);
  }
}

function tail(text, max = 400) {
  const trimmed = String(text ?? "").trim();
  return trimmed.length > max ? trimmed.slice(-max) : trimmed;
}

function upstreamOf(version) {
  const withoutEpoch = version.replace(/^\d+:/, "");
  const dash = withoutEpoch.lastIndexOf("-");
  return dash === -1 ? withoutEpoch : withoutEpoch.slice(0, dash);
}

/** Installed state of each package, e.g. { openssl: { status: "installed", version: "3.0.11-1~deb12u2" } }. */
export async function queryPackages(debs, exec = runInTarget) {
  assertSafeNames(debs);
  const result = await exec(`dpkg-query -W -f=${DPKG_FORMAT} ${debs.join(" ")}`);
  const packages = {};
  for (const line of result.stdout.split("\n")) {
    const [name, status, version] = line.trim().split(/\s+/);
    if (name && status && version) packages[name] = { status, version };
  }
  return packages;
}

export async function installPackageSet({ debs, version }, exec = runInTarget) {
  assertSafePackageSet(debs, version);
  const started = Date.now();
  const update = await exec("apt-get update -qq", { env: APT_ENV });
  const updated = Date.now();
  if (update.code !== 0) {
    return {
      ok: false,
      error: `apt-get update failed: ${tail(update.stderr || update.stdout)}`,
      updateMs: updated - started,
      installMs: 0,
    };
  }
  const targets = debs.map((deb) => `'${deb}=${version}'`).join(" ");
  const install = await exec(
    `apt-get install -y -qq --no-remove --allow-downgrades --no-install-recommends ${targets}`,
    { env: APT_ENV },
  );
  const installed = Date.now();
  return {
    ok: install.code === 0,
    error:
      install.code === 0
        ? null
        : `apt-get install failed: ${tail(install.stderr || install.stdout)}`,
    updateMs: updated - started,
    installMs: installed - updated,
  };
}

export async function verifyPackageSet({ debs, version }, exec = runInTarget) {
  assertSafePackageSet(debs, version);
  const checks = {};

  const packages = await queryPackages(debs, exec);
  checks.dpkgState = debs.every(
    (deb) =>
      packages[deb]?.status === "installed" && packages[deb]?.version === version,
  );

  const integrity = await exec(`dpkg --verify ${debs.join(" ")}`);
  checks.fileIntegrity = integrity.code === 0 && integrity.stdout.trim() === "";

  if (debs.includes("openssl")) {
    const binary = await exec("openssl version");
    checks.binaryVersion =
      binary.code === 0 && binary.stdout.startsWith(`OpenSSL ${upstreamOf(version)} `);
    const handshake = await exec(TLS_HANDSHAKE_SCRIPT, { timeoutMs: 30000 });
    checks.tlsHandshake = handshake.code === 0;
  }

  const maps = await exec(
    "grep -ls 'libssl\\.so\\.3 (deleted)' /proc/[0-9]*/maps || true",
  );
  const restartRequired = maps.stdout
    .split("\n")
    .map((line) => line.trim().match(/^\/proc\/(\d+)\/maps$/)?.[1])
    .filter(Boolean)
    .map(Number);

  return {
    passed: Object.values(checks).every(Boolean),
    checks,
    restartRequired,
  };
}
