FROM node
ARG PRIVATE_SSH_KEY
RUN mkdir -p "/root/.ssh" && \
  echo $PRIVATE_SSH_KEY >> /root/.ssh/id_rsa && \
  chmod 0600 /root/.ssh/id_rsa && \
  ssh-keyscan -H github.com >> /root/.ssh/known_hosts
WORKDIR /src
RUN mkdir -p /src /dist
ADD package.json /src/
RUN npm install
ADD . /src