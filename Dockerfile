FROM node:10-alpine as Builder

RUN mkdir -p /tmp/site
ADD . /tmp/site
WORKDIR /tmp/site
RUN yarn
RUN yarn build

FROM nginx:1.15-alpine
COPY --from=Builder /tmp/site/dist /usr/share/nginx/html