package com.auth.app.dto.external;

/**
 * API2専用リクエストDTO（ネスト構造）
 * 
 * 構造:
 * {
 *   "B01": {
 *     "screenId": "xxx",
 *     "userId": "xxx"
 *   }
 * }
 */
public class Api2PermissionRequest {

    private final Api2Data b01;

    public Api2PermissionRequest(Api2Data b01) {
        this.b01 = b01;
    }

    public Api2Data getB01() {
        return b01;
    }

    /**
     * API2データ
     */
    public static class Api2Data {
        private final String screenId;
        private final String userId;

        public Api2Data(String screenId, String userId) {
            this.screenId = screenId;
            this.userId = userId;
        }

        public String getScreenId() {
            return screenId;
        }

        public String getUserId() {
            return userId;
        }
    }
}
