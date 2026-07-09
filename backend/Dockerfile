FROM python:3.10-slim

WORKDIR /app

# Install system dependencies required for building PostgreSQL connector
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend files and built smart contract ABIs
COPY backend/ /app/backend/
COPY out/ /app/out/

EXPOSE 8000

# Run API database migrations/startup on creation, then launch backend
CMD ["sh", "-c", "python -m backend.init_db && uvicorn backend.main:app --host 0.0.0.0 --port 8000"]
