package com.project.harnessagent.service.auth;

import com.project.harnessagent.exception.BizException;
import com.project.harnessagent.exception.ErrorCode;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Service;

/**
 * 体验期会话：sessionId 绑定 userId，只存在内存里。
 *
 * <p>校验逻辑刻意做得"像真的"——会话必须存在且属于该 userId，否则拒绝。
 * 认证接上后，这层换成真实会话或 JWT 校验即可。
 */
@Service
public class ExperienceSessionService {

    public record Session(String sessionId, String userId, Instant createdAt, Instant lastSeenAt) {
    }

    private final Map<String, Session> sessions = new ConcurrentHashMap<>();

    public Session create(String userId) {
        Instant now = Instant.now();
        Session session = new Session(UUID.randomUUID().toString(), userId, now, now);
        sessions.put(session.sessionId(), session);
        return session;
    }

    /**
     * 校验会话确实属于该用户，并刷新最后活跃时间。
     */
    public Session require(String sessionId, String userId) {
        Session session = sessions.get(sessionId);
        if (session == null || !session.userId().equals(userId)) {
            throw new BizException(ErrorCode.SESSION_INVALID);
        }
        Session touched = new Session(session.sessionId(), session.userId(), session.createdAt(), Instant.now());
        sessions.put(sessionId, touched);
        return touched;
    }

    public void remove(String sessionId) {
        sessions.remove(sessionId);
    }

    public int size() {
        return sessions.size();
    }
}
