package handler

import (
	"log"
	"net/http"

	"github.com/daugia999/backend/internal/auth"
)

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Email == "" || req.Password == "" {
		writeError(w, http.StatusBadRequest, "email and password required")
		return
	}

	user, err := h.queries.GetUserByEmail(r.Context(), req.Email)
	if err != nil {
		if dbErrorStatus(err) != http.StatusNotFound {
			writeDBError(w, err, "")
			return
		}
		// Burn the same bcrypt cost for unknown emails so response time does
		// not reveal whether an account exists.
		_ = auth.CheckPassword(auth.DummyHash, req.Password)
		writeError(w, http.StatusUnauthorized, "invalid credentials")
		return
	}

	if err := auth.CheckPassword(user.PasswordHash, req.Password); err != nil {
		writeError(w, http.StatusUnauthorized, "invalid credentials")
		return
	}

	token, err := auth.GenerateToken(user.ID, user.Email, user.Role, h.jwtSecret)
	if err != nil {
		log.Printf("generate token: %v", err)
		writeError(w, http.StatusInternalServerError, "failed to generate token")
		return
	}

	auth.SetTokenCookie(w, token, h.secureCookie)

	writeJSON(w, http.StatusOK, map[string]any{
		"data": map[string]any{
			"id":    user.ID,
			"email": user.Email,
			"name":  user.Name,
			"role":  user.Role,
		},
	})
}

func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	auth.ClearTokenCookie(w, h.secureCookie)
	writeJSON(w, http.StatusOK, map[string]string{"message": "logged out"})
}

func (h *Handler) Me(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("token")
	if err != nil {
		writeError(w, http.StatusUnauthorized, "not authenticated")
		return
	}

	claims, err := auth.ValidateToken(cookie.Value, h.jwtSecret)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "invalid token")
		return
	}

	user, err := h.queries.GetUserByID(r.Context(), claims.Subject)
	if err != nil {
		if dbErrorStatus(err) != http.StatusNotFound {
			writeDBError(w, err, "")
			return
		}
		writeError(w, http.StatusUnauthorized, "user not found")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"data": map[string]any{
			"id":    user.ID,
			"email": user.Email,
			"name":  user.Name,
			"role":  user.Role,
		},
	})
}
