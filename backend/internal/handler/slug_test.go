package handler

import "testing"

func TestSlugifyTitle_Vietnamese(t *testing.T) {
	cases := []struct {
		name  string
		title string
		want  string
	}{
		{"basic phrase", "Thông báo đấu giá", "thong-bao-dau-gia"},
		{"category name", "Đấu Giá QSD Đất", "dau-gia-qsd-dat"},
		{"d with stroke lower", "đường Phạm Văn Đồng", "duong-pham-van-dong"},
		{"collapses spaces", "Tài  sản   thi hành án", "tai-san-thi-hanh-an"},
		{"trims and dedups dashes", "  Vĩnh - Yên  ", "vinh-yen"},
		{"drops punctuation", "Số: 23/TB-ĐGTS", "so-23tb-dgts"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := slugifyTitle(tc.title)
			if got != tc.want {
				t.Errorf("slugifyTitle(%q) = %q, want %q", tc.title, got, tc.want)
			}
		})
	}
}

func TestSlugifyTitle_AllDiacriticsNotEmpty(t *testing.T) {
	// Previously an all-diacritic title reduced to "" (or "-"), colliding on the
	// unique constraint. It must now produce a real ASCII slug.
	got := slugifyTitle("Đấu")
	if got == "" || got == "-" {
		t.Errorf("all-diacritic title produced empty slug: %q", got)
	}
	if got != "dau" {
		t.Errorf("slugifyTitle(%q) = %q, want %q", "Đấu", got, "dau")
	}
}
