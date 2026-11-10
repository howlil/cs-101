import type { LearningGraph, LearningLevel } from './learning-graph';
import { getFocusedConcept } from './learning-graph';
import { getLearningPath } from './learning-path';

export type LearningGoal={conceptId:string;level:LearningLevel};
export type PlannedStep={
  itemId:string;title:string;trackTitle:string;conceptId:string;conceptTitle:string;
  role:'foundation'|'application'|'diagnostic'|'operation';
  level:LearningLevel;priority:'P0'|'P1'|'P2'|'unknown';
  content:'published'|'outline';reason:'reviewed-prerequisite'|'suggested-outcome';
};
export type GoalPlan={
  goal:LearningGoal;outcomeAvailable:boolean;
  steps:PlannedStep[];reviewedPrerequisiteCount:number;
  gaps:Array<{conceptId:string;title:string;availableLevels:LearningLevel[]}>;
  publishedCount:number;outlineCount:number;
};
/** Content availability does not certify mastery. The path is an editorial learning plan, not a learner status. */
export function planLearningGoal(graph:LearningGraph,goal:LearningGoal,publishedIds:ReadonlySet<string>):GoalPlan{
  if(!graph.conceptsById.has(goal.conceptId))throw new Error('Unknown learning goal: '+goal.conceptId);
  const focus=getFocusedConcept(graph,goal.conceptId,goal.level);
  const path=getLearningPath(graph,focus);
  const steps=path.steps.map(step=>{
    const item=graph.curriculum.itemsById.get(step.itemId)!;
    const priority=item.kind==='unit'
      ?(item.marketExpectation[0]?.slice(0,2)??'unknown'):'unknown';
    return {
      itemId:step.itemId,title:step.title,trackTitle:step.trackTitle,role:step.role,
      conceptId:step.conceptId,conceptTitle:step.conceptTitle,level:step.stepLevel,
      priority:(['P0','P1','P2'].includes(priority)?priority:'unknown') as PlannedStep['priority'],
      content:(publishedIds.has(step.itemId)?'published':'outline') as PlannedStep['content'],
      reason:(step.reviewedPrerequisite?'reviewed-prerequisite':'suggested-outcome') as PlannedStep['reason'],
    };
  });
  return {
    goal,outcomeAvailable:Boolean(focus.outcome),steps,
    reviewedPrerequisiteCount:path.reviewedPrerequisiteCount,
    gaps:path.missingPrerequisites.map(x=>({conceptId:x.id,title:x.title,availableLevels:x.availableLevels})),
    publishedCount:steps.filter(x=>x.content==='published').length,
    outlineCount:steps.filter(x=>x.content==='outline').length,
  };
}
