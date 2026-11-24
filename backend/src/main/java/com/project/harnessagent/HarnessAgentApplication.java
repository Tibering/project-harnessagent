package com.project.harnessagent;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@MapperScan("com.project.harnessagent.**.mapper")
public class HarnessAgentApplication {

    public static void main(String[] args) {
        SpringApplication.run(HarnessAgentApplication.class, args);
    }
}
