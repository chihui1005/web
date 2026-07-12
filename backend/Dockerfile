FROM python:3.12-slim

ARG PIP_INDEX_URL=https://mirrors.cloud.tencent.com/pypi/simple
ARG PIP_EXTRA_INDEX_URL=https://mirrors.aliyun.com/pypi/simple/
ARG PIP_TRUSTED_HOST=mirrors.cloud.tencent.com mirrors.aliyun.com
ARG PIP_DEFAULT_TIMEOUT=60

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY backend/requirements.txt ./requirements.txt

RUN pip install --no-cache-dir -r requirements.txt \
    --default-timeout ${PIP_DEFAULT_TIMEOUT} \
    -i ${PIP_INDEX_URL} \
    --extra-index-url ${PIP_EXTRA_INDEX_URL} \
    --trusted-host mirrors.cloud.tencent.com \
    --trusted-host mirrors.aliyun.com

COPY backend/app ./app

RUN mkdir -p /app/data

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
