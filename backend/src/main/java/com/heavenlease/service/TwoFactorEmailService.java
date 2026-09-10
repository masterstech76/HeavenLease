package com.heavenlease.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.HexFormat;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import com.heavenlease.model.TwoFactorChallenge;
import com.heavenlease.model.User;
import com.heavenlease.repository.TwoFactorChallengeRepository;

@Service
public class TwoFactorEmailService {
    private final JavaMailSender mailSender;
    private final TwoFactorChallengeRepository repo;
    private final SecureRandom random = new SecureRandom();
    private final int expirySeconds;
    private final int maxAttempts;
    private final int resendSeconds;
    private final String fromEmail;

    public TwoFactorEmailService(JavaMailSender mailSender, TwoFactorChallengeRepository repo,
            @Value("${app.two-factor.email-otp-expiry-seconds:300}") int expirySeconds,
            @Value("${app.two-factor.max-attempts:5}") int maxAttempts,
            @Value("${app.two-factor.resend-seconds:30}") int resendSeconds,
            @Value("${app.otp.from-email:no-reply@heavenlease.in}") String fromEmail) {
        this.mailSender = mailSender; this.repo = repo; this.expirySeconds = expirySeconds;
        this.maxAttempts = maxAttempts; this.resendSeconds = resendSeconds; this.fromEmail = fromEmail;
    }

    public void send(User user) {
        var previous = repo.findTopByUserIdAndUsedFalseOrderByCreatedAtDesc(user.getId());
        if (previous.isPresent() && previous.get().getCreatedAt().plusSeconds(resendSeconds).isAfter(LocalDateTime.now())) {
            throw new IllegalStateException("Please wait before requesting another code.");
        }
        previous.ifPresent(c -> { c.setUsed(true); repo.save(c); });
        String code = String.format("%06d", random.nextInt(1_000_000));
        TwoFactorChallenge c = new TwoFactorChallenge();
        c.setUserId(user.getId()); c.setEmail(user.getEmail()); c.setCodeHash(hash(code));
        c.setCreatedAt(LocalDateTime.now()); c.setExpiresAt(LocalDateTime.now().plusSeconds(expirySeconds));
        c.setAttempts(0); c.setUsed(false); repo.save(c);
        SimpleMailMessage msg = new SimpleMailMessage();
        msg.setFrom(fromEmail); msg.setTo(user.getEmail()); msg.setSubject("Your HeavenLease security code");
        msg.setText("Your HeavenLease verification code is " + code + "\n\nThis code expires in 5 minutes. If you did not try to sign in, secure your account immediately.");
        mailSender.send(msg);
    }

    public boolean verify(User user, String code) {
        if (code == null || !code.matches("\\d{6}")) return false;
        var opt = repo.findTopByUserIdAndUsedFalseOrderByCreatedAtDesc(user.getId());
        if (opt.isEmpty()) return false;
        TwoFactorChallenge c = opt.get();
        if (c.getExpiresAt().isBefore(LocalDateTime.now()) || c.getAttempts() >= maxAttempts) { c.setUsed(true); repo.save(c); return false; }
        c.setAttempts(c.getAttempts() + 1);
        boolean ok = MessageDigest.isEqual(hash(code).getBytes(StandardCharsets.UTF_8), c.getCodeHash().getBytes(StandardCharsets.UTF_8));
        if (ok) c.setUsed(true);
        repo.save(c);
        return ok;
    }

    private static String hash(String code) {
        try { return hex(MessageDigest.getInstance("SHA-256").digest(code.getBytes(StandardCharsets.UTF_8))); }
        catch (Exception e) { throw new IllegalStateException("Unable to hash OTP", e); }
    }
    private static String hex(byte[] b) { return HexFormat.of().formatHex(b); }
}
