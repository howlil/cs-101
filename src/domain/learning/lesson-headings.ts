export type LessonStageId = 'understand' | 'practice' | 'evidence';
export type RenderedLessonHeading = {
  depth: number;
  slug: string;
  text: string;
};
export type StagedLessonHeading = RenderedLessonHeading & { stage: LessonStageId };

/**
 * Derives TOC ownership from authored MDX order, not client DOM queries.
 * The boundaries come from LessonStage components in the lesson source.
 * Markdown headings are matched to Astro's rendered headings by document order.
 */
export function mapLessonHeadings(
  source: string,
  headings: RenderedLessonHeading[],
): StagedLessonHeading[] {
  const lines = source.split(/\r?\n/);
  let current: LessonStageId = 'understand';
  const stages: LessonStageId[] = [];
  for (const line of lines) {
    const match = line.match(/^\s*<LessonStage stage="(understand|practice|evidence)">/);
    if (match) current = match[1] as LessonStageId;
    if (/^##\s+\S/.test(line)) stages.push(current);
  }
  let cursor = 0;
  return headings.map((heading) => ({
    ...heading,
    stage: heading.depth === 2 ? stages[cursor++] ?? 'understand' : current,
  }));
}
