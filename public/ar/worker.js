/* Classic worker: the packaged CommonJS build exposes its API through exports. */
self.exports = {};
importScripts('/ar/vision.js');
(() => {
  let detector;
  self.onmessage = async ({data}) => {
    const {id,bitmap}=data;
    try {
      if(data.type==='init'){
        const files=await self.exports.FilesetResolver.forVisionTasks('/ar/wasm');
        detector=await self.exports.FaceLandmarker.createFromOptions(files,{
          baseOptions:{modelAssetPath:'/ar/face_landmarker.task',delegate:'CPU'},
          runningMode:'IMAGE',numFaces:2,minFaceDetectionConfidence:.5,minFacePresenceConfidence:.5,
          outputFaceBlendshapes:false,outputFacialTransformationMatrixes:false
        });
        self.postMessage({id,ready:true});return;
      }
      if(!detector)throw new Error('AR is not initialized');
      const result=detector.detect(bitmap);
      const faces=result.faceLandmarks.map(points=>({
        left:{x:(points[33].x+points[133].x)/2,y:(points[33].y+points[133].y)/2},
        right:{x:(points[263].x+points[362].x)/2,y:(points[263].y+points[362].y)/2},
        forehead:{x:points[10].x,y:points[10].y}
      }));
      self.postMessage({id,faces});
    }catch(error){self.postMessage({id,error:String(error?.message||error)});}
    finally{bitmap?.close();}
  };
})();
