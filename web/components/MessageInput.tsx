import React, { useState } from "react";
import { z } from "zod";

const messageSchema = z.object({
  content: z.string().min(1).max(1000),
  recipientId: z.string().min(1),
});

type MessageInputProps = {
  onSend: (content: string, recipientId: string) => void;
  recipientId: string;
};

export const MessageInput: React.FC<MessageInputProps> = ({
  onSend,
  recipientId,
}) => {
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      messageSchema.parse({ content, recipientId });
      onSend(content, recipientId);
      setContent("");
      setError(null);
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="p-2 border rounded"
        placeholder="Type your message..."
        rows={3}
      />
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button
        type="submit"
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        Send Message
      </button>
    </form>
  );
};
