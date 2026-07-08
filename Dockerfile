# Use a slim Python 3.12 image
FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Install system dependencies (gcc is useful for compiling python packages if pre-built wheels are unavailable)
RUN apt-get update && apt-get install -y gcc

# Copy the requirements file (it is located inside the app/ folder)
COPY app/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the entire source code into /app
COPY . .

# Ensure the unified start script is executable
RUN chmod +x start.sh

# Run the unified startup script
CMD ["bash", "start.sh"]
