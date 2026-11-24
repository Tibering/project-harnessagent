package com.project.harnessagent.config;

import com.project.harnessagent.common.CurrentUser;
import com.project.harnessagent.common.CurrentUserHolder;
import com.project.harnessagent.entity.user.InMemoryUser;
import com.project.harnessagent.exception.BizException;
import com.project.harnessagent.exception.ErrorCode;
import com.project.harnessagent.service.auth.ExperienceSessionService;
import com.project.harnessagent.service.user.InMemoryUserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Set;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * 把 {@code X-User-Id} + {@code X-Session-Id} 解析成 {@link CurrentUser}。
 *
 * <p>两个头都不带 = 匿名请求（体验期 CRUD 允许匿名）；只带一个、或会话对不上 = 401。
 * 认证接上后替换这里的解析逻辑即可，业务代码与前端契约都不用改。
 */
@Component
public class CurrentUserInterceptor implements HandlerInterceptor {

    public static final String USER_ID_HEADER = "X-User-Id";
    public static final String SESSION_ID_HEADER = "X-Session-Id";

    private final ExperienceSessionService sessions;
    private final InMemoryUserService users;

    public CurrentUserInterceptor(ExperienceSessionService sessions, InMemoryUserService users) {
        this.sessions = sessions;
        this.users = users;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        String userId = trimToNull(request.getHeader(USER_ID_HEADER));
        String sessionId = trimToNull(request.getHeader(SESSION_ID_HEADER));
        if (userId == null && sessionId == null) {
            return true;
        }
        if (userId == null || sessionId == null) {
            throw new BizException(ErrorCode.UNAUTHORIZED, "需要同时提供 " + USER_ID_HEADER + " 与 " + SESSION_ID_HEADER);
        }
        ExperienceSessionService.Session session = sessions.require(sessionId, userId);
        InMemoryUser user = users.find(userId).orElseThrow(() -> new BizException(ErrorCode.SESSION_INVALID));
        CurrentUserHolder.set(new CurrentUser(
                user.getId(),
                session.sessionId(),
                user.getUsername(),
                user.getNickname(),
                user.getTenantId(),
                Set.copyOf(user.getRoles())));
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        CurrentUserHolder.clear();
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
