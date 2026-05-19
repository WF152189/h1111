package com.auth.app.dto;

import lombok.*;
import java.util.Map;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class InitDataResponse {
    private String message;
    private String userId;
    private String displayName;
    private Map<String, Object> data;
}
