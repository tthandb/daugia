package storage

import (
	"context"
	"fmt"
	"io"
	"mime"
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

// Object is a readable stored object together with its size.
type Object struct {
	io.ReadCloser
	Size int64
}

// New creates a MinIO client and verifies the bucket exists. The bucket is
// never created here: production tokens are scoped to a pre-made bucket, so a
// missing bucket is a configuration error, not something to paper over.
func New(ctx context.Context, endpoint, accessKey, secretKey, bucket string, useSSL bool) (*Client, error) {
	mc, err := minio.New(endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(accessKey, secretKey, ""),
		Secure: useSSL,
	})
	if err != nil {
		return nil, err
	}

	exists, err := mc.BucketExists(ctx, bucket)
	if err != nil {
		return nil, fmt.Errorf("check bucket %q: %w", bucket, err)
	}
	if !exists {
		return nil, fmt.Errorf("bucket %q does not exist", bucket)
	}

	return &Client{mc: mc, bucket: bucket}, nil
}

func (c *Client) Upload(ctx context.Context, objectKey string, reader io.Reader, size int64, contentType string) error {
	_, err := c.mc.PutObject(ctx, c.bucket, objectKey, reader, size, minio.PutObjectOptions{
		ContentType: contentType,
	})
	return err
}

func (c *Client) GetObject(ctx context.Context, objectKey string) (*Object, error) {
	obj, err := c.mc.GetObject(ctx, c.bucket, objectKey, minio.GetObjectOptions{})
	if err != nil {
		return nil, err
	}
	info, err := obj.Stat()
	if err != nil {
		obj.Close()
		return nil, err
	}
	return &Object{ReadCloser: obj, Size: info.Size}, nil
}

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
		reqParams.Set("response-content-disposition", ContentDisposition(downloadName))
	}
	u, err := c.mc.PresignedGetObject(ctx, c.bucket, objectKey, expiry, reqParams)
	if err != nil {
		return "", err
	}
	return u.String(), nil
}

// ContentDisposition builds an RFC 6266 attachment header value. Non-ASCII
// names (Vietnamese) are carried in the filename* parameter so browsers keep
// the diacritics instead of showing the object key.
func ContentDisposition(name string) string {
	return mime.FormatMediaType("attachment", map[string]string{"filename": sanitizeFilename(name)})
}

func sanitizeFilename(name string) string {
	out := make([]rune, 0, len(name))
	for _, r := range name {
		if r < 0x20 || r == 0x7f || r == '"' || r == '\\' || r == '/' {
			continue
		}
		out = append(out, r)
	}
	if len(out) == 0 {
		return "download"
	}
	return string(out)
}

func (c *Client) Delete(ctx context.Context, objectKey string) error {
	return c.mc.RemoveObject(ctx, c.bucket, objectKey, minio.RemoveObjectOptions{})
}

// DeletePrefix removes all objects whose keys start with the given prefix.
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
