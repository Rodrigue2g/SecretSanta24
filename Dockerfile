ARG NODE_VERSION=lts
# Ensure apple silicon doesn't messup the build
FROM --platform=linux/amd64 node:${NODE_VERSION}-alpine 

ENV NODE_ENV production

WORKDIR /usr/src

# RUN mkdir -p /usr/src/artifacts && chown node:node /usr/src/artifacts
# having the .gitkeep in /artifacts pretty much does the same

# Copy package.json and package-lock.json
COPY ./package*.json ./

RUN npm install

# Not in docker file --> In the command that uses docker-compose
USER node

VOLUME ["/usr/src/artifacts"]

# Copy the entire application directory into the container
#COPY . .
COPY --chown=node:node ./ /usr/src

# Expose port 8080
EXPOSE 8080

CMD node server.js