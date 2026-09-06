package com.heavenlease.security;

import java.util.Collections;
import java.util.List;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import com.heavenlease.model.User;
import com.heavenlease.repository.UserRepository;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    public CustomUserDetailsService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + email));

        List<GrantedAuthority> authorities = Collections.singletonList(
                new SimpleGrantedAuthority("ROLE_" + user.getRole().name())
        );

        // Do NOT throw DisabledException from here for deactivated accounts:
        // Spring's DaoAuthenticationProvider wraps exceptions thrown inside
        // loadUserByUsername into InternalAuthenticationServiceException, which
        // would surface as a generic 401. Encoding "disabled" via the flag makes
        // the provider raise a proper DisabledException -> AuthController returns
        // 403 with the clear "deactivated" message, and the JWT filter rejects
        // existing tokens for disabled accounts on the next request.
        return new CurrentUserDetails(
                user.getId(),
                user.getEmail(),
                user.getPasswordHash(),
                authorities,
                !user.isDeactivated()
        );
    }
}
