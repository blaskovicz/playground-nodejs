default: build
.PHONY: docker build

build:
	yarn
docker: Dockerfile
	docker build -t func_playground_node .
