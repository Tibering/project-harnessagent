package com.project.harnessagent.controller.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.project.harnessagent.support.IdentityTestSupport;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

class ExperienceSessionTests extends IdentityTestSupport {

    @Test
    void enterCreatesIdentityWithDefaultTenantAndUserRole() throws Exception {
        mvc.perform(post(SESSION_PATH)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"alice","nickname":"爱丽丝"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.userId").isNotEmpty())
                .andExpect(jsonPath("$.data.sessionId").isNotEmpty())
                .andExpect(jsonPath("$.data.user.username").value("alice"))
                .andExpect(jsonPath("$.data.user.nickname").value("爱丽丝"))
                .andExpect(jsonPath("$.data.user.tenantId").value("default"))
                .andExpect(jsonPath("$.data.user.roles[0]").value("USER"));
    }

    @Test
    void enteringAgainWithSameUsernameReusesUserButOpensNewSession() throws Exception {
        JsonNode first = enter("bob", "鲍勃");
        JsonNode second = enter("bob", "鲍勃二号");

        assertThat(second.path("userId").asText()).isEqualTo(first.path("userId").asText());
        assertThat(second.path("sessionId").asText()).isNotEqualTo(first.path("sessionId").asText());
        assertThat(second.path("user").path("nickname").asText()).isEqualTo("鲍勃二号");
    }

    @Test
    void currentReturnsIdentityWhenBothHeadersPresent() throws Exception {
        JsonNode identity = enter("carol", "卡罗尔");

        mvc.perform(get(SESSION_PATH)
                        .header(USER_ID_HEADER, identity.path("userId").asText())
                        .header(SESSION_ID_HEADER, identity.path("sessionId").asText()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.userId").value(identity.path("userId").asText()))
                .andExpect(jsonPath("$.data.user.username").value("carol"));
    }

    @Test
    void currentWithoutHeadersIsUnauthorized() throws Exception {
        mvc.perform(get(SESSION_PATH))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value(40101));
    }

    @Test
    void mismatchedUserIdIsRejected() throws Exception {
        JsonNode identity = enter("dave", "戴夫");

        mvc.perform(get(SESSION_PATH)
                        .header(USER_ID_HEADER, "someone-else")
                        .header(SESSION_ID_HEADER, identity.path("sessionId").asText()))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value(40102));
    }

    @Test
    void leaveInvalidatesSession() throws Exception {
        JsonNode identity = enter("erin", "艾琳");

        mvc.perform(delete(SESSION_PATH)
                        .header(USER_ID_HEADER, identity.path("userId").asText())
                        .header(SESSION_ID_HEADER, identity.path("sessionId").asText()))
                .andExpect(status().isOk());

        mvc.perform(get(SESSION_PATH)
                        .header(USER_ID_HEADER, identity.path("userId").asText())
                        .header(SESSION_ID_HEADER, identity.path("sessionId").asText()))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value(40102));
    }

    @Test
    void onlyOneHeaderIsRejected() throws Exception {
        JsonNode identity = enter("frank", "弗兰克");

        mvc.perform(get(SESSION_PATH)
                        .header(USER_ID_HEADER, identity.path("userId").asText()))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value(40101));
    }
}
