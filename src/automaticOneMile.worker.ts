import {prepareAutomaticSceneCandidate} from './automaticOneMileScene';
self.onmessage=event=>{
 try{self.postMessage({state:prepareAutomaticSceneCandidate(event.data)});}
 catch(error){self.postMessage({error:error instanceof Error?error.message:String(error)});}
};
