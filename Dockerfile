# stage 1: bundle every project's HTML (and the JS/CSS it references) into static files
FROM oven/bun:1 AS build
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun build ./index.html ./*/*.html --outdir dist

# stage 2: serve the static output on one port
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
