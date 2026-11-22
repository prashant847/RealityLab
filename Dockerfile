# RealityLab AI as a service: the API and the built web app in one image.
#   docker build -t realitylab .  &&  docker run -p 8000:8000 -v realitylab-data:/data realitylab
FROM node:20-slim AS web
WORKDIR /web
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.11-slim
WORKDIR /srv
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/app ./app
COPY --from=web /web/dist ./frontend
# the database and the report-signing key live in /data: keep it on a volume, and back it up
ENV REALITYLAB_DB=sqlite:////data/realitylab.db \
    REALITYLAB_FRONTEND=/srv/frontend \
    REALITYLAB_CLAUDE=off \
    REALITYLAB_LLM=off
RUN mkdir -p /data && useradd -r -u 10001 app && chown app /data
USER app
VOLUME /data
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/api/health', timeout=4).status == 200 else 1)"
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
