"""Token-based session memory for conversation context."""

from dataclasses import dataclass
from typing import List
import tiktoken


@dataclass
class Turn:
    """A single conversation turn."""
    role: str      # "user" or "assistant"
    content: str
    tokens: int


class SessionMemory:
    """Token-based sliding window conversation memory."""

    def __init__(self, session_id: str = "default"):
        self.session_id = session_id
        self._turns: List[Turn] = []
        self._encoder = tiktoken.get_encoding("cl100k_base")

    def add_turn(self, role: str, content: str) -> None:
        """Add a conversation turn."""
        tokens = len(self._encoder.encode(content))
        self._turns.append(Turn(role=role, content=content, tokens=tokens))

    def get_context(self, token_limit: int = 500) -> str:
        """Get recent conversation context within token limit."""
        if not self._turns:
            return ""

        selected: List[Turn] = []
        total_tokens = 0

        # Walk backwards from most recent
        for turn in reversed(self._turns):
            if total_tokens + turn.tokens <= token_limit:
                selected.insert(0, turn)
                total_tokens += turn.tokens
            elif total_tokens == 0:
                # Always include at least one turn (even if over limit)
                selected.insert(0, turn)
                break
            else:
                break

        return self._format_turns(selected)

    def _format_turns(self, turns: List[Turn]) -> str:
        """Format turns as readable context string."""
        lines = []
        for turn in turns:
            role_label = "User" if turn.role == "user" else "Assistant"
            lines.append(f"{role_label}: {turn.content}")
        return "\n".join(lines)

    def clear(self) -> None:
        """Clear all turns."""
        self._turns.clear()

    @property
    def turn_count(self) -> int:
        """Number of turns in session."""
        return len(self._turns)

    @property
    def total_tokens(self) -> int:
        """Total tokens across all turns."""
        return sum(turn.tokens for turn in self._turns)
