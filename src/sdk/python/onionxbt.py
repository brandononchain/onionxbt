"""
OnionXBT Python SDK
Official Python SDK for integrating OnionXBT

Installation:
    pip install onionxbt

Usage:
    from onionxbt import OnionXBT
    
    client = OnionXBT(api_key="your_api_key")
    response = client.ask("What is Bitcoin?")
    print(response)
"""

import os
import json
import time
import threading
from typing import Optional, List, Dict, Any, Callable
from dataclasses import dataclass
from enum import Enum
import requests
import websocket

__version__ = "0.1.0"
__author__ = "OnionXBT"

DEFAULT_BASE_URL = "https://api.onionxbt.com"
DEFAULT_WS_URL = "wss://api.onionxbt.com/ws"


class OnionError(Exception):
    """OnionXBT API Error"""
    def __init__(self, message: str, status_code: int = 500):
        super().__init__(message)
        self.status_code = status_code


@dataclass
class ChatMessage:
    role: str  # 'user', 'assistant', 'system'
    content: str


@dataclass
class ChatResponse:
    id: str
    content: str
    tool_calls: Optional[List[Dict]] = None
    cost_sats: int = 0
    balance_remaining: int = 0


@dataclass
class Payment:
    id: str
    type: str  # 'lightning' or 'onchain'
    amount: int
    status: str  # 'pending', 'confirmed', 'expired'
    invoice: Optional[str] = None
    address: Optional[str] = None
    payment_hash: Optional[str] = None
    qr_svg: Optional[str] = None
    created_at: Optional[str] = None
    confirmed_at: Optional[str] = None


@dataclass
class Balance:
    balance: int
    total_deposited: int
    total_spent: int
    currency: str = "sats"


@dataclass
class Skill:
    name: str
    description: str
    icon: str
    price: int
    version: str
    author: str
    tags: List[str]
    tools: List[Dict]


