package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/lucsky/cuid"

	"github.com/daugia999/backend/internal/db"
)

func (h *Handler) ListCategories(w http.ResponseWriter, r *http.Request) {
	cats, err := h.queries.ListCategories(r.Context())
	if err != nil {
		writeError(w, 500, "failed to list categories")
		return
	}

	items := make([]map[string]any, len(cats))
	for i, c := range cats {
		items[i] = map[string]any{
			"id":        c.ID,
			"name":      c.Name,
			"slug":      c.Slug,
			"color":     c.Color,
			"sortOrder": c.SortOrder,
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": items})
}

func (h *Handler) ListTags(w http.ResponseWriter, r *http.Request) {
	tags, err := h.queries.ListTags(r.Context())
	if err != nil {
		writeError(w, 500, "failed to list tags")
		return
	}

	items := make([]map[string]any, len(tags))
	for i, t := range tags {
		items[i] = map[string]any{
			"id":   t.ID,
			"name": t.Name,
			"slug": t.Slug,
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": items})
}

func (h *Handler) AdminCreateCategory(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name      string `json:"name"`
		Slug      string `json:"slug"`
		Color     string `json:"color"`
		SortOrder int32  `json:"sortOrder"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, 400, "invalid request body")
		return
	}

	cat, err := h.queries.CreateCategory(r.Context(), db.CreateCategoryParams{
		ID:        cuid.New(),
		Name:      req.Name,
		Slug:      req.Slug,
		Color:     req.Color,
		SortOrder: req.SortOrder,
	})
	if err != nil {
		writeError(w, 500, "failed to create category")
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{"data": cat})
}

func (h *Handler) AdminUpdateCategory(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req struct {
		Name      *string `json:"name"`
		Slug      *string `json:"slug"`
		Color     *string `json:"color"`
		SortOrder *int32  `json:"sortOrder"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, 400, "invalid request body")
		return
	}

	var sortOrder pgtype.Int4
	if req.SortOrder != nil {
		sortOrder = pgtype.Int4{Int32: *req.SortOrder, Valid: true}
	}

	cat, err := h.queries.UpdateCategory(r.Context(), db.UpdateCategoryParams{
		ID:        id,
		Name:      req.Name,
		Slug:      req.Slug,
		Color:     req.Color,
		SortOrder: sortOrder,
	})
	if err != nil {
		writeError(w, 500, "failed to update category")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"data": cat})
}

func (h *Handler) AdminDeleteCategory(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := h.queries.DeleteCategory(r.Context(), id); err != nil {
		writeError(w, 500, "failed to delete category")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) AdminCreateTag(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name string `json:"name"`
		Slug string `json:"slug"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, 400, "invalid request body")
		return
	}

	tag, err := h.queries.CreateTag(r.Context(), db.CreateTagParams{
		ID:   cuid.New(),
		Name: req.Name,
		Slug: req.Slug,
	})
	if err != nil {
		writeError(w, 500, "failed to create tag")
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{"data": tag})
}

func (h *Handler) AdminDeleteTag(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := h.queries.DeleteTag(r.Context(), id); err != nil {
		writeError(w, 500, "failed to delete tag")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
