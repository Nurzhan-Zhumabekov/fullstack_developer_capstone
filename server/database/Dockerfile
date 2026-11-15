FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY app.js dealership.js review.js ./
COPY data/ data/
COPY test/ test/
USER 10001
EXPOSE 3030
ENTRYPOINT ["node"]
CMD ["app.js"]
