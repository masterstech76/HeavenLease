package com.heavenlease.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doReturn;

import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.SpyBean;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;

/**
 * Full-stack end-to-end test of the /edit-profile page flow against the real
 * Spring context (test profile, in-memory H2, no reCAPTCHA).
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@SuppressWarnings({"null", "unused"})
class EditProfileE2ETest {

    @LocalServerPort
    private int port;

    @SpyBean
    private com.heavenlease.service.EmailVerificationService emailVerificationService;

    private static final ParameterizedTypeReference<Map<String, Object>> MAP_RESP =
            new ParameterizedTypeReference<Map<String, Object>>() {
            };

    private String base() {
        return "http://localhost:" + port;
    }

    @Test
    void fullEditProfileFlow_worksEndToEnd() {
        TestRestTemplate rest = new TestRestTemplate();

        // Signup with a verification code: the real OTP email path (AWS SES) is
        // not exercised in tests, so the OTP check is satisfied via the spy.
        doReturn(true).when(emailVerificationService).verifyCode(anyString(), anyString());

        // 1) Signup (no captcha in test profile, rate limit off) -> token
        String email = "e2e" + System.nanoTime() + "@local.test";
        HttpEntity<Map<String, Object>> signupEntity = new HttpEntity<>(Map.of(
                "fullName", "E2E Old Name",
                "email", email,
                "phone", "9898989898",
                "password", "E2eTestPass123",
                "role", "TENANT",
                "code", "000000"));
        ResponseEntity<Map<String, Object>> signup = rest.exchange(
                base() + "/api/auth/signup", HttpMethod.POST, signupEntity, MAP_RESP);
        assertThat(signup.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        String token = String.valueOf(signup.getBody().get("token"));
        Number userId = (Number) signup.getBody().get("id");

        HttpHeaders auth = new HttpHeaders();
        auth.setBearerAuth(token);
        auth.setContentType(MediaType.APPLICATION_JSON);

        // 2) GET /api/auth/me -> profile loads
        ResponseEntity<Map<String, Object>> me = rest.exchange(
                base() + "/api/auth/me", HttpMethod.GET, new HttpEntity<>(auth), MAP_RESP);
        assertThat(me.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(me.getBody().get("fullName")).isEqualTo("E2E Old Name");
        assertThat(me.getBody().get("id")).isEqualTo(userId);

        // 3) PUT /api/users/{id} -> save profile details (phone normalization + URL)
        HttpEntity<Map<String, Object>> updateEntity = new HttpEntity<>(Map.of(
                "fullName", "E2E New Name",
                "username", "e2euser" + String.valueOf(System.nanoTime()).substring(8),
                "bio", "Hello E2E",
                "website", "example.in",
                "gender", "other",
                "phone", "+91 98765 12345"), auth);
        ResponseEntity<Map<String, Object>> updated = rest.exchange(
                base() + "/api/users/" + userId, HttpMethod.PUT, updateEntity, MAP_RESP);
        assertThat(updated.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(updated.getBody().get("fullName")).isEqualTo("E2E New Name");
        assertThat(updated.getBody().get("phone")).isEqualTo("9876512345");
        assertThat(updated.getBody().get("website")).isEqualTo("https://example.in");
        assertThat(updated.getBody().get("gender")).isEqualTo("other");

        ResponseEntity<Map<String, Object>> meAfter = rest.exchange(
                base() + "/api/auth/me", HttpMethod.GET, new HttpEntity<>(auth), MAP_RESP);
        assertThat(meAfter.getBody().get("fullName")).isEqualTo("E2E New Name");
        assertThat(meAfter.getBody().get("username")).isEqualTo(updated.getBody().get("username"));

        // 4) PATCH /api/users/{id}/password -> change password with current password
        ResponseEntity<Map<String, Object>> pwd = rest.exchange(
                base() + "/api/users/" + userId + "/password", HttpMethod.PATCH,
                new HttpEntity<>(Map.of("password", "NewPass456", "currentPassword", "E2eTestPass123"), auth),
                MAP_RESP);
        assertThat(pwd.getStatusCode()).isEqualTo(HttpStatus.OK);

        // Old password must now fail, new one succeeds
        ResponseEntity<Map<String, Object>> loginOld = rest.exchange(
                base() + "/api/auth/login", HttpMethod.POST,
                new HttpEntity<>(Map.of("email", email, "password", "E2eTestPass123")), MAP_RESP);
        assertThat(loginOld.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        ResponseEntity<Map<String, Object>> loginNew = rest.exchange(
                base() + "/api/auth/login", HttpMethod.POST,
                new HttpEntity<>(Map.of("email", email, "password", "NewPass456")), MAP_RESP);
        assertThat(loginNew.getStatusCode()).isEqualTo(HttpStatus.OK);

        avatarUploadAndDelete(rest, auth, userId);
    }

    private void avatarUploadAndDelete(TestRestTemplate rest, HttpHeaders auth, Number userId) {
        String base = base();
        // POST /api/users/{id}/avatar -> upload profile photo
        HttpHeaders formHeaders = new HttpHeaders(auth);
        formHeaders.setContentType(MediaType.MULTIPART_FORM_DATA);
        byte[] png = { (byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0x0D,
                'I', 'H', 'D', 'R', 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0 };
        ByteArrayResource resource = new ByteArrayResource(png) {
            @Override
            public String getFilename() {
                return "avatar.png";
            }
        };
        MultiValueMap<String, Object> form = new LinkedMultiValueMap<>();
        form.add("file", resource);
        ResponseEntity<Map<String, Object>> avatar = rest.exchange(
                base + "/api/users/" + userId + "/avatar", HttpMethod.POST,
                new HttpEntity<>(form, formHeaders), MAP_RESP);
        if (!avatar.getStatusCode().is2xxSuccessful()) {
            System.out.println("AVATAR_UPLOAD_BODY=" + avatar.getBody());
        }
        assertThat(avatar.getStatusCode())
                .withFailMessage("avatar upload failed, body=" + avatar.getBody())
                .isEqualTo(HttpStatus.OK);
        String avatarUrl = String.valueOf(avatar.getBody().get("avatarUrl"));
        assertThat(avatarUrl).startsWith("/uploads/avatars/");

        // The uploaded avatar must be publicly fetchable via /uploads/**
        ResponseEntity<byte[]> avatarFetch = new TestRestTemplate().getForEntity(
                base + avatarUrl, byte[].class);
        assertThat(avatarFetch.getStatusCode()).isEqualTo(HttpStatus.OK);

        // DELETE /api/account (active session) -> permanent delete (full cleanup).
        // Mirror the real frontend (api.js deleteAccount sends no body / no
        // Content-Type) — only the Authorization header is transmitted.
        HttpHeaders deleteHeaders = new HttpHeaders();
        String bearer = auth.getFirst(HttpHeaders.AUTHORIZATION);
        if (bearer != null && bearer.startsWith("Bearer ")) {
            deleteHeaders.setBearerAuth(bearer.substring(7));
        }
        ResponseEntity<Map<String, Object>> deleted = rest.exchange(
                base + "/api/account", HttpMethod.DELETE, new HttpEntity<>(deleteHeaders), MAP_RESP);
        assertThat(deleted.getStatusCode())
                .withFailMessage("delete account failed, body=" + deleted.getBody())
                .isEqualTo(HttpStatus.OK);
    }

    @Test
    void deactivateAccount_blocksFurtherLogin() {
        TestRestTemplate rest = new TestRestTemplate();
        doReturn(true).when(emailVerificationService).verifyCode(anyString(), anyString());

        String email = "deact" + System.nanoTime() + "@local.test";
        HttpEntity<Map<String, Object>> signupEntity = new HttpEntity<>(Map.of(
                "fullName", "Deact User", "email", email, "phone", "9812345678",
                "password", "DeactPass123", "role", "TENANT", "code", "000000"));
        ResponseEntity<Map<String, Object>> signup = rest.exchange(
                base() + "/api/auth/signup", HttpMethod.POST, signupEntity, MAP_RESP);
        assertThat(signup.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        String token = String.valueOf(signup.getBody().get("token"));

        HttpHeaders auth = new HttpHeaders();
        auth.setBearerAuth(token);
        auth.setContentType(MediaType.APPLICATION_JSON);

        ResponseEntity<Map<String, Object>> deactivated = rest.exchange(
                base() + "/api/account/deactivate", HttpMethod.POST,
                new HttpEntity<>(Map.of(), auth), MAP_RESP);
        assertThat(deactivated.getStatusCode()).isEqualTo(HttpStatus.OK);

        // After deactivation, logging in must be rejected with a clear 403.
        ResponseEntity<Map<String, Object>> login = rest.exchange(
                base() + "/api/auth/login", HttpMethod.POST,
                new HttpEntity<>(Map.of("email", email, "password", "DeactPass123")), MAP_RESP);
        assertThat(login.getStatusCode())
                .withFailMessage("login after deactivate, body=" + login.getBody())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }
}