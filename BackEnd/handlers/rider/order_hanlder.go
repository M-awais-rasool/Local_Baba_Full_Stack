package rider

import (
	"context"
	"fmt"
	"foodApp/database"
	"foodApp/models"
	"foodApp/utils"
	"net/http"
	"time"

	firebase "firebase.google.com/go"
	"firebase.google.com/go/messaging"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

func Get_accepted_order(c *gin.Context) {
	token := c.GetHeader("Authorization")
	fmt.Println("Received token:", token)

	if token == "" {
		fmt.Println("Token is missing")
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Token missing"})
		return
	}

	_, err := utils.ValidateToken(token)
	if err != nil {
		fmt.Println("Invalid token:", err)
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Invalid token"})
		return
	}

	ctx := context.Background()
	collection := database.GetCollection("order")
	restaurantCollection := database.GetCollection("restaurants")
	userCollection := database.GetCollection("user")

	filter := bson.M{"status": "Accepted"}
	fmt.Println("Fetching orders with filter:", filter)
	cursor, err := collection.Find(ctx, filter)
	if err != nil {
		fmt.Println("Failed to fetch orders:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "Failed to fetch orders"})
		return
	}
	defer cursor.Close(ctx)

	var orders []models.Order
	var restaurant models.Restaurant
	var user models.User

	if err := cursor.All(ctx, &orders); err != nil {
		fmt.Println("Failed to parse orders:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "Failed to parse orders"})
		return
	}
	fmt.Println("Orders fetched successfully:", orders)

	groupedOrders := make(map[string]gin.H)
	for _, order := range orders {
		fmt.Println("Processing order:", order)

		if err := restaurantCollection.FindOne(ctx, bson.M{"_id": order.RestaurantID}).Decode(&restaurant); err != nil {
			fmt.Println("Failed to find restaurant for order:", order.OrderID, "Error:", err)
			c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Restaurant not found"})
			return
		}
		fmt.Println("Restaurant found:", restaurant)
		if err := userCollection.FindOne(ctx, bson.M{"_id": order.UserID}).Decode(&user); err != nil {
			fmt.Println("Failed to find user for order:", order.OrderID, "Error:", err)
			c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "User not found"})
			return
		}

		if _, exists := groupedOrders[order.OrderID]; !exists {
			groupedOrders[order.OrderID] = gin.H{
				"orderId":           order.OrderID,
				"userLatLong":       order.LatLong,
				"restaurantLatLong": restaurant.Location,
				"restaurantName":    restaurant.Name,
				"userName":          user.Name,
				"totalPrice":        0.0,
				"status":            order.Status,
				"createdAt":         order.CreatedAt,
			}
		}

		groupedOrders[order.OrderID]["totalPrice"] = groupedOrders[order.OrderID]["totalPrice"].(float64) + order.Price
		fmt.Println("Updated totalPrice for order:", order.OrderID, "New totalPrice:", groupedOrders[order.OrderID]["totalPrice"])
	}

	var response []gin.H
	for _, groupedOrder := range groupedOrders {
		response = append(response, groupedOrder)
	}
	fmt.Println("Final grouped orders response:", response)

	c.JSON(http.StatusOK, gin.H{"status": "success", "data": response})
}
func Order_assigned_for_rider(c *gin.Context, firebaseApp *firebase.App) {
	token := c.GetHeader("Authorization")
	if token == "" {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Token missing"})
		fmt.Println("Error: Token missing")
		return
	}
	fmt.Println("Token retrieved successfully")

	claims, err := utils.ValidateToken(token)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "message": "Invalid token"})
		fmt.Println("Error: Invalid token", err)
		return
	}
	fmt.Println("Token validated successfully")

	var body struct {
		Id string `json:"id"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		fmt.Println("Error: Invalid request body", err)
		return
	}
	fmt.Println("Request body parsed successfully:", body)

	collection := database.GetCollection("order")
	ctx := context.Background()

	riderID := (*claims)["userId"].(string)
	var existingOrder models.Order
	if err := collection.FindOne(ctx, bson.M{"rider_id": riderID, "status": "Assigned"}).Decode(&existingOrder); err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "You already have an assigned order"})
		fmt.Println("Error: Rider already has an assigned order")
		return
	} else if err != mongo.ErrNoDocuments {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check for existing orders"})
		fmt.Println("Error: Failed to check for existing orders", err)
		return
	}
	fmt.Println("No existing assigned orders for rider")

	var order models.Order
	if err := collection.FindOne(ctx, bson.M{"orderId": body.Id}).Decode(&order); err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
			fmt.Println("Error: Order not found", body.Id)
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve order"})
		fmt.Println("Error: Failed to retrieve order", err)
		return
	}
	fmt.Println("Order retrieved successfully:", order)

	if order.Status == "Assigned" {
		c.JSON(http.StatusConflict, gin.H{"error": "Order is already assigned to a rider"})
		fmt.Println("Error: Order is already assigned to a rider")
		return
	}

	update := bson.M{
		"$set": bson.M{
			"status":   "Assigned",
			"rider_id": riderID,
		},
	}
	_, err = collection.UpdateOne(ctx, bson.M{"orderId": body.Id}, update)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update order"})
		fmt.Println("Error: Failed to update order", err)
		return
	}
	fmt.Println("Order status updated successfully")

	userTokenCollection := database.GetCollection("fcm_tokens")
	var userToken models.FCMToken
	if err := userTokenCollection.FindOne(ctx, bson.M{"user_id": order.UserID}).Decode(&userToken); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve user FCM token"})
		fmt.Println("Error: Failed to retrieve user FCM token", err)
		return
	}
	fmt.Println("User FCM token retrieved successfully:", userToken.FCMToken)

	client, err := firebaseApp.Messaging(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to initialize Firebase messaging client",
			"details": err.Error(),
		})
		fmt.Println("Error: Failed to initialize Firebase messaging client", err)
		return
	}

	message := &messaging.Message{
		Token: userToken.FCMToken,
		Notification: &messaging.Notification{
			Title: "Order Assigned",
			Body:  "Your order has been assigned to a rider!",
		},
	}

	_, err = client.Send(ctx, message)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send notification"})
		fmt.Println("Error: Failed to send notification", err)
		return
	}
	fmt.Println("Notification sent successfully")

	c.JSON(http.StatusOK, gin.H{"status": "success", "message": "Order status updated and notification sent"})
	fmt.Println("Order status updated and notification sent successfully")
}

func Get_completed_orders_count(c *gin.Context) {
	token := c.GetHeader("Authorization")
	if token == "" {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "token missing"})
		return
	}

	claims, err := utils.ValidateToken(token)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "message": "invalid token"})
		return
	}

	riderID := (*claims)["userId"].(string)

	collection := database.GetCollection("order")
	ctx := context.Background()

	pipeline := mongo.Pipeline{
		{
			{Key: "$match", Value: bson.D{
				{Key: "status", Value: "Delivered"},
				{Key: "rider_id", Value: riderID},
			}},
		},
		{
			{Key: "$group", Value: bson.D{
				{Key: "_id", Value: "$orderId"},
			}},
		},
		{
			{Key: "$count", Value: "totalOrders"},
		},
	}

	cursor, err := collection.Aggregate(ctx, pipeline)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "Failed to count orders"})
		return
	}
	defer cursor.Close(ctx)

	var result []bson.M
	if err = cursor.All(ctx, &result); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "Failed to parse aggregation result"})
		return
	}

	totalOrders := 0
	if len(result) > 0 {
		if count, ok := result[0]["totalOrders"].(int32); ok {
			totalOrders = int(count)
		}
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "totalOrders": totalOrders})
}

func Get_new_orders_count(c *gin.Context) {
	token := c.GetHeader("Authorization")
	if token == "" {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "token missing"})
		return
	}

	_, err := utils.ValidateToken(token)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "message": "invalid token"})
		return
	}

	collection := database.GetCollection("order")
	ctx := context.Background()

	pipeline := mongo.Pipeline{
		{
			{Key: "$match", Value: bson.D{{Key: "status", Value: "Accepted"}}},
		},
		{
			{Key: "$group", Value: bson.D{
				{Key: "_id", Value: "$orderId"},
			}},
		},
		{
			{Key: "$count", Value: "totalOrders"},
		},
	}

	cursor, err := collection.Aggregate(ctx, pipeline)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "Failed to count orders"})
		return
	}
	defer cursor.Close(ctx)

	var result []bson.M
	if err = cursor.All(ctx, &result); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "Failed to parse aggregation result"})
		return
	}

	totalOrders := 0
	if len(result) > 0 {
		if count, ok := result[0]["totalOrders"].(int32); ok {
			totalOrders = int(count)
		}
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "totalOrders": totalOrders})
}

func Get_rider_assigned_order(c *gin.Context) {
	token := c.GetHeader("Authorization")

	if token == "" {
		fmt.Println("Token is missing")
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Token missing"})
		return
	}

	_, err := utils.ValidateToken(token)
	if err != nil {
		fmt.Println("Invalid token:", err)
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Invalid token"})
		return
	}

	claims, _ := utils.ValidateToken(token)
	userID := (*claims)["userId"].(string)

	ctx := context.Background()
	collection := database.GetCollection("order")
	restaurantCollection := database.GetCollection("restaurants")

	filter := bson.M{"rider_id": userID, "status": "Assigned"}
	fmt.Println("Fetching assigned orders for user:", userID, "with filter:", filter)
	cursor, err := collection.Find(ctx, filter)
	if err != nil {
		fmt.Println("Failed to fetch orders:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "Failed to fetch orders"})
		return
	}
	defer cursor.Close(ctx)

	var orders []models.Order
	var restaurant models.Restaurant

	if err := cursor.All(ctx, &orders); err != nil {
		fmt.Println("Failed to parse orders:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "Failed to parse orders"})
		return
	}
	fmt.Println("Orders fetched successfully:", orders)

	groupedOrders := make(map[string]gin.H)
	for _, order := range orders {
		fmt.Println("Processing order:", order)

		if err := restaurantCollection.FindOne(ctx, bson.M{"_id": order.RestaurantID}).Decode(&restaurant); err != nil {
			fmt.Println("Failed to find restaurant for order:", order.OrderID, "Error:", err)
			c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Restaurant not found"})
			return
		}
		fmt.Println("Restaurant found:", restaurant)

		if _, exists := groupedOrders[order.OrderID]; !exists {
			groupedOrders[order.OrderID] = gin.H{
				"orderId":           order.OrderID,
				"userLatLong":       order.LatLong,
				"restaurantLatLong": restaurant.Location,
				"restaurantName":    restaurant.Name,
				"totalPrice":        0.0,
				"status":            order.Status,
				"createdAt":         order.CreatedAt,
			}
		}

		groupedOrders[order.OrderID]["totalPrice"] = groupedOrders[order.OrderID]["totalPrice"].(float64) + order.Price
		fmt.Println("Updated totalPrice for order:", order.OrderID, "New totalPrice:", groupedOrders[order.OrderID]["totalPrice"])
	}

	var response []gin.H
	for _, groupedOrder := range groupedOrders {
		response = append(response, groupedOrder)
	}
	fmt.Println("Final grouped orders response:", response)

	c.JSON(http.StatusOK, gin.H{"status": "success", "data": response})
}

func Picked_order(c *gin.Context, firebaseApp *firebase.App) {
	token := c.GetHeader("Authorization")
	if token == "" {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Token missing"})
		return
	}

	_, err := utils.ValidateToken(token)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "message": "Invalid token"})
		return
	}

	var body struct {
		Id string `json:"id"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	collection := database.GetCollection("order")
	ctx := context.Background()

	var order models.Order
	if err := collection.FindOne(ctx, bson.M{"orderId": body.Id}).Decode(&order); err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve order"})
		return
	}

	userTokenCollection := database.GetCollection("fcm_tokens")
	var userToken models.FCMToken
	if err := userTokenCollection.FindOne(ctx, bson.M{"user_id": order.UserID}).Decode(&userToken); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve user FCM token"})
		return
	}

	client, err := firebaseApp.Messaging(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to initialize Firebase messaging client",
			"details": err.Error(),
		})
		return
	}

	message := &messaging.Message{
		Token: userToken.FCMToken,
		Notification: &messaging.Notification{
			Title: "Order Picked Up",
			Body:  "Your order is now being picked up by rider",
		},
	}

	_, err = client.Send(ctx, message)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send notification"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "message": "Order status updated and notification sent"})
}

