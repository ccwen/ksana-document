/* Ksana Database Engine
   middleware for client and server.
   each ydb has one engine instance.
   all data from server will be cache at client side to save network roundtrip.
*/
if (typeof nodeRequire=='undefined')nodeRequire=require;

var pool={},localPool={};
var customfunc=require("./customfunc");


var gets=function(keys,cb) { //get many data with one call
	if (!keys) return ;
	if (typeof keys=='string') {
		keys=[keys];
	}
	var engine=this, output=[];

	var makecb=function(key){
		return function(data){
				if (!(typeof data =='object' && data.__empty)) output.push(data);
				engine.get(key,taskqueue.shift());
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
var createLocalEngine=function(ydb,cb) {
	var engine={lastAccess:new Date(), ydb:ydb};

	ydb.get(["meta"],true,function(res){
		engine.dbname=res.name;
		engine.customfunc=customfunc.getAPI(res.template);
		cb(engine);
	});

	engine.queryCache={};
	engine.postingCache={}; //cache for merged posting
	engine.get=function(key,recursive,cb) {
		if (typeof recursive=="function") cb=recursive;
		if (typeof key=="string") key=[key];
		if (typeof key[0] =="object") {
			return gets.apply(engine,[key,cb]);
		} else {
			return engine.ydb.get(key,recursive,cb);	
		}
	};	
	return engine;
}


var createEngine=function(ydbid) {
	var $kse=Require("ksanaforge-kse").$yase; 
	var engine={lastAccess:new Date(), ydbid:ydbid, cache:{} , postingCache:{}, queryCache:{}};

	engine.get=function(key,recursive,cb) {
		if (!engine.ready) {
			console.error("remote connection not established yet");
			return;
		} 
		if (typeof recursive=="function") {
			cb=recursive;
		}
		recursive=recursive||false;
		if (typeof key=="string") key=[key];
		var cachekey=key.join("\0");
		var data=engine.cache[cachekey];
		if (typeof data!="undefined") {
			cb.apply(engine.context,[data]);
		} else {
			var opts={key:key,recursive:recursive,db:engine.ydbid};
			$kse("get",opts).done(function(data){
				engine.cache[cachekey]=data;
				cb.apply(engine.context,[data]);	
			});
		}
	}

	$kse("get",{key:["meta"], recursive:true, db:ydbid} ).done(function(res){
		console.log("remote database ["+ydbid+"] established.");
		engine.dbname=res.name;
		engine.customfunc=customfunc.getAPI(res.template);
		engine.ready=true;
	});

	engine.setContext=function(ctx) {this.context=ctx};
	engine.gets=gets;
	engine.queryCache={};
	engine.postingCache={}; //cache for merged posting
	return engine;
}


var open=function(ydbid,context) {
	var engine=localPool[ydbid];
	if (engine) return engine;
	engine=createEngine(ydbid,context);
	localPool[ydbid]=engine;
	return engine;
}

var openLocal=function(ydbid,cb)  {
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
				createLocalEngine(ydb,function(engine){
					pool[ydbid]=engine;
					cb(engine);
				});
			}
		}
	}
	return engine;
}

module.exports={openLocal:openLocal, open:open};