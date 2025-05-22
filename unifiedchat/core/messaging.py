from typing import Optional
from pydantic import BaseModel

class Message(BaseModel):
    """A message in the unified chat system."""
    id: str
    content: str
    sender_id: str
    recipient_id: str
    timestamp: float
    metadata: Optional[dict] = None

    def is_valid(self) -> bool:
        """Check if the message is valid."""
        return bool(self.content.strip() and self.sender_id and self.recipient_id)
