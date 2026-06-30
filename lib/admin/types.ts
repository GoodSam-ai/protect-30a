export type ReportedCommentQueueItem = {
  id: string;
  createdAt: string;
  body: string;
  topic: string | null;
  moderationStatus: string;
  isHidden: boolean;
  isFeatured: boolean;
  isReported: boolean;
  authorDisplayName: string;
  reportCount: number;
  reportReasons: string[];
  reportDetails: string[];
};
