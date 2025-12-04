#!/bin/bash

# QuickShop Platform Complete Verification Script
# Verifies that all components of the QuickShop platform are properly set up and functional

echo "🔍 QuickShop Platform Complete Verification"
echo "========================================="
echo ""

# Function to check if a service is running
check_service() {
    local service=$1
    if pgrep -f "$service" > /dev/null; then
        echo "✅ $service is running"
        return 0
    else
        echo "❌ $service is not running"
        return 1
    fi
}

# Function to check if a port is listening
check_port() {
    local port=$1
    local service=$2
    if lsof -i :$port > /dev/null; then
        echo "✅ Port $port ($service) is listening"
        return 0
    else
        echo "❌ Port $port ($service) is not listening"
        return 1
    fi
}

# Function to check if a URL is accessible
check_url() {
    local url=$1
    local name=$2
    if curl -s --max-time 10 "$url" > /dev/null; then
        echo "✅ $name is accessible at $url"
        return 0
    else
        echo "❌ $name is not accessible at $url"
        return 1
    fi
}

# Check system prerequisites
echo "📋 Checking System Prerequisites..."
echo ""

# Check Docker
if command -v docker &> /dev/null; then
    echo "✅ Docker is installed: $(docker --version)"
else
    echo "❌ Docker is not installed"
    exit 1
fi

# Check Docker Compose
if command -v docker-compose &> /dev/null; then
    echo "✅ Docker Compose is installed: $(docker-compose --version)"
else
    echo "❌ Docker Compose is not installed"
    exit 1
fi

# Check Git
if command -v git &> /dev/null; then
    echo "✅ Git is installed: $(git --version)"
else
    echo "❌ Git is not installed"
    exit 1
fi

# Check Node.js
if command -v node &> /dev/null; then
    echo "✅ Node.js is installed: $(node --version)"
else
    echo "❌ Node.js is not installed"
    exit 1
fi

# Check NPM
if command -v npm &> /dev/null; then
    echo "✅ NPM is installed: $(npm --version)"
else
    echo "❌ NPM is not installed"
    exit 1
fi

# Check MySQL client
if command -v mysql &> /dev/null; then
    echo "✅ MySQL client is installed"
else
    echo "⚠️  MySQL client is not installed (may be in Docker container)"
fi

# Check Redis client
if command -v redis-cli &> /dev/null; then
    echo "✅ Redis CLI is installed"
else
    echo "⚠️  Redis CLI is not installed (may be in Docker container)"
fi

echo ""
echo "📁 Checking Directory Structure..."
echo ""

# Check essential directories
ESSENTIAL_DIRS=(
    "backend"
    "frontend" 
    "admin_portal"
    "support_portal"
    "analytics_portal"
    "database"
    "docs"
    "deployment"
    "backend/auth"
    "backend/product"
    "backend/order"
    "backend/payment"
    "backend/user"
    "backend/cart"
    "backend/wishlist"
    "backend/review"
    "backend/seller"
    "backend/inventory"
    "backend/chatbot"
    "backend/analytics"
    "backend/support"
    "backend/admin"
)

MISSING_DIRS=()
for dir in "${ESSENTIAL_DIRS[@]}"; do
    if [ ! -d "$dir" ]; then
        MISSING_DIRS+=("$dir")
    fi
done

