ARG FRONTEND_BUILD_IMAGE=node:22-alpine
ARG FRONTEND_RUNTIME_IMAGE=nginx:1.26-alpine
FROM ${FRONTEND_BUILD_IMAGE} AS build

ARG NPM_REGISTRY=https://mirrors.cloud.tencent.com/npm/
ARG NPM_FETCH_RETRIES=10
ARG NPM_FETCH_RETRY_MINTIMEOUT=20000
ARG NPM_FETCH_RETRY_MAXTIMEOUT=120000
ARG NPM_FETCH_TIMEOUT=120000

WORKDIR /app

COPY package.json package-lock.json vite.config.js ./
COPY frontend ./frontend

ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN npm config set registry ${NPM_REGISTRY} \
	&& npm config set fetch-retries ${NPM_FETCH_RETRIES} \
	&& npm config set fetch-retry-mintimeout ${NPM_FETCH_RETRY_MINTIMEOUT} \
	&& npm config set fetch-retry-maxtimeout ${NPM_FETCH_RETRY_MAXTIMEOUT} \
	&& npm config set fetch-timeout ${NPM_FETCH_TIMEOUT} \
	&& npm ci \
		--prefer-offline \
		--no-audit \
		--no-fund \
	&& npm run build

FROM ${FRONTEND_RUNTIME_IMAGE}

COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html

EXPOSE 80
