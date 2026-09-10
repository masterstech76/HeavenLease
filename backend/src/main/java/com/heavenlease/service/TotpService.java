package com.heavenlease.service;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.io.ByteArrayOutputStream;
import java.awt.image.BufferedImage;
import javax.imageio.ImageIO;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.MultiFormatWriter;
import com.google.zxing.common.BitMatrix;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class TotpService {
    private static final String BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    private final SecureRandom random = new SecureRandom();
    private final CryptoService cryptoService;
    private final String issuer;
    private final int digits;
    private final int period;

    public TotpService(CryptoService cryptoService,
                       @Value("${app.two-factor.issuer:HeavenLease}") String issuer,
                       @Value("${app.two-factor.totp-digits:6}") int digits,
                       @Value("${app.two-factor.totp-period:30}") int period) {
        this.cryptoService = cryptoService;
        this.issuer = issuer;
        this.digits = digits;
        this.period = period;
    }

    public String newSecret() {
        byte[] bytes = new byte[20];
        random.nextBytes(bytes);
        return base32Encode(bytes);
    }

    public String encrypt(String secret) { return cryptoService.encrypt(secret); }
    public String decrypt(String encrypted) { return cryptoService.decrypt(encrypted); }

    public boolean verify(String secret, String code) {
        if (secret == null || code == null || !code.matches("\\d{" + digits + "}")) return false;
        long current = Instant.now().getEpochSecond() / period;
        for (long offset = -1; offset <= 1; offset++) {
            if (constantTimeEquals(generate(secret, current + offset), code)) return true;
        }
        return false;
    }

    public String qrDataUrl(String email, String secret) {
        try {
            BitMatrix matrix = new MultiFormatWriter().encode(otpauthUri(email, secret), BarcodeFormat.QR_CODE, 280, 280, java.util.Map.of(EncodeHintType.MARGIN, 1));
            BufferedImage image = new BufferedImage(280, 280, BufferedImage.TYPE_INT_RGB);
            for (int x = 0; x < 280; x++) for (int y = 0; y < 280; y++) image.setRGB(x, y, matrix.get(x, y) ? 0x000000 : 0xFFFFFF);
            ByteArrayOutputStream out = new ByteArrayOutputStream(); ImageIO.write(image, "PNG", out);
            return "data:image/png;base64," + Base64.getEncoder().encodeToString(out.toByteArray());
        } catch (Exception e) { throw new IllegalStateException("Unable to generate authenticator QR code", e); }
    }

    public String otpauthUri(String email, String secret) {
        return "otpauth://totp/" + enc(issuer) + ":" + enc(email)
                + "?secret=" + secret + "&issuer=" + enc(issuer)
                + "&algorithm=SHA1&digits=" + digits + "&period=" + period;
    }

    private String generate(String secret, long counter) {
        try {
            byte[] key = base32Decode(secret);
            byte[] data = ByteBuffer.allocate(8).putLong(counter).array();
            Mac mac = Mac.getInstance("HmacSHA1");
            mac.init(new SecretKeySpec(key, "HmacSHA1"));
            byte[] hash = mac.doFinal(data);
            int offset = hash[hash.length - 1] & 0x0f;
            int binary = ((hash[offset] & 0x7f) << 24)
                    | ((hash[offset + 1] & 0xff) << 16)
                    | ((hash[offset + 2] & 0xff) << 8)
                    | (hash[offset + 3] & 0xff);
            int mod = digits == 8 ? 100_000_000 : 1_000_000;
            return String.format("%0" + digits + "d", binary % mod);
        } catch (Exception e) { throw new IllegalStateException("Unable to generate TOTP", e); }
    }

    private static boolean constantTimeEquals(String a, String b) {
        byte[] x = a.getBytes(StandardCharsets.UTF_8), y = b.getBytes(StandardCharsets.UTF_8);
        return java.security.MessageDigest.isEqual(x, y);
    }
    private static String enc(String s) { return java.net.URLEncoder.encode(s, StandardCharsets.UTF_8).replace("+", "%20"); }
    private static String base32Encode(byte[] data) {
        StringBuilder out = new StringBuilder(); int buffer = 0, bits = 0;
        for (byte b : data) { buffer = (buffer << 8) | (b & 255); bits += 8; while (bits >= 5) { bits -= 5; out.append(BASE32.charAt((buffer >> bits) & 31)); } }
        if (bits > 0) out.append(BASE32.charAt((buffer << (5 - bits)) & 31));
        return out.toString();
    }
    private static byte[] base32Decode(String input) {
        input = input.replace("=", "").replace(" ", "").toUpperCase();
        byte[] out = new byte[input.length() * 5 / 8]; int buffer = 0, bits = 0, index = 0;
        for (char c : input.toCharArray()) { int val = BASE32.indexOf(c); if (val < 0) throw new IllegalArgumentException("Invalid base32 secret"); buffer = (buffer << 5) | val; bits += 5; if (bits >= 8) { bits -= 8; out[index++] = (byte)((buffer >> bits) & 255); } }
        return out;
    }
}