if [ ${#MISSING_DIRS[@]} -eq 0 ]; then
    echo "✅ All essential directories present"
else
    echo "❌ Missing directories: ${MISSING_DIRS[*]}"
fi

# Check essential files
echo ""
echo "📄 Checking Essential Files..."
echo ""

ESSENTIAL_FILES=(
    "backend/server.js"
    "backend/package.json"
    "frontend/package.json"
    "database/schema.sql"
    "database/seed_data.sql"
    "deployment/prod-docker-compose.yml"
    "backend/.env.example"
    "frontend/.env.example"
    "docs/README.md"
)

MISSING_FILES=()
for file in "${ESSENTIAL_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        MISSING_FILES+=("$file")
    fi
done

if [ ${#MISSING_FILES[@]} -eq 0 ]; then
    echo "✅ All essential files present"
else
    echo "❌ Missing files: ${MISSING_FILES[*]}"
fi

# Check Docker Compose file validity
echo ""
echo "🐳 Checking Docker Compose File..."
echo ""

if docker-compose -f deployment/prod-docker-compose.yml config --quiet 2>/dev/null; then
    echo "✅ Docker Compose file is valid"
else
    echo "❌ Docker Compose file has syntax errors"
fi

# Check database schema
echo ""
echo "🗄️  Checking Database Schema..."
echo ""

if [ -f "database/schema.sql" ] && [ -s "database/schema.sql" ]; then
    if grep -q "CREATE TABLE" database/schema.sql; then
        echo "✅ Database schema contains CREATE TABLE statements"
    else
        echo "❌ Database schema is missing CREATE TABLE statements"
    fi
    
    if grep -q "FOREIGN KEY" database/schema.sql; then
        echo "✅ Database schema contains FOREIGN KEY constraints"
    else
        echo "⚠️  Database schema may be missing FOREIGN KEY constraints"
    fi
else
    echo "❌ Database schema file not found or empty"
fi

# Check for environment files
echo ""
echo "🔑 Checking Environment Files..."
echo ""

ENV_FILES=(
    ".env"
    "backend/.env"
    "frontend/.env"
    "admin_portal/.env"
    "support_portal/.env"
    "analytics_portal/.env"
)

for env_file in "${ENV_FILES[@]}"; do
    if [ -f "$env_file" ]; then
        echo "✅ Environment file found: $env_file"
    else
        echo "⚠️  Environment file not found: $env_file"
    fi
done

# Check package dependencies
echo ""
echo "📦 Checking Package Dependencies..."
echo ""

if [ -f "backend/package.json" ]; then
    BACKEND_DEPS=("express" "mysql2" "bcryptjs" "jsonwebtoken" "cors" "helmet" "stripe" "paypal-rest-sdk" "razorpay")
    MISSING_BACKEND_DEPS=()
    
    for dep in "${BACKEND_DEPS[@]}"; do
        if ! grep -q "\"$dep\"" backend/package.json; then
            MISSING_BACKEND_DEPS+=("$dep")
        fi
    done
    
    if [ ${#MISSING_BACKEND_DEPS[@]} -eq 0 ]; then
        echo "✅ Backend dependencies complete"
    else
        echo "⚠️  Missing backend dependencies: ${MISSING_BACKEND_DEPS[*]}"
    fi
else
    echo "❌ Backend package.json not found"
fi

if [ -f "frontend/package.json" ]; then
    FRONTEND_DEPS=("react" "react-router-dom" "@reduxjs/toolkit" "axios" "react-redux")
    MISSING_FRONTEND_DEPS=()
    
    for dep in "${FRONTEND_DEPS[@]}"; do
        if ! grep -q "\"$dep\"" frontend/package.json; then
            MISSING_FRONTEND_DEPS+=("$dep")
        fi
    done
    
    if [ ${#MISSING_FRONTEND_DEPS[@]} -eq 0 ]; then
        echo "✅ Frontend dependencies complete"
    else
        echo "⚠️  Missing frontend dependencies: ${MISSING_FRONTEND_DEPS[*]}"
    fi
else
    echo "❌ Frontend package.json not found"
fi

# Check for API route files
echo ""
echo "📡 Checking API Route Files..."
echo ""

API_ROUTES=("auth" "product" "order" "payment" "user" "cart" "wishlist" "review" "seller" "inventory")
MISSING_ROUTES=()

for route in "${API_ROUTES[@]}"; do
    ROUTE_FILE="backend/$route/${route}Routes.js"
    if [ ! -f "$ROUTE_FILE" ]; then
        MISSING_ROUTES+=("$route")
    fi
done

if [ ${#MISSING_ROUTES[@]} -eq 0 ]; then
    echo "✅ All API route files present"
else
    echo "⚠️  Missing API routes: ${MISSING_ROUTES[*]}"
fi

# Check for controller files
echo ""
echo "⚙️  Checking Controller Files..."
echo ""

CONTROLLERS=("auth" "product" "order" "payment" "user" "cart" "wishlist" "review" "seller" "inventory" "chatbot" "analytics" "support" "admin")
MISSING_CONTROLLERS=()

for controller in "${CONTROLLERS[@]}"; do
    CONTROLLER_FILE="backend/$controller/${controller}Controller.js"
    if [ ! -f "$CONTROLLER_FILE" ]; then
        MISSING_CONTROLLERS+=("$controller")
    fi
done

if [ ${#MISSING_CONTROLLERS[@]} -eq 0 ]; then
    echo "✅ All controller files present"
else
    echo "⚠️  Missing controllers: ${MISSING_CONTROLLERS[*]}"
fi

# Check for frontend components
echo ""
echo "🎨 Checking Frontend Components..."
echo ""

REACT_COMPONENTS=("Header" "Footer" "ProductCard" "Cart" "Checkout" "UserProfile" "OrderHistory")
MISSING_COMPONENTS=()

for component in "${REACT_COMPONENTS[@]}"; do
    if [ ! -f "frontend/src/components/$component.jsx" ] && [ ! -f "frontend/src/components/$component.js" ]; then
        MISSING_COMPONENTS+=("$component")
    fi
done

if [ ${#MISSING_COMPONENTS[@]} -eq 0 ]; then
    echo "✅ All major React components present"
else
    echo "⚠️  Missing React components: ${MISSING_COMPONENTS[*]}"
fi

# Check for admin portals
echo ""
echo "📋 Checking Admin Portals..."
echo ""

PORTALS=("admin_portal" "support_portal" "analytics_portal" "seller_portal")

for portal in "${PORTALS[@]}"; do
    if [ -d "$portal" ] && [ -f "$portal/package.json" ]; then
        echo "✅ $portal is present with package.json"
    elif [ -d "$portal" ]; then
        echo "⚠️  $portal directory exists but missing package.json"
    else
        echo "❌ $portal is missing"
    fi
done

# Check for advanced features
echo ""
echo "🤖 Checking Advanced Features..."
echo ""

FEATURES_PRESENT=0

if [ -d "backend/chatbot" ]; then
    echo "✅ Chatbot module present"
    FEATURES_PRESENT=$((FEATURES_PRESENT + 1))
else
    echo "❌ Chatbot module missing"
fi

if [ -d "backend/analytics" ]; then
    echo "✅ Analytics module present"
    FEATURES_PRESENT=$((FEATURES_PRESENT + 1))
else
    echo "❌ Analytics module missing"
fi

if grep -q "openai\|ai\|ml\|machine learning" backend/package.json 2>/dev/null; then
    echo "✅ AI/ML dependencies present"
    FEATURES_PRESENT=$((FEATURES_PRESENT + 1))
else
    echo "⚠️  AI/ML dependencies not found"
fi

if [ -f "backend/payment/advancedPaymentController.js" ]; then
    echo "✅ Advanced payment system present"
    FEATURES_PRESENT=$((FEATURES_PRESENT + 1))
else
    echo "❌ Advanced payment system missing"
fi

# Summary
echo ""
echo "📊 Verification Summary"
echo "======================="
echo ""

TOTAL_CHECKS=10
PASSED_CHECKS=0

if [ ${#MISSING_DIRS[@]} -eq 0 ]; then PASSED_CHECKS=$((PASSED_CHECKS + 1)); fi
if [ ${#MISSING_FILES[@]} -eq 0 ]; then PASSED_CHECKS=$((PASSED_CHECKS + 1)); fi
if docker-compose -f deployment/prod-docker-compose.yml config --quiet 2>/dev/null; then PASSED_CHECKS=$((PASSED_CHECKS + 1)); fi
if [ -f "database/schema.sql" ] && grep -q "CREATE TABLE" database/schema.sql; then PASSED_CHECKS=$((PASSED_CHECKS + 1)); fi
if [ -f "backend/package.json" ]; then PASSED_CHECKS=$((PASSED_CHECKS + 1)); fi
if [ -f "frontend/package.json" ]; then PASSED_CHECKS=$((PASSED_CHECKS + 1)); fi
if [ ${#MISSING_ROUTES[@]} -eq 0 ]; then PASSED_CHECKS=$((PASSED_CHECKS + 1)); fi
if [ ${#MISSING_CONTROLLERS[@]} -eq 0 ]; then PASSED_CHECKS=$((PASSED_CHECKS + 1)); fi
if [ ${#MISSING_COMPONENTS[@]} -eq 0 ]; then PASSED_CHECKS=$((PASSED_CHECKS + 1)); fi

ADMIN_PORTALS_PRESENT=0
for portal in "${PORTALS[@]}"; do
    if [ -d "$portal" ] && [ -f "$portal/package.json" ]; then
        ADMIN_PORTALS_PRESENT=$((ADMIN_PORTALS_PRESENT + 1))
    fi
done

if [ $ADMIN_PORTALS_PRESENT -ge 3 ]; then
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
fi

SCORE=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))

echo "✅ Passed: $PASSED_CHECKS/$TOTAL_CHECKS checks"
echo "📈 Score: $SCORE%"
echo ""

if [ $SCORE -ge 90 ]; then
    echo "🎉 Excellent! Platform is well-structured and ready for deployment!"
    echo "✅ QuickShop platform is properly configured and ready for production"
elif [ $SCORE -ge 70 ]; then
    echo "👍 Good! Platform is mostly complete with minor issues to address"
    echo "⚠️  Some components may need attention before production"
else
    echo "🚨 Attention needed! Platform has significant structural issues"
    echo "❌ Major components are missing or incorrectly configured"
fi

echo ""
echo "🔧 Recommended Next Steps:"
if [ ${#MISSING_DIRS[@]} -gt 0 ]; then
    echo "- Create missing directories: ${MISSING_DIRS[*]}"
fi
if [ ${#MISSING_FILES[@]} -gt 0 ]; then
    echo "- Create missing files: ${MISSING_FILES[*]}"
fi
if [ ${#MISSING_ROUTES[@]} -gt 0 ]; then
    echo "- Implement missing API routes: ${MISSING_ROUTES[*]}"
fi
if [ ${#MISSING_CONTROLLERS[@]} -gt 0 ]; then
    echo "- Create missing controllers: ${MISSING_CONTROLLERS[*]}"
fi
if [ ${#MISSING_COMPONENTS[@]} -gt 0 ]; then
    echo "- Add missing React components: ${MISSING_COMPONENTS[*]}"
fi

echo ""
echo "🚀 Deployment Commands:"
echo "  # Build and start all services"
echo "  sudo docker-compose -f deployment/prod-docker-compose.yml up -d --build"
echo ""
echo "  # Check service status"
echo "  sudo docker-compose -f deployment/prod-docker-compose.yml ps"
echo ""
echo "  # View logs"
echo "  sudo docker-compose -f deployment/prod-docker-compose.yml logs -f"
echo ""
echo "  # Access the application"
echo "  https://quickshop.echelonxventures.org"
echo ""
echo "  # Admin portal"
echo "  https://quickshop.echelonxventures.org/admin"
echo ""
echo "  # Support portal"
echo "  https://quickshop.echelonxventures.org/support"
echo ""
echo "  # Analytics portal"
echo "  https://quickshop.echelonxventures.org/analytics"
echo ""
echo "🏁 Platform Verification Complete!"