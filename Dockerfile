FROM oven/bun:1.4.0-debian

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 python3-venv tesseract-ocr tesseract-ocr-eng tesseract-ocr-ind \
  && python3 -m venv /opt/ocr-venv \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

ENV PATH="/opt/ocr-venv/bin:${PATH}"
ENV NODE_ENV=production

COPY workers/ocr-python/requirements.txt /tmp/ocr-requirements.txt
RUN pip install --no-cache-dir -r /tmp/ocr-requirements.txt \
  && rm /tmp/ocr-requirements.txt

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

# next build inlines NEXT_PUBLIC_* into the client bundle. Railway forwards a
# service variable into the Docker build only when declared as an ARG here.
ARG NEXT_PUBLIC_BETTER_AUTH_URL
ENV NEXT_PUBLIC_BETTER_AUTH_URL=${NEXT_PUBLIC_BETTER_AUTH_URL}

RUN bun run build

EXPOSE 3000
CMD ["bun", "run", "start"]