package com.project.harnessagent.support;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

/**
 * 测试里生成身份的小工具：真实调用 /experience/session 拿 userId 与 sessionId。
 */
public abstract class IdentityTestSupport extends PostgresTestSupport {

    protected static final String SESSION_PATH = "/experience/session";
    protected static final String USER_ID_HEADER = "X-User-Id";
    protected static final String SESSION_ID_HEADER = "X-Session-Id";

    @Autowired
    protected MockMvc mvc;

    @Autowired
    protected ObjectMapper objectMapper;

    protected JsonNode readJson(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    protected JsonNode enter(String username, String nickname) throws Exception {
        String body = objectMapper.writeValueAsString(
                java.util.Map.of("username", username, "nickname", nickname));
        MvcResult result = mvc.perform(post(SESSION_PATH)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andReturn();
        JsonNode json = readJson(result);
        return json.path("data");
    }

    protected MvcResult getWithIdentity(String path, JsonNode identity) throws Exception {
        return mvc.perform(get(path)
                        .header(USER_ID_HEADER, identity.path("userId").asText())
                        .header(SESSION_ID_HEADER, identity.path("sessionId").asText()))
                .andReturn();
    }
}
