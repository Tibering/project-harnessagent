package com.project.harnessagent.controller.auth;

import com.project.harnessagent.common.ApiResponse;
import com.project.harnessagent.common.CurrentUser;
import com.project.harnessagent.common.CurrentUserHolder;
import com.project.harnessagent.dto.auth.SessionCreateRequest;
import com.project.harnessagent.dto.auth.SessionResponse;
import com.project.harnessagent.dto.user.UserResponse;
import com.project.harnessagent.entity.user.InMemoryUser;
import com.project.harnessagent.service.auth.ExperienceSessionService;
import com.project.harnessagent.service.user.InMemoryUserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 体验期身份入口：首屏输用户名 + 昵称，拿到 userId 与 sessionId，之后每个请求带上这两个头。
 */
@Tag(name = "体验身份")
@RestController
@RequestMapping("/experience/session")
public class ExperienceSessionController {

    private final InMemoryUserService users;
    private final ExperienceSessionService sessions;

    public ExperienceSessionController(InMemoryUserService users, ExperienceSessionService sessions) {
        this.users = users;
        this.sessions = sessions;
    }

    @Operation(summary = "进入系统（同名复用同一用户，新开一个会话）")
    @PostMapping
    public ApiResponse<SessionResponse> enter(@Valid @RequestBody SessionCreateRequest request) {
        InMemoryUser user = users.findOrCreate(request.username().trim(), request.nickname().trim());
        ExperienceSessionService.Session session = sessions.create(user.getId());
        return ApiResponse.ok(new SessionResponse(user.getId(), session.sessionId(), UserResponse.from(user)));
    }

    @Operation(summary = "查看当前身份")
    @GetMapping
    public ApiResponse<SessionResponse> current() {
        CurrentUser current = CurrentUserHolder.require();
        InMemoryUser user = users.require(current.userId());
        return ApiResponse.ok(new SessionResponse(current.userId(), current.sessionId(), UserResponse.from(user)));
    }

    @Operation(summary = "退出（仅作废当前会话）")
    @DeleteMapping
    public ApiResponse<Void> leave() {
        CurrentUser current = CurrentUserHolder.require();
        sessions.remove(current.sessionId());
        return ApiResponse.ok();
    }
}
