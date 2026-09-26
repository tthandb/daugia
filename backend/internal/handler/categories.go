package handler

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/lucsky/cuid"

	"github.com/daugia999/backend/internal/db"
)

func categoryItem(c db.Category) map[string]any {
	return map[string]any{
		"id":        c.ID,
		"name":      c.Name,
		"slug":      c.Slug,
		"color":     c.Color,
		"sortOrder": c.SortOrder,
	}
}

func tagItem(t db.Tag) map[string]any {
	return map[string]any{"id": t.ID, "name": t.Name, "slug": t.Slug}
}

func (h *Handler) ListCategories(w http.ResponseWriter, r *http.Request) {
	cats, err := h.queries.ListCategories(r.Context())
	if err != nil {
		writeDBError(w, err, "")
		return
	}
	items := make([]map[string]any, len(cats))
	for i, c := range cats {
		items[i] = categoryItem(c)
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": items})
}

func (h *Handler) ListTags(w http.ResponseWriter, r *http.Request) {
	tags, err := h.queries.ListTags(r.Context())
	if err != nil {
		writeDBError(w, err, "")
		return
	}
	items := make([]map[string]any, len(tags))
	for i, t := range tags {
		items[i] = tagItem(t)
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
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Name == "" || !validSlug(req.Slug) {
		writeError(w, http.StatusBadRequest, "name and a valid slug are required")
		return
	}
	if req.Color == "" {
		req.Color = "#57534E"
	}

	cat, err := h.queries.CreateCategory(r.Context(), db.CreateCategoryParams{
		ID: cuid.New(), Name: req.Name, Slug: req.Slug, Color: req.Color, SortOrder: req.SortOrder,
	})
	if err != nil {
		if isUniqueViolation(err) {
			writeError(w, http.StatusConflict, "category name or slug already exists")
			return
		}
		writeDBError(w, err, "")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"data": categoryItem(cat)})
}

func (h *Handler) AdminUpdateCategory(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name      *string `json:"name"`
		Slug      *string `json:"slug"`
		Color     *string `json:"color"`
		SortOrder *int32  `json:"sortOrder"`
	}
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Slug != nil && !validSlug(*req.Slug) {
		writeError(w, http.StatusBadRequest, "slug may only contain a-z, 0-9 and dashes")
		return
	}

	cat, err := h.queries.UpdateCategory(r.Context(), db.UpdateCategoryParams{
		ID: chi.URLParam(r, "id"), Name: req.Name, Slug: req.Slug, Color: req.Color, SortOrder: req.SortOrder,
	})
	if err != nil {
		if isUniqueViolation(err) {
			writeError(w, http.StatusConflict, "category name or slug already exists")
			return
		}
		writeDBError(w, err, "category not found")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": categoryItem(cat)})
}

func (h *Handler) AdminDeleteCategory(w http.ResponseWriter, r *http.Request) {
	rows, err := h.queries.DeleteCategory(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		writeDBError(w, err, "category not found")
		return
	}
	if rows == 0 {
		writeError(w, http.StatusNotFound, "category not found")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) AdminCreateTag(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name string `json:"name"`
		Slug string `json:"slug"`
	}
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Slug == "" {
		req.Slug = slugifyTitle(req.Name)
	}
	if req.Name == "" || !validSlug(req.Slug) {
		writeError(w, http.StatusBadRequest, "name and a valid slug are required")
		return
	}

	tag, err := h.queries.CreateTag(r.Context(), db.CreateTagParams{ID: cuid.New(), Name: req.Name, Slug: req.Slug})
	if err != nil {
		if isUniqueViolation(err) {
			writeError(w, http.StatusConflict, "tag name or slug already exists")
			return
		}
		writeDBError(w, err, "")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"data": tagItem(tag)})
}

func (h *Handler) AdminDeleteTag(w http.ResponseWriter, r *http.Request) {
	rows, err := h.queries.DeleteTag(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		writeDBError(w, err, "tag not found")
		return
	}
	if rows == 0 {
		writeError(w, http.StatusNotFound, "tag not found")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
