.PHONY: build run test clean docker-build docker-run

# Build the application
build:
	go build -o bin/audio-service src/main.go

# Run the application
run:
	go run src/main.go

# Run tests
test:
	go test ./...

# Clean build artifacts
clean:
	rm -rf bin/

# Build Docker image
docker-build:
	docker build -t audio-service .

# Run Docker container
docker-run:
	docker run -p 8084:8084 audio-service

# Install dependencies
deps:
	go mod tidy
	go mod download
