FROM node:20-alpine

WORKDIR /app

COPY docker/frontend/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN sed -i 's/\r$//' /usr/local/bin/entrypoint.sh && chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 4200

ENTRYPOINT ["entrypoint.sh"]
CMD ["npm", "start", "--", "--host", "0.0.0.0", "--poll", "2000"]