class OnionXBT:
    """
    OnionXBT Python Client
    
    Example:
        client = OnionXBT(api_key="your_api_key")
        
        # Simple question
        answer = client.ask("What is Lightning Network?")
        
        # Chat with history
        response = client.chat([
            {"role": "user", "content": "Hello"},
            {"role": "assistant", "content": "Hi there!"},
            {"role": "user", "content": "What can you do?"}
        ])
        
        # Run a skill tool
        result = client.run_tool("BTCPriceOracle", "btc_price", {"currency": "USD"})
        
        # Create payment
        payment = client.create_payment(10000, type="lightning")
        print(f"Pay this invoice: {payment.invoice}")
    """
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        ws_url: Optional[str] = None,
        timeout: int = 30
    ):
        self.api_key = api_key or os.environ.get("ONIONXBT_API_KEY")
        if not self.api_key:
            raise OnionError("API key required. Set ONIONXBT_API_KEY or pass api_key.")
        
        self.base_url = (base_url or os.environ.get("ONIONXBT_BASE_URL", DEFAULT_BASE_URL)).rstrip("/")
        self.ws_url = ws_url or os.environ.get("ONIONXBT_WS_URL", DEFAULT_WS_URL)
        self.timeout = timeout
        self._ws: Optional[websocket.WebSocketApp] = None
        self._ws_thread: Optional[threading.Thread] = None
        self._event_handlers: Dict[str, List[Callable]] = {}
    
    def _request(
        self,
        method: str,
        path: str,
        json_data: Optional[Dict] = None,
        params: Optional[Dict] = None
    ) -> Dict:
        """Make an HTTP request to the API."""
        url = f"{self.base_url}{path}"
        headers = {
            "X-API-Key": self.api_key,
            "Content-Type": "application/json"
        }
        
        response = requests.request(
            method=method,
            url=url,
            headers=headers,
            json=json_data,
            params=params,
            timeout=self.timeout
        )
        
        if not response.ok:
            try:
                error = response.json().get("error", response.text)
            except:
                error = response.text
            raise OnionError(error, response.status_code)
        
        return response.json()
    
    # ============================================
    # Chat API
    # ============================================
    
    def chat(self, messages: List[Dict[str, str]]) -> ChatResponse:
        """
        Send a chat request.
        
        Args:
            messages: List of message dicts with 'role' and 'content'
            
        Returns:
            ChatResponse with the assistant's reply
        """
        data = self._request("POST", "/v1/chat", json_data={"messages": messages})
        
        return ChatResponse(
            id=data.get("id", ""),
            content=data.get("content", ""),
            tool_calls=data.get("tool_calls"),
            cost_sats=data.get("usage", {}).get("cost_sats", 0),
            balance_remaining=data.get("usage", {}).get("balance_remaining", 0)
        )
    
    def ask(self, question: str) -> str:
        """
        Simple single-question interface.
        
        Args:
            question: Your question
            
        Returns:
            The assistant's response as a string
        """
        response = self.chat([{"role": "user", "content": question}])
        return response.content
    
    # ============================================
    # Skills API
    # ============================================
    
    def list_skills(self) -> List[Skill]:
        """Get all available skills."""
        data = self._request("GET", "/v1/skills")
        return [
            Skill(
                name=s["name"],
                description=s["description"],
                icon=s["icon"],
                price=s["price"],
                version=s["version"],
                author=s["author"],
                tags=s["tags"],
                tools=s["tools"]
            )
            for s in data.get("skills", [])
        ]
    
    def run_tool(self, skill: str, tool: str, params: Optional[Dict] = None) -> Any:
        """
        Execute a skill tool directly.
        
        Args:
            skill: Skill name (e.g., "BTCPriceOracle")
            tool: Tool name (e.g., "btc_price")
            params: Tool parameters
            
        Returns:
            Tool execution result
        """
        data = self._request(
            "POST",
            f"/v1/skills/{skill}/tools/{tool}",
            json_data=params or {}
        )
        return data.get("result")
    
    # ============================================
    # Payments API
    # ============================================
    
    def create_payment(
        self,
        amount: int,
        type: str = "lightning"
    ) -> Payment:
        """
        Create a payment to add balance.
        
        Args:
            amount: Amount in satoshis (minimum 1000)
            type: 'lightning' or 'onchain'
            
        Returns:
            Payment object with invoice/address
        """
        data = self._request(
            "POST",
            "/v1/payments",
            json_data={"amount": amount, "type": type}
        )
        
        return Payment(
            id=data["id"],
            type=data["type"],
            amount=data["amount"],
            status=data.get("status", "pending"),
            invoice=data.get("invoice"),
            address=data.get("address"),
            payment_hash=data.get("payment_hash"),
            qr_svg=data.get("qr_svg"),
            created_at=data.get("created_at"),
            confirmed_at=data.get("confirmed_at")
        )
    
    def get_payment(self, payment_id: str) -> Payment:
        """Check payment status."""
        data = self._request("GET", f"/v1/payments/{payment_id}")
        
        return Payment(
            id=data["id"],
            type=data["type"],
            amount=data["amount"],
            status=data["status"],
            invoice=data.get("invoice"),
            address=data.get("address"),
            created_at=data.get("created_at"),
            confirmed_at=data.get("confirmed_at")
        )
    
    def wait_for_payment(
        self,
        payment_id: str,
        timeout: int = 600,
        poll_interval: int = 3
    ) -> Payment:
        """
        Wait for a payment to be confirmed.
        
        Args:
            payment_id: Payment ID to check
            timeout: Maximum wait time in seconds
            poll_interval: How often to check (seconds)
            
        Returns:
            Confirmed Payment object
            
        Raises:
            OnionError: If payment expires or times out
        """
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            payment = self.get_payment(payment_id)
            
            if payment.status == "confirmed":
                return payment
            
            if payment.status == "expired":
                raise OnionError("Payment expired", 408)
            
            time.sleep(poll_interval)
        
        raise OnionError("Payment timeout", 408)
    
    # ============================================
    # Balance API
    # ============================================
    
    def get_balance(self) -> Balance:
        """Get current balance."""
        data = self._request("GET", "/v1/balance")
        
        return Balance(
            balance=data["balance"],
            total_deposited=data["total_deposited"],
            total_spent=data["total_spent"],
            currency=data.get("currency", "sats")
        )
    
    def get_usage(self, limit: int = 50, offset: int = 0) -> List[Dict]:
        """Get usage history."""
        data = self._request(
            "GET",
            "/v1/usage",
            params={"limit": limit, "offset": offset}
        )
        return data.get("usage", [])
    
    # ============================================
    # WebSocket (Real-time)
    # ============================================
    
    def connect(self) -> None:
        """Connect to WebSocket for real-time events."""
        if self._ws:
            return
        
        url = f"{self.ws_url}?api_key={self.api_key}"
        
        def on_message(ws, message):
            try:
                event = json.loads(message)
                event_type = event.get("type", "unknown")
                handlers = self._event_handlers.get(event_type, [])
                for handler in handlers:
                    handler(event)
            except Exception as e:
                print(f"WebSocket message error: {e}")
        
        def on_error(ws, error):
            print(f"WebSocket error: {error}")
        
        def on_close(ws, close_status_code, close_msg):
            print("WebSocket disconnected")
        
        def on_open(ws):
            print("WebSocket connected")
        
        self._ws = websocket.WebSocketApp(
            url,
            on_message=on_message,
            on_error=on_error,
            on_close=on_close,
            on_open=on_open
        )
        
        self._ws_thread = threading.Thread(target=self._ws.run_forever)
        self._ws_thread.daemon = True
        self._ws_thread.start()
    
    def disconnect(self) -> None:
        """Disconnect WebSocket."""
        if self._ws:
            self._ws.close()
            self._ws = None
    
    def on(self, event_type: str, handler: Callable) -> None:
        """Subscribe to an event type."""
        if event_type not in self._event_handlers:
            self._event_handlers[event_type] = []
        self._event_handlers[event_type].append(handler)
    
    def off(self, event_type: str, handler: Callable) -> None:
        """Unsubscribe from an event type."""
        if event_type in self._event_handlers:
            self._event_handlers[event_type].remove(handler)
    
    # ============================================
    # Utilities
    # ============================================
    
    def ping(self) -> bool:
        """Check if API is reachable."""
        try:
            self._request("GET", "/health")
            return True
        except:
            return False
    
    def get_pricing(self) -> Dict:
        """Get pricing information."""
        return self._request("GET", "/v1/pricing")


# Convenience function
def create_client(api_key: Optional[str] = None, **kwargs) -> OnionXBT:
    """Create a new OnionXBT client."""
    return OnionXBT(api_key=api_key, **kwargs)


# Example usage
if __name__ == "__main__":
    # Demo
    client = OnionXBT(api_key=os.environ.get("ONIONXBT_API_KEY", "demo"))
    
    print("OnionXBT Python SDK")
    print(f"Version: {__version__}")
    print()
    
    # Check connection
    if client.ping():
        print("✓ API is reachable")
    else:
        print("✗ API is not reachable")
    
    # Get pricing
    pricing = client.get_pricing()
    print(f"Pricing: {pricing}")
