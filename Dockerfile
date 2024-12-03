ARG NODE_VERSION=lts
# Make sure the platform is the same as the one defined in ECS service & cluster
FROM --platform=linux/amd64 node:${NODE_VERSION}-alpine 

ENV NODE_ENV production

# The main application directory
WORKDIR /usr/src

# Copy package.json and package-lock.json
COPY ./package*.json ./

# Install dependencies
RUN npm install

# Not in docker file --> In the command that uses docker-compose
USER node

# Copy the entire application directory into the container
#COPY . .
COPY --chown=node:node ./ /usr/src

# Expose port 8080
EXPOSE 8080

CMD node server.js