package com.auth.app.dto.external;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * 外部API レスポンスDTO（ネスト構造）
 * 
 * 構造:
 * {
 *   "AA": { "userId": "xxx", "result": "xxx" },
 *   "BB": { "errFlg": "xx", "errorMes": "xx" }
 * }
 */
public class ExternalApiResponse {

    private final AaData aa;
    private final BbData bb;

    @JsonCreator
    public ExternalApiResponse(
            @JsonProperty("AA") AaData aa,
            @JsonProperty("BB") BbData bb) {
        this.aa = aa;
        this.bb = bb;
    }

    public AaData getAa() {
        return aa;
    }

    public BbData getBb() {
        return bb;
    }

    /**
     * AA層データ（結果情報）
     */
    public static class AaData {
        private final String userId;
        private final String result;

        @JsonCreator
        public AaData(
                @JsonProperty("userId") String userId,
                @JsonProperty("result") String result) {
            this.userId = userId;
            this.result = result;
        }

        public String getUserId() {
            return userId;
        }

        public String getResult() {
            return result;
        }
    }

    /**
     * BB層データ（エラー情報）
     */
    public static class BbData {
        private final String errFlg;
        private final String errorMes;

        @JsonCreator
        public BbData(
                @JsonProperty("errFlg") String errFlg,
                @JsonProperty("errorMes") String errorMes) {
            this.errFlg = errFlg;
            this.errorMes = errorMes;
        }

        public String getErrFlg() {
            return errFlg;
        }

        public String getErrorMes() {
            return errorMes;
        }
    }
}
