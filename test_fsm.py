"""
Test script for Bot FSM API
Demonstrates the finite state machine transitions
"""

import requests
import time
import json

API_URL = "http://localhost:5001"

def print_separator():
    print("\n" + "=" * 60)

def print_state(response_data):
    """Pretty print bot state"""
    if 'state' in response_data:
        state = response_data['state']
        print(f"\n🤖 Bot: {state['bot_id']}")
        print(f"   State: {state['state'].upper()}")
        print(f"   Reason: {state['reason']}")
        print(f"   Health: {state['health']}/{state['max_health']}")
        print(f"   Player Visible: {state['player_visible']}")
        print(f"   Player Distance: {state['player_distance']}")
        print(f"   Time in State: {state['time_in_state']}s")
    else:
        print(json.dumps(response_data, indent=2))

def test_fsm_transitions():
    """Test all FSM state transitions"""
    
    print_separator()
    print("🎮 BOT FSM TEST - State Transition Demo")
    print_separator()
    
    # Step 1: Create a new bot
    print("\n📍 Step 1: Creating a new bot...")
    response = requests.post(f"{API_URL}/create", json={"initial_health": 100})
    data = response.json()
    bot_id = data['bot_id']
    print(f"✅ Created {bot_id}")
    print_state(data)
    
    time.sleep(1)
    
    # Step 2: IDLE → PATROL (wait for timer)
    print_separator()
    print("📍 Step 2: Waiting for IDLE → PATROL transition...")
    time.sleep(3)
    response = requests.post(f"{API_URL}/update", json={
        "bot_id": bot_id,
        "player_visible": False,
        "player_distance": 100
    })
    print_state(response.json())
    
    time.sleep(1)
    
    # Step 3: PATROL → CHASE (player detected)
    print_separator()
    print("📍 Step 3: Player detected! PATROL → CHASE...")
    response = requests.post(f"{API_URL}/update", json={
        "bot_id": bot_id,
        "player_visible": True,
        "player_distance": 25
    })
    print_state(response.json())
    
    time.sleep(1)
    
    # Step 4: CHASE → ATTACK (player in range)
    print_separator()
    print("📍 Step 4: Player in attack range! CHASE → ATTACK...")
    response = requests.post(f"{API_URL}/update", json={
        "bot_id": bot_id,
        "player_visible": True,
        "player_distance": 8
    })
    print_state(response.json())
    
    time.sleep(1)
    
    # Step 5: Apply damage to trigger FLEE
    print_separator()
    print("📍 Step 5: Bot takes heavy damage! ATTACK → FLEE...")
    response = requests.post(f"{API_URL}/damage", json={
        "bot_id": bot_id,
        "damage": 85
    })
    print(f"💥 Damage dealt: 85")
    print_state(response.json())
    
    # Update state to trigger flee
    response = requests.post(f"{API_URL}/update", json={
        "bot_id": bot_id,
        "player_visible": True,
        "player_distance": 8
    })
    print_state(response.json())
    
    time.sleep(1)
    
    # Step 6: Heal bot to trigger re-engagement
    print_separator()
    print("📍 Step 6: Bot heals! FLEE → CHASE...")
    response = requests.post(f"{API_URL}/heal", json={
        "bot_id": bot_id,
        "amount": 60
    })
    print(f"💚 Healed: 60")
    print_state(response.json())
    
    # Update state
    response = requests.post(f"{API_URL}/update", json={
        "bot_id": bot_id,
        "player_visible": True,
        "player_distance": 20
    })
    print_state(response.json())
    
    time.sleep(1)
    
    # Step 7: Kill the bot
    print_separator()
    print("📍 Step 7: Bot takes fatal damage! → DEAD...")
    response = requests.post(f"{API_URL}/damage", json={
        "bot_id": bot_id,
        "damage": 100
    })
    print(f"💀 Fatal damage!")
    print_state(response.json())
    
    time.sleep(1)
    
    # Step 8: Reset bot
    print_separator()
    print("📍 Step 8: Resetting bot to IDLE state...")
    response = requests.post(f"{API_URL}/reset", json={"bot_id": bot_id})
    print_state(response.json())
    
    # Step 9: Get all bots
    print_separator()
    print("📍 Step 9: Getting all bots...")
    response = requests.get(f"{API_URL}/bots")
    data = response.json()
    print(f"\n📊 Total bots: {data['bot_count']}")
    for bot in data['bots']:
        print(f"\n   {bot['bot_id']}: {bot['state']} (Health: {bot['health']})")
    
    print_separator()
    print("✅ FSM Test Complete!")
    print_separator()

def test_scenario_player_approach():
    """Test scenario: Player approaching bot"""
    
    print_separator()
    print("🎯 SCENARIO TEST: Player Approaching Bot")
    print_separator()
    
    # Create bot
    response = requests.post(f"{API_URL}/create")
    bot_id = response.json()['bot_id']
    
    print(f"\n🤖 Testing with {bot_id}")
    
    # Simulate player approaching from far distance
    distances = [100, 80, 50, 28, 15, 8, 5]
    
    for distance in distances:
        print(f"\n📏 Player distance: {distance}m")
        response = requests.post(f"{API_URL}/update", json={
            "bot_id": bot_id,
            "player_visible": True,
            "player_distance": distance
        })
        data = response.json()
        print(f"   State: {data['state'].upper()} - {data['reason']}")
        time.sleep(0.5)
    
    print_separator()

if __name__ == "__main__":
    try:
        # Check if server is running
        response = requests.get(API_URL)
        print("✅ FSM API Server is running!")
        
        # Run tests
        test_fsm_transitions()
        time.sleep(2)
        test_scenario_player_approach()
        
    except requests.exceptions.ConnectionError:
        print("❌ Error: FSM API Server is not running!")
        print("   Please start the server first: python fsm_server.py")
