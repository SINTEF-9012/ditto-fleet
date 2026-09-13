#!/bin/sh
set -e

until [ -s /lab-repo/keyring.gpg ] && apt-get update -qq >/dev/null 2>&1; do
  echo "waiting for the lab apt repository..."
  sleep 2
done

if [ -n "${INITIAL_OPENSSL_VERSION:-}" ]; then
  current=$(dpkg-query -W -f='${Version}' openssl 2>/dev/null || true)
  if [ "$current" != "$INITIAL_OPENSSL_VERSION" ]; then
    DEBIAN_FRONTEND=noninteractive apt-get install -y -qq --no-install-recommends --allow-downgrades \
      "openssl=${INITIAL_OPENSSL_VERSION}" "libssl3=${INITIAL_OPENSSL_VERSION}"
  fi
fi

echo "gateway ready: $(dpkg-query -W -f='${Package} ${Version}  ' openssl libssl3)"

trap 'exit 0' TERM INT
while :; do
  sleep 3600 &
  wait $!
done
