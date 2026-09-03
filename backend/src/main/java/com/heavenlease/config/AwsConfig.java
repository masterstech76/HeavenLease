package com.heavenlease.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.DynamoDbClientBuilder;

@Configuration
public class AwsConfig {

    @Value("${aws.region:ap-south-1}")
    private String region;

    @Value("${aws.access-key-id:}")
    private String accessKeyId;

    @Value("${aws.secret-access-key:}")
    private String secretAccessKey;

    @Bean
    public DynamoDbClient dynamoDbClient() {
        try {
            DynamoDbClientBuilder builder = DynamoDbClient.builder().region(Region.of(region));
            if (accessKeyId != null && !accessKeyId.isEmpty() && secretAccessKey != null && !secretAccessKey.isEmpty()) {
                builder.credentialsProvider(StaticCredentialsProvider.create(AwsBasicCredentials.create(accessKeyId, secretAccessKey)));
            } else {
                // Fall back to default provider chain; avoid startup failure when no keys are set yet.
                builder.credentialsProvider(DefaultCredentialsProvider.create());
            }
            return builder.build();
        } catch (Exception e) {
            // Without valid AWS credentials the app should still run (graceful degradation).
            // The bean returns a client that will fail per-call, and DynamoDBService catches those.
            DynamoDbClientBuilder builder = DynamoDbClient.builder().region(Region.of(region));
            builder.credentialsProvider(DefaultCredentialsProvider.create());
            return builder.build();
        }
    }
}