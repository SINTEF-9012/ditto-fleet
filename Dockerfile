FROM node:16-alpine

ENV APP_HOME="/app"

# Create app directory
WORKDIR ${APP_HOME}

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
#COPY package*.json ${APP_HOME}/

COPY public/ ${APP_HOME}/public
COPY src/ ${APP_HOME}/src
COPY package.json ${APP_HOME}/
COPY .env ${APP_HOME}/

RUN npm config set strict-ssl false
#RUN npm set registry http://host.docker.internal:4873
RUN npm install
# If you are building your code for production
# RUN npm ci --only=production

# Bundle app source
#COPY . ${APP_HOME}/

# Expose the port
EXPOSE 3000
# Run the app
CMD ["npm", "start"]