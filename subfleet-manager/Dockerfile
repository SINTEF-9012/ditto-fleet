FROM gcr.io/projectsigstore/cosign:v1.9.0 AS cosign-bin
FROM node:16-alpine

ENV APP_HOME="/app"

# Create app directory
WORKDIR ${APP_HOME}

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
#COPY package*.json ${APP_HOME}/

# Bundle app source
COPY package.json ${APP_HOME}/
#COPY . ${APP_HOME}/
#COPY resources/ ${APP_HOME}/resources
COPY src/ ${APP_HOME}/src
COPY sample/ ${APP_HOME}/sample
COPY build/ ${APP_HOME}/build
COPY ext/download/ ${APP_HOME}/ext/download
COPY ext/pubkeys/ ${APP_HOME}/ext/pubkeys
COPY --from=cosign-bin /ko-app/cosign /usr/local/bin/cosign

RUN npm config set strict-ssl false
#RUN npm set registry http://host.docker.internal:4873
RUN npm install

#WORKDIR /opt/trudeplo
#COPY ./package*.json ./
#RUN npm install
#ENTRYPOINT [ "node", "./build/cli/cmd.js" ]
#ENTRYPOINT [ "node", "./build/api/main.js" ]

EXPOSE 5000
#CMD [ "node", "server.js" ]
CMD ["npm", "start", "dt", "start"]
