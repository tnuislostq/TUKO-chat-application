#!/usr/bin/env python3
"""
Tuko Chat Backend API Testing Suite
Tests all backend endpoints for the Tuko chat application
"""

import requests
import json
import uuid
import time
import asyncio
import websockets
from datetime import datetime

# Configuration
BASE_URL = "https://tanuchat.preview.emergentagent.com/api"
WS_URL = "wss://tanuchat.preview.emergentagent.com/ws"

class TukoBackendTester:
    def __init__(self):
        self.session = requests.Session()
        self.test_user_data = {
            "username": f"testuser_{uuid.uuid4().hex[:8]}",
            "email": f"test_{uuid.uuid4().hex[:8]}@example.com",
            "password": "securepassword123"
        }
        self.logged_in_user = None
        self.chat_session_id = str(uuid.uuid4())
        
    def log_test(self, test_name, status, details=""):
        """Log test results"""
        status_symbol = "✅" if status == "PASS" else "❌"
        print(f"{status_symbol} {test_name}: {details}")
        
    def test_health_check(self):
        """Test the health check endpoint"""
        try:
            response = self.session.get(f"{BASE_URL}/health")
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "healthy" and data.get("app") == "Tuko Chat":
                    self.log_test("Health Check", "PASS", "API is healthy")
                    return True
                else:
                    self.log_test("Health Check", "FAIL", f"Unexpected response: {data}")
                    return False
            else:
                self.log_test("Health Check", "FAIL", f"Status code: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Health Check", "FAIL", f"Exception: {str(e)}")
            return False
    
    def test_user_registration(self):
        """Test user registration endpoint"""
        try:
            response = self.session.post(
                f"{BASE_URL}/auth/register",
                json=self.test_user_data
            )
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["id", "username", "email", "created_at"]
                if all(field in data for field in required_fields):
                    if data["username"] == self.test_user_data["username"] and data["email"] == self.test_user_data["email"]:
                        self.log_test("User Registration", "PASS", f"User created with ID: {data['id']}")
                        return True
                    else:
                        self.log_test("User Registration", "FAIL", "User data mismatch")
                        return False
                else:
                    self.log_test("User Registration", "FAIL", f"Missing required fields: {data}")
                    return False
            else:
                self.log_test("User Registration", "FAIL", f"Status code: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_test("User Registration", "FAIL", f"Exception: {str(e)}")
            return False
    
    def test_duplicate_registration(self):
        """Test duplicate user registration (should fail)"""
        try:
            response = self.session.post(
                f"{BASE_URL}/auth/register",
                json=self.test_user_data
            )
            
            if response.status_code == 400:
                data = response.json()
                if "already exists" in data.get("detail", "").lower():
                    self.log_test("Duplicate Registration Prevention", "PASS", "Correctly prevented duplicate registration")
                    return True
                else:
                    self.log_test("Duplicate Registration Prevention", "FAIL", f"Wrong error message: {data}")
                    return False
            else:
                self.log_test("Duplicate Registration Prevention", "FAIL", f"Should return 400, got: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Duplicate Registration Prevention", "FAIL", f"Exception: {str(e)}")
            return False
    
    def test_user_login(self):
        """Test user login endpoint"""
        try:
            login_data = {
                "email": self.test_user_data["email"],
                "password": self.test_user_data["password"]
            }
            
            response = self.session.post(
                f"{BASE_URL}/auth/login",
                json=login_data
            )
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["id", "username", "email", "is_online"]
                if all(field in data for field in required_fields):
                    if data["email"] == self.test_user_data["email"] and data["is_online"] == True:
                        self.logged_in_user = data
                        self.log_test("User Login", "PASS", f"User logged in: {data['username']}")
                        return True
                    else:
                        self.log_test("User Login", "FAIL", "Login data incorrect")
                        return False
                else:
                    self.log_test("User Login", "FAIL", f"Missing required fields: {data}")
                    return False
            else:
                self.log_test("User Login", "FAIL", f"Status code: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_test("User Login", "FAIL", f"Exception: {str(e)}")
            return False
    
    def test_invalid_login(self):
        """Test login with invalid credentials"""
        try:
            invalid_login = {
                "email": self.test_user_data["email"],
                "password": "wrongpassword"
            }
            
            response = self.session.post(
                f"{BASE_URL}/auth/login",
                json=invalid_login
            )
            
            if response.status_code == 401:
                data = response.json()
                if "invalid credentials" in data.get("detail", "").lower():
                    self.log_test("Invalid Login Prevention", "PASS", "Correctly rejected invalid credentials")
                    return True
                else:
                    self.log_test("Invalid Login Prevention", "FAIL", f"Wrong error message: {data}")
                    return False
            else:
                self.log_test("Invalid Login Prevention", "FAIL", f"Should return 401, got: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Invalid Login Prevention", "FAIL", f"Exception: {str(e)}")
            return False
    
    def test_ai_chat_integration(self):
        """Test AI chat endpoint"""
        if not self.logged_in_user:
            self.log_test("AI Chat Integration", "FAIL", "No logged in user for testing")
            return False
            
        try:
            ai_message_data = {
                "message": "Hello Tuko AI! Can you tell me what you are?",
                "chat_session_id": self.chat_session_id,
                "user_id": self.logged_in_user["id"]
            }
            
            response = self.session.post(
                f"{BASE_URL}/chat/ai",
                json=ai_message_data
            )
            
            if response.status_code == 200:
                data = response.json()
                if "user_message" in data and "ai_response" in data:
                    user_msg = data["user_message"]
                    ai_msg = data["ai_response"]
                    
                    # Validate user message
                    if (user_msg["content"] == ai_message_data["message"] and 
                        user_msg["is_ai"] == False and
                        user_msg["chat_session_id"] == self.chat_session_id):
                        
                        # Validate AI response
                        if (ai_msg["is_ai"] == True and 
                            ai_msg["username"] == "Tuko AI" and
                            len(ai_msg["content"]) > 0):
                            
                            self.log_test("AI Chat Integration", "PASS", f"AI responded: {ai_msg['content'][:50]}...")
                            return True
                        else:
                            self.log_test("AI Chat Integration", "FAIL", f"Invalid AI response format: {ai_msg}")
                            return False
                    else:
                        self.log_test("AI Chat Integration", "FAIL", f"Invalid user message format: {user_msg}")
                        return False
                else:
                    self.log_test("AI Chat Integration", "FAIL", f"Missing response fields: {data}")
                    return False
            else:
                self.log_test("AI Chat Integration", "FAIL", f"Status code: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_test("AI Chat Integration", "FAIL", f"Exception: {str(e)}")
            return False
    
    def test_chat_message_retrieval(self):
        """Test retrieving chat messages"""
        try:
            response = self.session.get(f"{BASE_URL}/chat/messages/{self.chat_session_id}")
            
            if response.status_code == 200:
                messages = response.json()
                if isinstance(messages, list):
                    if len(messages) >= 2:  # Should have user message and AI response from previous test
                        # Check message structure
                        for msg in messages:
                            required_fields = ["id", "user_id", "username", "content", "timestamp", "is_ai", "chat_session_id"]
                            if not all(field in msg for field in required_fields):
                                self.log_test("Chat Message Retrieval", "FAIL", f"Missing fields in message: {msg}")
                                return False
                        
                        self.log_test("Chat Message Retrieval", "PASS", f"Retrieved {len(messages)} messages")
                        return True
                    else:
                        self.log_test("Chat Message Retrieval", "PASS", f"Retrieved {len(messages)} messages (empty chat)")
                        return True
                else:
                    self.log_test("Chat Message Retrieval", "FAIL", f"Expected list, got: {type(messages)}")
                    return False
            else:
                self.log_test("Chat Message Retrieval", "FAIL", f"Status code: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_test("Chat Message Retrieval", "FAIL", f"Exception: {str(e)}")
            return False
    
    async def test_websocket_connection(self):
        """Test WebSocket connection and messaging"""
        if not self.logged_in_user:
            self.log_test("WebSocket Connection", "FAIL", "No logged in user for testing")
            return False
            
        try:
            client_id = str(uuid.uuid4())
            uri = f"{WS_URL}/{client_id}"
            
            async with websockets.connect(uri) as websocket:
                # Test sending a message
                test_message = {
                    "user_id": self.logged_in_user["id"],
                    "username": self.logged_in_user["username"],
                    "content": "Test WebSocket message",
                    "chat_session_id": self.chat_session_id
                }
                
                await websocket.send(json.dumps(test_message))
                
                # Wait for response (should be broadcast back)
                try:
                    response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                    data = json.loads(response)
                    
                    if data.get("type") == "message" and "data" in data:
                        msg_data = data["data"]
                        if (msg_data["content"] == test_message["content"] and
                            msg_data["username"] == test_message["username"]):
                            self.log_test("WebSocket Connection", "PASS", "Message sent and received successfully")
                            return True
                        else:
                            self.log_test("WebSocket Connection", "FAIL", f"Message data mismatch: {msg_data}")
                            return False
                    else:
                        self.log_test("WebSocket Connection", "FAIL", f"Invalid response format: {data}")
                        return False
                        
                except asyncio.TimeoutError:
                    self.log_test("WebSocket Connection", "FAIL", "Timeout waiting for WebSocket response")
                    return False
                    
        except Exception as e:
            self.log_test("WebSocket Connection", "FAIL", f"Exception: {str(e)}")
            return False
    
    def test_user_logout(self):
        """Test user logout endpoint"""
        if not self.logged_in_user:
            self.log_test("User Logout", "FAIL", "No logged in user for testing")
            return False
            
        try:
            response = self.session.post(f"{BASE_URL}/auth/logout/{self.logged_in_user['id']}")
            
            if response.status_code == 200:
                data = response.json()
                if "logged out successfully" in data.get("message", "").lower():
                    self.log_test("User Logout", "PASS", "User logged out successfully")
                    return True
                else:
                    self.log_test("User Logout", "FAIL", f"Unexpected response: {data}")
                    return False
            else:
                self.log_test("User Logout", "FAIL", f"Status code: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_test("User Logout", "FAIL", f"Exception: {str(e)}")
            return False
    
    async def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting Tuko Chat Backend API Tests")
        print("=" * 50)
        
        test_results = {}
        
        # Test sequence
        tests = [
            ("Health Check", self.test_health_check),
            ("User Registration", self.test_user_registration),
            ("Duplicate Registration Prevention", self.test_duplicate_registration),
            ("User Login", self.test_user_login),
            ("Invalid Login Prevention", self.test_invalid_login),
            ("AI Chat Integration", self.test_ai_chat_integration),
            ("Chat Message Retrieval", self.test_chat_message_retrieval),
            ("User Logout", self.test_user_logout)
        ]
        
        # Run synchronous tests
        for test_name, test_func in tests:
            test_results[test_name] = test_func()
            time.sleep(0.5)  # Small delay between tests
        
        # Run WebSocket test separately (async)
        print("\n🔌 Testing WebSocket Connection...")
        test_results["WebSocket Connection"] = await self.test_websocket_connection()
        
        # Summary
        print("\n" + "=" * 50)
        print("📊 TEST SUMMARY")
        print("=" * 50)
        
        passed = sum(1 for result in test_results.values() if result)
        total = len(test_results)
        
        for test_name, result in test_results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"{status} {test_name}")
        
        print(f"\n🎯 Results: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All tests passed! Backend is working correctly.")
        else:
            print("⚠️  Some tests failed. Check the details above.")
        
        return test_results

async def main():
    """Main test runner"""
    tester = TukoBackendTester()
    results = await tester.run_all_tests()
    return results

if __name__ == "__main__":
    asyncio.run(main())