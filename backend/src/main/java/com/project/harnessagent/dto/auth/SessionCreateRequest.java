package com.project.harnessagent.dto.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * 体验期入场：只收用户名与昵称，不收密码。
 */
public record SessionCreateRequest(
        @NotBlank
        @Size(min = 3, max = 32, message = "长度需在 3-32 之间")
        String username,

        @NotBlank
        @Size(max = 32, message = "长度不能超过 32")
        String nickname) {
}
