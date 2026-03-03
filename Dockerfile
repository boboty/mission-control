# Phase 1: builder
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY convex.json ./
COPY convex ./convex

# Install dependencies (including dev deps for types)
RUN npm ci --include=dev && npm install --save-dev @types/pg

# Copy source code
COPY . .

# Build-time public env (embedded into client bundle)
ARG NEXT_PUBLIC_APP_NAME
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

# Build Next.js app
RUN npm run build

# Phase 2: runner
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Runtime deps: CA certs for TLS (Supabase HTTPS/Postgres), wget for healthcheck
RUN apk add --no-cache ca-certificates wget && update-ca-certificates

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built artifacts
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/package*.json ./

USER nextjs

EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
