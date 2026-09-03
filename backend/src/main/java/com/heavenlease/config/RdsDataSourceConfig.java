package com.heavenlease.config;

import javax.sql.DataSource;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import com.heavenlease.service.RdsIamAuthService;
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;

/**
 * Configures a HikariCP DataSource that authenticates to AWS RDS PostgreSQL
 * with an IAM token instead of a static password.
 *
 * Enabled only when app.rds-iam-enabled=true (set in the prod profile). For
 * local H2/dev or Docker-Postgres setups the property is false and Spring
 * Boot's normal auto-configuration is used instead — nothing changes there.
 */
@Configuration
@ConditionalOnProperty(name = "app.rds-iam-enabled", havingValue = "true")
public class RdsDataSourceConfig {

    @Bean
    @Primary
    public DataSource dataSource(RdsIamAuthService authService,
                                 @Value("${spring.datasource.url}") String url,
                                 @Value("${spring.datasource.username:postgres}") String username) {
        HikariConfig cfg = new HikariConfig();
        cfg.setJdbcUrl(url);
        cfg.setUsername(username);
        cfg.setMaximumPoolSize(10);
        cfg.setMinimumIdle(1);
        cfg.setConnectionTimeout(30_000);
        // AWS RDS IAM tokens are valid for ~15 minutes. Keep connections
        // shorter than that so a new token is fetched before expiry.
        cfg.setMaxLifetime(840_000); // 14 minutes
        cfg.setPoolName("HeavenLease-RDS-IAM");
        return new IamAuthHikariDataSource(cfg, authService, username);
    }

    /**
     * HikariDataSource wrapper that sets a fresh IAM token as the connection
     * password before each new connection is created. Existing pooled
     * connections stay valid within the 15-minute token window.
     */
    static class IamAuthHikariDataSource extends HikariDataSource {

        private final RdsIamAuthService authService;
        private final String user;
        private final String host;
        private final int port;

        IamAuthHikariDataSource(HikariConfig config, RdsIamAuthService authService, String user) {
            super(config);
            this.authService = authService;
            this.user = user;
            String jdbcUrl = config.getJdbcUrl();
            String[] hostPort = jdbcUrl.replace("jdbc:postgresql://", "").split("/")[0].split(":");
            this.host = hostPort[0];
            this.port = hostPort.length > 1 ? Integer.parseInt(hostPort[1].split("\\?")[0]) : 5432;
        }

        @Override
        public java.sql.Connection getConnection() throws java.sql.SQLException {
            try {
                setPassword(authService.generateToken(host, port, user));
            } catch (Exception e) {
                throw new java.sql.SQLException("Failed to generate RDS IAM token", e);
            }
            return super.getConnection();
        }

        @Override
        public java.sql.Connection getConnection(String ignoredUser, String ignoredPassword)
                throws java.sql.SQLException {
            return getConnection();
        }
    }
}