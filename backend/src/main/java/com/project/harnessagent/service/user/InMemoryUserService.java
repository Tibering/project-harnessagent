package com.project.harnessagent.service.user;

import com.project.harnessagent.dto.user.UserCreateRequest;
import com.project.harnessagent.dto.user.UserUpdateRequest;
import com.project.harnessagent.entity.user.InMemoryUser;
import com.project.harnessagent.exception.BizException;
import com.project.harnessagent.exception.ErrorCode;
import java.time.Instant;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Service;

/**
 * 体验期用户存储：进程内存，重启即失。
 *
 * <p>username 是身份键：首屏同名再次进入会复用同一个用户（无密码，等于"认领"）。
 * 这条约定记在 ADR 0004 里，认证接上后必须由真实登录替代。
 */
@Service
public class InMemoryUserService {

    public static final String DEFAULT_TENANT = "default";
    public static final String DEFAULT_ROLE = "USER";

    private final Map<String, InMemoryUser> byId = new ConcurrentHashMap<>();
    private final Map<String, String> idByUsername = new ConcurrentHashMap<>();

    public synchronized InMemoryUser findOrCreate(String username, String nickname) {
        String existingId = idByUsername.get(username);
        if (existingId != null) {
            InMemoryUser existing = byId.get(existingId);
            if (existing != null) {
                if (!nickname.equals(existing.getNickname())) {
                    existing.setNickname(nickname);
                    existing.setUpdatedAt(Instant.now());
                }
                return existing;
            }
            idByUsername.remove(username);
        }
        return createInternal(username, nickname, DEFAULT_TENANT, Set.of(DEFAULT_ROLE));
    }

    public synchronized InMemoryUser create(UserCreateRequest request) {
        if (idByUsername.containsKey(request.username())) {
            throw new BizException(ErrorCode.USERNAME_TAKEN);
        }
        String tenantId = request.tenantId() == null ? DEFAULT_TENANT : request.tenantId();
        Set<String> roles = request.roles() == null ? Set.of(DEFAULT_ROLE) : new LinkedHashSet<>(request.roles());
        return createInternal(request.username(), request.nickname(), tenantId, roles);
    }

    public List<InMemoryUser> list(String keyword) {
        String needle = keyword == null ? "" : keyword.trim().toLowerCase(Locale.ROOT);
        return byId.values().stream()
                .filter(user -> needle.isEmpty() || matches(user, needle))
                .sorted(Comparator.comparing(InMemoryUser::getCreatedAt))
                .toList();
    }

    public Optional<InMemoryUser> find(String id) {
        return Optional.ofNullable(byId.get(id));
    }

    public InMemoryUser require(String id) {
        return find(id).orElseThrow(() -> new BizException(ErrorCode.USER_NOT_FOUND));
    }

    public synchronized InMemoryUser update(String id, UserUpdateRequest request) {
        InMemoryUser user = require(id);
        user.setNickname(request.nickname());
        if (request.tenantId() != null) {
            user.setTenantId(request.tenantId());
        }
        if (request.roles() != null) {
            user.setRoles(new LinkedHashSet<>(request.roles()));
        }
        user.setUpdatedAt(Instant.now());
        return user;
    }

    public synchronized void delete(String id) {
        InMemoryUser removed = byId.remove(id);
        if (removed == null) {
            throw new BizException(ErrorCode.USER_NOT_FOUND);
        }
        idByUsername.remove(removed.getUsername());
    }

    private InMemoryUser createInternal(String username, String nickname, String tenantId, Set<String> roles) {
        Instant now = Instant.now();
        InMemoryUser user = new InMemoryUser();
        user.setId(UUID.randomUUID().toString());
        user.setUsername(username);
        user.setNickname(nickname);
        user.setTenantId(tenantId);
        user.setRoles(new LinkedHashSet<>(roles));
        user.setCreatedAt(now);
        user.setUpdatedAt(now);
        byId.put(user.getId(), user);
        idByUsername.put(username, user.getId());
        return user;
    }

    private static boolean matches(InMemoryUser user, String needle) {
        return user.getUsername().toLowerCase(Locale.ROOT).contains(needle)
                || user.getNickname().toLowerCase(Locale.ROOT).contains(needle)
                || user.getTenantId().toLowerCase(Locale.ROOT).contains(needle);
    }
}
