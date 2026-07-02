package com.auth.app.dto.external;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * 外部APIレスポンスDTO
 * 
 * 構造:
 * {
 *   "bb": { ... },
 *   "error": { "flg": true/false, "errMsg": "..." }
 * }
 * 
 * 権限判定: error.flg が false であれば権限あり、true であれば権限なし
 */
public class ExternalPermissionResponse {

    private final BbData bb;
    private final ErrorData error;

    @JsonCreator
    public ExternalPermissionResponse(
            @JsonProperty("bb") BbData bb,
            @JsonProperty("error") ErrorData error) {
        this.bb = bb;
        this.error = error;
    }

    public BbData getBb() {
        return bb;
    }

    public ErrorData getError() {
        return error;
    }

    /**
     * 権限判定
     * 
     * @return true=権限あり, false=権限なし
     */
    public boolean isAuthorized() {
        if (error == null) {
            return false;
        }
        // error.flg が false であれば権限あり
        return !error.isFlg();
    }

    /**
     * エラーメッセージを取得
     * 
     * @return エラーメッセージ（ない場合はnull）
     */
    public String getErrorMessage() {
        if (error == null) {
            return null;
        }
        return error.getErrMsg();
    }

    /**
     * BB層データ
     */
    public static class BbData {
        // 必要に応じてフィールドを追加
        // 現在は空だが、将来の拡張のために残している

        @JsonCreator
        public BbData() {
        }
    }

    /**
     * エラー情報
     */
    public static class ErrorData {
        private final boolean flg;
        private final String errMsg;

        @JsonCreator
        public ErrorData(
                @JsonProperty("flg") boolean flg,
                @JsonProperty("errMsg") String errMsg) {
            this.flg = flg;
            this.errMsg = errMsg;
        }

        public boolean isFlg() {
            return flg;
        }

        public String getErrMsg() {
            return errMsg;
        }
    }
}
