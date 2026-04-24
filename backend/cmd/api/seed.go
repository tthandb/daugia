package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/lucsky/cuid"
	"golang.org/x/crypto/bcrypt"

	"github.com/daugia999/backend/internal/db"
)

func seedDB(ctx context.Context, queries *db.Queries) {
	// Seed admin user
	email := os.Getenv("ADMIN_EMAIL")
	password := os.Getenv("ADMIN_PASSWORD")
	if email == "" {
		email = "admin@daugia.vn"
	}
	if password == "" {
		password = "changeme123"
	}

	exists, err := queries.UserExists(ctx, email)
	if err != nil {
		log.Fatalf("failed to check user: %v", err)
	}

	if !exists {
		hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
		if err != nil {
			log.Fatalf("failed to hash password: %v", err)
		}
		_, err = queries.CreateUser(ctx, db.CreateUserParams{
			ID:           cuid.New(),
			Email:        email,
			PasswordHash: string(hash),
			Name:         "Nguyễn Văn Dương",
			Role:         "ADMIN",
		})
		if err != nil {
			log.Fatalf("failed to create admin: %v", err)
		}
		fmt.Printf("admin user created: %s\n", email)
	} else {
		fmt.Println("admin user already exists")
	}

	// Seed categories
	categories := []struct {
		Name      string
		Slug      string
		Color     string
		SortOrder int32
	}{
		{"Đấu Giá QSD Đất", "dau-gia-qsd-dat", "#A16207", 1},
		{"Tài Sản Thi Hành Án", "tai-san-thi-hanh-an", "#B45309", 2},
		{"Tài Sản Thanh Lý", "tai-san-thanh-ly", "#78350F", 3},
		{"Đấu Giá Phương Tiện", "dau-gia-phuong-tien", "#44403C", 4},
		{"Khác", "khac", "#57534E", 5},
	}

	for _, cat := range categories {
		_, err := queries.UpsertCategory(ctx, db.UpsertCategoryParams{
			ID:        cuid.New(),
			Name:      cat.Name,
			Slug:      cat.Slug,
			Color:     cat.Color,
			SortOrder: cat.SortOrder,
		})
		if err != nil {
			log.Printf("failed to upsert category %s: %v", cat.Name, err)
		} else {
			fmt.Printf("category: %s\n", cat.Name)
		}
	}

	fmt.Println("seed complete")
}
