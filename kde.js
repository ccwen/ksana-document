/* Ksana Database Engine
   middleware for client and server.
   each ydb has one engine instance.
   all data from server will be cache at client side to save network roundtrip.
*/
if (typeof nodeRequire=='undefined')nodeRequire=require;

var pool={},localPool={};
var customfunc=require("./customfunc");


var _gets=function(keys,cb) { //get many data with one call
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
		if (typeof keys[i]=="null") { //this is only a place holder for key data already in client cache
			output.push(null);
		} else {
			taskqueue.push(makecb(keys[i]));
		}
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
			return _gets.apply(engine,[key,cb]);
		} else {
			return engine.ydb.get(key,recursive,cb);	
		}
	};	
	return engine;
}

var getRemote=function(key,recursive,cb) {
	var $kse=Require("ksanaforge-kse").$yase; 
	var engine=this;
	if (!engine.ready) {
		console.error("remote connection not established yet");
		return;
	} 
	if (typeof recursive=="function") {
		cb=recursive;
	}
	recursive=recursive||false;
	if (typeof key=="string") key=[key];

	if (typeof key[0]=="array") { //multiple keys
		var keys=[],output=[];
		for (var i=0;i<key.length;i++) {
			var cachekey=key[i].join("\0");
			var data=engine.cache[cachekey];
			if (typeof data!="undefined") {
				keys.push(null);//  place holder for LINE 28
				output.push(data); //put cached data into output
			} else{
				engine.fetched++;
				keys.push(key[i]); //need to ask server
				output.push(null); //data is unknown yet
			}
		}
		//now ask server for unknown datum
		engine.traffic++;
		var opts={key:keys,recursive:recursive,db:engine.ydbid};
		$kse("get",opts).done(function(datum){
			//merge the server result with cached 
			for (var i=0;i<output.length;i++) {
				if (typeof datum[i]!="null") {
					var cachekey=keys[i].join("\0");
					engine.cache[cachekey]=datum[i];
					output[i]=datum[i];
				}
			}
			cb.apply(engine.context,[output]);	
		});
	} else { //single key
		var cachekey=key.join("\0");
		var data=engine.cache[cachekey];
		if (typeof data!="undefined") {
			cb.apply(engine.context,[data]);
		} else {
			engine.traffic++;
			engine.fetched++;
			var opts={key:key,recursive:recursive,db:engine.ydbid};
			$kse("get",opts).done(function(data){
				engine.cache[cachekey]=data;
				cb.apply(engine.context,[data]);	
			});
		}
	}
}


var createEngine=function(ydbid) {
	var $kse=Require("ksanaforge-kse").$yase; 
	var engine={lastAccess:new Date(), ydbid:ydbid, cache:{} , 
	postingCache:{}, queryCache:{}, traffic:0,fetched:0};

	$kse("get",{key:["meta"], recursive:true, db:ydbid} ).done(function(meta){
		console.log("remote kde connection ["+ydbid+"] established.");
		engine.dbname=meta.name;
		engine.customfunc=customfunc.getAPI(meta.template);
		engine.cache["meta"]=meta; //put into cache manually
		engine.ready=true;
	});

	engine.setContext=function(ctx) {this.context=ctx};
	engine.get=getRemote;
	return engine;
}


var open=function(ydbid,context) {
	var engine=localPool[ydbid];
	if (engine) return engine;
	engine=createEngine(ydbid,context);
	localPool[ydbid]=engine;
	return engine;
}

var openLocal=function(kdbid,cb)  {
	var fs=nodeRequire('fs');
	var Kdb=nodeRequire('ksana-document').kdb;
	var engine=pool[kdbid];
	if (engine) {
		if (cb) cb(engine);
		return engine;
	}

	var kdbfn=kdbid+'.kdb';

	var tries=["./"+kdbfn  //TODO , allow any depth
	           ,"./ksana_databases/"+kdbfn
	           ,"../"+kdbfn
	           ,"../ksana_databases/"+kdbfn
	           ,"../../"+kdbfn
	           ,"../../ksana_databases/"+kdbfn
	           ,"../../../"+kdbfn
	           ,"../../../ksana_databases/"+kdbfn
	           ];

	for (var i=0;i<tries.length;i++) {
		if (fs.existsSync(tries[i])) {
			kdb=new Kdb(tries[i]);
			if (kdb) {
				createLocalEngine(kdb,function(engine){
					pool[kdbid]=engine;
					cb(engine);
				});
			}
		}
	}
	return engine;
}

module.exports={openLocal:openLocal, open:open};