package parser

import "testing"

func TestSanitizeHTML_StripsDangerousLinkSchemes(t *testing.T) {
	cases := []struct {
		name    string
		input   string
		wantOut string // substring that must be absent
	}{
		{"javascript scheme", `<a href="javascript:alert(1)">x</a>`, "javascript:"},
		{"data scheme", `<a href="data:text/html,<script>alert(1)</script>">x</a>`, "data:"},
		{"vbscript scheme", `<a href="vbscript:msgbox(1)">x</a>`, "vbscript:"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := SanitizeHTML(tc.input)
			if contains(got, tc.wantOut) {
				t.Errorf("dangerous scheme survived sanitization:\ninput=%q\noutput=%q", tc.input, got)
			}
		})
	}
}

func TestSanitizeHTML_KeepsSafeLinks(t *testing.T) {
	input := `<p><a href="https://example.com/notice">Xem</a></p>`
	got := SanitizeHTML(input)
	if !contains(got, `href="https://example.com/notice"`) {
		t.Errorf("safe https link was stripped:\ninput=%q\noutput=%q", input, got)
	}
}

func TestSanitizeHTML_AddsNoopenerToBlankTarget(t *testing.T) {
	input := `<a href="https://example.com" target="_blank">x</a>`
	got := SanitizeHTML(input)
	if contains(got, `target="_blank"`) && !contains(got, "noopener") {
		t.Errorf("target=_blank link lacks rel=noopener (tabnabbing):\noutput=%q", got)
	}
}

func contains(haystack, needle string) bool {
	return len(needle) > 0 && stringIndex(haystack, needle) >= 0
}

func stringIndex(s, sub string) int {
	for i := 0; i+len(sub) <= len(s); i++ {
		if s[i:i+len(sub)] == sub {
			return i
		}
	}
	return -1
}
