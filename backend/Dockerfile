FROM node:22-alpine

ENV APP_HOME="/app"

# Create app directory
WORKDIR ${APP_HOME}

# Install dependencies first (own layer, cached until the lockfile changes)
COPY package.json package-lock.json ${APP_HOME}/
RUN npm config set strict-ssl false
RUN npm ci --omit=dev

# Bundle app source
COPY resources/ ${APP_HOME}/resources
COPY src/ ${APP_HOME}/src

EXPOSE 4000
CMD ["node", "src/backend.js"]
