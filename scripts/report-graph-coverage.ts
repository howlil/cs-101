import {readdirSync} from 'node:fs';
import manifest from '../curriculum/manifest.v2.json';
import overlay from '../curriculum/learning-graph.v2.json';
import {buildCurriculumGraph} from '../src/domain/curriculum-v2/graph';
import {buildLearningGraph} from '../src/domain/learning-graph';
import {reportGraphCoverage} from '../src/domain/graph-coverage';

const published=new Set(readdirSync('src/content/lessons').filter(n=>n.endsWith('.mdx')).map(n=>n.slice(0,-4)));
const graph=buildLearningGraph(overlay,buildCurriculumGraph(manifest));
const result=reportGraphCoverage(graph,published);
if(process.argv.includes('--validate')){
  if(result.unmappedPublished.length)throw new Error('Published lessons not mapped: '+result.unmappedPublished.join(','));
  console.log('Graph V2 valid: '+result.totalConcepts+' concepts, '+result.mappedItemCount+' mapped units, '+result.reviewedDependencies+' reviewed competency dependencies.');
}else console.log(JSON.stringify(result,null,2));
