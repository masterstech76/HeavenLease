package com.heavenlease.config;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Value("${app.static-path:}")
    private String staticPathOverride;

    @Value("${app.upload-dir:./uploads}")
    private String uploadDir;

    @Override
    public void addResourceHandlers(@NonNull ResourceHandlerRegistry registry) {
        // Serve uploaded property photos from the configured upload dir.
        String uploadLocation = uploadDir.replace("\\", "/");
        if (!uploadLocation.endsWith("/")) uploadLocation += "/";
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations("file:" + uploadLocation);

        // Prefer an explicit config (safe); otherwise relative to CWD/../static
        if (staticPathOverride != null && !staticPathOverride.isBlank()) {
            String override = staticPathOverride.replace("\\", "/");
            if (!override.endsWith("/")) override += "/";
            registry.addResourceHandler("/**")
                    .addResourceLocations("file:" + override, "classpath:/static/");
            return;
        }
        Path cwd = Paths.get("").toAbsolutePath();
        Path staticPath = cwd.resolve("static");
        if (!Files.isDirectory(staticPath)) {
            // Last-resort: fall back to <project>/static (one level up when CWD is backend/)
            Path parent = cwd.getParent();
            if (parent != null) {
                Path candidate = parent.resolve("static");
                if (Files.isDirectory(candidate)) staticPath = candidate;
            }
        }
        String staticLocation = "file:" + staticPath.toString().replace("\\", "/") + "/";
        registry.addResourceHandler("/**")
                .addResourceLocations(staticLocation, "classpath:/static/");
    }
}
