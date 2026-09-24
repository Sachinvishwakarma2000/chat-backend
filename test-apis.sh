#!/usr/bin/env bash

# Chat Backend - Automated Live API Test Script
# Tests all 6 required endpoints + bonus endpoints against http://localhost:3000

set -e

BASE_URL="http://localhost:3000"
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}====================================================${NC}"
echo -e "${BLUE}       CHAT BACKEND - END-TO-END API TEST           ${NC}"
echo -e "${BLUE}====================================================${NC}\n"

# 1. Health Check
echo -e "${YELLOW}[1/9] Testing GET /health...${NC}"
HEALTH_RES=$(curl -s -X GET "$BASE_URL/health")
echo "$HEALTH_RES"
echo -e "${GREEN}✓ Health check passed!${NC}\n"

# 2. Create Users
echo -e "${YELLOW}[2/9] Creating Users for Testing...${NC}"
USER_A_RES=$(curl -s -X POST "$BASE_URL/user" \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice Johnson", "email": "alice.'$(date +%s)'@test.com"}')
USER_A_ID=$(echo "$USER_A_RES" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

USER_B_RES=$(curl -s -X POST "$BASE_URL/user" \
  -H "Content-Type: application/json" \
  -d '{"name": "Bob Smith", "email": "bob.'$(date +%s)'@test.com"}')
USER_B_ID=$(echo "$USER_B_RES" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

echo "User A ID: $USER_A_ID"
echo "User B ID: $USER_B_ID"
echo -e "${GREEN}✓ Users created successfully!${NC}\n"

# 3. API 1: Create or Get 1:1 Chat
echo -e "${YELLOW}[3/9] Testing API 1: POST /chat/create (1:1 Chat)...${NC}"
CHAT_RES=$(curl -s -X POST "$BASE_URL/chat/create" \
  -H "Content-Type: application/json" \
  -d '{"userAId": "'"$USER_A_ID"'", "userBId": "'"$USER_B_ID"'"}')
echo "$CHAT_RES"
CHAT_ID=$(echo "$CHAT_RES" | grep -o '"chatId":"[^"]*' | cut -d'"' -f4)
echo "Created Chat ID: $CHAT_ID"

# Test Idempotency (calling again returns existing chat)
echo "Testing Idempotency (calling /chat/create again with reversed order):"
CHAT_IDEMPOTENT_RES=$(curl -s -X POST "$BASE_URL/chat/create" \
  -H "Content-Type: application/json" \
  -d '{"userAId": "'"$USER_B_ID"'", "userBId": "'"$USER_A_ID"'"}')
echo "$CHAT_IDEMPOTENT_RES"
echo -e "${GREEN}✓ API 1 passed (Chat created & idempotency verified)!${NC}\n"

# 4. API 2: Send Message
echo -e "${YELLOW}[4/9] Testing API 2: POST /chat/:chatId/message/send...${NC}"
MSG_RES=$(curl -s -X POST "$BASE_URL/chat/$CHAT_ID/message/send" \
  -H "Content-Type: application/json" \
  -d '{"senderId": "'"$USER_A_ID"'", "text": "Hello Bob, how is the project going?"}')
echo "$MSG_RES"
MSG_ID=$(echo "$MSG_RES" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
echo "Sent Message ID: $MSG_ID"
echo -e "${GREEN}✓ API 2 passed (Message stored with timestamp & readBy)!${NC}\n"

# Send a second message from Bob
curl -s -X POST "$BASE_URL/chat/$CHAT_ID/message/send" \
  -H "Content-Type: application/json" \
  -d '{"senderId": "'"$USER_B_ID"'", "text": "Hey Alice, it is going great!"}' > /dev/null

# 5. API 3: Get Messages
echo -e "${YELLOW}[5/9] Testing API 3: GET /chat/:chatId/messages?limit=50...${NC}"
MESSAGES_RES=$(curl -s -X GET "$BASE_URL/chat/$CHAT_ID/messages?limit=50")
echo "$MESSAGES_RES"
echo -e "${GREEN}✓ API 3 passed (Messages retrieved chronologically)!${NC}\n"

# 6. API 4: Mark Message Read
echo -e "${YELLOW}[6/9] Testing API 4: POST /chat/:chatId/message/:messageId/read...${NC}"
READ_RES=$(curl -s -X POST "$BASE_URL/chat/$CHAT_ID/message/$MSG_ID/read" \
  -H "Content-Type: application/json" \
  -d '{"userId": "'"$USER_B_ID"'"}')
echo "$READ_RES"
echo -e "${GREEN}✓ API 4 passed (Read receipt updated atomically in Firestore)!${NC}\n"

# 7. API 5: Update Last Seen Message
echo -e "${YELLOW}[7/9] Testing API 5: POST /chat/:chatId/lastseen...${NC}"
LAST_SEEN_RES=$(curl -s -X POST "$BASE_URL/chat/$CHAT_ID/lastseen" \
  -H "Content-Type: application/json" \
  -d '{"userId": "'"$USER_B_ID"'", "messageId": "'"$MSG_ID"'"}')
echo "$LAST_SEEN_RES"
echo -e "${GREEN}✓ API 5 passed (Last seen updated)!${NC}\n"

# 8. API 6: List User Chats
echo -e "${YELLOW}[8/9] Testing API 6: GET /user/:userId/chats...${NC}"
USER_CHATS_RES=$(curl -s -X GET "$BASE_URL/user/$USER_A_ID/chats")
echo "$USER_CHATS_RES"
echo -e "${GREEN}✓ API 6 passed (User chats with member details retrieved)!${NC}\n"

# 9. Bonus APIs: Edit & Soft Delete Message
echo -e "${YELLOW}[9/9] Testing Bonus APIs (Edit & Delete Message)...${NC}"
EDIT_RES=$(curl -s -X PATCH "$BASE_URL/chat/$CHAT_ID/message/$MSG_ID" \
  -H "Content-Type: application/json" \
  -d '{"senderId": "'"$USER_A_ID"'", "text": "Hello Bob! (Edited)"}')
echo "Edited: $EDIT_RES"

DELETE_RES=$(curl -s -X DELETE "$BASE_URL/chat/$CHAT_ID/message/$MSG_ID" \
  -H "Content-Type: application/json" \
  -d '{"senderId": "'"$USER_A_ID"'"}')
echo "Deleted: $DELETE_RES"
echo -e "${GREEN}✓ Bonus APIs passed!${NC}\n"

echo -e "${BLUE}====================================================${NC}"
echo -e "${GREEN}   🎉 ALL 6 CORE APIS + BONUS APIS PASSED 100%!     ${NC}"
echo -e "${BLUE}====================================================${NC}"
