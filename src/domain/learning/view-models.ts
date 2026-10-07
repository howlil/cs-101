import type { CurriculumGraph } from '../curriculum-v2/graph';
import type { CurriculumItem } from '../curriculum-v2/schema';
import { itemHref } from '../curriculum-v2/selectors';
import type { AvailabilityState, ItemProgressState } from './rules';
import type { ReviewScheduleView } from '../review/policy';

export type LearningViewState = {
  activeItemId: string | null;
  progress: Array<ItemProgressState & { taskId?: string }>;
  availability: AvailabilityState[];
  reviews: ReviewScheduleView[];
};

export type ItemDisplayState =
  | 'passed'
  | 'stale'
  | 'active'
  | 'started'
  | 'locked'
  | 'ready'
  | 'unknown';

export type ItemLearningView = {
  item: CurriculumItem;
  href: string;
  displayState: ItemDisplayState;
  completion: 'not_started' | 'active' | 'passed' | 'stale';
  availability: 'locked' | 'ready' | 'unknown';
  review: ReviewScheduleView['state'] | 'none';
  reviewDueAt: string | null;
  missingPrerequisites: string[];
  continueFrom: string;
  isFocused: boolean;
};

function stateMaps(state: LearningViewState) {
  return {
    progress: new Map(state.progress.map((entry) => [entry.itemId, entry])),
    availability: new Map(state.availability.map((entry) => [entry.itemId, entry])),
    reviews: new Map(state.reviews.map((entry) => [entry.itemId, entry])),
  };
}

export function getItemLearningView(
  graph: CurriculumGraph,
  state: LearningViewState,
  itemId: string,
): ItemLearningView {
  const item = graph.itemsById.get(itemId);
  if (!item) throw new Error('Item tidak ditemukan: ' + itemId);

  const maps = stateMaps(state);
  const progress = maps.progress.get(itemId);
  const availability = maps.availability.get(itemId);
  const review = maps.reviews.get(itemId);
  const isFocused = state.activeItemId === itemId;

  const completion: ItemLearningView['completion'] =
    progress?.status === 'passed'
      ? 'passed'
      : progress?.status === 'stale'
        ? 'stale'
        : isFocused
          ? 'active'
          : 'not_started';

  const displayState: ItemDisplayState =
    completion === 'passed'
      ? 'passed'
      : completion === 'stale'
        ? 'stale'
        : isFocused
          ? 'active'
          : progress?.status === 'active'
            ? 'started'
            : availability?.status ?? 'unknown';

  return {
    item,
    href: itemHref(graph, itemId),
    displayState,
    completion,
    availability: availability?.status ?? 'unknown',
    review: completion === 'passed' ? review?.state ?? 'none' : 'none',
    reviewDueAt: completion === 'passed' ? review?.dueAt ?? null : null,
    missingPrerequisites: availability?.missingPrerequisites ?? [],
    continueFrom: progress?.continueFrom ?? '',
    isFocused,
  };
}

function orderedItems(graph: CurriculumGraph) {
  const tracks = [...graph.manifest.tracks].sort((a, b) => a.order - b.order);
  const ordered: CurriculumItem[] = [];

  for (const track of tracks) {
    const modules = [...graph.modulesById.values()]
      .filter((module) => module.trackId === track.id)
      .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));

    for (const module of modules) {
      for (const id of graph.moduleItems.get(module.id) ?? []) {
        const item = graph.itemsById.get(id);
        if (item) ordered.push(item);
      }
    }
  }

  ordered.push(
    ...graph.manifest.items
      .filter((item) => item.kind === 'integration')
      .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id)),
  );

  return ordered;
}

