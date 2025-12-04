#!/bin/bash

# QuickShop Final Verification Script
# Verifies that all components of the QuickShop platform are properly set up

echo "🔍 QuickShop Platform Verification Script"
echo "======================================="

# Check if all essential directories exist
echo "📁 Checking directory structure..."
ESSENTIAL_DIRS=("backend" "frontend" "admin_portal" "support_portal" "analytics_portal" "database" "docs" "deployment")
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

# Check for essential files
echo ""
echo "📄 Checking essential files..."
ESSENTIAL_FILES=(
    "backend/server.js"
    "backend/package.json" 
    "frontend/package.json"
    "database/schema.sql"
    "database/seed_data.sql"
    "deployment/prod-docker-compose.yml"
    "docs/api.md"
    "docs/prd.md"
    "docs/roadmap.md"
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

# Check Docker Compose file syntax
echo ""
echo "🐳 Checking Docker Compose file..."
if docker-compose -f deployment/prod-docker-compose.yml config --quiet 2>/dev/null; then
    echo "✅ Docker Compose file is valid"
else
    echo "❌ Docker Compose file has syntax errors"
fi

# Check if MySQL schema is valid (basic check)
echo ""
echo "🗄️  Checking database schema..."
if [ -f "database/schema.sql" ]; then
    if grep -q "CREATE TABLE" database/schema.sql && grep -q "FOREIGN KEY" database/schema.sql; then
        echo "✅ Database schema contains required elements"
    else
        echo "❌ Database schema may be incomplete"
    fi
else
    echo "❌ Database schema file not found"
fi

# Check for environment files
echo ""
echo "🔑 Checking environment configuration..."
if [ -f ".env" ] || [ -f "backend/.env" ] || [ -f "frontend/.env" ]; then
    echo "✅ Environment files present"
else
    echo "⚠️  Environment files not found (this might be intentional during setup)"
fi

# Check package.json dependencies
echo ""
echo "📦 Checking package dependencies..."
BACKEND_DEPS=("express" "mysql2" "bcryptjs" "jsonwebtoken" "cors" "helmet" "stripe" "razorpay" "paypal-rest-sdk")
FRONTEND_DEPS=("react" "react-router-dom" "@reduxjs/toolkit" "axios")

# Check backend dependencies
if [ -f "backend/package.json" ]; then
    BACKEND_MISSING=()
    for dep in "${BACKEND_DEPS[@]}"; do
        if ! grep -q "\"${dep}\"" backend/package.json; then
            BACKEND_MISSING+=("$dep")
        fi
    done
    
    if [ ${#BACKEND_MISSING[@]} -eq 0 ]; then
        echo "✅ Backend dependencies complete"
    else
        echo "⚠️  Missing backend dependencies: ${BACKEND_MISSING[*]}"
    fi
fi

# Check frontend dependencies
if [ -f "frontend/package.json" ]; then
    FRONTEND_MISSING=()
    for dep in "${FRONTEND_DEPS[@]}"; do
        if ! grep -q "\"${dep}\"" frontend/package.json; then
            FRONTEND_MISSING+=("$dep")
        fi
    done
    
    if [ ${#FRONTEND_MISSING[@]} -eq 0 ]; then
        echo "✅ Frontend dependencies complete"
    else
        echo "⚠️  Missing frontend dependencies: ${FRONTEND_MISSING[*]}"
    fi
fi

# Check for API route files
echo ""
echo "📡 Checking API routes..."
API_ROUTES=("auth" "products" "orders" "payments" "cart" "wishlist" "reviews" "users" "sellers" "inventory")
MISSING_ROUTES=()

for route in "${API_ROUTES[@]}"; do
    if [ ! -f "backend/$route/${route}Routes.js" ] && [ ! -f "backend/routes/${route}.js" ]; then
        MISSING_ROUTES+=("$route")
    fi
done

if [ ${#MISSING_ROUTES[@]} -eq 0 ]; then
    echo "✅ All API routes present"
else
    echo "⚠️  Missing API routes: ${MISSING_ROUTES[*]}"
fi

# Check for controller files
echo ""
echo "⚙️  Checking controllers..."
CONTROLLERS=("auth" "product" "order" "payment" "cart" "wishlist" "review" "user" "seller" "inventory" "chatbot" "analytics" "support")
MISSING_CONTROLLERS=()

for controller in "${CONTROLLERS[@]}"; do
    if [ ! -f "backend/$controller/${controller}Controller.js" ] && [ ! -f "backend/controllers/${controller}.js" ]; then
        MISSING_CONTROLLERS+=("$controller")
    fi
done

if [ ${#MISSING_CONTROLLERS[@]} -eq 0 ]; then
    echo "✅ All controllers present"
else
    echo "⚠️  Missing controllers: ${MISSING_CONTROLLERS[*]}"
fi

# Check for frontend components
echo ""
echo "🎨 Checking frontend components..."
REACT_COMPONENTS=("Header" "Footer" "ProductCard" "Cart" "Checkout" "UserProfile" "OrderHistory")
MISSING_COMPONENTS=()

for component in "${REACT_COMPONENTS[@]}"; do
    if [ ! -f "frontend/src/components/${component}.jsx" ] && [ ! -f "frontend/src/components/${component}.js" ]; then
        MISSING_COMPONENTS+=("$component")
    fi
done

if [ ${#MISSING_COMPONENTS[@]} -eq 0 ]; then
    echo "✅ All major React components present"
else
    echo "⚠️  Missing React components: ${MISSING_COMPONENTS[*]}"
fi

# Check for advanced features
echo ""
echo "🤖 Checking advanced features..."
ADVANCED_FEATURES=("chatbot" "analytics" "support_system" "ai_recommendations" "dynamic_pricing" "affiliate_system")
FEATURE_STATUS=()

# Check if chatbot exists
if [ -d "backend/chatbot" ] || grep -q "chatbot\|ai\|nlp" backend/package.json; then
    FEATURE_STATUS+=("Chatbot: ✅")
else
    FEATURE_STATUS+=("Chatbot: ❌")
fi

# Check if analytics exists
if [ -d "backend/analytics" ] || grep -q "analytics\|report\|dashboard" backend/package.json; then
    FEATURE_STATUS+=("Analytics: ✅")
else
    FEATURE_STATUS+=("Analytics: ❌")
fi

# Check if AI features exist
if grep -q "openai\|ai\|ml\|machine learning" backend/package.json; then
    FEATURE_STATUS+=("AI/ML: ✅")
else
    FEATURE_STATUS+=("AI/ML: ❌")
fi

for feature in "${FEATURE_STATUS[@]}"; do
    echo "  $feature"
done

# Check for admin portals
echo ""
echo "📋 Checking admin portals..."
PORTALS=("admin_portal" "support_portal" "analytics_portal" "seller_portal")
ACTIVE_PORTALS=()

for portal in "${PORTALS[@]}"; do
    if [ -d "$portal" ]; then
        if [ -f "$portal/package.json" ]; then
            ACTIVE_PORTALS+=("$portal: ✅")
        else
            ACTIVE_PORTALS+=("$portal: ⚠️ (missing package.json)")
        fi
    else
        ACTIVE_PORTALS+=("$portal: ❌")
    fi
done

for portal in "${ACTIVE_PORTALS[@]}"; do
    echo "  $portal"
done

# Final summary
echo ""
echo "📋 Verification Summary:"
echo "========================"
TOTAL_CHECKS=0
PASSED_CHECKS=0

# Count directory checks
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if [ ${#MISSING_DIRS[@]} -eq 0 ]; then PASSED_CHECKS=$((PASSED_CHECKS + 1)); fi

TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if [ ${#MISSING_FILES[@]} -eq 0 ]; then PASSED_CHECKS=$((PASSED_CHECKS + 1)); fi

TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if docker-compose -f deployment/prod-docker-compose.yml config --quiet 2>/dev/null; then PASSED_CHECKS=$((PASSED_CHECKS + 1)); fi

TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if [ -f "database/schema.sql" ] && grep -q "CREATE TABLE" database/schema.sql; then PASSED_CHECKS=$((PASSED_CHECKS + 1)); fi

SCORE=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))

echo "Passed: $PASSED_CHECKS/$TOTAL_CHECKS checks"
echo "Score: $SCORE%"

if [ $SCORE -ge 90 ]; then
    echo ""
    echo "🎉 Excellent! Platform is well-structured and ready for deployment!"
    echo "✅ QuickShop platform is properly configured and ready for production"
elif [ $SCORE -ge 70 ]; then
    echo ""
    echo "👍 Good! Platform is mostly complete with minor issues to address"
    echo "⚠️  Some components may need attention before production"
else
    echo ""
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