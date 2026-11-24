package com.project.harnessagent.dto.user;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.Set;

public record UserUpdateRequest(
        @NotBlank
        @Size(max = 32, message = "长度不能超过 32")
        String nickname,

        @Pattern(regexp = "^[a-z0-9-]{1,32}$", message = "只能是小写字母、数字或短横线")
        String tenantId,

        Set<@NotBlank @Size(max = 32) String> roles) {
}
