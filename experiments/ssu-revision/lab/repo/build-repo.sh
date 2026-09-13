#!/bin/bash
# Builds a signed flat apt repository containing archived Debian 12 builds of OpenSSL
# (downloaded from snapshot.debian.org and checked against the archive's SHA-1 hashes).
set -euo pipefail

ARCH="${ARCH:-amd64}"
VERSIONS="${VERSIONS:-3.0.11-1~deb12u2 3.0.14-1~deb12u2}"
BINARIES="${BINARIES:-openssl libssl3}"
REPO=/repo
# The signing key lives in its own volume: the repository volume is served over HTTP.
export GNUPGHOME=/keys/gnupg

apt-get update -qq
apt-get install -y -qq --no-install-recommends ca-certificates curl jq apt-utils gnupg >/dev/null

mkdir -p "$REPO"
cd "$REPO"
: > SHA256SUMS

for version in $VERSIONS; do
  for binary in $BINARIES; do
    info=$(curl -fsS "https://snapshot.debian.org/mr/binary/${binary}/${version}/binfiles?fileinfo=1")
    hash=$(jq -r --arg arch "$ARCH" '.result[] | select(.architecture == $arch) | .hash' <<<"$info")
    if [ -z "$hash" ] || [ "$hash" = "null" ]; then
      echo "no ${ARCH} build of ${binary} ${version} on snapshot.debian.org" >&2
      exit 1
    fi
    name=$(jq -r --arg hash "$hash" '.fileinfo[$hash][0].name' <<<"$info")
    if [ ! -f "$name" ]; then
      curl -fsS -o "$name" "https://snapshot.debian.org/file/${hash}"
    fi
    echo "${hash}  ${name}" | sha1sum -c --quiet
    sha256sum "$name" >> SHA256SUMS
    echo "fetched ${name}"
  done
done

# One minimal SPDX 2.3 document per OpenSSL version; E4 assignments reference it as artefact metadata.
mkdir -p sbom
created=$(date -u +%Y-%m-%dT%H:%M:%SZ)
for version in $VERSIONS; do
  for binary in $BINARIES; do
    deb="${binary}_${version}_${ARCH}.deb"
    jq -n --arg name "$binary" --arg version "$version" --arg arch "$ARCH" --arg deb "$deb" \
      --arg sha256 "$(sha256sum "$deb" | cut -d' ' -f1)" \
      '{name: $name, SPDXID: ("SPDXRef-Package-" + $name), versionInfo: $version,
        supplier: "Organization: Debian", downloadLocation: ("http://apt-repo/" + $deb),
        filesAnalyzed: false, checksums: [{algorithm: "SHA256", checksumValue: $sha256}],
        externalRefs: [{referenceCategory: "PACKAGE-MANAGER", referenceType: "purl",
          referenceLocator: ("pkg:deb/debian/" + $name + "@" + $version + "?arch=" + $arch)}]}'
  done | jq -s --arg version "$version" --arg created "$created" \
    '{spdxVersion: "SPDX-2.3", dataLicense: "CC0-1.0", SPDXID: "SPDXRef-DOCUMENT",
      name: ("openssl " + $version + " in the ditto-fleet lab repository"),
      documentNamespace: ("http://apt-repo/sbom/openssl_" + $version),
      creationInfo: {created: $created, creators: ["Tool: ditto-fleet lab build-repo.sh"]},
      packages: .,
      relationships: [.[] | {spdxElementId: "SPDXRef-DOCUMENT", relationshipType: "DESCRIBES",
        relatedSpdxElement: .SPDXID}]}' \
    > "sbom/openssl_${version}.spdx.json"
  echo "wrote sbom/openssl_${version}.spdx.json"
done

if [ ! -s /keys/keyring.gpg ]; then
  mkdir -p "$GNUPGHOME"
  chmod 700 "$GNUPGHOME"
  gpg --batch --pinentry-mode loopback --passphrase '' \
    --quick-generate-key "ditto-fleet lab repository <lab@ditto-fleet.invalid>" ed25519 sign never
  gpg --batch --export > /keys/keyring.gpg
fi
cp /keys/keyring.gpg "$REPO/keyring.gpg"

apt-ftparchive packages . > Packages
gzip -kf Packages
apt-ftparchive -o APT::FTPArchive::Release::Origin=ditto-fleet-lab release . > Release
rm -f InRelease Release.gpg
gpg --batch --yes --clearsign -o InRelease Release
gpg --batch --yes --detach-sign --armor -o Release.gpg Release

tmp=$(mktemp -d)
for binary in $BINARIES; do
  for deb in "${binary}"_3.0.14-*_"${ARCH}".deb; do
    [ -f "$deb" ] && dpkg-deb -x "$deb" "$tmp"
  done
done
if find "$tmp/usr/share/doc" -type f -name '*.gz' -exec zgrep -H -m 2 "CVE-2024-4603" {} + > cve-check.txt; then
  echo "CVE-2024-4603 is referenced in the 3.0.14 package documentation"
else
  echo "CVE-2024-4603 is not referenced in the 3.0.14 package documentation" | tee cve-check.txt
fi
rm -rf "$tmp"

echo "repository ready:"
cat SHA256SUMS
