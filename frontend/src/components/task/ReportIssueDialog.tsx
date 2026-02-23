import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertTriangle } from "lucide-react";
import type { ReportedIssue } from "@backend/types";
import { toast } from "@/hooks/use-toast";

interface ReportIssueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (issue: ReportedIssue) => void;
}

const ReportIssueDialog = ({ open, onOpenChange, onSubmit }: ReportIssueDialogProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = () => {
    if (!title.trim()) return;
    onSubmit({
      id: `issue-${Date.now()}`,
      title,
      description,
      status: "Reported",
    });
    setTitle("");
    setDescription("");
    onOpenChange(false);
    toast({ title: "Issue reported", description: "Property Manager will be notified." });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Report an Issue</DialogTitle>
          <DialogDescription>Flag an urgent issue for the Property Manager.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Input
            placeholder="Issue title (e.g., Faucet leaking)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-11"
          />
          <Textarea
            placeholder="Describe the issue..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
          <Button className="w-full h-12" onClick={handleSubmit} disabled={!title.trim()}>
            Submit Issue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReportIssueDialog;
