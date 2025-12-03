# QuickShop API Documentation

## Overview

The QuickShop API provides a comprehensive set of endpoints for managing an e-commerce platform, including user authentication, product management, order processing, and analytics. All API endpoints follow RESTful conventions and return JSON responses.

## Base URL

- **Development:** `http://localhost:5000/api`
- **Production:** `https://quickshop.echelonxventures.org/api`

## Authentication

Most API endpoints require authentication using JWT (JSON Web Tokens). Include the token in the `Authorization` header:

```
Authorization: Bearer <your-jwt-token>
```

## Response Format

All successful API responses follow this format:

```json
{
  "success": true,
  "data": { ... },
  "message": "Success message"
}
```

Error responses follow this format:

```json
{
  "success": false,
  "error": "Error message",
  "details": { ... } // optional
}
```

## Endpoints

### 1. Authentication

#### POST /auth/register
Register a new user

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "customer" // optional, defaults to 'customer'
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt-token",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "customer"
  },
  "message": "User registered successfully"
}
```

#### POST /auth/login
Login user

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt-token",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "customer"
  },
  "message": "Login successful"
}
```

#### GET /auth/profile
Get authenticated user profile

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "customer",
    "created_at": "2023-01-01T00:00:00Z"
  }
}
```

#### PUT /auth/profile
Update authenticated user profile

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "name": "John Smith",
  "email": "johnsmith@example.com"
}
```

### 2. Products

#### GET /products
Get all products with pagination and filtering

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 10)
- `category` (category ID)
- `minPrice`
- `maxPrice`
- `sortBy` (default: created_at)
- `sortOrder` (default: DESC)

**Response:**
```json
{
  "success": true,
  "products": [
    {
      "id": 1,
      "name": "iPhone 13",
      "description": "Latest iPhone",
      "price": 999.99,
      "category_id": 1,
      "stock_quantity": 50,
      "images": ["image1.jpg", "image2.jpg"],
      "rating": 4.5,
      "review_count": 10
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10
  }
}
```

#### GET /products/:id
Get product by ID

**Response:**
```json
{
  "success": true,
  "product": {
    "id": 1,
    "name": "iPhone 13",
    "description": "Latest iPhone",
    "price": 999.99,
    "category_id": 1,
    "category_name": "Electronics",
    "stock_quantity": 50,
    "images": ["image1.jpg", "image2.jpg"],
    "rating": 4.5,
    "review_count": 10,
    "specifications": {
      "weight": "174g",
      "display": "6.1-inch"
    }
  }
}
```

#### POST /products
Create a new product (admin/seller only)

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "New Product",
  "description": "Product description",
  "price": 29.99,
  "category_id": 2,
  "stock_quantity": 100,
  "images": ["product1.jpg", "product2.jpg"],
  "specifications": {
    "color": "Red",
    "size": "Medium"
  }
}
```

#### PUT /products/:id
Update a product (admin/seller only)

#### DELETE /products/:id
Delete a product (admin/seller only)

#### GET /products/search?q=keyword
Search products

#### GET /products/category/:categoryId
Get products by category

#### GET /products/recommended
Get recommended products for the authenticated user

### 3. Cart

#### GET /cart
Get cart items for authenticated user

**Response:**
```json
{
  "success": true,
  "cart": [
    {
      "id": 1,
      "product_id": 5,
      "product_name": "Nike Shoes",
      "quantity": 2,
      "price": 129.99,
      "total": 259.98
    }
  ],
  "total": 259.98
}
```

#### POST /cart
Add item to cart

**Request Body:**
```json
{
  "product_id": 5,
  "quantity": 1
}
```

#### PUT /cart/:productId
Update item quantity in cart

**Request Body:**
```json
{
  "quantity": 3
}
```

#### DELETE /cart/:productId
Remove item from cart

### 4. Orders

#### GET /orders
Get all orders for authenticated user

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 10)

#### POST /orders
Create a new order

**Request Body:**
```json
{
  "shipping_address_id": 1,
  "billing_address_id": 1,
  "payment_method": "stripe",
  "coupon_code": "WELCOME10" // optional
}
```

#### GET /orders/:id
Get order by ID

#### PUT /orders/:id/status
Update order status (admin/seller only)

**Request Body:**
```json
{
  "status": "shipped"
}
```

#### POST /orders/payment
Process payment for an order

**Request Body:**
```json
{
  "order_id": 1,
  "payment_method": "stripe",
  "payment_data": { ... } // payment gateway specific data
}
```

#### GET /orders/payment/methods
Get available payment methods

### 5. Reviews

#### GET /reviews/product/:productId
Get reviews for a product

#### POST /reviews
Create a new review

**Request Body:**
```json
{
  "product_id": 5,
  "rating": 5,
  "title": "Great product!",
  "review": "This product exceeded my expectations."
}
```

#### PUT /reviews/:id
Update a review

#### DELETE /reviews/:id
Delete a review

### 6. Wishlist

#### GET /wishlist
Get wishlist items for authenticated user

#### POST /wishlist
Add item to wishlist

**Request Body:**
```json
{
  "product_id": 5
}
```

#### DELETE /wishlist/:productId
Remove item from wishlist

### 7. Sellers

#### GET /sellers
Get all sellers

#### POST /sellers
Register as a seller

**Request Body:**
```json
{
  "business_name": "My Store",
  "business_email": "store@example.com",
  "business_phone": "+1234567890",
  "business_address": "123 Business St, City, State"
}
```

### 8. Categories

#### GET /categories
Get all categories

#### POST /categories
Create a new category (admin only)

### 9. Support Tickets

#### GET /support
Get support tickets for authenticated user

#### POST /support
Create a new support ticket

**Request Body:**
```json
{
  "subject": "Order issue",
  "message": "I have an issue with my order #123",
  "priority": "medium",
  "category": "technical"
}
```

#### GET /support/:id
Get support ticket by ID

#### POST /support/:id/reply
Reply to a support ticket

**Request Body:**
```json
{
  "message": "Thank you for your message, we're looking into this."
}
```

### 10. Analytics

#### GET /analytics/sales
Get sales analytics

#### GET /analytics/products
Get product performance analytics

#### GET /analytics/users
Get user analytics

## Error Codes

- `200`: Success
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `422`: Validation Error
- `500`: Server Error

## Rate Limiting

All endpoints are rate-limited to 100 requests per 15 minutes per IP address.

## CORS

The API supports CORS for requests from `http://localhost:3000` and `https://quickshop.echelonxventures.org`.

## Versioning

This is version 1 of the API. All endpoints are prefixed with `/api/v1` (not shown above for brevity).

## Security

- All sensitive data is transmitted over HTTPS
- JWT tokens expire after 7 days
- Passwords are hashed using bcrypt
- Input validation is performed on all endpoints
- Rate limiting is enforced
- SQL injection prevention is implemented

## Contact

For API support, contact: api-support@quickshop.echelonxventures.org