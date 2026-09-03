package com.heavenlease.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.AwsCredentialsProvider;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.rds.RdsUtilities;
import software.amazon.awssdk.services.rds.model.GenerateAuthenticationTokenRequest;

/**
 * Generates a short-lived IAM authentication token for AWS RDS PostgreSQL
 * (the same mechanism the `aws rds generate-db-auth-token` CLI uses). This
 * lets a Spring app connect to an RDS cluster configured for IAM database
 * authentication WITHOUT needing a static database password.
 *
 * A new token is minted on each call and is valid for ~15 minutes; HikariCP
 * refreshes the connection password automatically via the DataSource.
 */
@Service
public class RdsIamAuthService {

    private static final Logger log = LoggerFactory.getLogger(RdsIamAuthService.class);

    private final String region;
    private final AwsCredentialsProvider credentialsProvider;

    public RdsIamAuthService(@Value("${app.rds-iam-region:${aws.region:ap-south-1}}") String region,
                             @Value("${aws.access-key-id:}") String accessKeyId,
                             @Value("${aws.secret-access-key:}") String secretAccessKey) {
        this.region = region;
        if (accessKeyId != null && !accessKeyId.isBlank()
                && secretAccessKey != null && !secretAccessKey.isBlank()) {
            this.credentialsProvider = StaticCredentialsProvider.create(
                    AwsBasicCredentials.create(accessKeyId, secretAccessKey));
        } else {
            // Falls back to the EC2 instance role / environment credentials.
            this.credentialsProvider = DefaultCredentialsProvider.create();
        }
    }

    /**
     * Returns a freshly-generated IAM auth token for the given host/port/user.
     */
    public String generateToken(String host, int port, String user) {
        try {
            RdsUtilities rds = RdsUtilities.builder()
                    .region(Region.of(region))
                    .credentialsProvider(credentialsProvider)
                    .build();
            GenerateAuthenticationTokenRequest req = GenerateAuthenticationTokenRequest.builder()
                    .hostname(host)
                    .port(port)
                    .username(user)
                    .build();
            String token = rds.generateAuthenticationToken(req);
            log.debug("Generated RDS IAM auth token for {}", host);
            return token;
        } catch (Exception e) {
            log.error("Failed to generate RDS IAM auth token for {}", host, e);
            throw new IllegalStateException("RDS IAM auth token generation failed: " + e.getMessage(), e);
        }
    }
}