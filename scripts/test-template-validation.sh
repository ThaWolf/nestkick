#!/bin/bash

# Template Validation Test Script for Nestkick CLI
# Tests that all generated templates compile without TypeScript errors

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NESTKICK_CLI="./dist/index.js"
TEST_DIR="/tmp/nestkick-template-tests"
TIMEOUT=120 # 2 minutes timeout for each compilation

# Test combinations
ORMS=("prisma" "typeorm" "sequelize")
DATABASES=("mysql" "postgres" "sqlite" "mongodb")
PACKAGE_MANAGERS=("npm")  # Only test npm for compilation

# Counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Clean up function
cleanup() {
    echo -e "${YELLOW}Cleaning up test directory...${NC}"
    rm -rf "$TEST_DIR"
}

# Set up cleanup trap
trap cleanup EXIT

# Create test directory
mkdir -p "$TEST_DIR"

echo -e "${BLUE}🚀 Starting Template Validation Tests${NC}"
echo -e "${BLUE}Testing that all generated templates compile without errors${NC}"
echo ""

# Function to test template compilation
test_template_compilation() {
    local orm=$1
    local db=$2
    local pm=$3
    local project_name="template-${orm}-${db}-${pm}"
    
    echo -e "${YELLOW}Testing compilation: ${orm} + ${db} + ${pm}${NC}"
    
    # Create project
    cd "$TEST_DIR"
    if ! timeout $TIMEOUT "$NESTKICK_CLI" create "$project_name" --orm "$orm" --db "$db" --pm "$pm" --docker > /dev/null 2>&1; then
        echo -e "${RED}❌ Failed to create project: ${project_name}${NC}"
        return 1
    fi
    
    # Install dependencies and compile
    cd "$project_name"
    if ! timeout $TIMEOUT npm install > /dev/null 2>&1; then
        echo -e "${RED}❌ Failed to install dependencies: ${project_name}${NC}"
        return 1
    fi
    
    # Generate ORM clients if needed
    if [[ "$orm" == "prisma" ]]; then
        if ! timeout $TIMEOUT npm run db:generate > /dev/null 2>&1; then
            echo -e "${RED}❌ Failed to generate Prisma client: ${project_name}${NC}"
            return 1
        fi
    fi
    
    # Test TypeScript compilation
    if ! timeout $TIMEOUT npm run build > /dev/null 2>&1; then
        echo -e "${RED}❌ TypeScript compilation failed: ${project_name}${NC}"
        return 1
    fi
    
    # Clean up individual project
    cd "$TEST_DIR"
    rm -rf "$project_name"
    
    echo -e "${GREEN}✅ Compilation passed: ${orm} + ${db} + ${pm}${NC}"
    return 0
}

# Function to test ORM-specific template combinations
test_orm_template_combinations() {
    local orm=$1
    
    echo -e "${BLUE}Testing ${orm} template compilation with all databases...${NC}"
    
    for db in "${DATABASES[@]}"; do
        # Skip invalid combinations
        if [[ "$orm" == "sequelize" && "$db" == "mongodb" ]]; then
            echo -e "${YELLOW}⏭️  Skipping: ${orm} + ${db} (not supported)${NC}"
            continue
        fi
        
        for pm in "${PACKAGE_MANAGERS[@]}"; do
            TOTAL_TESTS=$((TOTAL_TESTS + 1))
            
            if test_template_compilation "$orm" "$db" "$pm"; then
                PASSED_TESTS=$((PASSED_TESTS + 1))
            else
                FAILED_TESTS=$((FAILED_TESTS + 1))
            fi
        done
    done
}

# Main test execution
echo -e "${BLUE}Building Nestkick CLI...${NC}"
if ! npm run build > /dev/null 2>&1; then
    echo -e "${RED}❌ Failed to build CLI${NC}"
    exit 1
fi

echo -e "${GREEN}✅ CLI built successfully${NC}"
echo ""

# Test each ORM
for orm in "${ORMS[@]}"; do
    test_orm_template_combinations "$orm"
    echo ""
done

# Final results
echo -e "${BLUE}🎯 Template Validation Results${NC}"
echo -e "${BLUE}===============================${NC}"
echo -e "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}🎉 All template validations passed! All templates compile successfully.${NC}"
    exit 0
else
    echo -e "${RED}❌ Some template validations failed. Please check the template code.${NC}"
    exit 1
fi 