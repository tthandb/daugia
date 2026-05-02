package storage

import (
	"context"
	"fmt"
	"io"
	"net/url"
	"time"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

// Client wraps a MinIO client and a single bucket name.
type Client struct {
	mc     *minio.Client
	bucket string
}

// New creates a MinIO client and ensures the bucket exists.
func New(endpoint, accessKey, secretKey, bucket string, useSSL bool) (*Client, error) {
	mc, err := minio.New(endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(accessKey, secretKey, ""),
		Secure: useSSL,
	})
	if err != nil {
		return nil, err
	}

	ctx := context.Background()
	exists, err := mc.BucketExists(ctx, bucket)
	if err != nil {
		return nil, err
	}
	if !exists {
		if err := mc.MakeBucket(ctx, bucket, minio.MakeBucketOptions{}); err != nil {
			return nil, err
		}
	}

	return &Client{mc: mc, bucket: bucket}, nil
}

// Upload puts an object into the bucket at the given key.
func (c *Client) Upload(ctx context.Context, objectKey string, reader io.Reader, size int64, contentType string) error {
	_, err := c.mc.PutObject(ctx, c.bucket, objectKey, reader, size, minio.PutObjectOptions{
		ContentType: contentType,
	})
	return err
}

// Download returns a ReadCloser for the object. Caller must close it.
func (c *Client) Download(ctx context.Context, objectKey string) (io.ReadCloser, error) {
	return c.mc.GetObject(ctx, c.bucket, objectKey, minio.GetObjectOptions{})
}

// GetObject returns the raw minio.Object which supports Stat() and Read.
func (c *Client) GetObject(ctx context.Context, objectKey string) (*minio.Object, error) {
	return c.mc.GetObject(ctx, c.bucket, objectKey, minio.GetObjectOptions{})
}

// PresignedURL generates a presigned GET URL valid for the given duration.
func (c *Client) PresignedURL(ctx context.Context, objectKey string, expiry time.Duration) (string, error) {
	u, err := c.mc.PresignedGetObject(ctx, c.bucket, objectKey, expiry, nil)
	if err != nil {
		return "", err
	}
	return u.String(), nil
}

// PresignedDownloadURL generates a presigned URL that forces the browser to
// download the object as an attachment with the given filename.
func (c *Client) PresignedDownloadURL(ctx context.Context, objectKey, downloadName string, expiry time.Duration) (string, error) {
	reqParams := url.Values{}
	if downloadName != "" {
		reqParams.Set("response-content-disposition", fmt.Sprintf(`attachment; filename="%s"`, sanitizeFilename(downloadName)))
	}
	u, err := c.mc.PresignedGetObject(ctx, c.bucket, objectKey, expiry, reqParams)
	if err != nil {
		return "", err
	}
	return u.String(), nil
}

// sanitizeFilename strips control characters and quotes to keep the
// Content-Disposition header valid.
func sanitizeFilename(name string) string {
	out := make([]rune, 0, len(name))
	for _, r := range name {
		if r < 0x20 || r == 0x7f || r == '"' || r == '\\' {
			continue
		}
		out = append(out, r)
	}
	return string(out)
}

// Delete removes a single object from the bucket.
func (c *Client) Delete(ctx context.Context, objectKey string) error {
	return c.mc.RemoveObject(ctx, c.bucket, objectKey, minio.RemoveObjectOptions{})
}

// DeletePrefix removes all objects whose keys start with the given prefix.
// Useful for cascade-deleting all files under an article ID.
func (c *Client) DeletePrefix(ctx context.Context, prefix string) error {
	objectsCh := c.mc.ListObjects(ctx, c.bucket, minio.ListObjectsOptions{
		Prefix:    prefix,
		Recursive: true,
	})

	errCh := c.mc.RemoveObjects(ctx, c.bucket, objectsCh, minio.RemoveObjectsOptions{})
	for err := range errCh {
		if err.Err != nil {
			return err.Err
		}
	}
	return nil
}
