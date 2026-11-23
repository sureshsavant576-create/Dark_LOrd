FROM node:24-slim

ENV NODE_ENV=production \
    PORT=8080 \
    LABLINK_DB_PATH=/tmp/lablink.sqlite

WORKDIR /app
COPY --chown=node:node package.json ./
COPY --chown=node:node server ./server
COPY --chown=node:node public ./public
RUN mkdir -p /app/data && chown node:node /app/data

USER node
EXPOSE 8080
CMD ["node", "server/index.js"]
