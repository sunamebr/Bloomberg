FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=optional

COPY . .

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["npm", "run", "dev"]
