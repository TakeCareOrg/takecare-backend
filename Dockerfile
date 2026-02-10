FROM node:20-slim

WORKDIR /app

COPY package*.json tsconfig.json ./

RUN npm ci --ignore-scripts

COPY . .

RUN npm run build

RUN cp -r src/services/mail/templates dist/services/mail/ || true

RUN npm prune --omit=dev

EXPOSE 4000

CMD ["node", "-r", "module-alias/register", "dist/index.js"]
