ARG BACKEND_BASE_IMAGE=python:3.12-slim
FROM ${BACKEND_BASE_IMAGE}

ARG PIP_INDEX_URL=https://mirrors.cloud.tencent.com/pypi/simple
ARG PIP_DEFAULT_TIMEOUT=120
ARG PIP_RETRIES=10

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY backend/requirements.txt ./requirements.txt
COPY backend/wheels ./wheels

RUN if find /app/wheels -type f \( -name '*.whl' -o -name '*.tar.gz' -o -name '*.zip' \) | grep -q .; then \
        pip install --no-cache-dir --no-index --find-links=/app/wheels -r requirements.txt; \
    else \
        pip install --no-cache-dir -r requirements.txt \
            --default-timeout ${PIP_DEFAULT_TIMEOUT} \
            --retries ${PIP_RETRIES} \
            -i ${PIP_INDEX_URL} \
            --trusted-host mirrors.cloud.tencent.com; \
    fi

COPY backend/app ./app

RUN mkdir -p /app/data

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
