######################
# Stage: Builder
FROM ruby:2.5-alpine as Builder
RUN apk add --update --no-cache \
    build-base

WORKDIR /app
ADD . /app
RUN bundle config --global frozen 1 \
 && bundle install -j4 --retry 3 \
 # Remove unneeded files (cached *.gem, *.o, *.c)
 && rm -rf /usr/local/bundle/cache/*.gem \
 && find /usr/local/bundle/gems/ -name "*.c" -delete \
 && find /usr/local/bundle/gems/ -name "*.o" -delete

FROM ruby:2.5-alpine

RUN addgroup -g 1000 -S app \
 && adduser -u 1000 -S app -G app
USER app

# Copy app with gems from former build stage
COPY --from=Builder /usr/local/bundle/ /usr/local/bundle/
COPY --from=Builder --chown=app:app /app /app

WORKDIR /app

ENV APP_ENV production
CMD ["ruby", "proxy.rb"]