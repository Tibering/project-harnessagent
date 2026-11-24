package com.project.harnessagent.entity.user;

import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.Set;
import lombok.Getter;
import lombok.Setter;

/**
 * 体验期用户。
 *
 * <p>只存在内存里，进程重启即清空。字段刻意与未来的库表形态对齐（id / username / nickname / tenantId / roles），
 * 认证接上后可以直接换成持久化实体，接口契约不变。
 */
@Getter
@Setter
public class InMemoryUser {

    private String id;
    private String username;
    private String nickname;
    private String tenantId;
    private Set<String> roles = new LinkedHashSet<>();
    private Instant createdAt;
    private Instant updatedAt;
}
