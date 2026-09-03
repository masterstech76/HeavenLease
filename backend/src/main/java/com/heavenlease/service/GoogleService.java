package com.heavenlease.service;

import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

@Service
public class GoogleService {

    private static final String TOKEN_INFO_URL = "https://oauth2.googleapis.com/tokeninfo";

    @Value("${app.google.client-id}")
    private String clientId;

    private final RestTemplate restTemplate;

    public GoogleService() {
        this.restTemplate = new RestTemplate();
    }

    public Map<String, Object> getUserInfo(String idToken) {
        String url = TOKEN_INFO_URL + "?id_token=" + idToken;
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.getForObject(url, Map.class);
            if (response == null || response.get("sub") == null) {
                throw new RuntimeException("Invalid Google token");
            }
            // If a client ID is explicitly configured, verify the token audience.
            // Without a configured client ID, the audience cannot be verified, so the
            // caller must have added their Google key in Admin → Integrations.
            String aud = response.get("aud") != null ? String.valueOf(response.get("aud")) : "";
            if (clientId != null && !clientId.isBlank() && !clientId.equals(aud)) {
                throw new RuntimeException("Google token was not issued for this application");
            }
            Object emailVerified = response.get("email_verified");
            if (emailVerified != null && !Boolean.parseBoolean(String.valueOf(emailVerified))) {
                throw new RuntimeException("Google email is not verified");
            }
            return response;
        } catch (RestClientException e) {
            throw new RuntimeException("Google authentication failed", e);
        }
    }
}
