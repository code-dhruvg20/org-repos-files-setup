FROM node:10-jessie

LABEL "maintainer"="GitHub Professional Services <services@github.com>"
LABEL "homepage"="https://services.github.com"
LABEL "version"="1.0.2"

COPY ./ /get-repos-in-org-and-size/
WORKDIR /get-repos-in-org-and-size

RUN npm install

CMD ["npm", "start"]
