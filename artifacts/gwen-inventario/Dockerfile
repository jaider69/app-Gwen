FROM python:3.11-slim

WORKDIR /code

COPY requirements.txt /code/requirements.txt
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

COPY . /code

# Hugging Face Spaces requiere obligatoriamente el puerto 7860
CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "7860"]