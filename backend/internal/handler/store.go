package handler

import (
	"context"
	"io"
	"time"

	"github.com/daugia999/backend/internal/storage"
)

// ObjectStore is the subset of the storage client the handlers depend on.
// Tests substitute an in-memory implementation.
type ObjectStore interface {
	Upload(ctx context.Context, objectKey string, reader io.Reader, size int64, contentType string) error
	GetObject(ctx context.Context, objectKey string) (*storage.Object, error)
	PresignedURL(ctx context.Context, objectKey string, expiry time.Duration) (string, error)
	PresignedDownloadURL(ctx context.Context, objectKey, downloadName string, expiry time.Duration) (string, error)
	Delete(ctx context.Context, objectKey string) error
	DeletePrefix(ctx context.Context, prefix string) error
}

var _ ObjectStore = (*storage.Client)(nil)
