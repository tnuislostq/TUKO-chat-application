import io
import uuid
import pytest
from fastapi.testclient import TestClient
from server import app

client = TestClient(app)

@pytest.fixture(scope="module")
def auth_tokens():
    uid = uuid.uuid4().hex[:6]
    alice_username = f"alice_{uid}"
    bob_username = f"bob_{uid}"
    pwd = "password123"

    res_a = client.post("/api/auth/register", json={
        "username": alice_username,
        "display_name": "Alice Tester",
        "email": f"{alice_username}@example.com",
        "password": pwd
    })
    assert res_a.status_code == 200
    token_a = res_a.json()["access_token"]
    user_a = res_a.json()["user"]

    res_b = client.post("/api/auth/register", json={
        "username": bob_username,
        "display_name": "Bob Tester",
        "email": f"{bob_username}@example.com",
        "password": pwd
    })
    assert res_b.status_code == 200
    token_b = res_b.json()["access_token"]
    user_b = res_b.json()["user"]

    return {
        "alice_token": token_a,
        "alice_user": user_a,
        "bob_token": token_b,
        "bob_user": user_b
    }

def test_root_and_health():
    res = client.get("/")
    assert res.status_code == 200
    assert res.json()["status"] == "online"

    h = client.get("/health")
    assert h.status_code == 200
    assert h.json()["status"] == "ok"

def test_auth_and_profile_flow(auth_tokens):
    headers = {"Authorization": f"Bearer {auth_tokens['alice_token']}"}

    # /me
    me = client.get("/api/auth/me", headers=headers)
    assert me.status_code == 200
    assert me.json()["user"]["username"] == auth_tokens["alice_user"]["username"]

    # Update Profile
    update = client.put("/api/auth/profile", json={
        "display_name": "Alice Super",
        "status_mood": "🚀 Super Fast"
    }, headers=headers)
    assert update.status_code == 200
    assert update.json()["user"]["display_name"] == "Alice Super"

    # Search
    search = client.get(f"/api/auth/search?q={auth_tokens['bob_user']['username']}", headers=headers)
    assert search.status_code == 200
    assert len(search.json()["results"]) > 0

def test_friends_and_dm_flow(auth_tokens):
    a_headers = {"Authorization": f"Bearer {auth_tokens['alice_token']}"}
    b_headers = {"Authorization": f"Bearer {auth_tokens['bob_token']}"}

    # Alice sends friend request to Bob
    fr_res = client.post("/api/friends/request", json={"username_or_id": auth_tokens["bob_user"]["username"]}, headers=a_headers)
    assert fr_res.status_code in [200, 400]

    # Bob checks pending requests
    pending = client.get("/api/friends/pending", headers=b_headers)
    assert pending.status_code == 200
    inc = pending.json()["incoming"]
    if inc:
        req_id = inc[0]["id"]
        acc = client.post(f"/api/friends/{req_id}/accept", headers=b_headers)
        assert acc.status_code == 200

    # List friends
    friends_res = client.get("/api/friends", headers=a_headers)
    assert friends_res.status_code == 200

    # Start DM
    conv_res = client.post(f"/api/conversations/with/{auth_tokens['bob_user']['id']}", headers=a_headers)
    assert conv_res.status_code == 200
    conv_id = conv_res.json()["conversation"]["id"]

    # Send message
    msg_res = client.post(f"/api/conversations/{conv_id}/messages", json={
        "text": "Hello Bob! Testing Tuko Chat."
    }, headers=a_headers)
    assert msg_res.status_code == 200
    msg_id = msg_res.json()["id"]

    # Bob views messages
    msgs_res = client.get(f"/api/conversations/{conv_id}/messages", headers=b_headers)
    assert msgs_res.status_code == 200
    assert any(m["id"] == msg_id for m in msgs_res.json()["messages"])

    # Bob reacts
    react_res = client.post(f"/api/conversations/{conv_id}/messages/{msg_id}/react", json={"emoji": "❤️"}, headers=b_headers)
    assert react_res.status_code == 200

    # Alice pins
    pin_res = client.post(f"/api/conversations/{conv_id}/messages/{msg_id}/pin", headers=a_headers)
    assert pin_res.status_code == 200
    assert pin_res.json()["pinned"] is True

def test_communities_flow(auth_tokens):
    headers = {"Authorization": f"Bearer {auth_tokens['alice_token']}"}

    # Create community
    comm_res = client.post("/api/communities", json={
        "name": "Design Pioneers",
        "description": "Designers & Engineers unite",
        "icon": "🎨"
    }, headers=headers)
    assert comm_res.status_code == 200
    comm_id = comm_res.json()["id"]

    # Add channel
    chan_res = client.post(f"/api/communities/{comm_id}/channels", json={
        "name": "ui-critique",
        "type": "text",
        "topic": "Share screenshots for feedback"
    }, headers=headers)
    assert chan_res.status_code == 200
    chan_id = chan_res.json()["id"]

    # Send channel message
    cmsg_res = client.post(f"/api/communities/{comm_id}/channels/{chan_id}/messages", json={
        "text": "Welcome to ui-critique channel!"
    }, headers=headers)
    assert cmsg_res.status_code == 200
    cmsg_id = cmsg_res.json()["id"]

    # Read messages
    list_msgs = client.get(f"/api/communities/{comm_id}/channels/{chan_id}/messages", headers=headers)
    assert list_msgs.status_code == 200
    assert any(m["id"] == cmsg_id for m in list_msgs.json()["messages"])

def test_calls_and_ice_servers(auth_tokens):
    headers = {"Authorization": f"Bearer {auth_tokens['alice_token']}"}

    # Get ICE servers
    ice_res = client.get("/api/calls/ice-servers", headers=headers)
    assert ice_res.status_code == 200
    assert "ice_servers" in ice_res.json()

    # Log a call
    log_res = client.post("/api/calls/log", json={
        "receiver_id": auth_tokens["bob_user"]["id"],
        "call_type": "video",
        "status": "completed",
        "duration_seconds": 125
    }, headers=headers)
    assert log_res.status_code == 200

    # Get call history
    hist = client.get("/api/calls/history", headers=headers)
    assert hist.status_code == 200
    assert len(hist.json()["history"]) > 0

def test_file_upload_flow(auth_tokens):
    headers = {"Authorization": f"Bearer {auth_tokens['alice_token']}"}

    file_content = b"Simulated image audio or attachment content"
    files = {"file": ("test_note.webm", io.BytesIO(file_content), "audio/webm")}
    upload_res = client.post("/api/uploads", files=files, headers=headers)
    assert upload_res.status_code == 200
    upload_data = upload_res.json()
    assert "url" in upload_data
    assert upload_data["url"].startswith("/uploads/")

def test_notifications_flow(auth_tokens):
    headers = {"Authorization": f"Bearer {auth_tokens['alice_token']}"}

    notifs = client.get("/api/notifications", headers=headers)
    assert notifs.status_code == 200

    read_all = client.post("/api/notifications/read-all", headers=headers)
    assert read_all.status_code == 200
