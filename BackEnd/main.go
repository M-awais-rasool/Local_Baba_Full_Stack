package main

import (
	"context"
	"fmt"
	"foodApp/envConfig"
	"foodApp/routes"
	"log"
	"os"
	"path/filepath"

	firebase "firebase.google.com/go"
	"google.golang.org/api/option"
)

func initializeFirebase() (*firebase.App, error) {
	currentDir, err := os.Getwd()
	if err != nil {
		return nil, fmt.Errorf("cannot get current directory: %v", err)
	}

	credentialsPath := filepath.Join(currentDir, "")

	if _, err := os.Stat(credentialsPath); os.IsNotExist(err) {
		return nil, fmt.Errorf("credentials file not found at %s", credentialsPath)
	}

	config := &firebase.Config{
		ProjectID: "localbaba-4ee69",
	}

	opt := option.WithCredentialsFile(credentialsPath)
	app, err := firebase.NewApp(context.Background(), config, opt)
	if err != nil {
		return nil, fmt.Errorf("error initializing Firebase: %v", err)
	}

	return app, nil
}

func init() {
	envConfig.LoadEnv()
}

func main() {
	firebaseApp, err := initializeFirebase()
	if err != nil {
		log.Fatalf("Failed to initialize Firebase: %v", err)
		return
	}
	router := routes.SetUpRoutes(firebaseApp)
	_, _, _, _, _, PORT, _ := envConfig.GetEnvVars()
	log.Println("Server is running on port 8080")
	log.Fatal(router.Run(PORT))
}
