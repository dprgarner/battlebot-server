FROM node:7

RUN mkdir /app && chown node:node /app

USER node
WORKDIR /app

ADD package.json /app
RUN npm install -q

ADD . /app

EXPOSE 3000
CMD ["node", "/app/src/index.js"]
