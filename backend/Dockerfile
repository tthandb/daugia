# Stage 1: Build
FROM golang:1.23-alpine AS builder

RUN apk add --no-cache gcc musl-dev vips-dev git

# Install sqlc
RUN go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest

WORKDIR /app
COPY go.mod ./
COPY go.sum* ./
COPY . .

# Generate type-safe DB code, then resolve deps, then build
RUN sqlc generate
RUN go mod tidy
RUN CGO_ENABLED=1 go build -o bin/api ./cmd/api/

# Stage 2: Runtime
FROM alpine:3.19

RUN apk add --no-cache \
    ca-certificates \
    curl \
    nodejs npm \
    poppler-utils \
    vips \
    && npm install -g mammoth \
    && npm cache clean --force \
    && curl -fsSL https://github.com/golang-migrate/migrate/releases/download/v4.17.1/migrate.linux-amd64.tar.gz \
       | tar -xz -C /usr/local/bin migrate \
    && chmod +x /usr/local/bin/migrate

WORKDIR /app
COPY --from=builder /app/bin/api .
COPY --from=builder /app/migrations ./migrations

EXPOSE 8080

CMD ["/app/api"]
