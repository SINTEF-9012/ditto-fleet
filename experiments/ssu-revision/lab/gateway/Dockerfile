# Emulated RPM gateway: a plain Debian 12 system whose only package source is the
# signed lab repository, so apt behaves deterministically and offline.
FROM docker.io/debian:bookworm-slim

# Undo the container-image tweaks of the slim image (excluded documentation, unsafe dpkg I/O,
# apt cache cleaning), so that dpkg --verify and apt timings match a regular Debian installation.
RUN rm -f /etc/apt/sources.list.d/debian.sources /etc/apt/sources.list \
      /etc/dpkg/dpkg.cfg.d/docker* /etc/apt/apt.conf.d/docker-*

COPY lab.list /etc/apt/sources.list.d/lab.list
COPY entrypoint.sh /entrypoint.sh
RUN sed -i 's/\r$//' /etc/apt/sources.list.d/lab.list /entrypoint.sh

ENTRYPOINT ["/bin/sh", "/entrypoint.sh"]
