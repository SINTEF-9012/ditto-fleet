FROM gcr.io/projectsigstore/cosign:v1.9.0 as cosign-bin
FROM node:16-alpine

# Create app directory
WORKDIR ${APP_HOME}

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ${APP_HOME}/

RUN npm config set strict-ssl false
#RUN npm set registry http://host.docker.internal:4873
RUN npm install

# Bundle app source
COPY . ${APP_HOME}/

#WORKDIR /opt/trudeplo
#COPY ./package*.json ./
#RUN npm install

COPY --from=cosign-bin /ko-app/cosign /usr/local/bin/cosign

COPY ./sample ./sample
COPY ./build ./build
COPY ./ext/download ./ext/download
COPY ./ext/pubkeys ./ext/pubkeys

#ENTRYPOINT [ "node", "./build/cli/cmd.js" ]
#ENTRYPOINT [ "node", "./build/api/main.js" ]
EXPOSE 5000
#CMD [ "node", "server.js" ]
CMD npm start dt start
