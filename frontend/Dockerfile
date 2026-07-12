ARG FRONTEND_BUILD_IMAGE=node:20-alpine
FROM ${FRONTEND_BUILD_IMAGE} AS build

ARG NPM_REGISTRY=https://registry.npmmirror.com

WORKDIR /app

COPY package.json package-lock.json vite.config.js ./
COPY frontend ./frontend

ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN npm config set registry ${NPM_REGISTRY} \
	&& npm ci \
	&& npm run build

ARG FRONTEND_RUNTIME_IMAGE=nginx:1.26-alpine
FROM ${FRONTEND_RUNTIME_IMAGE}

COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html

EXPOSE 80
