package parser

import (
	"fmt"
	"os/exec"
	"regexp"
	"strings"
	"unicode/utf8"

	"github.com/microcosm-cc/bluemonday"
)

// sanitizePolicy is the shared bluemonday policy for HTML sanitization.
// Created once at package init to avoid per-call allocation.
var sanitizePolicy = func() *bluemonday.Policy {
	p := bluemonday.NewPolicy()
	p.AllowElements(
		"p", "h1", "h2", "h3", "h4",
		"ul", "ol", "li",
		"strong", "em",
		"blockquote",
		"br",
		"table", "thead", "tbody", "tr", "td", "th",
	)
	p.AllowAttrs("href").OnElements("a")
	p.AllowAttrs("rel", "target").OnElements("a")
	return p
}()

// stripPolicy strips all HTML tags, returning plain text only.
var stripPolicy = bluemonday.StrictPolicy()

// ParseDOCX converts a DOCX file to sanitized HTML and plain text using the
// mammoth CLI tool. The mammoth command writes HTML to stdout.
func ParseDOCX(filePath string) (html string, plain string, err error) {
	cmd := exec.Command("mammoth", filePath)
	out, err := cmd.Output()
	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			return "", "", fmt.Errorf("mammoth failed: %s", string(exitErr.Stderr))
		}
		return "", "", fmt.Errorf("mammoth exec: %w", err)
	}

	raw := string(out)
	html = SanitizeHTML(raw)
	html = demoteHeadings(html)
	html = styleDocumentHeader(html)
	plain = StripHTML(raw)
	return html, plain, nil
}

// ParsePDF converts a PDF file to HTML-wrapped paragraphs and plain text using
// pdftotext (poppler-utils). The -layout flag preserves the original layout,
// and "-" sends output to stdout.
func ParsePDF(filePath string) (html string, plain string, err error) {
	cmd := exec.Command("pdftotext", "-layout", filePath, "-")
	out, err := cmd.Output()
	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			return "", "", fmt.Errorf("pdftotext failed: %s", string(exitErr.Stderr))
		}
		return "", "", fmt.Errorf("pdftotext exec: %w", err)
	}

	plain = strings.TrimSpace(string(out))

	// Wrap non-empty lines as <p> tags, collapsing consecutive blank lines.
	var b strings.Builder
	for _, line := range strings.Split(plain, "\n") {
		trimmed := strings.TrimSpace(line)
		if trimmed == "" {
			continue
		}
		b.WriteString("<p>")
		b.WriteString(trimmed)
		b.WriteString("</p>\n")
	}

	html = SanitizeHTML(b.String())
	return html, plain, nil
}

// StripHTML removes all HTML tags and returns plain text.
func StripHTML(html string) string {
	return strings.TrimSpace(stripPolicy.Sanitize(html))
}

// multiSpaceRe collapses multiple whitespace into a single space
var multiSpaceRe = regexp.MustCompile(`\s{2,}`)

// headerRe matches the entire document header block up to the actual content.
// Captures everything from "CÔNG TY" through "THÔNG BÁO ĐẤU GIÁ..." heading.
var headerRe = regexp.MustCompile(
	`(?s)CÔNG TY ĐẤU GIÁ.*?(?:THÔNG BÁO[^.]{0,80}?)(?:\d+\.\s)`,
)

// altHeaderRe for documents that start with "CỘNG HÒA"
var altHeaderRe = regexp.MustCompile(
	`(?s)CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM.*?(?:THÔNG BÁO|QUY CHẾ)[^.]{0,80}?(?:\d+\.\s|[-–]\s*Căn cứ)`,
)

// docNumberRe matches standalone doc numbers like "Số: 23/TB –ĐGTS"
var docNumberRe = regexp.MustCompile(`Số\s*:\s*[\d.]+[/\s]*[A-ZĐ\-–\s]+`)

// datePrefixRe matches date lines
var datePrefixRe = regexp.MustCompile(`(?:Phú Thọ|Vĩnh Phúc|Hà Nội),?\s*ngày\s+\d+\s+tháng\s+\d+\s+năm\s+\d{4}`)

// GenerateDescription extracts a clean description from parsed plain text.
// It strips document headers, boilerplate, and number references, then
// returns the first maxLen characters trimmed to a word boundary.
func GenerateDescription(plainText string, maxLen int) string {
	text := cleanBoilerplate(plainText)

	if utf8.RuneCountInString(text) <= maxLen {
		return text
	}

	runes := []rune(text)
	truncated := string(runes[:maxLen])

	if idx := strings.LastIndex(truncated, " "); idx > 0 {
		truncated = truncated[:idx]
	}

	return strings.TrimSpace(truncated) + "…"
}

