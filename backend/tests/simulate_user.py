import httpx
import json
import uuid

BASE_URL = "http://localhost:8000"

def run_user_simulation():
    print("--- Starting Real User Simulation on Live Backend ---")
    session_a = httpx.Client()
    session_b = httpx.Client()

    suffix = uuid.uuid4().hex[:6]
    alice_name = f"user_alice_{suffix}"
    bob_name = f"user_bob_{suffix}"
    pwd = "password123"

    # 1. Register Alice
    res = session_a.post(f"{BASE_URL}/api/auth/register", json={
        "username": alice_name,
        "display_name": "Alice Wonderland",
        "email": f"{alice_name}@tuko.test",
        "password": pwd
    })
    assert res.status_code == 200, f"Alice registration failed: {res.text}"
    token_a = res.json()["access_token"]
    user_a = res.json()["user"]
    session_a.headers["Authorization"] = f"Bearer {token_a}"
    print(f"[OK] Registered Alice ({alice_name})")

    # 2. Register Bob
    res = session_b.post(f"{BASE_URL}/api/auth/register", json={
        "username": bob_name,
        "display_name": "Bob The Builder",
        "email": f"{bob_name}@tuko.test",
        "password": pwd
    })
    assert res.status_code == 200, f"Bob registration failed: {res.text}"
    token_b = res.json()["access_token"]
    user_b = res.json()["user"]
    session_b.headers["Authorization"] = f"Bearer {token_b}"
    print(f"[OK] Registered Bob ({bob_name})")

    # 3. Alice updates profile
    res = session_a.put(f"{BASE_URL}/api/auth/profile", json={
        "status_mood": "🚀 Super Active on Tuko",
        "bio": "Full-stack engineer building real-time apps"
    })
    assert res.status_code == 200
    print("[OK] Alice profile updated")

    # 4. Bob searches for Alice
    res = session_b.get(f"{BASE_URL}/api/auth/search?q={alice_name}")
    assert res.status_code == 200
    assert any(u["username"] == alice_name for u in res.json()["results"])
    print("[OK] Bob searched for Alice successfully")

    # 5. Alice sends friend request to Bob
    res = session_a.post(f"{BASE_URL}/api/friends/request", json={"username_or_id": bob_name})
    assert res.status_code == 200
    print("[OK] Alice sent friend request to Bob")

    # 6. Bob views pending and accepts
    res = session_b.get(f"{BASE_URL}/api/friends/pending")
    assert res.status_code == 200
    inc = res.json()["incoming"]
    assert len(inc) > 0, "No incoming requests for Bob"
    req_id = inc[0]["id"]

    res = session_b.post(f"{BASE_URL}/api/friends/{req_id}/accept")
    assert res.status_code == 200
    print("[OK] Bob accepted friend request")

    # 7. Check friends list
    res = session_a.get(f"{BASE_URL}/api/friends")
    assert res.status_code == 200
    assert any(f["user"]["username"] == bob_name for f in res.json()["friends"])
    print("[OK] Alice and Bob are mutual friends")

    # 8. Start Direct Message
    res = session_a.post(f"{BASE_URL}/api/conversations/with/{user_b['id']}")
    assert res.status_code == 200
    conv_id = res.json()["conversation"]["id"]
    print(f"[OK] DM conversation established ({conv_id})")

    # 9. Alice sends message
    res = session_a.post(f"{BASE_URL}/api/conversations/{conv_id}/messages", json={
        "text": "Hey Bob! Check out this real-time communication platform."
    })
    assert res.status_code == 200
    msg_id = res.json()["id"]
    print(f"[OK] Alice sent message ({msg_id})")

    # 10. Bob reacts with emoji
    res = session_b.post(f"{BASE_URL}/api/conversations/{conv_id}/messages/{msg_id}/react", json={
        "emoji": "❤️"
    })
    assert res.status_code == 200
    assert "❤️" in res.json()["reactions"]
    print("[OK] Bob reacted to Alice message with emoji")

    # 11. Alice pins message
    res = session_a.post(f"{BASE_URL}/api/conversations/{conv_id}/messages/{msg_id}/pin")
    assert res.status_code == 200
    assert res.json()["pinned"] is True
    print("[OK] Alice pinned message")

    # 12. Create Community
    res = session_a.post(f"{BASE_URL}/api/communities", json={
        "name": "Design & Code Arena",
        "description": "Where creators share ideas and connect",
        "icon": "⚡"
    })
    assert res.status_code == 200
    comm = res.json()
    comm_id = comm["id"]
    invite_code = comm["invite_code"]
    print(f"[OK] Alice created community: {comm['name']} (Code: {invite_code})")

    # 13. Bob joins community via invite code
    res = session_b.post(f"{BASE_URL}/api/communities/join/{invite_code}")
    assert res.status_code == 200
    print("[OK] Bob joined community using invite code")

    # 14. Add voice room channel
    res = session_a.post(f"{BASE_URL}/api/communities/{comm_id}/channels", json={
        "name": "Live Stage Voice",
        "type": "voice",
        "topic": "Live discussion voice room"
    })
    assert res.status_code == 200
    print("[OK] Alice created voice room channel in community")

    # 15. ICE Servers & Call log test
    res = session_a.get(f"{BASE_URL}/api/calls/ice-servers")
    assert res.status_code == 200
    assert len(res.json()["ice_servers"]) > 0

    res = session_a.post(f"{BASE_URL}/api/calls/log", json={
        "receiver_id": user_b["id"],
        "call_type": "video",
        "status": "completed",
        "duration_seconds": 340
    })
    assert res.status_code == 200
    print("[OK] Logged WebRTC call session successfully")

    print("\n==========================================")
    print("ALL REAL USER SIMULATION TESTS PASSED 100%!")
    print("==========================================")

if __name__ == "__main__":
    run_user_simulation()
