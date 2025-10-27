"""
Finite State Machine (FSM) for 3D Battleground Game Bot AI
Manages bot states: idle, patrol, chase, attack, flee, dead
"""

import random
import time
from enum import Enum


class BotState(Enum):
    """Bot state enumeration"""
    IDLE = "idle"
    PATROL = "patrol"
    CHASE = "chase"
    ATTACK = "attack"
    FLEE = "flee"
    DEAD = "dead"


class Bot:
    """Bot class with FSM logic"""
    
    def __init__(self, bot_id, initial_health=100):
        self.bot_id = bot_id
        self.state = BotState.IDLE
        self.health = initial_health
        self.max_health = initial_health
        self.player_visible = False
        self.player_distance = float('inf')
        self.last_state_change = time.time()
        self.idle_timer = random.uniform(2, 5)  # Random idle time
        self.patrol_timer = random.uniform(3, 8)  # Random patrol time
        self.last_transition_reason = "Bot initialized"
        
        # FSM configuration
        self.CHASE_RANGE = 30.0
        self.ATTACK_RANGE = 10.0
        self.FLEE_HEALTH_THRESHOLD = 20
        self.RECOVER_HEALTH_THRESHOLD = 50
        
    def update(self, player_visible, player_distance):
        """
        Update bot state based on current conditions
        
        Args:
            player_visible (bool): Whether player is visible to bot
            player_distance (float): Distance to player
            
        Returns:
            dict: Current state info and transition reason
        """
        self.player_visible = player_visible
        self.player_distance = player_distance
        
        # Store previous state for transition tracking
        previous_state = self.state
        
        # Check for death first (highest priority)
        if self.health <= 0:
            self._transition_to(BotState.DEAD, "Health depleted")
        
        # FSM state transitions
        elif self.state == BotState.IDLE:
            self._handle_idle_state()
        
        elif self.state == BotState.PATROL:
            self._handle_patrol_state()
        
        elif self.state == BotState.CHASE:
            self._handle_chase_state()
        
        elif self.state == BotState.ATTACK:
            self._handle_attack_state()
        
        elif self.state == BotState.FLEE:
            self._handle_flee_state()
        
        elif self.state == BotState.DEAD:
            # Dead state is terminal
            pass
        
        # Return current state information
        return self.get_state_info()
    
    def _handle_idle_state(self):
        """Handle transitions from IDLE state"""
        # Check if player detected
        if self.player_visible and self.player_distance < self.CHASE_RANGE:
            self._transition_to(BotState.CHASE, "Player detected nearby")
        # Check idle timer
        elif time.time() - self.last_state_change > self.idle_timer:
            self._transition_to(BotState.PATROL, "Idle timer expired")
    
    def _handle_patrol_state(self):
        """Handle transitions from PATROL state"""
        # Check if player detected
        if self.player_visible and self.player_distance < self.CHASE_RANGE:
            self._transition_to(BotState.CHASE, "Player spotted during patrol")
        # Check if should flee
        elif self.health < self.FLEE_HEALTH_THRESHOLD:
            self._transition_to(BotState.FLEE, "Health critical, retreating")
        # Return to idle after patrol duration
        elif time.time() - self.last_state_change > self.patrol_timer:
            self._transition_to(BotState.IDLE, "Patrol complete")
    
    def _handle_chase_state(self):
        """Handle transitions from CHASE state"""
        # Check if should flee
        if self.health < self.FLEE_HEALTH_THRESHOLD:
            self._transition_to(BotState.FLEE, "Health critical during chase")
        # Check if in attack range
        elif self.player_visible and self.player_distance < self.ATTACK_RANGE:
            self._transition_to(BotState.ATTACK, "Player in attack range")
        # Lost sight of player
        elif not self.player_visible:
            self._transition_to(BotState.PATROL, "Lost sight of player")
        # Player too far
        elif self.player_distance > self.CHASE_RANGE * 1.5:
            self._transition_to(BotState.PATROL, "Player out of range")
    
    def _handle_attack_state(self):
        """Handle transitions from ATTACK state"""
        # Check if should flee
        if self.health < self.FLEE_HEALTH_THRESHOLD:
            self._transition_to(BotState.FLEE, "Health critical, retreating from combat")
        # Player moved out of attack range but still visible
        elif self.player_visible and self.player_distance > self.ATTACK_RANGE:
            self._transition_to(BotState.CHASE, "Player moved out of attack range")
        # Lost sight of player
        elif not self.player_visible:
            self._transition_to(BotState.CHASE, "Lost visual on player")
    
    def _handle_flee_state(self):
        """Handle transitions from FLEE state"""
        # Recovered enough health and player visible
        if self.health > self.RECOVER_HEALTH_THRESHOLD and self.player_visible:
            self._transition_to(BotState.CHASE, "Health recovered, re-engaging")
        # Player no longer visible
        elif not self.player_visible:
            self._transition_to(BotState.PATROL, "Escaped, returning to patrol")
        # Safe distance achieved
        elif self.player_distance > self.CHASE_RANGE * 2:
            self._transition_to(BotState.IDLE, "Safe distance reached")
    
    def _transition_to(self, new_state, reason):
        """
        Transition to a new state
        
        Args:
            new_state (BotState): The new state to transition to
            reason (str): Reason for the transition
        """
        if self.state != new_state:
            self.state = new_state
            self.last_state_change = time.time()
            self.last_transition_reason = reason
            
            # Reset timers when entering certain states
            if new_state == BotState.IDLE:
                self.idle_timer = random.uniform(2, 5)
            elif new_state == BotState.PATROL:
                self.patrol_timer = random.uniform(3, 8)
    
    def take_damage(self, damage):
        """
        Apply damage to bot
        
        Args:
            damage (int): Amount of damage to apply
        """
        self.health = max(0, self.health - damage)
    
    def heal(self, amount):
        """
        Heal the bot
        
        Args:
            amount (int): Amount to heal
        """
        self.health = min(self.max_health, self.health + amount)
    
    def reset(self):
        """Reset bot to initial state"""
        self.state = BotState.IDLE
        self.health = self.max_health
        self.player_visible = False
        self.player_distance = float('inf')
        self.last_state_change = time.time()
        self.idle_timer = random.uniform(2, 5)
        self.patrol_timer = random.uniform(3, 8)
        self.last_transition_reason = "Bot reset"
    
    def get_state_info(self):
        """
        Get current state information
        
        Returns:
            dict: State information
        """
        return {
            "bot_id": self.bot_id,
            "state": self.state.value,
            "reason": self.last_transition_reason,
            "health": self.health,
            "max_health": self.max_health,
            "player_visible": self.player_visible,
            "player_distance": round(self.player_distance, 2),
            "time_in_state": round(time.time() - self.last_state_change, 2)
        }


# Global bot manager
class BotManager:
    """Manages multiple bots"""
    
    def __init__(self):
        self.bots = {}
        self.next_bot_id = 1
    
    def create_bot(self, initial_health=100):
        """Create a new bot"""
        bot_id = f"bot_{self.next_bot_id}"
        self.next_bot_id += 1
        self.bots[bot_id] = Bot(bot_id, initial_health)
        return bot_id
    
    def get_bot(self, bot_id):
        """Get a bot by ID"""
        return self.bots.get(bot_id)
    
    def remove_bot(self, bot_id):
        """Remove a bot"""
        if bot_id in self.bots:
            del self.bots[bot_id]
    
    def get_all_bots(self):
        """Get all bots"""
        return self.bots
    
    def reset_all(self):
        """Reset all bots"""
        for bot in self.bots.values():
            bot.reset()


# Global instance
bot_manager = BotManager()
