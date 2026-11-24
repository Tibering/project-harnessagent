package com.project.harnessagent.controller.user;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.project.harnessagent.support.IdentityTestSupport;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

class UserCrudTests extends IdentityTestSupport {

    private static final String USERS_PATH = "/users";

    @Test
    void crudLifecycle() throws Exception {
        MvcResult created = mvc.perform(post(USERS_PATH)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"crud-user","nickname":"增删改查"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.username").value("crud-user"))
                .andReturn();
        String id = readJson(created).path("data").path("id").asText();

        mvc.perform(get(USERS_PATH + "/" + id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.nickname").value("增删改查"));

        mvc.perform(put(USERS_PATH + "/" + id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nickname":"改过了","roles":["ADMIN"]}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.nickname").value("改过了"))
                .andExpect(jsonPath("$.data.roles[0]").value("ADMIN"));

        mvc.perform(get(USERS_PATH).param("q", "crud-user"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].id").value(id));

        mvc.perform(delete(USERS_PATH + "/" + id))
                .andExpect(status().isOk());

        mvc.perform(get(USERS_PATH + "/" + id))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value(40402));
    }

    @Test
    void duplicateUsernameIsRejected() throws Exception {
        mvc.perform(post(USERS_PATH)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"dup-user","nickname":"一"}
                                """))
                .andExpect(status().isOk());

        mvc.perform(post(USERS_PATH)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"dup-user","nickname":"二"}
                                """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value(40902));
    }

    @Test
    void invalidUsernameIsRejected() throws Exception {
        mvc.perform(post(USERS_PATH)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"ab","nickname":"太短"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(40001));
    }

    @Test
    void crudIsOpenWithoutIdentity() throws Exception {
        mvc.perform(get(USERS_PATH))
                .andExpect(status().isOk());
    }

    @Test
    void explicitTenantIsKept() throws Exception {
        JsonNode created = readJson(mvc.perform(post(USERS_PATH)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"tenant-user","nickname":"某租户","tenantId":"team-a"}
                                """))
                .andExpect(status().isOk())
                .andReturn());

        org.assertj.core.api.Assertions.assertThat(created.path("data").path("tenantId").asText())
                .isEqualTo("team-a");
    }
}
