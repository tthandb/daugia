# Stage 1: Build
FROM golang:1.26.6-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
# sqlc output is committed; the build must not regenerate or re-resolve anything.
RUN CGO_ENABLED=0 go build -mod=readonly -trimpath -ldflags="-s -w" -o bin/api ./cmd/api/

# Stage 2: Runtime
FROM alpine:3.22

ARG MAMMOTH_VERSION=1.12.3
ARG MIGRATE_VERSION=v4.20.1
ARG MIGRATE_SHA256=b1e13121d4178b7804a9fb29dca62d57b732390f7e5ae33f2cd65e9b192e1bd4

RUN apk add --no-cache \
    ca-certificates \
    curl \
    nodejs npm \
    poppler-utils \
    vips-tools \
    && npm install -g "mammoth@${MAMMOTH_VERSION}" \
    && npm cache clean --force \
    && apk del npm \
    && curl -fsSL -o /tmp/migrate.tgz \
       "https://github.com/golang-migrate/migrate/releases/download/${MIGRATE_VERSION}/migrate.linux-amd64.tar.gz" \
    && echo "${MIGRATE_SHA256}  /tmp/migrate.tgz" | sha256sum -c - \
    && tar -xz -C /usr/local/bin -f /tmp/migrate.tgz migrate \
    && rm /tmp/migrate.tgz \
    && adduser -D -H -u 10001 app

WORKDIR /app
COPY --from=builder /app/bin/api .
COPY --from=builder /app/migrations ./migrations

USER app
EXPOSE 8080

CMD ["/app/api"]
