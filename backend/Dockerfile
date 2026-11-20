FROM node:22-slim AS base

WORKDIR /app

FROM base AS dependencies

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --ignore-scripts --non-interactive

FROM dependencies AS builder

COPY . .
RUN yarn build

FROM base AS production-dependencies

ENV NODE_ENV=production

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --ignore-scripts --production=true --non-interactive \
  && yarn cache clean

FROM base AS runner

ENV NODE_ENV=production \
  PORT=3000

COPY --from=production-dependencies --chown=root:root /app/node_modules ./node_modules
COPY --from=builder --chown=root:root /app/dist ./dist
COPY --chown=root:root package.json ./package.json

# UID 1001 preserves ownership compatibility with volumes created by previous
# releases. Group 0 write access also supports OpenShift's arbitrary runtime UID.
RUN useradd --uid 1001 --gid 0 --no-create-home --home-dir /nonexistent --shell /usr/sbin/nologin app \
  && mkdir -p /app/data/logs /app/data/sessions \
  && chown -R 1001:0 /app/data \
  && chmod -R g=u /app/data

USER 1001:0

EXPOSE 3000

CMD ["node", "./dist/server.js"]
