package com.project.harnessagent.dto.auth;

import com.project.harnessagent.dto.user.UserResponse;

public record SessionResponse(
        String userId,
        String sessionId,
        UserResponse user) {
}
