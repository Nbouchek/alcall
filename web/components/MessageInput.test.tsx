import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MessageInput } from "./MessageInput";

describe("MessageInput", () => {
  it("renders and allows sending a message", () => {
    const onSend = jest.fn();
    render(<MessageInput onSend={onSend} recipientId="user2" />);
    const textarea = screen.getByPlaceholderText("Type your message...");
    fireEvent.change(textarea, { target: { value: "Hello!" } });
    fireEvent.click(screen.getByText("Send Message"));
    expect(onSend).toHaveBeenCalledWith("Hello!", "user2");
  });
});
