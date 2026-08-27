FROM python:3.11-slim

WORKDIR /app

# Upgrade pip and install build essentials
RUN pip install --no-cache-dir --upgrade pip setuptools wheel

# Install dependencies with timeout protection
COPY requirements.txt .
RUN pip install --default-timeout=120 -r requirements.txt

# Copy application source code and data
COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
