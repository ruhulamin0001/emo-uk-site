# Asterisk 21 from the official source tarball, on Debian 12, with the modules this stack needs
# (chan_pjsip, app_audiosocket, res_audiosocket, func_uuid, app_mixmonitor). Two stages so the
# runtime image has no compiler. Config is NOT baked in: scripts/render_conf.py writes it to
# ./asterisk/etc on the VPS and docker-compose mounts it read only.
FROM debian:12-slim AS build
ARG ASTERISK_VERSION=21-current
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
      build-essential curl ca-certificates wget file pkg-config python3 \
      libjansson-dev libxml2-dev libsqlite3-dev uuid-dev libssl-dev libedit-dev \
      libsrtp2-dev libspeex-dev libspeexdsp-dev libgsm1-dev libcurl4-openssl-dev libopus-dev \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /usr/src
RUN curl -fsSL "https://downloads.asterisk.org/pub/telephony/asterisk/asterisk-${ASTERISK_VERSION}.tar.gz" | tar xz \
    && mv asterisk-* asterisk
WORKDIR /usr/src/asterisk
RUN ./configure --with-pjproject-bundled --with-jansson-bundled --disable-xmldoc \
    && make menuselect.makeopts \
    && menuselect/menuselect \
         --enable app_audiosocket --enable res_audiosocket --enable func_uuid --enable func_shell \
         --enable chan_pjsip --enable res_pjsip --enable app_mixmonitor --enable app_dial \
         --enable CORE-SOUNDS-EN-GSM --enable MOH-OPSOUND-GSM \
         --disable BUILD_NATIVE menuselect.makeopts \
    && make -j"$(nproc)" \
    && make install DESTDIR=/out \
    && make samples DESTDIR=/out >/dev/null \
    && rm -rf /out/etc/asterisk

FROM debian:12-slim
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
      libjansson4 libxml2 libsqlite3-0 libuuid1 libssl3 libedit2 libsrtp2-1 libspeex1 libspeexdsp1 \
      libgsm1 libcurl4 libopus0 ca-certificates tini \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd -r asterisk && useradd -r -g asterisk -d /var/lib/asterisk -s /usr/sbin/nologin asterisk
COPY --from=build /out/ /
RUN mkdir -p /etc/asterisk /var/lib/asterisk/db /var/spool/asterisk/monitor /var/log/asterisk /var/run/asterisk \
    && chown -R asterisk:asterisk /var/lib/asterisk /var/spool/asterisk /var/log/asterisk /var/run/asterisk \
    && ldconfig
EXPOSE 5060/udp 5038/tcp
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD asterisk -rx "core show uptime" >/dev/null 2>&1 || exit 1
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["asterisk", "-f", "-U", "asterisk", "-G", "asterisk", "-vvv"]
