package com.heavenlease.config;

import java.util.Arrays;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import com.heavenlease.security.JwtAuthenticationFilter;
import com.heavenlease.security.RateLimitFilter;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final RateLimitFilter rateLimitFilter;
    private final UserDetailsService userDetailsService;

    @Value("${spring.profiles.active:}")
    private String activeProfiles;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter, RateLimitFilter rateLimitFilter, UserDetailsService userDetailsService) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.rateLimitFilter = rateLimitFilter;
        this.userDetailsService = userDetailsService;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .authorizeHttpRequests(auth -> {
                    // Static assets + auth + public config are always public
                    auth.requestMatchers("/", "/index.html", "/favicon.ico",
                            "/*.html", "/*.css", "/*.js",
                            "/*.svg", "/*.ico", "/*.png", "/*.jpg", "/*.jpeg", "/*.webp",
                            "/*.txt", "/*.xml", "/*.json", "/*.map", "/*.woff", "/*.woff2").permitAll();
                    auth.requestMatchers("/uploads/**").permitAll();
                    // /api/auth/me must ALWAYS require a valid session — it returns the
                    // current user's data, so an anonymous request would 500 (user not
                    // found) and leave the UI stuck. A missing/invalid token -> 401.
                    auth.requestMatchers("/api/auth/me").authenticated();
                    auth.requestMatchers("/api/auth/**", "/api/public/config", "/api/health/**", "/api/stats/**").permitAll();
                    // WebSocket endpoint for real-time messaging
                    auth.requestMatchers("/ws/**", "/topic/**", "/app/**").permitAll();
                    // Swagger UI / API docs are only exposed in the dev profile
                    if (activeProfiles != null && activeProfiles.contains("dev")) {
                        auth.requestMatchers("/swagger-ui/**", "/v3/api-docs/**", "/swagger-ui.html").permitAll();
                    }
                    auth.requestMatchers(org.springframework.http.HttpMethod.GET, "/api/properties/**").permitAll();
                    auth.requestMatchers("/api/properties/**").authenticated();
                    auth.anyRequest().authenticated();
                })
                // Security headers to protect against common web attacks
                .headers(headers -> headers
                        .contentTypeOptions(org.springframework.security.config.Customizer.withDefaults())
                        .frameOptions(org.springframework.security.config.Customizer.withDefaults())
                        .contentSecurityPolicy(csp -> csp.policyDirectives(
                                "default-src 'self'; " +
                                        "script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://accounts.google.com https://www.google.com https://www.gstatic.com; " +
                                        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; " +
                                        "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com https://fonts.googleapis.com; " +
                                        "img-src 'self' data: https:; " +
                                        "connect-src 'self' https://api.razorpay.com https://www.google.com https://accounts.google.com https://www.gstatic.com https://oauth2.googleapis.com ws: wss:; " +
                                        "frame-src 'self' https://accounts.google.com https://www.google.com https://www.gstatic.com; " +
                                        "frame-ancestors 'self'; base-uri 'self'; object-src 'none'"))
                        .referrerPolicy(referrer -> referrer.policy(org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter.ReferrerPolicy.SAME_ORIGIN)))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(ex -> ex
                        // Missing/invalid/expired token -> 401 JSON so the frontend's
                        // session-expiry handler can auto-logout cleanly (previously this
                        // surfaced as a 403, which the UI treated as a generic error and
                        // left profile/dashboard pages stuck on blank placeholders).
                        .authenticationEntryPoint((request, response, authException) -> {
                            response.setStatus(401);
                            response.setContentType("application/json");
                            response.setCharacterEncoding("UTF-8");
                            response.getWriter().write("{\"error\":\"Unauthorized\",\"message\":\"Session expired. Please login again.\"}");
                        })
                        // Authenticated but not allowed -> 403 JSON (clear, never blank).
                        .accessDeniedHandler((request, response, accessDeniedException) -> {
                            response.setStatus(403);
                            response.setContentType("application/json");
                            response.setCharacterEncoding("UTF-8");
                            response.getWriter().write("{\"error\":\"Forbidden\"}");
                        }))
                .authenticationProvider(authenticationProvider())
                .addFilterBefore(rateLimitFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Value("${app.cors.allowed-origins:https://heavenlease.in,https://www.heavenlease.in}")
    private String allowedOrigins;

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(Arrays.asList(allowedOrigins.split(",")));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "Accept"));
        configuration.setExposedHeaders(List.of("Authorization"));
        configuration.setAllowCredentials(false);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}