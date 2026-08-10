# Setup

uv sync or pip install -r requirements.txt, then uvicorn app.main:app --reload --port 8000

# Health check

curl http://localhost:8000/health
