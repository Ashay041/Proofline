import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Send, MessageCircle } from "lucide-react";
import type { AIChatPair } from "@backend/types";
import type { ChatMessage } from "@backend/types";

interface AIChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AIChatDialog = ({ open, onOpenChange }: AIChatDialogProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setInput("");

    // Simple fallback AI - in production this would call an edge function
    const fallbackResponses: AIChatPair[] = [
      { question: "product", answer: "Please refer to the task specifications for approved products. Contact your Property Manager if unsure." },
      { question: "bleach", answer: "Bleach usage depends on the surface type. Check the task specifications for guidance." },
    ];
    const match = fallbackResponses.find((r) =>
      userMsg.toLowerCase().includes(r.question.toLowerCase())
    );

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: match?.answer ??
            "I don't have specific information about that. Please contact your Property Manager for clarification.",
        },
      ]);
    }, 600);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>AI Help</DialogTitle>
          <DialogDescription>Ask questions about this task. Try: "What product should I use?"</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-3 py-3 min-h-[200px]">
          {messages.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Ask a question about cleaning specs, products, or procedures.
            </p>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`rounded-lg px-3 py-2 max-w-[80%] text-sm ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2 pt-2 border-t">
          <Input
            placeholder="Type your question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            className="h-11"
          />
          <Button size="icon" className="h-11 w-11 shrink-0" onClick={handleSend}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AIChatDialog;
