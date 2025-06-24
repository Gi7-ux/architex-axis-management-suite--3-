<?php
class JWTHandler {
    private static function base64UrlEncode($data) {
        return str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($data));
    }

    public static function generateToken($payload) {
        $header = [
            'typ' => 'JWT',
            'alg' => JWT_ALGORITHM
        ];

        $headerEncoded = self::base64UrlEncode(json_encode($header));
        $payloadEncoded = self::base64UrlEncode(json_encode($payload));

        $signature = hash_hmac('sha256', "$headerEncoded.$payloadEncoded", JWT_SECRET_KEY, true);
        $signatureEncoded = self::base64UrlEncode($signature);

        return "$headerEncoded.$payloadEncoded.$signatureEncoded";
    }

    public static function validateToken($token) {
        try {
            $parts = explode('.', $token);
            
            if (count($parts) !== 3) {
                return false;
            }

            list($headerEncoded, $payloadEncoded, $signatureEncoded) = $parts;

            $signature = self::base64UrlEncode(
                hash_hmac('sha256', "$headerEncoded.$payloadEncoded", JWT_SECRET_KEY, true)
            );

            if ($signatureEncoded !== $signature) {
                return false;
            }

            $payload = json_decode(base64_decode(str_replace(['-', '_'], ['+', '/'], $payloadEncoded)), true);
            
            if (isset($payload['exp']) && $payload['exp'] < time()) {
                return false;
            }

            return $payload;
        } catch (Exception $e) {
            return false;
        }
    }
}
?>
