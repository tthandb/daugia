package auth

import (
	"context"
	"encoding/json"
	"net/http"
)

// contextKey is a private type for context keys to avoid collisions.
type contextKey struct{}

// claimsKey is the context key used to store and retrieve Claims.
var claimsKey = contextKey{}

// RequireAdmin returns Chi middleware that validates the JWT from the
// "token" cookie, checks that the role is ADMIN, and injects the
// Claims into the request context. Returns 401 JSON on any failure.
func RequireAdmin(secret []byte) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			cookie, err := r.Cookie("token")
			if err != nil {
				writeUnauthorized(w, "missing authentication token")
				return
			}

			claims, err := ValidateToken(cookie.Value, secret)
			if err != nil {
				writeUnauthorized(w, "invalid or expired token")
				return
			}

			if claims.Role != "ADMIN" {
				writeUnauthorized(w, "admin access required")
				return
			}

			ctx := context.WithValue(r.Context(), claimsKey, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// GetClaims extracts the Claims from the request context.
// Returns nil if no claims are present (i.e., the request did not
// pass through RequireAdmin middleware).
func GetClaims(ctx context.Context) *Claims {
	claims, _ := ctx.Value(claimsKey).(*Claims)
	return claims
}

// writeUnauthorized writes a 401 JSON error response.
func writeUnauthorized(w http.ResponseWriter, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusUnauthorized)
	json.NewEncoder(w).Encode(map[string]string{
		"error": message,
	})
}
