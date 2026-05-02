// Package imageopt wraps libvips' `vipsthumbnail` CLI to convert and resize
// uploaded images into web-optimized WebP. We shell out instead of binding
// libvips directly (e.g. via h2non/bimg) because the project already uses
// the os/exec pattern for mammoth and pdftotext, and the runtime image ships
// libvips + vips-tools — no extra CGO dependency.
//
// All functions here are "best effort": if vipsthumbnail is not on PATH
// (typical in fresh dev environments without `apk add vips-tools`), the
// caller can fall back to uploading the original bytes. Production must
// have vips-tools installed (the runtime Dockerfile does).
package imageopt

import (
	"fmt"
	"image"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"

	// Side-effect imports register decoders so image.DecodeConfig can read
	// dimensions from JPEG/PNG/GIF without needing libvips.
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
)

const (
	// DefaultThumbMaxDim caps the long edge of an article thumbnail. Source
	// docs are usually 800-1200px; 1600 covers retina at the listing card
	// width without bloating bytes.
	DefaultThumbMaxDim = 1600
	// DefaultQuality is the WebP quality. 75 is the libvips default and
	// strikes the typical visual-vs-bytes balance; 90+ is overkill for
	// thumbnails and roughly doubles file size.
	DefaultQuality = 75
)

// HasVipsThumbnail reports whether `vipsthumbnail` is available on PATH.
// Cached after first lookup; cheap to call.
var hasVipsThumbnail = func() bool {
	_, err := exec.LookPath("vipsthumbnail")
	return err == nil
}()

func HasVipsThumbnail() bool { return hasVipsThumbnail }

// OptimizeWebP resizes srcPath so its longest edge is <= maxDim, encodes it
// as WebP at the given quality, and writes the result to dstPath. Returns
// the resulting image dimensions and any error.
//
// vipsthumbnail flags:
//
//	-s WxH    fit-inside size (preserves aspect, never upscales by default)
//	-o ...    output template; %s is replaced by the input basename. We use
//	          an explicit path with .webp extension and "[Q=N,strip]" suffix
//	          to apply WebP encoder options.
//
// Stripping metadata (`strip`) is intentional: thumbnails are decoration,
// not products of identifiable photographers, so EXIF/IPTC carry no SEO
// value and only inflate bytes.
func OptimizeWebP(srcPath, dstPath string, maxDim, quality int) (width, height int, err error) {
	if maxDim <= 0 {
		maxDim = DefaultThumbMaxDim
	}
	if quality < 1 || quality > 100 {
		quality = DefaultQuality
	}

	if !hasVipsThumbnail {
		return 0, 0, fmt.Errorf("vipsthumbnail not available on PATH")
	}

	// Use an absolute output path so vipsthumbnail's relative-path quirks
	// (it joins -o with dirname(input) when -o is relative) don't bite.
	absDst, err := filepath.Abs(dstPath)
	if err != nil {
		return 0, 0, fmt.Errorf("resolve dst: %w", err)
	}

	outArg := fmt.Sprintf("%s[Q=%d,strip]", absDst, quality)
	sizeArg := strconv.Itoa(maxDim) + "x" + strconv.Itoa(maxDim)

	cmd := exec.Command("vipsthumbnail", srcPath, "-s", sizeArg, "-o", outArg)
	out, err := cmd.CombinedOutput()
	if err != nil {
		return 0, 0, fmt.Errorf("vipsthumbnail failed: %w (%s)", err, strings.TrimSpace(string(out)))
	}

	// Read back dimensions from the encoded webp via Go's image package
	// (image/webp isn't in stdlib; fall back to opening the source if the
	// output decode fails — dimensions are correct enough for the fit case).
	if w, h, ok := decodeDims(absDst); ok {
		return w, h, nil
	}
	if w, h, ok := decodeDims(srcPath); ok {
		// Source dims, scaled to maxDim by aspect.
		if w >= h && w > maxDim {
			h = int(float64(h) * float64(maxDim) / float64(w))
			w = maxDim
		} else if h > maxDim {
			w = int(float64(w) * float64(maxDim) / float64(h))
			h = maxDim
		}
		return w, h, nil
	}
	return 0, 0, nil
}

func decodeDims(path string) (int, int, bool) {
	f, err := os.Open(path)
	if err != nil {
		return 0, 0, false
	}
	defer f.Close()
	cfg, _, err := image.DecodeConfig(f)
	if err != nil {
		return 0, 0, false
	}
	return cfg.Width, cfg.Height, true
}

// SniffMime reads the first few bytes of a file to determine its actual MIME.
// Used by file-proxy handlers to stop lying about content-type when legacy
// thumbnails are JPEG/PNG bytes mislabeled as image/webp.
func SniffMime(b []byte) string {
	if len(b) < 12 {
		return "application/octet-stream"
	}
	switch {
	case b[0] == 0xFF && b[1] == 0xD8 && b[2] == 0xFF:
		return "image/jpeg"
	case b[0] == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G':
		return "image/png"
	case string(b[0:4]) == "RIFF" && string(b[8:12]) == "WEBP":
		return "image/webp"
	case b[0] == 'G' && b[1] == 'I' && b[2] == 'F' && b[3] == '8':
		return "image/gif"
	case string(b[4:12]) == "ftypavif" || string(b[4:12]) == "ftypavis":
		return "image/avif"
	}
	return "application/octet-stream"
}
