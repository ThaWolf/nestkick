#!/bin/bash

# Comprehensive Docker Build Test Script for Nestkick CLI
# Tests all combinations of ORM, Database, and Package Manager

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NESTKICK_CLI="./dist/index.js"
TEST_DIR="/tmp/nestkick-tests"
TIMEOUT=300 # 5 minutes timeout for each build

# Test combinations
ORMS=("prisma" "typeorm" "sequelize")
DATABASES=("mysql" "postgres" "sqlite" "mongodb")
PACKAGE_MANAGERS=("npm" "yarn" "pnpm")

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

echo -e "${BLUE}🚀 Starting Comprehensive Docker Build Tests${NC}"
echo -e "${BLUE}Testing all combinations of ORM, Database, and Package Manager${NC}"
echo ""

# Function to test a single combination
test_combination() {
    local orm=$1
    local db=$2
    local pm=$3
    local project_name="test-${orm}-${db}-${pm}"
    
    echo -e "${YELLOW}Testing: ${orm} + ${db} + ${pm}${NC}"
    
    # Create project
    cd "$TEST_DIR"
    if ! timeout $TIMEOUT "$NESTKICK_CLI" create "$project_name" --orm "$orm" --db "$db" --pm "$pm" --docker > /dev/null 2>&1; then
        echo -e "${RED}❌ Failed to create project: ${project_name}${NC}"
        return 1
    fi
    
    # Test Docker build
    cd "$project_name"
    if ! timeout $TIMEOUT docker build -t "$project_name" . > /dev/null 2>&1; then
        echo -e "${RED}❌ Docker build failed: ${project_name}${NC}"
        return 1
    fi
    
    # Clean up individual project
    cd "$TEST_DIR"
    rm -rf "$project_name"
    
    echo -e "${GREEN}✅ Passed: ${orm} + ${db} + ${pm}${NC}"
    return 0
}

# Function to test ORM-specific combinations
test_orm_combinations() {
    local orm=$1
    
    echo -e "${BLUE}Testing ${orm} with all databases and package managers...${NC}"
    
    for db in "${DATABASES[@]}"; do
        # Skip invalid combinations
        if [[ "$orm" == "sequelize" && "$db" == "mongodb" ]]; then
            echo -e "${YELLOW}⏭️  Skipping: ${orm} + ${db} (not supported)${NC}"
            continue
        fi
        
        for pm in "${PACKAGE_MANAGERS[@]}"; do
            TOTAL_TESTS=$((TOTAL_TESTS + 1))
            
            if test_combination "$orm" "$db" "$pm"; then
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
    test_orm_combinations "$orm"
    echo ""
done

# Final results
echo -e "${BLUE}🎯 Test Results Summary${NC}"
echo -e "${BLUE}========================${NC}"
echo -e "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed! Docker builds work for all combinations.${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed. Please check the Docker build configurations.${NC}"
    exit 1
fi 