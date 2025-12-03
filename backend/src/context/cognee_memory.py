"""Long-term memory using Cognee knowledge graph."""

import asyncio
from dataclasses import dataclass
from typing import List, Optional
from pathlib import Path


@dataclass
class Memory:
    """A retrieved memory from long-term storage."""
    content: str
    score: float = 0.0
    metadata: Optional[dict] = None


class CogneeMemory:
    """Long-term memory powered by Cognee knowledge graph.

    Provides persistent memory that survives across sessions.
    Uses Cognee to build a knowledge graph from conversations
    and retrieve relevant context.
    """

    def __init__(self, data_dir: Optional[Path] = None, dataset_name: str = "her_memory"):
        self.data_dir = data_dir
        self.dataset_name = dataset_name
        self._initialized = False
        self._cognee = None

    async def initialize(self) -> None:
        """Initialize Cognee with project settings."""
        if self._initialized:
            return

        try:
            import cognee
            self._cognee = cognee

            # Configure data directory if specified
            if self.data_dir:
                self.data_dir.mkdir(parents=True, exist_ok=True)
                # Cognee uses environment variables for config
                import os
                os.environ.setdefault("COGNEE_DATA_DIR", str(self.data_dir))

            self._initialized = True
            print(f"[CogneeMemory] Initialized with dataset: {self.dataset_name}")

        except ImportError:
            print("[CogneeMemory] Warning: cognee not installed. Long-term memory disabled.")
            self._initialized = False

    async def add(self, content: str, metadata: Optional[dict] = None) -> bool:
        """Add information to long-term memory.

        Args:
            content: The information to remember
            metadata: Optional metadata (e.g., timestamp, source)

        Returns:
            True if successfully added, False otherwise
        """
        if not self._initialized or not self._cognee:
            return False

        try:
            # Add content to Cognee
            await self._cognee.add(content, dataset_name=self.dataset_name)

            # Process into knowledge graph
            await self._cognee.cognify(datasets=[self.dataset_name])

            return True

        except Exception as e:
            print(f"[CogneeMemory] Error adding memory: {e}")
            return False

    async def search(self, query: str, limit: int = 5) -> List[Memory]:
        """Search long-term memory for relevant information.

        Args:
            query: The search query
            limit: Maximum number of results

        Returns:
            List of relevant memories
        """
        if not self._initialized or not self._cognee:
            return []

        try:
            # Search using Cognee's graph completion
            results = await self._cognee.search(query)

            memories = []
            for i, result in enumerate(results[:limit]):
                # Handle different result formats from Cognee
                if hasattr(result, 'content'):
                    content = result.content
                elif hasattr(result, 'text'):
                    content = result.text
                elif isinstance(result, str):
                    content = result
                elif isinstance(result, dict):
                    content = result.get('content', result.get('text', str(result)))
                else:
                    content = str(result)

                score = getattr(result, 'score', 1.0 - (i * 0.1))
                memories.append(Memory(content=content, score=score))

            return memories

        except Exception as e:
            print(f"[CogneeMemory] Error searching: {e}")
            return []

    async def clear(self) -> bool:
        """Clear all long-term memories.

        Returns:
            True if successfully cleared, False otherwise
        """
        if not self._initialized or not self._cognee:
            return False

        try:
            # Delete the dataset
            await self._cognee.prune.prune_data()
            return True

        except Exception as e:
            print(f"[CogneeMemory] Error clearing: {e}")
            return False

    def get_context_sync(self, query: str, limit: int = 3) -> str:
        """Synchronous wrapper for getting context (for compatibility).

        Args:
            query: The query to find relevant memories for
            limit: Maximum memories to include

        Returns:
            Formatted context string
        """
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                # We're in an async context, need to handle differently
                import concurrent.futures
                with concurrent.futures.ThreadPoolExecutor() as pool:
                    future = pool.submit(asyncio.run, self.search(query, limit))
                    memories = future.result(timeout=5)
            else:
                memories = loop.run_until_complete(self.search(query, limit))
        except Exception:
            return ""

        if not memories:
            return ""

        lines = ["[Long-term Memory]"]
        for mem in memories:
            lines.append(f"- {mem.content}")
        return "\n".join(lines)

    @property
    def is_available(self) -> bool:
        """Check if Cognee is available and initialized."""
        return self._initialized and self._cognee is not None
