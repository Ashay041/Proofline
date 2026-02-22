import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Image as ImageIcon, AlertTriangle } from "lucide-react";
import type { Task } from "@/types";

interface TaskPhotosProps {
  photos: string[];
}

export const TaskPhotos = ({ photos }: TaskPhotosProps) => {
  if (photos.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 mb-3">
      {photos.map((photo, i) => (
        <div key={i} className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center border overflow-hidden">
          {photo.startsWith("data:") || photo.startsWith("http") ? (
            <img src={photo} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
          ) : (
            <ImageIcon className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
      ))}
    </div>
  );
};

interface TaskIssuesListProps {
  issues: Task["issues"];
}

export const TaskIssuesList = ({ issues }: TaskIssuesListProps) => {
  if (issues.length === 0) return null;
  return (
    <section>
      <h2 className="text-base font-semibold text-foreground mb-2">Reported Issues</h2>
      <div className="space-y-2">
        {issues.map((issue) => (
          <Card key={issue.id}>
            <CardContent className="p-3 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">{issue.title}</p>
                {issue.description && <p className="text-sm text-muted-foreground">{issue.description}</p>}
                <Badge variant="outline" className="mt-1 border-destructive/30 text-destructive">
                  {issue.status}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
};
