FROM node:20-bookworm-slim AS base
WORKDIR /app
ENV PRISMA_CONFIG_PATH=/app/prisma.config.ts

FROM base AS deps
RUN apt-get update \
  && apt-get install -y ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS builder
ENV NEXT_TELEMETRY_DISABLED=1
ENV PRISMA_CONFIG_PATH=/app/prisma.config.ts
ARG DATABASE_URL=file:./prisma/dev.db
ENV DATABASE_URL=${DATABASE_URL}
COPY prisma ./prisma
COPY tsconfig.json next.config.ts postcss.config.mjs eslint.config.mjs ./
COPY prisma.config.ts ./prisma.config.ts
COPY src ./src
COPY public ./public
RUN npx prisma generate
RUN npm run build
RUN npm prune --omit=dev

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PRISMA_CONFIG_PATH=/app/prisma.config.ts
RUN apt-get update \
  && apt-get install -y ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*
RUN mkdir -p /app/data
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
EXPOSE 3000
CMD ["npm", "run", "start"]
