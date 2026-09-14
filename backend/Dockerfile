FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY prisma ./prisma

# Run migrations against the real DATABASE_URL at container startup, not build time
# (build time has no DB access, so this must not happen in a RUN step).
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/server.js"]
