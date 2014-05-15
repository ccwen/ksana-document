/* Ksana Database Engine
  pooling, query cache, stable interface for ksana search engine.
*/
if (typeof nodeRequire=='undefined')nodeRequire=require;

var pool={};
var customfunc=require("./customfunc");


var createEngine=function(ydb,cb) {
	var engine={lastAccess:new Date(), ydb:ydb};

	ydb.get(["meta"],true,function(res){
		engine.dbname=res.name;
		engine.customfunc=customfunc.getAPI(res.template);
		cb(engine);
	});

	engine.preload=preload;
	engine.queryCache={};
	engine.postingCache={}; //cache for merged posting
	engine.get=function(key) {return engine.ydb.get(key);};	
	return engine;
}

var preload=function(keys,cb) {
	if (!keys) return ;
	if (typeof keys=='string') {
		keys=[keys];
	}
	var engine=this, output=[];

	var makecb=function(key){
		return function(data){
				if (!(typeof data =='object' && data.__empty)) output.push(data);
				engine.ydb.get(key,taskqueue.shift());
		};
	};

	var taskqueue=[];
	for (var i=0;i<keys.length;i++) {
			taskqueue.push(makecb(keys[i]));
	};

	taskqueue.push(function(data){
		output.push(data);
		cb(output,keys); //return to caller
	});

	taskqueue.shift()({__empty:true}); //run the task
}
var open=function(ydbid,cb)  {
	var fs=nodeRequire('fs');
	var Y=nodeRequire('ksana-document').ydb;
	var engine=pool[ydbid];
	if (engine) {
		if (cb) cb(engine);
		return engine;
	}

	var ydbfn=ydbid+'.ydb';

	var tries=["./"+ydbfn,
	           "./ksana_databases/"+ydbfn,
	           "../"+ydbfn,
	           "../ksana_databases/"+ydbfn,
	           "../../"+ydbfn,
	           "../../ksana_databases/"+ydbfn];

	for (var i=0;i<tries.length;i++) {
		if (fs.existsSync(tries[i])) {
			ydb=new Y(tries[i]);
			if (ydb) {
				createEngine(ydb,function(engine){
					pool[ydbid]=engine;
					cb(engine);
				});
			}
		}
	}
	return engine;
}

module.exports={open:open};