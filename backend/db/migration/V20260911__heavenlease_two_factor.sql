-- HeavenLease native 2FA storage. Email OTP delivery is through the site's own SMTP mailbox.
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_email_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_totp_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret_encrypted VARCHAR(1000);

CREATE TABLE IF NOT EXISTS two_factor_challenges (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    email VARCHAR(120) NOT NULL,
    code_hash VARCHAR(128) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_2fa_challenge_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_2fa_challenge_user ON two_factor_challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_2fa_challenge_expires ON two_factor_challenges(expires_at);