// contentStartRe finds the first real content — typically starts with a phrase like:
// "Cơ quan có tài sản", "Đơn vị có tài sản", "Căn cứ", "1. Đơn vị", "1. Cơ quan"
// or any sentence starting with a Vietnamese word (capitalized, not all-caps).
var contentStartRe = regexp.MustCompile(
	`(?:(?:1\.\s*)?(?:Cơ quan|Đơn vị|Căn cứ|Tổ chức|Công ty|Ngân hàng|Chi cục)[^.]{10,})`,
)

// cleanBoilerplate removes document header noise and finds the actual content start.
func cleanBoilerplate(text string) string {
	// Normalize whitespace
	text = multiSpaceRe.ReplaceAllString(text, " ")

	// Strategy: find the first real content marker and take everything from there
	if loc := contentStartRe.FindStringIndex(text); loc != nil {
		text = text[loc[0]:]
	} else {
		// Fallback: strip known boilerplate strings
		boilerplate := []string{
			"CÔNG TY ĐẤU GIÁ HỢP DANH VĨNH YÊN",
			"CÔNG TY ĐẤU GIÁ",
			"HỢP DANH VĨNH YÊN",
			"CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM",
			"Độc lập – Tự do – Hạnh phúc",
			"Độc lập - Tự do - Hạnh phúc",
			"Độc lập -Tự do - Hạnh Phúc",
			"Độc lập – Tự do – Hạnh Phúc",
		}
		for _, bp := range boilerplate {
			text = strings.ReplaceAll(text, bp, "")
		}
		text = docNumberRe.ReplaceAllString(text, "")
		text = datePrefixRe.ReplaceAllString(text, "")

		// Remove all-caps phrases (headings like "THÔNG BÁO ĐẤU GIÁ TÀI SẢN THI HÀNH ÁN")
		allCapsRe := regexp.MustCompile(`[A-ZÀ-Ỹ][A-ZÀ-Ỹ\s]{5,}`)
		text = allCapsRe.ReplaceAllString(text, " ")
	}

	// Collapse whitespace and trim
	text = multiSpaceRe.ReplaceAllString(text, " ")
	text = strings.TrimSpace(text)
	text = strings.TrimLeft(text, ".,;:- –—\t\n\r ")

	return text
}

// headingToParaRe converts h1/h2 tags to <p><strong> to prevent boilerplate
// from rendering as giant headings. The DOCX documents use heading styles for
// company name, document numbers, etc. which should display as regular bold text.
var headingToParaRe = regexp.MustCompile(`<h([12])([^>]*)>(.*?)</h[12]>`)

// demoteHeadings converts h1/h2 to <p><strong> in parsed HTML.
// Keeps h3/h4 as-is since those are typically real section headings.
func demoteHeadings(html string) string {
	return headingToParaRe.ReplaceAllString(html, `<p><strong>$3</strong></p>`)
}

// headerTableRe matches the header table block from mammoth output
var headerTableRe = regexp.MustCompile(
	`(?si)^(\s*<table>.*?CÔNG TY ĐẤU GIÁ.*?</table>)`,
)

// titleBlockRe matches the "THÔNG BÁO / ĐẤU GIÁ..." bold heading lines after the header table
var titleBlockRe = regexp.MustCompile(
	`(?si)(<p>\s*<strong>\s*(?:THÔNG BÁO)\s*</strong>\s*</p>\s*<p>\s*<strong>\s*(?:ĐẤU GIÁ[^<]*)</strong>\s*</p>)`,
)

// styleDocumentHeader wraps the official document header in a styled container
// instead of removing it — preserves the formal look of Vietnamese government documents.
func styleDocumentHeader(html string) string {
	// Wrap the header table in a styled div
	if loc := headerTableRe.FindStringIndex(html); loc != nil {
		headerHTML := html[loc[0]:loc[1]]
		rest := html[loc[1]:]

		// Find the title block ("THÔNG BÁO / ĐẤU GIÁ...") in the rest and wrap it too
		if titleLoc := titleBlockRe.FindStringIndex(rest); titleLoc != nil {
			titleHTML := rest[titleLoc[0]:titleLoc[1]]
			afterTitle := rest[titleLoc[1]:]
			html = `<div class="doc-header">` + headerHTML + titleHTML + `</div>` + afterTitle
		} else {
			html = `<div class="doc-header">` + headerHTML + `</div>` + rest
		}
	}

	return html
}

// SanitizeHTML applies the whitelist policy, allowing only safe editorial HTML
// elements: p, h1-h4, ul, ol, li, strong, em, blockquote, a, br, table elements.
func SanitizeHTML(html string) string {
	return sanitizePolicy.Sanitize(html)
}
