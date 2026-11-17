import type {GeometryPlanInput} from './geometryPlan';
import type {Detail1State} from './detailModel';

export function startAutomaticSceneJob(input:GeometryPlanInput,complete:(state:Detail1State)=>void,fail:(error:unknown)=>void){
 const worker=new Worker(new URL('./automaticOneMile.worker.ts',import.meta.url),{type:'module'});
 worker.onmessage=event=>{worker.terminate();if(event.data.error)fail(Error(event.data.error));else complete(event.data.state);};
 worker.onerror=event=>{worker.terminate();fail(Error(event.message));};
 try{worker.postMessage(input);}catch(error){worker.terminate();throw error;}
 return ()=>worker.terminate();
}
