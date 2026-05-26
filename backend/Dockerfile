# ---------- Build stage ----------
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app
COPY .mvn .mvn
COPY mvnw pom.xml ./
# Normaliza CRLF -> LF en mvnw. Cuando se chequea el repo en Windows, git
# convierte los line endings y dentro del container Alpine el shebang queda
# roto ("#!/bin/sh\r"), provocando "./mvnw: not found".
RUN sed -i 's/\r$//' mvnw && chmod +x mvnw && ./mvnw dependency:go-offline -B
COPY src src
RUN ./mvnw -B clean package -DskipTests

# ---------- Runtime stage ----------
FROM eclipse-temurin:21-jre-alpine
RUN addgroup -S queueless && adduser -S queueless -G queueless
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
RUN chown -R queueless:queueless /app
USER queueless

EXPOSE 8080
ENV JAVA_OPTS=""
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget -q --spider http://localhost:8080/actuator/health || exit 1
