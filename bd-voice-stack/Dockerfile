# ai-bridge: answers AudioSocket calls from the freepbx container. Same three ideas as the
# other sites on this VPS: no secrets in the image, non root, healthcheck for Traefik/compose.
FROM python:3.11-slim AS base
WORKDIR /app
ENV PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1

COPY pyproject.toml ./
COPY bridge ./bridge
RUN pip install -q . && rm -rf /root/.cache

COPY prompts ./prompts
COPY sql ./sql

RUN useradd -r -u 1001 -s /usr/sbin/nologin bridge && chown -R bridge:bridge /app
USER bridge

ENV AI_BRIDGE_ENV=/app/.env.unused PROMPT_DIR=/app/prompts AUDIOSOCKET_HOST=0.0.0.0
EXPOSE 9092
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD python -c "import socket; socket.create_connection(('127.0.0.1', 9092), 3).close()"
CMD ["python", "-m", "bridge.main"]
