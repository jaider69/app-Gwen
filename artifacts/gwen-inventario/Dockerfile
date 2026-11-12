FROM python:3.11-slim

# Instalar dependencias del sistema necesarias para LightGBM (libgomp1)
RUN apt-get update && apt-get install -y \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /code

COPY requirements.txt /code/requirements.txt
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

COPY . /code

CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "7860"]