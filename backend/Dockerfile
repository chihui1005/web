FROM python:3.12-slim

ARG PIP_INDEX_URL=https://pypi.tuna.tsinghua.edu.cn/simple
ARG PIP_TRUSTED_HOST=pypi.tuna.tsinghua.edu.cn

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY backend/requirements.txt ./requirements.txt

RUN pip install --no-cache-dir --upgrade pip \
        -i ${PIP_INDEX_URL} \
        --trusted-host ${PIP_TRUSTED_HOST} \
    && pip install --no-cache-dir -r requirements.txt \
        -i ${PIP_INDEX_URL} \
        --trusted-host ${PIP_TRUSTED_HOST}

COPY backend/app ./app

RUN mkdir -p /app/data

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
