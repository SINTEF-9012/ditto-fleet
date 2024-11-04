FROM gcr.io/projectsigstore/cosign:v1.9.0 as cosign-bin
FROM node:16-alpine

WORKDIR /opt/trudeplo
COPY ./package*.json ./
RUN npm install

COPY --from=cosign-bin /ko-app/cosign /usr/local/bin/cosign

COPY ./sample ./sample
COPY ./build ./build
COPY ./ext/download ./ext/download
COPY ./ext/pubkeys ./ext/pubkeys

#ENTRYPOINT [ "node", "./build/cli/cmd.js" ]
ENTRYPOINT [ "node", "./build/api/main.js" ]
