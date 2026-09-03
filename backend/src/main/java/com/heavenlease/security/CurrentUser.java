package com.heavenlease.security;

import java.util.Collection;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

/**
 * Static helper for reading the currently authenticated user's id and roles
 * from the Spring Security context. Safe to call anywhere; never throws.
 */
public final class CurrentUser {

    private CurrentUser() {
    }

    public static Authentication getAuthentication() {
        return SecurityContextHolder.getContext().getAuthentication();
    }

    /** Returns the authenticated user's id, or null when anonymous/unknown. */
    public static Long getId() {
        Authentication auth = getAuthentication();
        if (auth == null) return null;
        Object principal = auth.getPrincipal();
        if (principal instanceof CurrentUserDetails cud) {
            return cud.getId();
        }
        // Legacy principals (plain Spring User built in AuthController for
        // phone/OTP logins). Return null — callers must handle null gracefully.
        return null;
    }

    public static boolean isAuthenticated() {
        Authentication auth = getAuthentication();
        return auth != null && auth.isAuthenticated()
                && !"anonymousUser".equals(auth.getPrincipal());
    }

    public static boolean hasAnyRole(String... roles) {
        if (!isAuthenticated()) return false;
        Collection<? extends GrantedAuthority> authorities = getAuthentication().getAuthorities();
        for (GrantedAuthority authority : authorities) {
            String role = authority.getAuthority().replace("ROLE_", "");
            for (String wanted : roles) {
                if (role.equals(wanted)) return true;
            }
        }
        return false;
    }

    public static boolean isAdmin() {
        return hasAnyRole("ADMIN");
    }
}