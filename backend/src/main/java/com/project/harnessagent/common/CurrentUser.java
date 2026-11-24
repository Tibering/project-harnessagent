package com.project.harnessagent.common;

import java.util.Set;

/**
 * 当前请求的身份。业务代码只依赖它，不关心身份是怎么来的。
 *
 * <p>体验期由 {@code X-User-Id} + {@code X-Session-Id} 解析而来；认证接上后换成解析真实凭证，
 * 这里的字段与方法不变。
 */
public record CurrentUser(
        String userId,
        String sessionId,
        String username,
        String nickname,
        String tenantId,
        Set<String> roles) {
}
