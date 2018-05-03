# NodeJS Docker File
# https://nodejs.org/en/docs/guides/nodejs-docker-webapp/

# Use Node LTS (Carbon is 8.X)
FROM node:carbon

# Create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Install app dependencies
# Wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./
RUN yarn

# Bundle app source
COPY . ./
