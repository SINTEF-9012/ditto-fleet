FROM node:16-alpine

ENV APP_HOME="/app"

# Create app directory
WORKDIR ${APP_HOME}

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
#COPY package*.json ${APP_HOME}/

COPY resources/ ${APP_HOME}/resources
COPY src/ ${APP_HOME}/src
COPY package.json ${APP_HOME}/

RUN npm config set strict-ssl false
#RUN npm set registry http://host.docker.internal:4873
RUN npm install
# If you are building your code for production
# RUN npm ci --only=production

# Bundle app source
#COPY . ${APP_HOME}/

EXPOSE 4000
#CMD [ "node", "server.js" ]
CMD ["npm", "start"]