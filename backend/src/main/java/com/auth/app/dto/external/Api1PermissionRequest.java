package com.auth.app.dto.external;

/**
 * API1専用リクエストDTO（ネスト構造）
 * 
 * 構造:
 * {
 *   "A01": {
 *     "screenId": "xxx",
 *     "typeId": "xxx"
 *   }
 * }
 */
public class Api1PermissionRequest {

    private final Api1Data a01;

    public Api1PermissionRequest(Api1Data a01) {
        this.a01 = a01;
    }

    public Api1Data getA01() {
        return a01;
    }

    /**
     * API1データ
     */
    public static class Api1Data {
        private final String screenId;
        private final String typeId;

        public Api1Data(String screenId, String typeId) {
            this.screenId = screenId;
            this.typeId = typeId;
        }

        public String getScreenId() {
            return screenId;
        }

        public String getTypeId() {
            return typeId;
        }
    }
}
