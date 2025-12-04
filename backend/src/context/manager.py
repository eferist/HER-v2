"""Unified memory manager - session-based conversation memory."""

from typing import Optional

from .session import SessionMemory


class MemoryManager:
    """Unified interface for memory systems.

    Currently provides:
    - SessionMemory: Short-term sliding window (current conversation)

    This is the single point of access for memory in the orchestration engine.
    """

    def __init__(self, session_id: str = "default"):
        self.session = SessionMemory(session_id=session_id)

    def add_turn(self, role: str, content: str) -> None:
        """Add a conversation turn to memory.

        Args:
            role: "user" or "assistant"
            content: The message content
        """
        self.session.add_turn(role, content)

    def get_context(self, token_limit: int = 500) -> str:
        """Get conversation context within token limit.

        Args:
            token_limit: Maximum tokens

        Returns:
            Session context string
        """
        return self.session.get_context(token_limit)

    def clear(self) -> None:
        """Clear session memory."""
        self.session.clear()

    def status(self) -> dict:
        """Get status of memory system.

        Returns:
            Dictionary with memory stats
        """
        return {
            "turns": self.session.turn_count,
            "tokens": self.session.total_tokens,
        }
