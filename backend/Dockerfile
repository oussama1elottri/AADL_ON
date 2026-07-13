FROM python:3.10-slim

WORKDIR /app

# Install system dependencies required for building PostgreSQL connector
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Download and install ZoKrates release binary directly matching container architecture
RUN ARCH=$(uname -m) && \
    if [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then \
      URL="https://github.com/ZoKrates/ZoKrates/releases/download/v0.8.8/zokrates-v0.8.8-aarch64-unknown-linux-gnu.tar.gz"; \
    else \
      URL="https://github.com/ZoKrates/ZoKrates/releases/download/v0.8.8/zokrates-v0.8.8-x86_64-unknown-linux-gnu.tar.gz"; \
    fi && \
    curl -L "$URL" -o zokrates.tar.gz && \
    tar -xzf zokrates.tar.gz && \
    mv zokrates /usr/local/bin/ && \
    rm zokrates.tar.gz && \
    chmod +x /usr/local/bin/zokrates

# Copy backend requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend files and built smart contract ABIs
COPY backend/ /app/backend/
COPY out/ /app/out/

EXPOSE 8000

# Run API database migrations/startup on creation, then launch backend
CMD ["sh", "-c", "python -m backend.init_db && uvicorn backend.main:app --host 0.0.0.0 --port 8000"]
