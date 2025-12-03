"""Unified memory manager combining short-term and long-term memory."""

from typing import Optional, List
from pathlib import Path

from .session import SessionMemory
from .cognee_memory import CogneeMemory, Memory


class MemoryManager:
    """Unified interface for all memory systems.

    Combines:
    - SessionMemory: Short-term sliding window (current conversation)
    - CogneeMemory: Long-term knowledge graph (persistent across sessions)

    This is the single point of access for memory in the orchestration engine.
    """

    def __init__(
        self,
        session_id: str = "default",
        cognee_data_dir: Optional[Path] = None,
        cognee_dataset: str = "her_memory",
        enable_longterm: bool = True,
    ):
        # Short-term memory (always enabled)
        self.session = SessionMemory(session_id=session_id)

        # Long-term memory (optional)
        self._enable_longterm = enable_longterm
        self.cognee = CogneeMemory(
            data_dir=cognee_data_dir,
            dataset_name=cognee_dataset
        ) if enable_longterm else None

        self._longterm_initialized = False

    async def initialize(self) -> None:
        """Initialize all memory systems."""
        if self.cognee and not self._longterm_initialized:
            await self.cognee.initialize()
            self._longterm_initialized = True

    def add_turn(self, role: str, content: str) -> None:
        """Add a conversation turn to short-term memory.

        Args:
            role: "user" or "assistant"
            content: The message content
        """
        self.session.add_turn(role, content)

    async def persist(self, content: str) -> bool:
        """Persist important information to long-term memory.

        Args:
            content: Information to remember long-term

        Returns:
            True if successfully persisted
        """
        if not self.cognee or not self._longterm_initialized:
            return False

        return await self.cognee.add(content)

    async def search_longterm(self, query: str, limit: int = 5) -> List[Memory]:
        """Search long-term memory directly.

        Args:
            query: Search query
            limit: Maximum results

        Returns:
            List of relevant memories
        """
        if not self.cognee or not self._longterm_initialized:
            return []

        return await self.cognee.search(query, limit)

    async def get_context(
        self,
        query: str,
        session_token_limit: int = 500,
        longterm_limit: int = 3,
        include_longterm: bool = True,
    ) -> str:
        """Get combined context from all memory systems.

        Args:
            query: The current query (used to find relevant long-term memories)
            session_token_limit: Token limit for session context
            longterm_limit: Max long-term memories to include
            include_longterm: Whether to include long-term memories

        Returns:
            Formatted context string combining all sources
        """
        parts = []

        # Get short-term context (recent conversation)
        session_context = self.session.get_context(session_token_limit)
        if session_context:
            parts.append(session_context)

        # Get long-term context (relevant memories)
        if include_longterm and self.cognee and self._longterm_initialized:
            try:
                memories = await self.cognee.search(query, limit=longterm_limit)
                if memories:
                    longterm_lines = ["", "[Relevant Memories]"]
                    for mem in memories:
                        longterm_lines.append(f"- {mem.content}")
                    parts.append("\n".join(longterm_lines))
            except Exception as e:
                print(f"[MemoryManager] Long-term search error: {e}")

        return "\n".join(parts)

    def get_session_context(self, token_limit: int = 500) -> str:
        """Get only short-term session context (synchronous).

        Args:
            token_limit: Maximum tokens

        Returns:
            Session context string
        """
        return self.session.get_context(token_limit)

    def clear_session(self) -> None:
        """Clear short-term session memory only."""
        self.session.clear()

    async def clear_all(self) -> None:
        """Clear both short-term and long-term memory."""
        self.session.clear()
        if self.cognee and self._longterm_initialized:
            await self.cognee.clear()

    def status(self) -> dict:
        """Get status of all memory systems.

        Returns:
            Dictionary with memory stats
        """
        return {
            "session": {
                "turns": self.session.turn_count,
                "tokens": self.session.total_tokens,
            },
            "longterm": {
                "enabled": self._enable_longterm,
                "initialized": self._longterm_initialized,
                "available": self.cognee.is_available if self.cognee else False,
            }
        }

    @property
    def longterm_available(self) -> bool:
        """Check if long-term memory is available."""
        return (
            self.cognee is not None
            and self._longterm_initialized
            and self.cognee.is_available
        )
