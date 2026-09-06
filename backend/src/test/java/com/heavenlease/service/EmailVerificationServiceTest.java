package com.heavenlease.service;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class EmailVerificationServiceTest {

    @Test
    void sandboxRecipientFailureNamesTheFix() {
        String aws = "Email address is not verified. The following identities failed the check "
                + "in region AP-SOUTH-1: user@gmail.com";
        String out = EmailVerificationService.buildSesFailureMessage("ap-south-1", aws);

        // Must keep the real AWS detail (the failing identity)...
        assertThat(out).contains("user@gmail.com");
        // ...must NOT wrongly blame the sender (the old buggy prefix)...
        assertThat(out).doesNotContain("the sender 'no-reply@heavenlease.in' is not verified");
        // ...and must point at sandbox mode + the real remedy.
        assertThat(out).contains("SANDBOX");
        assertThat(out).contains("production access");
        assertThat(out).contains("ap-south-1");
    }

    @Test
    void genuineSenderVerificationFailureStillGuidesToIdentities() {
        String aws = "Email address is not verified. The following identities failed the check "
                + "in region AP-SOUTH-1: no-reply@heavenlease.in";
        String out = EmailVerificationService.buildSesFailureMessage("ap-south-1", aws);

        assertThat(out).contains("no-reply@heavenlease.in");
        assertThat(out).contains("Identities");
    }

    @Test
    void unconvertedRawMessageIsKeptVerbatim() {
        String out = EmailVerificationService.buildSesFailureMessage("ap-south-1", "throttling limit exceeded");
        assertThat(out).isEqualTo("Failed to send email via SES: throttling limit exceeded");
    }

    @Test
    void nullAwsMessageDoesNotCrash() {
        String out = EmailVerificationService.buildSesFailureMessage("ap-south-1", null);
        assertThat(out).isEqualTo("Failed to send email via SES: ");
    }
}