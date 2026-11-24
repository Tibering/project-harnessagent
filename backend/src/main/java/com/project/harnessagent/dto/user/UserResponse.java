package com.project.harnessagent.dto.user;

import com.project.harnessagent.entity.user.InMemoryUser;
import java.time.Instant;
import java.util.Set;

public record UserResponse(
        String id,
        String username,
        String nickname,
        String tenantId,
        Set<String> roles,
        Instant createdAt,
        Instant updatedAt) {

    public static UserResponse from(InMemoryUser user) {
        return new UserResponse(
                user.getId(),
                user.getUsername(),
                user.getNickname(),
                user.getTenantId(),
                Set.copyOf(user.getRoles()),
                user.getCreatedAt(),
                user.getUpdatedAt());
    }
}
