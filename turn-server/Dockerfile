FROM ubuntu:22.04

RUN apt-get update && apt-get install -y \
  coturn \
  && rm -rf /var/lib/apt/lists/*

COPY turnserver.conf /etc/turnserver.conf

EXPOSE 3478/tcp 3478/udp 5349/tcp 5349/udp
EXPOSE 49152-65535/udp

CMD ["turnserver", "-c", "/etc/turnserver.conf", "--no-cli", "--log-file=stdout"]
