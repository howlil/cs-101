import type { ItemProgressState, AvailabilityState } from '../../domain/learning/rules';
import type { ReviewScheduleView } from '../../domain/review/policy';

// taskId and activeTaskId exist only for the V1 compatibility window.
export type LearningProgress = ItemProgressState & { taskId: string };
export type LearningSnapshot = {
  activeItemId: string | null;
  activeTaskId: string | null;
  revision: number;
  progress: LearningProgress[];
  availability: AvailabilityState[];
  reviews: ReviewScheduleView[];
};
