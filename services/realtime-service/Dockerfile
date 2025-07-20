FROM golang:1.23-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN go mod vendor
RUN go build -mod=vendor -o main ./src

FROM alpine:latest
RUN apk --no-cache add ca-certificates curl netcat-openbsd
WORKDIR /app/
COPY --from=builder /app/main .
EXPOSE 8084
CMD ["./main"]
