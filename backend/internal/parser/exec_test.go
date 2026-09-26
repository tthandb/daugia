package parser

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func fakeBinary(t *testing.T, name, script string) {
	t.Helper()
	dir := t.TempDir()
	if err := os.WriteFile(filepath.Join(dir, name), []byte(script), 0o755); err != nil {
		t.Fatal(err)
	}
	t.Setenv("PATH", dir+string(os.PathListSeparator)+os.Getenv("PATH"))
}

func TestParsePDF_HonoursContextTimeout(t *testing.T) {
	fakeBinary(t, "pdftotext", "#!/bin/sh\nsleep 5\n")
	ctx, cancel := context.WithTimeout(context.Background(), 200*time.Millisecond)
	defer cancel()

	start := time.Now()
	_, _, err := ParsePDF(ctx, "irrelevant.pdf")
	if err == nil {
		t.Fatal("expected error from timed-out child process")
	}
	if time.Since(start) > 2*time.Second {
		t.Fatalf("child process outlived the context: %v", time.Since(start))
	}
}

func TestParsePDF_NonZeroExitIsBadDocument(t *testing.T) {
	fakeBinary(t, "pdftotext", "#!/bin/sh\necho 'Syntax Error' >&2\nexit 1\n")
	_, _, err := ParsePDF(context.Background(), "x.pdf")
	if !errors.Is(err, ErrBadDocument) {
		t.Fatalf("err = %v, want ErrBadDocument", err)
	}
}

func TestParseDOCX_MissingToolIsNotBadDocument(t *testing.T) {
	t.Setenv("PATH", t.TempDir())
	_, _, err := ParseDOCX(context.Background(), "x.docx")
	if err == nil || errors.Is(err, ErrBadDocument) {
		t.Fatalf("missing binary must surface as a server error, got %v", err)
	}
}

func TestParseDOCX_CapsOutputSize(t *testing.T) {
	fakeBinary(t, "mammoth", "#!/bin/sh\nhead -c 9000000 /dev/zero | tr '\\0' 'a'\n")
	_, _, err := ParseDOCX(context.Background(), "x.docx")
	if !errors.Is(err, ErrBadDocument) {
		t.Fatalf("oversized output must be rejected as a bad document, got %v", err)
	}
}
