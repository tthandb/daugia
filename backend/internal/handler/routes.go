package handler

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/httprate"

	"github.com/daugia999/backend/internal/auth"
)

const (
	jsonBodyLimit       = 1 << 20
	documentBodyLimit   = 50 << 20
	imageBodyLimit      = 50 << 20
	attachmentBodyLimit = 20 << 20
)

// RegisterRoutes mounts the whole /api tree on r.
func RegisterRoutes(r chi.Router, h *Handler) {
	r.Route("/api", func(r chi.Router) {
		r.Use(securityHeaders)
		r.Get("/health", h.Health)

		r.Group(func(r chi.Router) {
			r.Use(LimitBody(jsonBodyLimit))

			r.Get("/articles", h.ListArticles)
			r.Get("/articles/featured", h.FeaturedArticles)
			r.Get("/articles/{slug}", h.GetArticle)
			r.Group(func(r chi.Router) {
				r.Use(httprate.LimitByIP(30, time.Minute))
				r.Post("/articles/{id}/view", h.TrackView)
			})

			r.Get("/categories", h.ListCategories)
			r.Get("/tags", h.ListTags)
			r.Get("/search", h.SearchArticles)

			r.Get("/thumbs/{id}", h.ProxyThumbnail)
			r.Head("/thumbs/{id}", h.ProxyThumbnail)
			r.Get("/images/{id}", h.ProxyImage)
			r.Head("/images/{id}", h.ProxyImage)
			r.Get("/articles/{id}/attachments/{attachmentId}", h.DownloadAttachment)
			r.Get("/articles/{slug}/download", h.DownloadArticle)

			r.Get("/sitemap", h.SitemapData)

			// Login is throttled per IP and globally: bcrypt costs ~100ms of CPU per
			// attempt, and the per-IP key alone is defeatable behind shared egress.
			r.Group(func(r chi.Router) {
				r.Use(httprate.LimitByIP(5, time.Minute))
				r.Use(httprate.Limit(30, time.Minute, httprate.WithKeyFuncs(func(*http.Request) (string, error) {
					return "login", nil
				})))
				r.Post("/auth/login", h.Login)
			})
			r.Post("/auth/logout", h.Logout)
			r.Get("/auth/me", h.Me)
		})

		r.Route("/admin", func(r chi.Router) {
			r.Use(auth.RequireAdmin(h.jwtSecret))

			r.Group(func(r chi.Router) {
				r.Use(LimitBody(jsonBodyLimit))

				r.Get("/stats", h.AdminStats)

				r.Get("/articles", h.AdminListArticles)
				r.Get("/articles/{id}", h.AdminGetArticle)
				r.Patch("/articles/{id}", h.AdminUpdateArticle)
				r.Delete("/articles/{id}", h.AdminDeleteArticle)
				r.Post("/articles/{id}/publish", h.AdminPublishArticle)
				r.Post("/articles/{id}/unpublish", h.AdminUnpublishArticle)
				r.Post("/articles/{id}/archive", h.AdminArchiveArticle)
				r.Put("/articles/{id}/tags", h.AdminSetArticleTags)
				r.Get("/articles/{id}/raw", h.AdminRawFileURL)

				r.Patch("/articles/{id}/images/reorder", h.AdminReorderImages)
				r.Patch("/articles/{id}/images/{imageId}", h.AdminUpdateImage)
				r.Delete("/articles/{id}/images/{imageId}", h.AdminDeleteImage)

				r.Patch("/articles/{id}/attachments/{attachmentId}", h.AdminUpdateAttachment)
				r.Delete("/articles/{id}/attachments/{attachmentId}", h.AdminDeleteAttachment)

				r.Post("/categories", h.AdminCreateCategory)
				r.Patch("/categories/{id}", h.AdminUpdateCategory)
				r.Delete("/categories/{id}", h.AdminDeleteCategory)

				r.Post("/tags", h.AdminCreateTag)
				r.Delete("/tags/{id}", h.AdminDeleteTag)
			})

			r.With(LimitBody(documentBodyLimit)).Post("/articles", h.AdminCreateArticle)
			r.With(LimitBody(imageBodyLimit)).Post("/articles/{id}/images", h.AdminUploadImages)
			r.With(LimitBody(attachmentBodyLimit)).Post("/articles/{id}/attachments", h.AdminUploadAttachment)
		})
	})
}
