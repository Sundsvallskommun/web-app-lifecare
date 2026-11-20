# Dockerfile for the frontend service
FROM node:22-slim AS dependencies

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --ignore-scripts --non-interactive

FROM node:22-slim AS builder

WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

# Next.js embeds public values at build time, so building against real values
# would lock the image to a single environment. Build against the placeholders
# in .env-cicd instead and let entrypoint.sh substitute the real values at startup.
COPY .env-cicd .env

ENV NEXT_TELEMETRY_DISABLED=1

RUN yarn build

FROM node:22-slim AS runner

WORKDIR /app

ENV NODE_ENV=production \
  HOSTNAME=0.0.0.0 \
  NEXT_TELEMETRY_DISABLED=1 \
  PORT=3000

COPY --from=builder --chown=root:root /app/public ./public
COPY --from=builder --chown=root:root /app/.next/standalone ./
COPY --from=builder --chown=root:root /app/.next/static ./.next/static

# Next's output tracing can omit Sharp's dynamically loaded native libvips
# payload. Copy the packages selected for the build platform in full so image
# optimization works on every supported architecture at runtime.
COPY --from=dependencies --chown=root:root /app/node_modules/sharp ./node_modules/sharp
COPY --from=dependencies --chown=root:root /app/node_modules/@img ./node_modules/@img

COPY --chown=root:root entrypoint.sh ./
# Normalise line endings so the script still runs when checked out on Windows.
RUN sed -i 's/\r$//' entrypoint.sh && chmod 0555 entrypoint.sh

# UID 1001 stays compatible with earlier images; group 0 write access supports
# OpenShift's arbitrary runtime UID. entrypoint.sh rewrites the build output in
# place, so .next and server.js are group-writable — the directories too, since
# sed -i creates its temp file alongside the target. Nothing else is writable.
RUN useradd --uid 1001 --gid 0 --no-create-home --home-dir /nonexistent --shell /usr/sbin/nologin app \
  && mkdir -p /app/.next/cache \
  && chown -R 1001:0 /app/.next /app/server.js \
  && chmod -R g+w /app/.next \
  && chmod g+w /app/server.js

USER 1001:0

EXPOSE 3000

ENTRYPOINT ["/app/entrypoint.sh"]