export function getTodayView(graph: CurriculumGraph, state: LearningViewState) {
  const active = state.activeItemId
    ? getItemLearningView(graph, state, state.activeItemId)
    : undefined;
  const actionableActive = active?.displayState === 'active' ? active : undefined;

  const nextReady = orderedItems(graph)
    .map((item) => getItemLearningView(graph, state, item.id))
    .find((view) =>
      view.availability === 'ready' &&
      view.completion !== 'passed' &&
      view.displayState !== 'active'
    );

  const reviews = state.reviews
    .filter((review) => review.state === 'due' || review.state === 'retry')
    .map((review) => {
      const item = getItemLearningView(graph, state, review.itemId);
      return { item, review };
    })
    .filter(({ item }) => item.completion === 'passed')
    .sort((a, b) => {
      if (a.review.state !== b.review.state) return a.review.state === 'retry' ? -1 : 1;
      return (a.review.dueAt ?? '').localeCompare(b.review.dueAt ?? '');
    });

  return {
    primary: actionableActive ?? nextReady,
    primaryMode: actionableActive ? 'continue' as const : nextReady ? 'next' as const : 'none' as const,
    actionableReviews: reviews,
    nextReview: reviews[0],
  };
}

export type ModuleProgressView = {
  id: string;
  title: string;
  href: string;
  completed: number;
  total: number;
  active: boolean;
  reviewActions: number;
};

export type TrackProgressView = {
  id: string;
  title: string;
  href: string;
  completed: number;
  total: number;
  reviewActions: number;
  modules: ModuleProgressView[];
};

export function getProgressOverview(graph: CurriculumGraph, state: LearningViewState) {
  const tracks: TrackProgressView[] = [...graph.manifest.tracks]
    .sort((a, b) => a.order - b.order)
    .map((track) => {
      const modules = [...graph.modulesById.values()]
        .filter((module) => module.trackId === track.id)
        .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
        .map((module) => {
          const itemIds = graph.moduleItems.get(module.id) ?? [];
          const views = itemIds.map((id) => getItemLearningView(graph, state, id));
          const completed = views.filter((view) => view.completion === 'passed').length;
          const reviewActions = views.filter((view) =>
            view.review === 'due' || view.review === 'retry'
          ).length;

          return {
            id: module.id,
            title: module.title,
            href: '/curriculum?track=' + encodeURIComponent(track.id) +
              '&item=' + encodeURIComponent(itemIds[0] ?? ''),
            completed,
            total: views.length,
            active: views.some((view) => view.displayState === 'active'),
            reviewActions,
          };
        });

      return {
        id: track.id,
        title: track.title,
        href: '/curriculum?track=' + encodeURIComponent(track.id),
        completed: modules.reduce((sum, module) => sum + module.completed, 0),
        total: modules.reduce((sum, module) => sum + module.total, 0),
        reviewActions: modules.reduce((sum, module) => sum + module.reviewActions, 0),
        modules,
      };
    });

  const integrations = graph.manifest.items
    .filter((item) => item.kind === 'integration')
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
    .map((item) => getItemLearningView(graph, state, item.id));

  const actionableReviews = state.reviews
    .filter((review) => review.state === 'due' || review.state === 'retry')
    .map((review) => ({
      review,
      item: getItemLearningView(graph, state, review.itemId),
    }))
    .filter(({ item }) => item.completion === 'passed')
    .sort((a, b) => {
      if (a.review.state !== b.review.state) return a.review.state === 'retry' ? -1 : 1;
      return (a.review.dueAt ?? '').localeCompare(b.review.dueAt ?? '');
    });

  return {
    tracks,
    integrations,
    actionableReviews,
    completed: state.progress.filter((entry) => entry.status === 'passed').length,
    total: graph.manifest.items.length,
  };
}

export function itemStateMarker(state: ItemDisplayState, kind: CurriculumItem['kind']) {
  if (state === 'passed') return '✓';
  if (state === 'active') return '●';
  if (state === 'started') return '◐';
  if (state === 'stale') return '!';
  if (state === 'locked') return '×';
  if (state === 'ready') return '○';
  return kind === 'checkpoint' ? '◆' : kind === 'integration' ? '◇' : '○';
}
