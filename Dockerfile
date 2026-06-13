FROM node:20-alpine AS builder
WORKDIR /app

ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3002

COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

COPY --from=builder /app/dist ./dist

EXPOSE 3002

CMD ["node", "dist/server.cjs"]
