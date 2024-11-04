FROM node:18-alpine

WORKDIR /opt/trust-agent
COPY package*.json ./
RUN npm install

COPY ./device_data ./device_data
COPY ./client ./client

CMD ["npm", "run", "high"]