func Deliverd_order(c *gin.Context, firebaseApp *firebase.App) {
	token := c.GetHeader("Authorization")
	if token == "" {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Token missing"})
		return
	}

	_, err := utils.ValidateToken(token)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "message": "Invalid token"})
		return
	}

	var body struct {
		Id string `json:"id"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	collection := database.GetCollection("order")
	ctx := context.Background()

	var order models.Order
	if err := collection.FindOne(ctx, bson.M{"orderId": body.Id}).Decode(&order); err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve order"})
		return
	}

	if order.Status == "Delivered" {
		c.JSON(http.StatusConflict, gin.H{"error": "Order is already assigned to a rider"})
		return
	}

	update := bson.M{
		"$set": bson.M{
			"status": "Delivered",
		},
	}
	_, err = collection.UpdateOne(ctx, bson.M{"orderId": body.Id}, update)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update order"})
		return
	}

	userTokenCollection := database.GetCollection("fcm_tokens")
	var userToken models.FCMToken
	if err := userTokenCollection.FindOne(ctx, bson.M{"user_id": order.UserID}).Decode(&userToken); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve user FCM token"})
		return
	}
	client, err := firebaseApp.Messaging(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to initialize Firebase messaging client",
			"details": err.Error(),
		})
		return
	}

	message := &messaging.Message{
		Token: userToken.FCMToken,
		Notification: &messaging.Notification{
			Title: "Order Delivered",
			Body:  "Your order has been delivered by rider",
		},
	}

	_, err = client.Send(ctx, message)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send notification"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "message": "Order status updated and notification sent"})
}

func Get_notification(c *gin.Context) {
	token := c.GetHeader("Authorization")
	fmt.Println("Received token:", token)

	if token == "" {
		fmt.Println("Token is missing")
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Token missing"})
		return
	}

	_, err := utils.ValidateToken(token)
	if err != nil {
		fmt.Println("Invalid token:", err)
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Invalid token"})
		return
	}

	ctx := context.Background()
	orderCollection := database.GetCollection("order")
	restaurantCollection := database.GetCollection("restaurants")
	userCollection := database.GetCollection("user")

	filter := bson.M{"status": "Accepted"}
	fmt.Println("Fetching orders with filter:", filter)
	cursor, err := orderCollection.Find(ctx, filter)
	if err != nil {
		fmt.Println("Failed to fetch orders:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "Failed to fetch orders"})
		return
	}
	defer cursor.Close(ctx)

	var orders []models.Order
	var restaurant models.Restaurant
	var user models.User

	if err := cursor.All(ctx, &orders); err != nil {
		fmt.Println("Failed to parse orders:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "Failed to parse orders"})
		return
	}
	fmt.Println("Orders fetched successfully:", orders)

	groupedOrders := make(map[string]gin.H)
	for _, order := range orders {
		fmt.Println("Processing order:", order)

		if err := restaurantCollection.FindOne(ctx, bson.M{"_id": order.RestaurantID}).Decode(&restaurant); err != nil {
			fmt.Println("Failed to find restaurant for order:", order.OrderID, "Error:", err)
			c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Restaurant not found"})
			return
		}
		fmt.Println("Restaurant found:", restaurant)

		if err := userCollection.FindOne(ctx, bson.M{"_id": order.UserID}).Decode(&user); err != nil {
			fmt.Println("Failed to find user for order:", order.OrderID, "Error:", err)
			c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "User not found"})
			return
		}
		fmt.Println("User found:", user)

		if _, exists := groupedOrders[order.OrderID]; !exists {
			groupedOrders[order.OrderID] = gin.H{
				"orderId":           order.OrderID,
				"userLatLong":       order.LatLong,
				"userName":          user.Name,
				"restaurantLatLong": restaurant.Location,
				"restaurantName":    restaurant.Name,
				"totalPrice":        0.0,
				"status":            order.Status,
				"createdAt":         order.CreatedAt,
			}
		}

		groupedOrders[order.OrderID]["totalPrice"] = groupedOrders[order.OrderID]["totalPrice"].(float64) + order.Price
		fmt.Println("Updated totalPrice for order:", order.OrderID, "New totalPrice:", groupedOrders[order.OrderID]["totalPrice"])
	}

	var response []gin.H
	for _, groupedOrder := range groupedOrders {
		response = append(response, groupedOrder)
	}
	fmt.Println("Final grouped orders response:", response)

	c.JSON(http.StatusOK, gin.H{"status": "success", "data": response})
}

func GetTodayDeliveredOrders(c *gin.Context) {
	token := c.GetHeader("Authorization")
	fmt.Println("Received token:", token)

	if token == "" {
		fmt.Println("Token is missing")
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Token missing"})
		return
	}

	_, err := utils.ValidateToken(token)
	if err != nil {
		fmt.Println("Invalid token:", err)
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Invalid token"})
		return
	}

	ctx := context.Background()
	collection := database.GetCollection("order")
	restaurantCollection := database.GetCollection("restaurants")
	userCollection := database.GetCollection("user")

	now := time.Now()
	startOfDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	endOfDay := startOfDay.Add(24 * time.Hour)

	filter := bson.M{
		"status": "Delivered",
		"createdAt": bson.M{
			"$gte": startOfDay,
			"$lt":  endOfDay,
		},
	}
	fmt.Println("Fetching orders with filter:", filter)

	cursor, err := collection.Find(ctx, filter)
	if err != nil {
		fmt.Println("Failed to fetch orders:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "Failed to fetch orders"})
		return
	}
	defer cursor.Close(ctx)

	var orders []models.Order
	if err := cursor.All(ctx, &orders); err != nil {
		fmt.Println("Failed to parse orders:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "Failed to parse orders"})
		return
	}
	fmt.Println("Orders fetched successfully:", orders)

	groupedOrders := make(map[string]gin.H)
	for _, order := range orders {
		fmt.Println("Processing order:", order)

		var restaurant models.Restaurant
		if err := restaurantCollection.FindOne(ctx, bson.M{"_id": order.RestaurantID}).Decode(&restaurant); err != nil {
			fmt.Println("Failed to find restaurant for order:", order.OrderID, "Error:", err)
			c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "Restaurant not found"})
			return
		}
		fmt.Println("Restaurant found:", restaurant)

		var user models.User
		if err := userCollection.FindOne(ctx, bson.M{"_id": order.UserID}).Decode(&user); err != nil {
			fmt.Println("Failed to find user for order:", order.OrderID, "Error:", err)
			c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "User not found"})
			return
		}

		if _, exists := groupedOrders[order.OrderID]; !exists {
			groupedOrders[order.OrderID] = gin.H{
				"orderId":           order.OrderID,
				"userLatLong":       order.LatLong,
				"restaurantLatLong": restaurant.Location,
				"restaurantName":    restaurant.Name,
				"userName":          user.Name,
				"totalPrice":        0.0,
				"status":            order.Status,
				"createdAt":         order.CreatedAt,
			}
		}

		groupedOrders[order.OrderID]["totalPrice"] = groupedOrders[order.OrderID]["totalPrice"].(float64) + order.Price
		fmt.Println("Updated totalPrice for order:", order.OrderID, "New totalPrice:", groupedOrders[order.OrderID]["totalPrice"])
	}

	var response []gin.H
	for _, groupedOrder := range groupedOrders {
		response = append(response, groupedOrder)
	}
	fmt.Println("Final grouped orders response:", response)

	c.JSON(http.StatusOK, gin.H{"status": "success", "data": response})
}
