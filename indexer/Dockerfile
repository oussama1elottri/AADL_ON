FROM python:3.10-slim

WORKDIR /app

# Install system dependencies required for building PostgreSQL connector
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy indexer, backend, and built smart contract ABIs
COPY indexer/ /app/indexer/
COPY backend/ /app/backend/
COPY out/ /app/out/

# Execute indexer listener script
CMD ["python", "indexer/listener.py"]
