FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn clean package -DskipTests -B

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENV JAVA_OPTS="-Xmx384m -Xms128m -XX:MaxMetaspaceSize=160m -XX:+UseSerialGC -XX:ReservedCodeCacheSize=48m"
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]