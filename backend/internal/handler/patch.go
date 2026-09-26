package handler

import (
	"bytes"
	"encoding/json"
	"fmt"
	"time"
)

// patch distinguishes a key that is absent (keep the column) from one that is
// present with null (clear the column) in a JSON PATCH body.
type patch map[string]json.RawMessage

func (p patch) has(key string) bool {
	_, ok := p[key]
	return ok
}

func (p patch) isNull(key string) bool {
	return bytes.Equal(bytes.TrimSpace(p[key]), []byte("null"))
}

// optionalText returns (set, value). Both null and "" clear an optional column.
func (p patch) optionalText(key string) (bool, *string, error) {
	if !p.has(key) {
		return false, nil, nil
	}
	if p.isNull(key) {
		return true, nil, nil
	}
	var s string
	if err := json.Unmarshal(p[key], &s); err != nil {
		return false, nil, fmt.Errorf("%s must be a string", key)
	}
	if s == "" {
		return true, nil, nil
	}
	return true, &s, nil
}

// requiredText rejects null and "" for NOT NULL columns.
func (p patch) requiredText(key string) (bool, *string, error) {
	if !p.has(key) {
		return false, nil, nil
	}
	var s string
	if p.isNull(key) || json.Unmarshal(p[key], &s) != nil || s == "" {
		return false, nil, fmt.Errorf("%s must be a non-empty string", key)
	}
	return true, &s, nil
}

func (p patch) optionalInt32(key string) (bool, *int32, error) {
	if !p.has(key) {
		return false, nil, nil
	}
	if p.isNull(key) {
		return true, nil, nil
	}
	var n int32
	if err := json.Unmarshal(p[key], &n); err != nil {
		return false, nil, fmt.Errorf("%s must be an integer", key)
	}
	return true, &n, nil
}

func (p patch) optionalInt64(key string) (bool, *int64, error) {
	if !p.has(key) {
		return false, nil, nil
	}
	if p.isNull(key) {
		return true, nil, nil
	}
	var n int64
	if err := json.Unmarshal(p[key], &n); err != nil {
		return false, nil, fmt.Errorf("%s must be an integer", key)
	}
	if n < 0 {
		return false, nil, fmt.Errorf("%s must not be negative", key)
	}
	return true, &n, nil
}

func (p patch) optionalTime(key string) (bool, *time.Time, error) {
	if !p.has(key) {
		return false, nil, nil
	}
	if p.isNull(key) {
		return true, nil, nil
	}
	var s string
	if err := json.Unmarshal(p[key], &s); err != nil || s == "" {
		if s == "" && err == nil {
			return true, nil, nil
		}
		return false, nil, fmt.Errorf("%s must be an RFC 3339 timestamp", key)
	}
	t, err := time.Parse(time.RFC3339, s)
	if err != nil {
		return false, nil, fmt.Errorf("%s must be an RFC 3339 timestamp", key)
	}
	return true, &t, nil
}
