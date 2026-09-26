package main

import (
	"context"
	"errors"
	"fmt"
	"os"

	"github.com/lucsky/cuid"
	"golang.org/x/crypto/bcrypt"

	"github.com/daugia999/backend/internal/db"
)

// seedDB creates the admin user and the default categories. It is idempotent:
// an existing admin is left alone and categories the admin has renamed or
// re-ordered are never overwritten.
func seedDB(ctx context.Context, queries *db.Queries) error {
	email := os.Getenv("ADMIN_EMAIL")
	password := os.Getenv("ADMIN_PASSWORD")
	if email == "" || password == "" {
		return errors.New("ADMIN_EMAIL and ADMIN_PASSWORD must be set to seed the admin user")
	}
	if len(password) < 12 {
		return errors.New("ADMIN_PASSWORD must be at least 12 characters")
	}

	exists, err := queries.UserExists(ctx, email)
	if err != nil {
		return fmt.Errorf("check user: %w", err)
	}
	if !exists {
		hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
		if err != nil {
			return fmt.Errorf("hash password: %w", err)
		}
		if _, err := queries.CreateUser(ctx, db.CreateUserParams{
			ID:           cuid.New(),
			Email:        email,
			PasswordHash: string(hash),
			Name:         "Nguyễn Văn Dương",
			Role:         "ADMIN",
		}); err != nil {
			return fmt.Errorf("create admin: %w", err)
		}
		fmt.Printf("admin user created: %s\n", email)
	} else {
		fmt.Println("admin user already exists")
	}

	categories := []db.InsertCategoryIfMissingParams{
		{Name: "Đấu Giá QSD Đất", Slug: "dau-gia-qsd-dat", Color: "#A16207", SortOrder: 1},
		{Name: "Tài Sản Thi Hành Án", Slug: "tai-san-thi-hanh-an", Color: "#B45309", SortOrder: 2},
		{Name: "Tài Sản Thanh Lý", Slug: "tai-san-thanh-ly", Color: "#78350F", SortOrder: 3},
		{Name: "Đấu Giá Phương Tiện", Slug: "dau-gia-phuong-tien", Color: "#44403C", SortOrder: 4},
		{Name: "Khác", Slug: "khac", Color: "#57534E", SortOrder: 5},
	}
	for _, cat := range categories {
		cat.ID = cuid.New()
		if err := queries.InsertCategoryIfMissing(ctx, cat); err != nil {
			return fmt.Errorf("seed category %s: %w", cat.Slug, err)
		}
	}

	fmt.Println("seed complete")
	return nil
}
