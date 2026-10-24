const {get,put}=require('@vercel/blob');
const {createCloudHandler}=require('../lib/cloud');
const pathname='kalavathi/demo-state-v1.json';
const storage={
 async read(){const result=await get(pathname,{access:'private',useCache:false,headers:{'Accept-Encoding':'identity'}});if(!result)return null;if(result.blob.etag.startsWith('W/'))throw Error('Strong storage ETag unavailable');return {value:await new Response(result.stream).json(),etag:result.blob.etag};},
 async write(value,etag){try{return await put(pathname,JSON.stringify(value),{access:'private',contentType:'application/json',addRandomSuffix:false,cacheControlMaxAge:60,allowOverwrite:!!etag,...(etag?{ifMatch:etag}:{})});}catch(error){if(['BlobPreconditionFailedError','BlobAlreadyExistsError'].includes(error.name)||/already exists|precondition/i.test(error.message))error.conflict=true;throw error;}}
};
module.exports=createCloudHandler(storage);
