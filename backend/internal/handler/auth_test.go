package handler

import (
	"net/http"
	"testing"
)

func TestLogout_CookieSecureFlagFollowsConfig(t *testing.T) {
	e := newTestEnv(t)
	rec := e.public(http.MethodPost, "/api/auth/logout", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d", rec.Code)
	}
	cookies := rec.Result().Cookies()
	if len(cookies) != 1 || cookies[0].Name != "token" {
		t.Fatalf("cookies = %v", cookies)
	}
	if cookies[0].Secure {
		t.Fatal("logout cookie is Secure while login cookie is not (browser ignores the clear on http)")
	}
}
