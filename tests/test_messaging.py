import pytest
from unifiedchat.core.messaging import Message

def test_message_validation():
    """Test message validation."""
    # Valid message
    valid_msg = Message(
        id="123",
        content="Hello, World!",
        sender_id="user1",
        recipient_id="user2",
        timestamp=1234567890.0
    )
    assert valid_msg.is_valid() is True

    # Invalid message (empty content)
    invalid_msg = Message(
        id="124",
        content="   ",
        sender_id="user1",
        recipient_id="user2",
        timestamp=1234567890.0
    )
    assert invalid_msg.is_valid() is False
