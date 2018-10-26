FROM node:10-alpine

# add function watchdog
ADD https://github.com/openfaas/faas/releases/download/0.7.1/fwatchdog /usr/bin/fwatchdog
RUN chmod +x /usr/bin/fwatchdog \
    && sha256sum /usr/bin/fwatchdog | grep a67ce66ae0648a6148f00f3554f7de2b81c436a8f4f01141e498262951b40a09

WORKDIR /home/node
USER node:node
COPY --chown=node:node . .
ENV NPM_CONFIG_LOGLEVEL=info NODE_ENV=production
RUN yarn

# run function watchdog
ENV fprocess "node index.js"
ENTRYPOINT []
CMD ["/usr/bin/fwatchdog"]

# vi:syntax=Dockerfile filetype=Dockerfile