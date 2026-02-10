# ---- Build stage ----
FROM node:20-slim AS builder
WORKDIR /app
ENV HUSKY=0
COPY package*.json tsconfig.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN cp -r src/services/mail/templates dist/services/mail/ || true

# ---- Production stage ----
FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/data ./dist/data
EXPOSE 4000
CMD ["node", "-r", "module-alias/register", "dist/index.js"]